import * as vscode from "vscode";
import { Range, zeroRange } from "./model/common";
import {
    MapWithNode,
    Problem,
    RockcraftConfig,
    SequenceWithNode,
    WithNode
} from "./model/rock";
import { rangeToVSCodeRange } from "./util";

export class ProblemBasedDiagnostic extends vscode.Diagnostic {
    constructor(readonly problem: Problem, range: vscode.Range, message: string, severity?: vscode.DiagnosticSeverity) {
        super(range, message, severity);
    }

    static fromProblem(problem: Problem, range?: Range): ProblemBasedDiagnostic {
        const result = new this(problem, rangeToVSCodeRange(range ?? zeroRange()), problem.message);
        result.code = problem.id;
        return result;
    }
}

export function getMetadataDiagnostics(rockcraftConfig: RockcraftConfig): vscode.Diagnostic[] {
    return [
        ...rockcraftConfig.node.problems.map(x => ProblemBasedDiagnostic.fromProblem(x, rockcraftConfig.node.range)),
        ...f(rockcraftConfig.name),
        ...f(rockcraftConfig.title),
        ...f(rockcraftConfig.summary),
        ...f(rockcraftConfig.description),
        ...f(rockcraftConfig.version),
        ...f(rockcraftConfig.base),
        ...f(rockcraftConfig.buildBase),
        ...f(rockcraftConfig.license),
        ...f(rockcraftConfig.runUser),
        ...f(rockcraftConfig.entrypointService),
        ...fm(rockcraftConfig.environment),
        ...fm(rockcraftConfig.services, x => [
            ...f(x.override),
            ...f(x.command),
            ...f(x.summary),
            ...f(x.description),
            ...f(x.startup),
            ...fs(x.after),
            ...fs(x.before),
            ...fs(x.requires),
            ...fm(x.environment),
            ...f(x.user),
            ...f(x.userId),
            ...f(x.group),
            ...f(x.groupId),
            ...f(x.workingDir),
            ...f(x.onSuccess),
            ...f(x.onFailure),
            ...fm(x.onCheckFailure),
            ...f(x.backoffDelay),
            ...f(x.backoffFactor),
            ...f(x.backoffLimit),
            ...f(x.killDelay),
        ]),
        ...fm(rockcraftConfig.checks, x => [
            ...f(x.override),
            ...f(x.level),
            ...f(x.period),
            ...f(x.timeout),
            ...f(x.threshold),
            ...f(x.http),
            ...f(x.http?.value?.url),
            ...f(x.http?.value?.headers),
            ...f(x.tcp),
            ...f(x.tcp?.value?.host),
            ...f(x.tcp?.value?.port),
            ...f(x.exec),
            ...f(x.exec?.value?.command),
            ...fm(x.exec?.value?.environment),
            ...f(x.exec?.value?.group),
            ...f(x.exec?.value?.groupId),
            ...f(x.exec?.value?.serviceContext),
            ...f(x.exec?.value?.user),
            ...f(x.exec?.value?.userId),
            ...f(x.exec?.value?.workingDir),
        ]),
        ...fm(rockcraftConfig.platforms, x => [
            ...f(x.buildOn),
            ...(!x.buildFor ? [] : (x.buildFor.node.kind === 'sequence' ? fs(x.buildFor as SequenceWithNode<string>) : f(x.buildFor as WithNode<string>))),
        ]),
        ...fm(rockcraftConfig.parts, x => [
            ...fs(x.after),
            ...fs(x.buildEnvironment, x=> [
                ...fm(x),
            ]),
            ...fs(x.buildPackages),
            ...fs(x.buildSnaps),
            ...fm(x.organize),
            ...f(x.overrideBuild),
            ...f(x.overridePrime),
            ...f(x.overridePull),
            ...f(x.overrideStage),
            ...f(x.parseInfo),
            ...f(x.plugin),
            ...fs(x.prime),
            ...f(x.source),
            ...f(x.sourceBranch),
            ...f(x.sourceChecksum),
            ...f(x.sourceCommit),
            ...f(x.sourceDepth),
            ...f(x.sourceSubdir),
            ...fs(x.sourceSubmodules),
            ...f(x.sourceTag),
            ...f(x.sourceType),
            ...fs(x.stage),
            ...fs(x.stagePackages),
            ...fs(x.stageSnaps),
        ]),
    ];

    function fs<T>(e: SequenceWithNode<T> | undefined, cb?: ((e: T) => vscode.Diagnostic[])) {
        return !e ? [] : [
            ...f(e),
            ...(e.elements ?? []).map(x => [
                ...f(x),
                ...(x.value !== undefined && cb ? cb(x.value) : [])
            ]).flat(1),
        ];
    }

    function fm<T>(e: MapWithNode<T> | undefined, cb?: ((m: T) => vscode.Diagnostic[])) {
        return !e ? [] : [
            ...f(e),
            ...Object.values(e.entries ?? {}).map(x => [
                ...f(x),
                ...(x.value !== undefined && cb ? cb(x.value) : [])
            ]).flat(1),
        ];
    }

    function f(e: WithNode<any> | MapWithNode<any> | SequenceWithNode<any> | undefined): vscode.Diagnostic[] {
        return !e ? [] : [
            ...e.node.problems.map(p => ProblemBasedDiagnostic.fromProblem(p, e.node.range)),
        ];
    }
}
