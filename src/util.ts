import { TextDecoder } from 'util';
import { Uri, Range as VSCodeRange, workspace } from 'vscode';
import { Range } from './model/common';

export async function tryReadWorkspaceFileAsText(uri: Uri): Promise<undefined | string> {
    try {
        return new TextDecoder().decode(await workspace.fs.readFile(uri));
    } catch {
        return undefined;
    }
}

export function rangeToVSCodeRange(range: Range): VSCodeRange {
    return new VSCodeRange(range.start.line, range.start.character, range.end.line, range.end.character);
}
