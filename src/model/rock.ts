import { Range } from "./common";

export interface Problem {
    message: string;
    /**
     * Should be used for further identification of a problem type (e.g., to provide fix suggestions).
     */
    id?: string;
    key?: string;
    index?: number;
    /**
     * Supplementary data for further usage (e.g., when providing fix suggestions).
     */
    [key: string]: any;
}

export const YAML_PROBLEMS = {
    /**
     * Generic YAML file problems.
     */
    generic: {
        invalidYAML: { id: 'invalidYAML', message: "Invalid YAML file." },
        missingKey: (key: string) => ({ id: 'missingKey', key, message: `Missing \`${key}\` key.` }),
        unexpectedKey: (key: string) => ({ id: 'unexpectedKey', message: `Unexpected key \`${key}\`` }),
        unexpectedScalarType: (expected: 'string' | 'integer' | 'number' | 'boolean') => ({ id: 'unexpectedScalarType', expected, message: `Must be ${expected === 'integer' ? 'an' : 'a'} ${expected}.` }),
        expectedSequenceOfScalars: (expected: 'string' | 'integer' | 'number' | 'boolean') => ({ id: 'expectedSequenceOfScalars', expected, message: `Must be a sequence of ${expected} values.` }),
        expectedScalarOrSequence: (expected: 'string' | 'integer' | 'number' | 'boolean') => ({ id: 'expectedScalarOrSequence', expected, message: `Must be ${expected === 'integer' ? 'an' : 'a'} ${expected} or a sequence of them.` }),
        expectedMap: { id: 'expectedMap', message: `Must be a map.` },
        expectedSequence: { id: 'expectedSequence', message: `Must be a sequence.` },
        expectedEnumValue: (expected: string[]) => ({ id: 'expectedEnumValue', expected, message: `Must be one of the following: ${expected.join(', ')}.` }),
        expectedNull: { id: 'expectedNull', message: 'Must be null' },
        expectedUniqueScalars: { id: 'expectedUniqueScalars', message: 'Expected unique scalar values.' },
        expectedNonEmptySequence: { id: 'expectedNonEmptySequence', message: 'Expected non-empty sequence.' },
        expectedNonEmptyMap: { id: 'expectedNonEmptyMap', message: 'Expected non-empty map.' },
    },
    /**
     * Problems specific to `rockcraft.yaml`.
     */
    rockcraftConfig: {
        expectedBuildBaseForBareBase: { id: 'expectedBuildBaseForBareBase', message: '`build-base` is required since `base` is set to `bare`.' },
        expectedPlatformBuildForForUnknownPlatform: (entry: string) => ({ id: 'expectedPlatformBuildForForUnknownPlatform', message: `\`build-for\` is required since \`${entry}\` is not a supported platform.` }),
        expectedPlatformBuildOnForUnknownPlatform: (entry: string) => ({ id: 'expectedPlatformBuildOnForUnknownPlatform', message: `\`build-on\` is required since \`${entry}\` is not a supported platform.` }),
        expectedPlatformBuildOn: { id: 'expectedPlatformBuildOn', message: '`build-on` is required since `build-for` is assigned.' },
        expectedOnlyOneArchitecture: { id: 'expectedOnlyOneArchitecture', message: '`build-for` sequence should only have one element.' },
        unknownLicense: { id: 'unknownLicense', message: 'License does not match the SPDX format.' },
        expectedPebbleDuration: { id: 'expectedPebbleDuration', message: 'Expected a valid duration string (e.g., `100ms`).' },
        expectedPebbleTCPPortNumber: { id: 'expectedPebbleTCPPortNumber', message: 'Expected a valid TCP port number within the range [0, 65535].' },
        expectedPebbleCheckType: { id: 'expectedPebbleCheckType', message: 'Expected one of `tcp`, `http`, or `exec` check types.' },
        extraPebbleCheckType: { id: 'extraPebbleCheckType', message: 'Expected only one of `tcp`, `http`, or `exec` check types.' },
        missingServiceCommand: { id: 'missingServiceCommand', message: 'The \`command\` key is required because the service is referenced by the `entrypoint-service` value.' },
        expectedServiceCommandOptionalArgs: { id: 'expectedServiceCommandOptionalArgs', message: 'Must have the optional arguments suffix (e.g., \`/usr/bin/somedaemon --db=/db/path [ --port 8080 ]\`) because the service is referenced by the `entrypoint-service` value.' },
        expectedSingleKeyMapForPartBuildEnvironment: { id: 'expectedSingleKeyMapForPartBuildEnvironment', message: 'Expected a single-key map as a `build-environment` element.' },
    },
} satisfies Record<string, Record<string, Problem | ((...args: any[]) => Problem)>>;

