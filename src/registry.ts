import {
    CancellationToken,
    DiagnosticCollection,
    Disposable,
    EventEmitter,
    FileType,
    OutputChannel,
    Uri,
    workspace
} from 'vscode';
import { ROCK_FILE_ROCKCRAFT_YAML } from './model/common';
import { WorkspaceRock } from './workspace';

/**
 * Registry of discovered ROCKs.
 */
export class Registry implements Disposable {
    private readonly _set = new Set<WorkspaceRock>();
    private readonly _disposablesPerRock = new Map<WorkspaceRock, Disposable[]>();

    private readonly _onChanged = new EventEmitter<void>();
    /**
     * Fires when ROCKs change (e.g., a new ROCK is added/removed).
     */
    readonly onChanged = this._onChanged.event;

    private readonly _onRockcraftConfigChanged = new EventEmitter<WorkspaceRock>();
    /**
     * A de-mux/aggregator event for {@link WorkspaceRock.onRockcraftConfigChanged} event.
     */
    readonly onRockcraftConfigChanged = this._onRockcraftConfigChanged.event;

    constructor(readonly output: OutputChannel, readonly diagnostics: DiagnosticCollection) { }

    dispose() {
        this._onChanged.dispose();
        this._set.forEach(rock => this._removeAndDisposeRock(rock));
    }

    private _removeAndDisposeRock(rock: WorkspaceRock) {
        this._disposablesPerRock.get(rock)?.forEach(x => x.dispose());
        this._disposablesPerRock.delete(rock);
        rock.dispose();
        this._set.delete(rock);
    }

    getWorkspaceRocks() {
        return Array.from(this._set);
    }

    getRocks() {
        return Array.from(this._set).map(x => x.model);
    }

    /**
     * Locates corresponding ROCK for a given URI which could point to either a
     * file or a directory.
     * @returns Corresponding ROCK and the path of the given URI relative to
     * the ROCK. Note that, independent of the platform, the relative path is
     * separated by `/` (forward slash).
     */
    getRockByUri(uri: Uri): { workspaceRock: WorkspaceRock; relativePath: string } | { workspaceRock: undefined; relativePath: undefined } {
        const u = uri.toString();
        for (const rock of this._set) {
            const home = rock.home.toString() + '/';
            if (u.startsWith(home)) {
                return {
                    workspaceRock: rock,
                    relativePath: u.replace(home, ''),
                };
            }
        }
        return { workspaceRock: undefined, relativePath: undefined };
    }

    async refresh() {
        const snapshot = new Set(this._set);
        const snapshotUris = new Map(Array.from(snapshot).map(x => [x.home.toString(), x]));
        const initialKeys = Array.from(snapshotUris.keys());

        const newRocks: WorkspaceRock[] = [];
        const uris = await findRocks();
        for (const u of uris) {
            const key = u.toString();
            if (snapshotUris.has(key)) {
                snapshot.delete(snapshotUris.get(key)!);
                snapshotUris.delete(key);
                continue;
            }
            const rock = this._instantiateRock(u);
            this._set.add(rock);
            newRocks.push(rock);
        }

        // Disposing of ROCKs that no longer exist.
        if (snapshot.size) {
            snapshot.forEach(rock => {
                this._removeAndDisposeRock(rock);
            });
        }

        await Promise.allSettled(newRocks.map(rock => rock.refresh()));

        const changed = this._set.size !== initialKeys.length || !initialKeys.every(x => x in initialKeys);
        if (changed) {
            this.output.appendLine(`registry refreshed (changes detected)`);
            this._onChanged.fire();
        } else {
            this.output.appendLine(`registry refreshed (no change)`);
        }
    }

    private _instantiateRock(home: Uri): WorkspaceRock {
        const rock = new WorkspaceRock(home, this.output, this.diagnostics);
        this._disposablesPerRock.set(rock, [
            rock.onRockcraftConfigChanged(() => this._onRockcraftConfigChanged.fire(rock)),
        ]);
        return rock;
    }
}

const GLOB_METADATA = `**/${ROCK_FILE_ROCKCRAFT_YAML}}`;

export async function findRocks(token?: CancellationToken): Promise<Uri[]> {
    const matches = await workspace.findFiles(GLOB_METADATA, undefined, undefined, token);
    const result: Uri[] = [];
    await Promise.allSettled(
        matches.map(async uri => {
            const parent = Uri.joinPath(uri, '..');
            if (await isRockDirectory(parent)) {
                result.push(parent);
            }
        })
    );
    return result;
}

async function isRockDirectory(uri: Uri): Promise<boolean> {
    return (await Promise.allSettled([
        workspace.fs.stat(Uri.joinPath(uri, ROCK_FILE_ROCKCRAFT_YAML)),
    ])).every(x => x.status === 'fulfilled' && x.value.type === FileType.File);
}
