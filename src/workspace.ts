import * as vscode from 'vscode';
import { Disposable, Uri } from 'vscode';
import { getMetadataDiagnostics as getRockcraftConfigDiagnostics } from './diagnostic';
import { ROCK_FILE_ROCKCRAFT_YAML } from './model/common';
import { Rock, RockcraftConfig, emptyRockcraftConfig } from './model/rock';
import { parseRockcraftYAML as parseRockcraftConfigYAML } from './parser';
import { tryReadWorkspaceFileAsText } from './util';

const WATCH_GLOB_PATTERN = `${ROCK_FILE_ROCKCRAFT_YAML}`;

export class WorkspaceRock implements vscode.Disposable {
    private _disposables: Disposable[] = [];
    private readonly watcher: vscode.FileSystemWatcher;

    /**
     * Persisted model of the ROCK.
     */
    readonly model: Rock;

    /**
     * *Live* instance of the ROCK model (i.e., content is in sync with the
     * latest un-persisted changes).
     */
    readonly live: Rock;

    private _hasRockcraftConfig: boolean = false;
    private readonly _onRockcraftConfigChanged = new vscode.EventEmitter<void>();
    /**
     * URI of the ROCK's `rockcraft.yaml` file. This property is always
     * assigned with the standard path, so consult with {@link hasRockcraftConfig} to
     * check if the file exists.
     */
    readonly rockcraftConfigUri: Uri;
    /**
     * Fires when the **persisted** `rockcraft.yaml` changes, or is created/deleted).
     */
    readonly onRockcraftConfigChanged = this._onRockcraftConfigChanged.event;

    constructor(
        readonly home: Uri,
        readonly output: vscode.OutputChannel,
        readonly diagnostics: vscode.DiagnosticCollection
    ) {
        this.model = new Rock();
        this.live = new Rock();
        this.rockcraftConfigUri = Uri.joinPath(this.home, ROCK_FILE_ROCKCRAFT_YAML);
        this._disposables.push(
            this.watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(home, WATCH_GLOB_PATTERN)),
            this.watcher.onDidChange(async e => await this._onFileSystemEvent('change', e)),
            this.watcher.onDidCreate(async e => await this._onFileSystemEvent('create', e)),
            this.watcher.onDidDelete(async e => await this._onFileSystemEvent('delete', e)),
        );
    }

    dispose() {
        this._disposables.forEach(x => x.dispose());
    }

    /**
     * Returns `true` if there's a `rockcraft.yaml` file associated with the ROCK; otherwise, `false`.
     */
    get hasRockcraftConfig() {
        return this._hasRockcraftConfig;
    }

    private async _onFileSystemEvent(kind: 'change' | 'create' | 'delete', uri: Uri) {
        if (uri.path === this.rockcraftConfigUri.path) {
            await this._refreshRockcraftConfig();
        }
    }

    private _updateDiagnosticsByURI(uri: Uri, entries: vscode.Diagnostic[]) {
        this.diagnostics.delete(uri);
        this.diagnostics.set(uri, entries);
    }

    async refresh() {
        await Promise.allSettled([
            this._refreshRockcraftConfig(),
        ]);
    }

    private async _refreshRockcraftConfig() {
        const content = await tryReadWorkspaceFileAsText(this.rockcraftConfigUri);
        let rockcraftConfig: RockcraftConfig;
        if (content === undefined) {
            this._hasRockcraftConfig = false;
            rockcraftConfig = emptyRockcraftConfig();
        } else {
            this._hasRockcraftConfig = true;
            rockcraftConfig = parseRockcraftConfigYAML(content);
        }
        this.model.updateRockcraftConfig(rockcraftConfig);
        await this.updateLiveRockcraftConfigFile();
        this._onRockcraftConfigChanged.fire();
    }

    async updateLiveFile(uri: Uri) {
        if (uri.path === this.rockcraftConfigUri.path) {
            await this.updateLiveRockcraftConfigFile();
        }
    }

    /**
     * @returns `undefined` when there's no dirty document with the given URI.
     */
    private _getDirtyDocumentContent(uri: Uri): string | undefined {
        const docs = Array.from(vscode.workspace.textDocuments);
        for (const doc of docs) {
            if (doc.isClosed) {
                continue;
            }
            if (doc.uri.toString() === uri.toString()) {
                if (doc.isDirty) {
                    return doc.getText();
                }
            }
        }
        return undefined;
    }

    async updateLiveRockcraftConfigFile() {
        const content = this._getDirtyDocumentContent(this.rockcraftConfigUri);
        if (content === undefined) {
            this.live.updateRockcraftConfig(this.model.rockcraftConfig);
            this._updateDiagnosticsByURI(this.rockcraftConfigUri, getRockcraftConfigDiagnostics(this.live.rockcraftConfig));
            return;
        }

        this._log('rockcraft refreshed');
        this.live.updateRockcraftConfig(parseRockcraftConfigYAML(content));
        this._updateDiagnosticsByURI(this.rockcraftConfigUri, getRockcraftConfigDiagnostics(this.live.rockcraftConfig));
    }

    private _log(s: string) {
        this.output.appendLine(`${new Date().toISOString()} ${this.home.path} ${s}`);
    }
}