export interface YAMLNode {
    kind?: 'map' | 'sequence' | 'pair' | 'scalar';
    range?: Range;
    pairKeyRange?: Range;
    pairValueRange?: Range;
    problems: Problem[];
    /**
     * Raw node returned by the underlying YAML parser/tokenizer library.
     */
    raw?: any;
    /**
     * Raw text content, corresponding to the {@link range `range`} property.
     */
    text: string;
    pairText?: string;
}

type AttachedNode = {
    /**
     * If the field/value was not found, this will be missing/`undefined`.
     */
    node: YAMLNode;
};

export type WithNode<T> = AttachedNode & {
    value?: T;
};

export type SequenceWithNode<T> = AttachedNode & {
    elements?: WithNode<T>[];
};

export type MapWithNode<T> = AttachedNode & {
    entries?: { [key: string]: WithNode<T> };
};

export type RockBase = 'ubuntu@20.04' | 'ubuntu@22.04' | 'ubuntu@24.04' | 'bare';
export const validRockBaseValues: string[] = ['ubuntu@20.04', 'ubuntu@22.04', 'ubuntu@24.04', 'bare'] satisfies RockBase[];

export type RockBuildBase = 'ubuntu@20.04' | 'ubuntu@22.04' | 'ubuntu@24.04';
export const validRockBuildBaseValues: string[] = ['ubuntu@20.04', 'ubuntu@22.04', 'ubuntu@24.04'] satisfies RockBuildBase[];

export type SupportedRockPlatform = 'amd64' | 'arm64' | 'armhf' | 'i386' | 'ppc64el' | 'riscv64' | 's390x';
export const validSupportedRockPlatformValues: string[] = ['amd64', 'arm64', 'armhf', 'i386', 'ppc64el', 'riscv64', 's390x'] satisfies SupportedRockPlatform[];

export interface RockPlatform {
    name: string;
    buildOn?: SequenceWithNode<string>;
    buildFor?: WithNode<string> | SequenceWithNode<string>;
}

export type RockPartPlugin = 'ant' | 'autotools' | 'cmake' | 'dotnet' | 'dump' | 'go' | 'make' | 'maven' | 'meson' | 'nil' | 'npm' | 'python' | 'rust' | 'scons';
export const validRockPartPluginValues: string[] = ['ant', 'autotools', 'cmake', 'dotnet', 'dump', 'go', 'make', 'maven', 'meson', 'nil', 'npm', 'python', 'rust', 'scons'] satisfies RockPartPlugin[];

export type RockPartSourceType = 'deb' | 'file' | 'git' | 'local' | 'rpm' | 'snap' | 'tar' | 'zip';
export const validRockPartSourceTypeValues: string[] = ['deb', 'file', 'git', 'local', 'rpm', 'snap', 'tar', 'zip'] satisfies RockPartSourceType[];

/**
 * See here for more information:
 *   - https://canonical-rockcraft.readthedocs-hosted.com/en/latest/reference/part_properties/#ref-parts
 *  */
