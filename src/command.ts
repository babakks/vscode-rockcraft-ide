import TelemetryReporter from '@vscode/extension-telemetry';
import {
    ExtensionContext, commands
} from 'vscode';
import {
    COMMAND_DISCOVER_ROCKS,
    COMMAND_RESET_STATE_GLOBAL,
    COMMAND_RESET_STATE_WORKSPACE,
    COMMAND_REVEAL_ROCK_DIRECTORY,
    COMMAND_REVEAL_ROCK_FILE,
} from './command.const';
import { Registry } from './registry';
import {
    RockTreeItemModel,
    RockcraftTreeDataProvider, RockcraftConfigTreeItemModel
} from './tree';
import path = require('path');

export function registerCommands(ic: InternalCommands, reporter: TelemetryReporter) {
    return [
        commands.registerCommand(COMMAND_DISCOVER_ROCKS, async () => {
            reporter.sendTelemetryEvent('v0.command.discoverRocks');
            await ic.discoverRocks();
        }),
        commands.registerCommand(COMMAND_REVEAL_ROCK_DIRECTORY, async (e: RockTreeItemModel) => {
            reporter.sendTelemetryEvent('v0.command.revealRockDirectory');
            await commands.executeCommand('revealInExplorer', e.workspaceRock.home);
        }),
        commands.registerCommand(COMMAND_REVEAL_ROCK_FILE, async (e: RockcraftConfigTreeItemModel) => {
            reporter.sendTelemetryEvent('v0.command.revealRockFile.rockcraft');
            await commands.executeCommand('revealInExplorer', e.workspaceRock.rockcraftConfigUri);
        }),
        commands.registerCommand(COMMAND_RESET_STATE_GLOBAL, () => {
            reporter.sendTelemetryEvent('v0.command.resetStateGlobal');
            ic.resetStateGlobal();
        }),
        commands.registerCommand(COMMAND_RESET_STATE_WORKSPACE, () => {
            reporter.sendTelemetryEvent('v0.command.resetStateWorkspace');
            ic.resetStateWorkspace();
        }),
    ];
}

export class InternalCommands {
    constructor(
        readonly context: ExtensionContext,
        readonly registry: Registry,
        readonly treeDataProvider: RockcraftTreeDataProvider,
    ) { }

    async discoverRocks() {
        await this.registry.refresh();
        this.treeDataProvider.triggerRefresh();
    }

    resetStateGlobal() {
        const keys = this.context.globalState.keys();
        for (const key of keys) {
            this.context.globalState.update(key, undefined);
        }
    }

    resetStateWorkspace() {
        const keys = this.context.workspaceState.keys();
        for (const key of keys) {
            this.context.workspaceState.update(key, undefined);
        }
    }
}
