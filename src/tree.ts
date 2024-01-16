import TelemetryReporter from "@vscode/extension-telemetry";
import { basename } from "path";
import { Disposable, EventEmitter, ProviderResult, ThemeIcon, TreeDataProvider, TreeItem, TreeItemCollapsibleState } from "vscode";
import { Registry } from "./registry";
import { WorkspaceRock } from "./workspace";

type TreeItemModel =
    NoRockTreeItemModel
    | RockTreeItemModel
    | RockcraftConfigTreeItemModel;

type WithWorkspaceRock = {
    workspaceRock: WorkspaceRock;
};

export type NoRockTreeItemModel = {
    kind: 'noRockDetected';
};

export type RockTreeItemModel = WithWorkspaceRock & {
    kind: 'rock';
};

export type RockcraftConfigTreeItemModel = WithWorkspaceRock & {
    kind: 'rockcraft';
};

export class RockcraftTreeDataProvider implements TreeDataProvider<TreeItemModel>, Disposable {
    private readonly _disposables: Disposable[] = [];

    private readonly _onDidChangeTreeData = new EventEmitter<void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(readonly registry: Registry, readonly reporter: TelemetryReporter) {
        this._disposables.push(
            this.registry.onChanged(() => this.triggerRefresh()),
            this.registry.onRockcraftConfigChanged(() => this.triggerRefresh()),
        );
    }

    dispose() {
        this._disposables.forEach(x => x.dispose());
    }

    triggerRefresh() {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: TreeItemModel): TreeItem | Thenable<TreeItem> {
        if (element.kind === 'noRockDetected') {
            const item = new TreeItem("No ROCK Detected");
            item.iconPath = new ThemeIcon('info');
            item.collapsibleState = TreeItemCollapsibleState.None;
            return item;
        }

        if (element.kind === 'rock') {
            const item = new TreeItem(getWorkspaceRockLabel(element.workspaceRock));
            item.resourceUri = element.workspaceRock.home;
            item.id = item.resourceUri.fsPath;
            item.iconPath = new ThemeIcon('package');
            item.collapsibleState = TreeItemCollapsibleState.Expanded;
            item.contextValue = 'rock';
            return item;
        }

        if (element.kind === 'rockcraft') {
            const item = new TreeItem('rockcraft.yaml');
            item.resourceUri = element.workspaceRock.rockcraftConfigUri;
            item.id = item.resourceUri.fsPath;
            item.iconPath = new ThemeIcon('info');
            item.collapsibleState = TreeItemCollapsibleState.None;
            item.contextValue = 'rockcraft';
            item.tooltip = 'Open rockcraft.yaml';
            item.command = {
                title: 'Open',
                command: 'vscode.open',
                arguments: [element.workspaceRock.rockcraftConfigUri],
            };
            return item;
        }
        
        return undefined as never;
    }

    getChildren(element?: TreeItemModel | undefined): ProviderResult<TreeItemModel[]> {
        if (!element) {
            const workspaceRocks = this.registry.getWorkspaceRocks();
            if (!workspaceRocks.length) {
                return [{ kind: 'noRockDetected' } as NoRockTreeItemModel];
            }

            return workspaceRocks.sort((a, b) => {
                return getWorkspaceRockLabel(a).localeCompare(getWorkspaceRockLabel(b));
            }).map(x => ({
                kind: 'rock',
                workspaceRock: x,
            } as RockTreeItemModel));
        }

        if (element.kind === 'noRockDetected') {
            return;
        }

        const workspaceRock = element.workspaceRock;

        if (element.kind === 'rock') {
            return [
                ...(workspaceRock.hasRockcraftConfig ? [{ kind: 'rockcraft', workspaceRock: workspaceRock } as RockcraftConfigTreeItemModel] : []),
            ];
        }

        return [];
    }

    // getParent?(element: TreeItemModel): ProviderResult<TreeItemModel> {
    //     throw new Error("Method not implemented.");
    // }

    // resolveTreeItem?(item: TreeItem, element: TreeItemModel, token: CancellationToken): ProviderResult<TreeItem> {
    //     throw new Error("Method not implemented.");
    // }
}

function getWorkspaceRockLabel(workspaceRock: WorkspaceRock): string {
    const name = workspaceRock.model.rockcraftConfig.name?.value;
    const title = workspaceRock.model.rockcraftConfig.title?.value;
    return name && title ? `${title} (${name})`
        : name ? name : basename(workspaceRock.home.path);
}