export interface RockPart {
    name: string;
    after?: SequenceWithNode<string>;
    buildEnvironment?: SequenceWithNode<MapWithNode<string>>;
    buildPackages?: SequenceWithNode<string>;
    buildSnaps?: SequenceWithNode<string>;
    organize?: MapWithNode<string>;
    overrideBuild?: WithNode<string>;
    overridePrime?: WithNode<string>;
    overridePull?: WithNode<string>;
    overrideStage?: WithNode<string>;
    parseInfo?: WithNode<string>;
    plugin?: WithNode<string>;
    prime?: SequenceWithNode<string>;
    source?: WithNode<string>;
    sourceBranch?: WithNode<string>;
    sourceChecksum?: WithNode<string>;
    sourceCommit?: WithNode<string>;
    sourceDepth?: WithNode<number>;
    sourceSubdir?: WithNode<string>;
    sourceSubmodules?: SequenceWithNode<string>;
    sourceTag?: WithNode<string>;
    sourceType?: WithNode<RockPartSourceType>;
    stage?: SequenceWithNode<string>;
    stagePackages?: SequenceWithNode<string>;
    stageSnaps?: SequenceWithNode<string>;
}

export type PebbleServiceOverride = 'merge' | 'replace';
export const validPebbleServiceOverrideValues: string[] = ['merge', 'replace'] satisfies PebbleServiceOverride[];
export function isPebbleServiceOverride(v: any): v is PebbleServiceOverride {
    return typeof v === 'string' && validPebbleServiceOverrideValues.indexOf(v) !== -1;
}

export type PebbleServiceStartup = 'enabled' | 'disabled';
export const validPebbleServiceStartupValues: string[] = ['enabled', 'disabled'] satisfies PebbleServiceStartup[];
export function isPebbleServiceStartup(v: any): v is PebbleServiceStartup {
    return typeof v === 'string' && validPebbleServiceStartupValues.indexOf(v) !== -1;
}

export type PebbleServiceOnSuccess = 'restart' | 'shutdown' | 'failure-shutdown' | 'ignore';
export const validPebbleServiceOnSuccessValues: string[] = ['restart', 'shutdown', 'failure-shutdown', 'ignore'] satisfies PebbleServiceOnSuccess[];
export function isPebbleServiceOnSuccess(v: any): v is PebbleServiceOnSuccess {
    return typeof v === 'string' && validPebbleServiceOnSuccessValues.indexOf(v) !== -1;
}

export type PebbleServiceOnFailure = 'restart' | 'shutdown' | 'success-shutdown' | 'ignore';
export const validPebbleServiceOnFailureValues: string[] = ['restart', 'shutdown', 'success-shutdown', 'ignore'] satisfies PebbleServiceOnFailure[];
export function isPebbleServiceOnFailure(v: any): v is PebbleServiceOnFailure {
    return typeof v === 'string' && validPebbleServiceOnFailureValues.indexOf(v) !== -1;
}

export type PebbleServiceOnCheckFailure = 'restart' | 'shutdown' | 'success-shutdown' | 'ignore';
export const validPebbleServiceOnCheckFailureValues: string[] = ['restart', 'shutdown', 'success-shutdown', 'ignore'] satisfies PebbleServiceOnCheckFailure[];
export function isPebbleServiceOnCheckFailure(v: any): v is PebbleServiceOnCheckFailure {
    return typeof v === 'string' && validPebbleServiceOnCheckFailureValues.indexOf(v) !== -1;
}

/**
 * See here for more information:
 *   - https://github.com/canonical/pebble#layer-specification
 */
export interface PebbleService {
    name: string;
    override?: WithNode<PebbleServiceOverride>;
    command?: WithNode<string>;
    summary?: WithNode<string>;
    description?: WithNode<string>;
    startup?: WithNode<PebbleServiceStartup>;
    after?: SequenceWithNode<string>;
    before?: SequenceWithNode<string>;
    requires?: SequenceWithNode<string>;
    environment?: MapWithNode<string>;
    user?: WithNode<string>;
    userId?: WithNode<number>;
    group?: WithNode<string>;
    groupId?: WithNode<number>;
    workingDir?: WithNode<string>;
    onSuccess?: WithNode<PebbleServiceOnSuccess>;
    onFailure?: WithNode<PebbleServiceOnFailure>;
    onCheckFailure?: MapWithNode<PebbleServiceOnCheckFailure>;
    backoffDelay?: WithNode<string>;
    backoffFactor?: WithNode<number>;
    backoffLimit?: WithNode<string>;
    killDelay?: WithNode<string>;
}

