import TelemetryReporter from '@vscode/extension-telemetry';
import {
    ExtensionContext,
    ExtensionMode,
    commands,
    languages,
    window
} from 'vscode';
import { InternalCommands, registerCommands } from './command';
import { Registry } from './registry';
import { integrateWithYAMLExtension } from './schema';
import { RockcraftTreeDataProvider } from './tree';
import { DocumentWatcher } from './watcher';

const TELEMETRY_INSTRUMENTATION_KEY = '804eccd9-3d59-4aec-9fcc-9eec10a562c4';

export async function activate(context: ExtensionContext) {
    const reporter = new TelemetryReporter(context.extensionMode === ExtensionMode.Production ? TELEMETRY_INSTRUMENTATION_KEY : '');
    context.subscriptions.push(reporter);

    const output = window.createOutputChannel('Rockcraft IDE');
    context.subscriptions.push(output);

    const diagnostics = languages.createDiagnosticCollection('Rockcraft IDE');
    context.subscriptions.push(diagnostics);

    const registry = new Registry(output, diagnostics);
    context.subscriptions.push(registry);
    await registry.refresh();

    const dw = new DocumentWatcher(registry);
    context.subscriptions.push(dw);
    dw.enable();

    const tdp = new RockcraftTreeDataProvider(registry, reporter);
    context.subscriptions.push(tdp);
    context.subscriptions.push(window.createTreeView('rockcraft-rocks', { treeDataProvider: tdp }));

    const ic = new InternalCommands(context, registry, tdp);

    context.subscriptions.push(
        ...registerCommands(ic, reporter),
    );

    // Note that we shouldn't `await` on this call, because it could ask for user decision (e.g., to install the YAML
    // extension) and get blocked for an unknown time duration (possibly never, if user decides to skip the message).
    integrateWithYAMLExtension(context).catch(reason => {
        output.appendLine(`failed to integrate with YAML extension: ${reason}`);
    });
}

export function deactivate() { }