export interface PebbleCheckHTTP {
    url?: WithNode<string>;
    headers?: MapWithNode<string>;
}


export interface PebbleCheckTCP {
    host?: WithNode<string>;
    port?: WithNode<number>;
}

export interface PebbleCheckExec {
    command?: WithNode<string>;
    serviceContext?: WithNode<string>;
    environment?: MapWithNode<string>;
    user?: WithNode<string>;
    userId?: WithNode<number>;
    group?: WithNode<string>;
    groupId?: WithNode<number>;
    workingDir?: WithNode<string>;
}

export type PebbleCheckOverride = 'merge' | 'replace';
export const validPebbleCheckOverrideValues: string[] = ['merge', 'replace'] satisfies PebbleCheckOverride[];
export function isPebbleCheckOverride(v: any): v is PebbleCheckOverride {
    return typeof v === 'string' && validPebbleCheckOverrideValues.indexOf(v) !== -1;
}

export type PebbleCheckLevel = 'alive' | 'ready';
export const validPebbleCheckLevelValues: string[] = ['alive', 'ready'] satisfies PebbleCheckLevel[];
export function isPebbleCheckLevel(v: any): v is PebbleCheckLevel {
    return typeof v === 'string' && validPebbleCheckLevelValues.indexOf(v) !== -1;
}

/**
 * See here for more information:
 *   - https://github.com/canonical/pebble#layer-specification
 */
export interface PebbleCheck {
    name: string;
    override?: WithNode<PebbleCheckOverride>;
    level?: WithNode<PebbleCheckLevel>;
    period?: WithNode<string>;
    timeout?: WithNode<string>;
    threshold?: WithNode<number>;
    http?: WithNode<PebbleCheckHTTP>;
    tcp?: WithNode<PebbleCheckTCP>;
    exec?: WithNode<PebbleCheckExec>;
}

export type RunUser = 'root' | '_daemon_';
export const validRunUserValues: string[] = ['root', '_daemon_'] satisfies RunUser[];

/**
 * See here for more information:
 *   - https://canonical-rockcraft.readthedocs-hosted.com/en/latest/reference/rockcraft.yaml/
 */
export interface RockcraftConfig {
    name?: WithNode<string>;
    title?: WithNode<string>;
    summary?: WithNode<string>;
    description?: WithNode<string>;
    version?: WithNode<string>;
    base?: WithNode<RockBase>;
    buildBase?: WithNode<RockBuildBase>;
    license?: WithNode<string>;
    runUser?: WithNode<RunUser>;
    environment?: MapWithNode<string>;
    services?: MapWithNode<PebbleService>;
    entrypointService?: WithNode<string>;
    checks?: MapWithNode<PebbleCheck>;
    platforms?: MapWithNode<RockPlatform>;
    parts?: MapWithNode<RockPart>;
    /**
     * Root node.
     */
    node: YAMLNode;
}

export function emptyYAMLNode(): YAMLNode {
    return {
        text: '',
        raw: {},
        problems: [],
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
    };
}

export function emptyRockcraftConfig(): RockcraftConfig {
    return {
        node: emptyYAMLNode(),
    };
}

export class Rock {
    private _rockcraftConfig: RockcraftConfig = emptyRockcraftConfig();

    constructor() { }

    get rockcraftConfig(): RockcraftConfig {
        return this._rockcraftConfig;
    }

    async updateRockcraftConfig(rockcraftConfig: RockcraftConfig) {
        this._rockcraftConfig = rockcraftConfig;
    }
}
