import {
    Alias,
    Pair,
    ParsedNode,
    Scalar,
    YAMLMap,
    Range as YAMLRange,
    YAMLSeq,
    isMap,
    isScalar,
    isSeq,
    parseDocument
} from 'yaml';
import { Range, TextPositionMapper } from './model/common';
import {
    MapWithNode,
    PebbleCheck,
    PebbleCheckExec,
    PebbleCheckHTTP,
    PebbleCheckTCP,
    PebbleService,
    PebbleServiceOnCheckFailure,
    Problem,
    RockPart,
    RockPlatform,
    RockcraftConfig,
    SequenceWithNode,
    WithNode,
    YAMLNode,
    YAML_PROBLEMS,
    isPebbleServiceOnCheckFailure,
    validSupportedRockPlatformValues,
    validPebbleCheckLevelValues,
    validPebbleCheckOverrideValues,
    validPebbleServiceOnCheckFailureValues,
    validPebbleServiceOnFailureValues,
    validPebbleServiceOnSuccessValues,
    validPebbleServiceOverrideValues,
    validRockBaseValues,
    validRockBuildBaseValues,
    validRockPartPluginValues,
    validRockPartSourceTypeValues,
    validRunUserValues
} from './model/rock';
import { validSPDXLicenses } from './parser.license';

/**
 * A generic YAML parser that returns a tree of objects/arrays of type {@link WithNode<any>}.
 */
export class YAMLParser {
    readonly tpm: TextPositionMapper;
    constructor(readonly text: string) {
        this.tpm = new TextPositionMapper(text);
    }

    /**
     * @returns `undefined` if given content was not a valid YAML.
     */
    parse(): { tree: WithNode<any> | undefined; plain: any } {
        if (!this.text.trim().length) {
            return {
                plain: undefined,
                tree: {
                    value: {},
                    node: {
                        kind: 'map',
                        problems: [],
                        text: this.text,
                        range: this.tpm.all(),
                    },
                },
            };
        }
        const doc = parseDocument(this.text);
        return {
            tree: this._parseValue(doc.contents),
            plain: doc.toJS(),
        };
    }

    private _parseValue(node: Alias.Parsed | Scalar.Parsed | YAMLMap.Parsed<ParsedNode, ParsedNode | null> | YAMLSeq.Parsed<ParsedNode> | null): WithNode<any> | undefined {
        if (isMap(node)) {
            return this._parseMap(node);
        }
        if (isSeq(node)) {
            return this._parseSeq(node);
        }
        if (isScalar(node)) {
            return this._parseScalar(node);
        }
        return undefined;
    }

    private _parseMap(node: YAMLMap<ParsedNode, ParsedNode | null>): WithNode<any> {
        const range = this._nodeRangeToRange(node.range, this.tpm);
        return {
            value: Object.fromEntries(node.items.filter(x => isScalar(x.key)).map(x => [x.key.toString(), this._parsePair(x)])),
            node: {
                kind: 'map',
                range,
                text: this.tpm.getTextOverRange(range),
                raw: node,
                problems: [],
            }
        };
    }

    private _parseSeq(node: YAMLSeq<ParsedNode>): WithNode<any> {
        const range = this._nodeRangeToRange(node.range, this.tpm);
        return {
            value: node.items.map(x => this._parseValue(x)),
            node: {
                kind: 'sequence',
                range,
                text: this.tpm.getTextOverRange(range),
                raw: node,
                problems: [],
            }
        };
    }

    private _parseScalar(node: Scalar.Parsed): WithNode<any> {
        const range = this._nodeRangeToRange(node.range, this.tpm);
        return {
            value: node.value,
            node: {
                kind: 'scalar',
                range,
                text: this.tpm.getTextOverRange(range),
                raw: node,
                problems: [],
            }
        };
    }

    private _parsePair(node: Pair<ParsedNode, ParsedNode | null>): WithNode<any> {
        const range: Range = {
            start: this.tpm.indexToPosition(node.key.range[0]),
            end: node.value ? this.tpm.indexToPosition(node.value.range[2]) : this.tpm.indexToPosition(node.key.range[2]),
        };
        const value = this._parseValue(node.value);

        return {
            value,
            node: {
                kind: 'pair',
                range,
                text: this.tpm.getTextOverRange(range),
                raw: node,
                pairKeyRange: this._nodeRangeToRange(node.key.range, this.tpm),
                pairValueRange: node.value ? this._nodeRangeToRange(node.value.range, this.tpm) : undefined,
                problems: [],
            }
        };
    }

    private _nodeRangeToRange(nodeRange: YAMLRange | null | undefined, tpm: TextPositionMapper): Range {
        if (!nodeRange) {
            return { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } };
        }
        return {
            start: tpm.indexToPosition(nodeRange[0]),
            end: tpm.indexToPosition(nodeRange[2]),
        };
    }
}

type SupportedType = 'string' | 'boolean' | 'number' | 'integer';


function valueNodeFromPairNode(pairNode: YAMLNode, valueNode: YAMLNode): YAMLNode {
    return {
        ...valueNode,
        pairKeyRange: pairNode.pairKeyRange,
        pairValueRange: pairNode.pairValueRange,
        pairText: pairNode.text,
    };
}

/**
 * If there's any problem parsing the field, the returned object's `value` property will be `undefined`.
 * @returns `undefined` if the field was missing.
 */
function assignScalarFromPair<T>(map: WithNode<any>, key: string, t: SupportedType, required?: boolean, parentNodeProblems?: Problem[]): WithNode<T> | undefined {
    if (required && parentNodeProblems === undefined) {
        throw Error('`parentNodeProblems` cannot be `undefined` when `required` is `true`.');
    }
    if (!map.value || !(key in map.value)) {
        if (required) {
            parentNodeProblems!.push(YAML_PROBLEMS.generic.missingKey(key));
        }
        return undefined;
    }

    const pair: WithNode<any> = map.value[key];
    if (pair.node.kind !== 'pair') {
        return undefined;
    }

    const result: WithNode<T> = {
        node: valueNodeFromPairNode(pair.node, pair.value.node)
    };
    const value = pair.value.value;

    if (value !== undefined && (typeof value === t || t === 'integer' && typeof value === 'number' && Number.isInteger(value))) {
        result.value = value;
    } else {
        result.node.problems.push(YAML_PROBLEMS.generic.unexpectedScalarType(t));
    }
    return result;
}

/**
 * If there's any problem parsing the field, the returned object's `value` property will be `undefined`.
 * @returns `undefined` if the field was missing.
 */
function assignAnyFromPair(map: WithNode<any>, key: string, required?: boolean, parentNodeProblems?: Problem[]): WithNode<any> | undefined {
    if (required && parentNodeProblems === undefined) {
        throw Error('`parentNodeProblems` cannot be `undefined` when `required` is `true`.');
    }
    if (!map.value || !(key in map.value)) {
        if (required) {
            parentNodeProblems!.push(YAML_PROBLEMS.generic.missingKey(key));
        }
        return undefined;
    }

    const pair: WithNode<any> = map.value[key];
    if (pair.node.kind !== 'pair') {
        return undefined;
    }

    return {
        node: valueNodeFromPairNode(pair.node, pair.value.node),
        value: pair.value.value,
    };
}

/**
 * If there's any problem parsing the field, the returned object's `value` property will be `undefined`.
 * @returns `undefined` if the field was missing.
 */
function assignStringEnumFromScalarPair<T>(map: WithNode<any>, key: string, enumValues: string[], required?: boolean, parentNodeProblems?: Problem[]): WithNode<T> | undefined {
    const result = assignAnyFromPair(map, key, required, parentNodeProblems);
    if (!result || result.value === undefined || result.node.problems.length) {
        return result;
    }
    if (!enumValues.includes(result.value as string)) {
        result.value = undefined;
        result.node.problems.push(YAML_PROBLEMS.generic.expectedEnumValue(enumValues));
    }
    return result;
}

/**
 * If there's any problem parsing the field, the returned object's `value` property will be `undefined`.
 * @returns `undefined` if the field was missing.
 */
function assignArrayOfScalarsFromPair<T>(map: WithNode<any>, key: string, t: SupportedType, required?: boolean, parentNodeProblems?: Problem[]): SequenceWithNode<T> | undefined {
    const initial = assignAnyFromPair(map, key, required, parentNodeProblems);
    if (!initial) {
        return undefined;
    }
    const result: SequenceWithNode<T> = {
        node: initial.node,
    };
    if (initial.value === undefined || initial.node.problems.length) {
        return result;
    }
    if (initial.node.kind !== 'sequence') {
        result.node.problems.push(YAML_PROBLEMS.generic.expectedSequenceOfScalars(t));
        return result;
    }

    const sequence = initial.value;
    result.elements = [];
    for (const x of sequence as WithNode<any>[]) {
        const entry: WithNode<T> = {
            node: x.node,
        };
        result.elements.push(entry);
        if (x.node.kind === 'scalar' && x.value !== undefined && (typeof x.value === t || t === 'integer' && typeof x.value === 'number' && Number.isInteger(x.value))) {
            entry.value = x.value;
        } else {
            entry.node.problems.push(YAML_PROBLEMS.generic.unexpectedScalarType(t));
        }
    }
    return result;
}

/**
 * If there's any problem parsing the field, the returned object's `value` property will be `undefined`.
 * @returns `undefined` if the field was missing.
 */
function assignArrayOfMapsFromPair<T>(map: WithNode<any>, key: string, required?: boolean, parentNodeProblems?: Problem[]): SequenceWithNode<T> | undefined {
    const initial = assignAnyFromPair(map, key, required, parentNodeProblems);
    if (!initial) {
        return undefined;
    }
    const result: SequenceWithNode<T> = {
        node: initial.node,
    };
    if (initial.value === undefined || initial.node.problems.length) {
        return result;
    }
    if (initial.node.kind !== 'sequence') {
        result.node.problems.push(YAML_PROBLEMS.generic.expectedSequence);
        return result;
    }
    result.elements = (initial.value as WithNode<any>[]).map(x => {
        if (x.node.kind !== 'map') {
            x.node.problems.push(YAML_PROBLEMS.generic.expectedMap);
            x.value = undefined;
        }
        return x;
    });
    return result;
}

/**
 * If there's any problem parsing the field, the returned object's `value` property will be `undefined`.
 * @returns `undefined` if the field was missing.
 */
function assignScalarOrArrayOfScalarsFromPair<T>(map: WithNode<any>, key: string, t: SupportedType, required?: boolean, parentNodeProblems?: Problem[]): SequenceWithNode<T> | WithNode<T> | undefined {
    const initial = assignAnyFromPair(map, key, required, parentNodeProblems);
    if (!initial) {
        return undefined;
    }
    if (initial.value === undefined || initial.node.problems.length) {
        return {
            node: initial.node,
        };
    }

    if (initial.node.kind === 'sequence') {
        return assignArrayOfScalarsFromPair(map, key, t);
    } else if (initial.node.kind === 'scalar') {
        return assignScalarFromPair(map, key, t, required, parentNodeProblems);
    } else {
        initial.node.problems.push(YAML_PROBLEMS.generic.expectedScalarOrSequence(t));
        return {
            node: initial.node,
        };
    }
}

function readMap<T>(map: WithNode<any>, cb: ((value: WithNode<any>, key: string, entry: WithNode<T>) => void)): MapWithNode<T> | undefined {
    const result: MapWithNode<T> = {
        node: map.node,
    };

    if (!map.value || map.node.kind !== 'map') {
        result.node.problems.push(YAML_PROBLEMS.generic.expectedMap);
        return result;
    }

    result.entries = {};
    const m: { [key: string]: WithNode<any> } = map.value;
    for (const [name, pair] of Object.entries(m)) {
        const entry: WithNode<T> = {
            node: pair.node,
        };
        result.entries[name] = entry;
        cb(pair.value, name, entry);
    }
    return result;
}

function readMapOrNull<T>(map: WithNode<any>, cb: ((value: WithNode<any>, key: string, entry: WithNode<T>) => void)): MapWithNode<T> | undefined {
    const result: MapWithNode<T> = {
        node: map.node,
    };

    if (map.node.kind === 'scalar' && map.value === null) {
        return result;
    }

    if (!map.value || map.node.kind !== 'map') {
        result.node.problems.push(YAML_PROBLEMS.generic.expectedMap);
        return result;
    }

    result.entries = {};
    const m: { [key: string]: WithNode<any> } = map.value;
    for (const [name, pair] of Object.entries(m)) {
        const entry: WithNode<T> = {
            node: pair.node,
        };
        result.entries[name] = entry;
        cb(pair.value, name, entry);
    }
    return result;
}

function readMapOfMap<T>(map: WithNode<any>, key: string, cb: ((map: any, key: string, entry: WithNode<T>) => void)): MapWithNode<T> | undefined {
    const initial = assignAnyFromPair(map, key);
    if (!initial || initial.value === undefined) {
        return undefined;
    }
    return readMap<T>(initial, (value, key, entry) => {
        if (value.node.kind !== 'map' || !value.value) {
            entry.node.problems.push(YAML_PROBLEMS.generic.expectedMap);
            return;
        }
        cb(value, key, entry);
    });
}

function readMapOfMapOrNull<T>(map: WithNode<any>, key: string, cb: ((map: any, key: string, entry: WithNode<T>) => void)): MapWithNode<T> | undefined {
    const initial = assignAnyFromPair(map, key);
    if (!initial || initial.value === undefined) {
        return undefined;
    }
    return readMap<T>(initial, (value, key, entry) => {
        const isValid = value.node.kind === 'map' || value.node.kind === 'scalar' && value.value === null;
        if (!isValid) {
            entry.node.problems.push(YAML_PROBLEMS.generic.expectedMap);
            return;
        }
        cb(value, key, entry);
    });
}

export function parseRockcraftYAML(text: string): RockcraftConfig {
    const { tree, plain } = new YAMLParser(text).parse();
    if (!tree) {
        return {
            node: {
                kind: 'map',
                problems: [],
                text,
                range: new TextPositionMapper(text).all(),
            }
        };
    }

    const result: RockcraftConfig = {
        node: tree.node,
    };

    if (tree.node.kind !== 'map') {
        result.node.problems.push(YAML_PROBLEMS.generic.invalidYAML);
        return result;
    }

    result.name = assignScalarFromPair(tree, 'name', 'string', true, result.node.problems);
    result.title = assignScalarFromPair(tree, 'title', 'string');
    result.summary = assignScalarFromPair(tree, 'summary', 'string', true, result.node.problems);
    result.description = assignScalarFromPair(tree, 'description', 'string', true, result.node.problems);
    result.version = assignScalarFromPair(tree, 'version', 'string', true, result.node.problems);
    result.base = assignStringEnumFromScalarPair(tree, 'base', validRockBaseValues, true, result.node.problems);
    result.buildBase = assignStringEnumFromScalarPair(tree, 'build-base', validRockBuildBaseValues);
    result.license = assignScalarFromPair(tree, 'license', 'string', true, result.node.problems);
    result.runUser = assignStringEnumFromScalarPair(tree, 'run-user', validRunUserValues);
    result.environment = _environment(tree, 'environment');
    result.services = _services(tree, 'services');

    result.entrypointService = assignScalarFromPair(tree, 'entrypoint-service', 'string');
    result.checks = _checks(tree, 'checks');

    result.platforms = _platforms(tree, 'platforms', result.node.problems);
    result.parts = _parts(tree, 'parts', result.node.problems);

    const allowedKeys = new Set([
        'name',
        'title',
        'summary',
        'description',
        'version',
        'base',
        'build-base',
        'license',
        'run-user',
        'environment',
        'services',
        'entrypoint-service',
        'checks',
        'platforms',
        'parts',
    ]);

    for (const [k, v] of Object.entries(plain)) {
        if (allowedKeys.has(k)) {
            continue;
        }
        result.node.problems.push(YAML_PROBLEMS.generic.unexpectedKey(k));
    }

    if (result.base?.value === 'bare' && result.buildBase === undefined) {
        result.node.problems.push(YAML_PROBLEMS.rockcraftConfig.expectedBuildBaseForBareBase);
    }

    if (result.license?.value !== undefined && !validSPDXLicenses.has(result.license.value.toLowerCase())) {
        result.license.node.problems.push(YAML_PROBLEMS.rockcraftConfig.unknownLicense);
    }

    if (result.services?.entries) {
        const checkKeys = Object.keys(result.checks?.entries ?? {});
        const checkKeySet = new Set(checkKeys);

        for (const [name, service] of Object.entries(result.services.entries)) {
            if (!service.value) {
                continue;
            }

            const otherServices = Object.keys(result.services.entries).filter(x => x !== name);
            const otherServiceSet = new Set(otherServices);

            if (service.value.after?.elements?.length) {
                for (const e of service.value.after.elements) {
                    if (e.value !== undefined && !otherServiceSet.has(e.value)) {
                        e.node.problems.push(YAML_PROBLEMS.generic.expectedEnumValue(otherServices));
                    }
                }
            }

            if (service.value.before?.elements?.length) {
                for (const e of service.value.before.elements) {
                    if (e.value !== undefined && !otherServiceSet.has(e.value)) {
                        e.node.problems.push(YAML_PROBLEMS.generic.expectedEnumValue(otherServices));
                    }
                }
            }

            if (service.value.requires?.elements?.length) {
                for (const e of service.value.requires.elements) {
                    if (e.value !== undefined && !otherServiceSet.has(e.value)) {
                        e.node.problems.push(YAML_PROBLEMS.generic.expectedEnumValue(otherServices));
                    }
                }
            }

            if (service.value.onCheckFailure?.entries) {
                for (const [k, v] of Object.entries(service.value.onCheckFailure.entries)) {
                    if (!checkKeySet.has(k)) {
                        v.node.problems.push(YAML_PROBLEMS.generic.expectedEnumValue(checkKeys));
                    }
                }
            }

            if (service.value.killDelay?.value !== undefined && !isPebbleDuration(service.value.killDelay?.value)) {
                service.value.killDelay.node.problems.push(YAML_PROBLEMS.rockcraftConfig.expectedPebbleDuration);
            }

            if (service.value.backoffLimit?.value !== undefined && !isPebbleDuration(service.value.backoffLimit?.value)) {
                service.value.backoffLimit.node.problems.push(YAML_PROBLEMS.rockcraftConfig.expectedPebbleDuration);
            }

            if (service.value.backoffDelay?.value !== undefined && !isPebbleDuration(service.value.backoffDelay?.value)) {
                service.value.backoffDelay.node.problems.push(YAML_PROBLEMS.rockcraftConfig.expectedPebbleDuration);
            }
        }
    }

    if (result.entrypointService?.value !== undefined) {
        const serviceKeys = Object.keys(result.services?.entries ?? {});
        const serviceKeySet = new Set(serviceKeys);

        if (!serviceKeySet.has(result.entrypointService.value)) {
            result.entrypointService.node.problems.push(YAML_PROBLEMS.generic.expectedEnumValue(serviceKeys));
        } else {
            const service = result.services?.entries![result.entrypointService.value]!;
            if (service.value) {
                if (service.value.command?.value === undefined) {
                    service.node.problems.push(YAML_PROBLEMS.rockcraftConfig.missingServiceCommand);
                } else if (!service.value.command.value.trim().match(/\[.*?\]$/g)) {
                    /**
                     * The documentation says "The command of the Pebble service
                     * must contain an optional argument that will become the OCI
                     * CMD".
                     * 
                     * (See https://canonical-rockcraft.readthedocs-hosted.com/en/latest/reference/rockcraft.yaml/#entrypoint-service)
                    */
                    service.value.command.node.problems.push(YAML_PROBLEMS.rockcraftConfig.expectedServiceCommandOptionalArgs);
                }
            }
        }
    }

    if (result.checks?.entries) {
        const serviceKeys = Object.keys(result.services?.entries ?? {});
        const serviceKeySet = new Set(serviceKeys);

        for (const [, check] of Object.entries(result.checks.entries)) {
            if (!check.value) {
                continue;
            }

            if (check.value.period?.value !== undefined && !isPebbleDuration(check.value.period?.value)) {
                check.value.period.node.problems.push(YAML_PROBLEMS.rockcraftConfig.expectedPebbleDuration);
            }

            if (check.value.timeout?.value !== undefined && !isPebbleDuration(check.value.timeout?.value)) {
                check.value.timeout.node.problems.push(YAML_PROBLEMS.rockcraftConfig.expectedPebbleDuration);
            }

            const tcpPort = check.value.tcp?.value?.port;
            if (tcpPort?.value !== undefined && (tcpPort.value < 0 || tcpPort.value > 65535)) {
                tcpPort.node.problems.push(YAML_PROBLEMS.rockcraftConfig.expectedPebbleTCPPortNumber);
            }

            const execServiceContext = check.value.exec?.value?.serviceContext;
            if (execServiceContext?.value !== undefined && !serviceKeySet.has(execServiceContext.value)) {
                execServiceContext.node.problems.push(YAML_PROBLEMS.generic.expectedEnumValue(serviceKeys));
            }

            const sum = (check.value.tcp ? 1 : 0)
                + (check.value.http ? 1 : 0)
                + (check.value.exec ? 1 : 0);
            if (sum === 0) {
                check.node.problems.push(YAML_PROBLEMS.rockcraftConfig.expectedPebbleCheckType);
            } else if (sum !== 1) {
                check.node.problems.push(YAML_PROBLEMS.rockcraftConfig.extraPebbleCheckType);
            }
        }
    }

    if (result.platforms?.entries) {
        if (!Object.keys(result.platforms.entries).length) {
            result.platforms.node.problems.push(YAML_PROBLEMS.generic.expectedNonEmptyMap);
        } else {
            for (const [name, entry] of Object.entries(result.platforms.entries)) {
                if (!entry.value) {
                    continue;
                }

                if (entry.value.buildFor?.node.kind === 'sequence') {
                    const elements = (entry.value.buildFor as SequenceWithNode<string>).elements;
                    if (elements?.length !== undefined) {
                        if (elements.length === 0) {
                            entry.value.buildFor.node.problems.push(YAML_PROBLEMS.generic.expectedNonEmptySequence);
                        } else if (elements.length > 1) {
                            entry.value.buildFor.node.problems.push(YAML_PROBLEMS.rockcraftConfig.expectedOnlyOneArchitecture);
                        }
                    }
                }

                const isSupportedPlatform = validSupportedRockPlatformValues.indexOf(name) !== -1;
                if (!isSupportedPlatform) {
                    if (!entry.value.buildFor) {
                        entry.node.problems.push(YAML_PROBLEMS.rockcraftConfig.expectedPlatformBuildForForUnknownPlatform(name));
                    }
                    if (!entry.value.buildOn) {
                        entry.node.problems.push(YAML_PROBLEMS.rockcraftConfig.expectedPlatformBuildOnForUnknownPlatform(name));
                    }
                } else {
                    if (entry.value.buildFor && !entry.value.buildOn) {
                        entry.node.problems.push(YAML_PROBLEMS.rockcraftConfig.expectedPlatformBuildOn);
                    }
                }
            }
        }
    }

    if (result.parts?.entries) {
        if (!Object.keys(result.parts.entries).length) {
            result.parts.node.problems.push(YAML_PROBLEMS.generic.expectedNonEmptyMap);
        } else {
            const partKeys = Object.keys(result.parts?.entries ?? {});
            const partKeySet = new Set(partKeys);

            for (const [name, part] of Object.entries(result.parts.entries)) {
                if (!part.value) {
                    continue;
                }

                const otherParts = Object.keys(result.parts.entries).filter(x => x !== name);
                const otherPartSet = new Set(otherParts);

                if (part.value.after?.elements?.length) {
                    for (const e of part.value.after.elements) {
                        if (e.value !== undefined && !otherPartSet.has(e.value)) {
                            e.node.problems.push(YAML_PROBLEMS.generic.expectedEnumValue(otherParts));
                        }
                    }
                }

                if (part.value.sourceSubmodules?.elements?.length) {
                    const values = part.value.sourceSubmodules?.elements.map(x => typeof x.value === 'string' ? x.value : '');
                    if (!_valuesAreUnique(values)) {
                        part.value.sourceSubmodules.node.problems.push(YAML_PROBLEMS.generic.expectedUniqueScalars);
                    }
                }

                if (part.value.prime?.elements?.length) {
                    const values = part.value.prime?.elements.map(x => typeof x.value === 'string' ? x.value : '');
                    if (!_valuesAreUnique(values)) {
                        part.value.prime.node.problems.push(YAML_PROBLEMS.generic.expectedUniqueScalars);
                    }
                }

                if (part.value.stage?.elements?.length) {
                    const values = part.value.stage?.elements.map(x => typeof x.value === 'string' ? x.value : '');
                    if (!_valuesAreUnique(values)) {
                        part.value.stage.node.problems.push(YAML_PROBLEMS.generic.expectedUniqueScalars);
                    }
                }
            }
        }
    }

    return result;

    function _stringToStringMap(map: WithNode<any>, key: string): MapWithNode<string> | undefined {
        const initial = assignAnyFromPair(map, key);
        if (!initial || initial.value === undefined) {
            return undefined;
        }

        return readMap<string>(initial, (value, key, entry) => {
            const v = value.value;
            if (typeof v !== 'string') {
                entry.node.problems.push(YAML_PROBLEMS.generic.unexpectedScalarType('string'));
                return;
            }
            entry.value = v;
        });
    }

    function _environment(map: WithNode<any>, key: string): MapWithNode<string> | undefined {
        return _stringToStringMap(map, key);
    }

    function _services(map: WithNode<any>, key: string): MapWithNode<PebbleService> | undefined {
        return readMapOfMap<PebbleService>(map, key, (map, key, entry) => {
            entry.value = {
                name: key,
                command: assignScalarFromPair(map, 'command', 'string'),
                summary: assignScalarFromPair(map, 'summary', 'string'),
                description: assignScalarFromPair(map, 'description', 'string'),
                startup: assignScalarFromPair(map, 'startup', 'string'),
                after: assignArrayOfScalarsFromPair(map, 'after', 'string'),
                before: assignArrayOfScalarsFromPair(map, 'before', 'string'),
                requires: assignArrayOfScalarsFromPair(map, 'requires', 'string'),
                environment: _environment(map, 'environment'),
                user: assignScalarFromPair(map, 'user', 'string'),
                userId: assignScalarFromPair(map, 'user-id', 'integer'),
                group: assignScalarFromPair(map, 'group', 'string'),
                groupId: assignScalarFromPair(map, 'group-id', 'integer'),
                workingDir: assignScalarFromPair(map, 'working-dir', 'string'),
                onSuccess: assignStringEnumFromScalarPair(map, 'on-success', validPebbleServiceOnSuccessValues),
                onFailure: assignStringEnumFromScalarPair(map, 'on-failure', validPebbleServiceOnFailureValues),
                onCheckFailure: _servicesOnCheckFailure(map, 'on-check-failure'),
                backoffDelay: assignScalarFromPair(map, 'backoff-delay', 'string'),
                backoffFactor: assignScalarFromPair(map, 'backoff-factor', 'number'),
                backoffLimit: assignScalarFromPair(map, 'backoff-limit', 'string'),
                killDelay: assignScalarFromPair(map, 'kill-delay', 'string'),
            };
            entry.value.override = assignStringEnumFromScalarPair(map, 'override', validPebbleServiceOverrideValues, true, entry.node.problems);
        });
    }

    function _servicesOnCheckFailure(map: WithNode<any>, key: string): MapWithNode<PebbleServiceOnCheckFailure> | undefined {
        const initial = assignAnyFromPair(map, key);
        if (!initial || initial.value === undefined) {
            return undefined;
        }
        return readMap<PebbleServiceOnCheckFailure>(initial, (value, key, entry) => {
            const v = value.value;
            if (typeof v !== 'string') {
                entry.node.problems.push(YAML_PROBLEMS.generic.unexpectedScalarType('string'));
                return;
            }
            if (!isPebbleServiceOnCheckFailure(v)) {
                entry.node.problems.push(YAML_PROBLEMS.generic.expectedEnumValue(validPebbleServiceOnCheckFailureValues));
                return;
            }
            entry.value = v;
        });
    }

    function _checks(map: WithNode<any>, key: string): MapWithNode<PebbleCheck> | undefined {
        return readMapOfMap<PebbleCheck>(map, key, (map, key, entry) => {
            entry.value = {
                name: key,
                level: assignStringEnumFromScalarPair(map, 'level', validPebbleCheckLevelValues),
                period: assignScalarFromPair(map, 'period', 'string'),
                timeout: assignScalarFromPair(map, 'timeout', 'string'),
                threshold: assignScalarFromPair(map, 'threshold', 'integer'),
                http: _checksHttp(map, 'http'),
                tcp: _checksTcp(map, 'tcp'),
                exec: _checksExec(map, 'exec'),
            };
            entry.value.override = assignStringEnumFromScalarPair(map, 'override', validPebbleCheckOverrideValues, true, entry.node.problems);
        });
    }

    function _checksHttp(tree: WithNode<any>, key: string): WithNode<PebbleCheckHTTP> | undefined {
        const initial = assignAnyFromPair(tree, key);
        if (!initial || initial.value === undefined) {
            return undefined;
        }

        const result: WithNode<PebbleCheckHTTP> = {
            node: initial.node,
        };

        if (result.node.kind !== 'map') {
            result.node.problems.push(YAML_PROBLEMS.generic.expectedMap);
            return result;
        }

        result.value = {
            headers: _stringToStringMap(initial, 'headers'),
        };
        result.value.url = assignScalarFromPair(initial, 'url', 'string', true, result.node.problems);
        return result;
    }

    function _checksTcp(tree: WithNode<any>, key: string): WithNode<PebbleCheckTCP> | undefined {
        const initial = assignAnyFromPair(tree, key);
        if (!initial || initial.value === undefined) {
            return undefined;
        }

        const result: WithNode<PebbleCheckTCP> = {
            node: initial.node,
        };

        if (result.node.kind !== 'map') {
            result.node.problems.push(YAML_PROBLEMS.generic.expectedMap);
            return result;
        }

        result.value = {
            host: assignScalarFromPair(initial, 'host', 'string'),
        };
        result.value.port = assignScalarFromPair(initial, 'port', 'integer', true, result.node.problems);
        return result;
    }

    function _checksExec(tree: WithNode<any>, key: string): WithNode<PebbleCheckExec> | undefined {
        const initial = assignAnyFromPair(tree, key);
        if (!initial || initial.value === undefined) {
            return undefined;
        }

        const result: WithNode<PebbleCheckExec> = {
            node: initial.node,
        };

        if (result.node.kind !== 'map') {
            result.node.problems.push(YAML_PROBLEMS.generic.expectedMap);
            return result;
        }

        result.value = {
            serviceContext: assignScalarFromPair(initial, 'service-context', 'string'),
            environment: _stringToStringMap(initial, 'environment'),
            user: assignScalarFromPair(initial, 'user', 'string'),
            userId: assignScalarFromPair(initial, 'user-id', 'integer'),
            group: assignScalarFromPair(initial, 'group', 'string'),
            groupId: assignScalarFromPair(initial, 'group-id', 'integer'),
            workingDir: assignScalarFromPair(initial, 'working-dir', 'string'),
        };
        result.value.command = assignScalarFromPair(initial, 'command', 'string', true, result.node.problems);
        return result;
    }

    function _platforms(map: WithNode<any>, key: string, parentNodeProblems: Problem[]): MapWithNode<RockPlatform> | undefined {
        const initial = assignAnyFromPair(map, key);
        if (!initial || initial.value === undefined) {
            parentNodeProblems.push(YAML_PROBLEMS.generic.missingKey(key));
            return undefined;
        }

        return readMapOfMapOrNull<RockPlatform>(map, key, (map, key, entry) => {
            entry.value = {
                name: key,
                buildOn: assignArrayOfScalarsFromPair(map, 'build-on', 'string'),
                buildFor: assignScalarOrArrayOfScalarsFromPair(map, 'build-for', 'string'),
            };
        });
    }

    function _parts(map: WithNode<any>, key: string, parentNodeProblems: Problem[]): MapWithNode<RockPart> | undefined {
        const initial = assignAnyFromPair(map, key);
        if (!initial || initial.value === undefined) {
            parentNodeProblems.push(YAML_PROBLEMS.generic.missingKey(key));
            return undefined;
        }

        if (initial.node.kind !== 'map') {
            parentNodeProblems.push(YAML_PROBLEMS.generic.expectedMap);
            return undefined;
        }

        return readMapOfMap<RockPart>(map, key, (map, key, entry) => {
            entry.value = {
                name: key,
                after: assignArrayOfScalarsFromPair(map, 'after', 'string'),
                buildPackages: assignArrayOfScalarsFromPair(map, 'build-packages', 'string'),
                buildSnaps: assignArrayOfScalarsFromPair(map, 'build-snaps', 'string'),
                organize: _stringToStringMap(map, 'organize'),
                overrideBuild: assignScalarFromPair(map, 'override-build', 'string'),
                overridePrime: assignScalarFromPair(map, 'override-prime', 'string'),
                overridePull: assignScalarFromPair(map, 'override-pull', 'string'),
                overrideStage: assignScalarFromPair(map, 'override-stage', 'string'),
                parseInfo: assignScalarFromPair(map, 'parse-info', 'string'),
                plugin: assignStringEnumFromScalarPair(map, 'plugin', validRockPartPluginValues),
                prime: assignArrayOfScalarsFromPair(map, 'prime', 'string'),
                source: assignScalarFromPair(map, 'source', 'string'),
                sourceBranch: assignScalarFromPair(map, 'source-branch', 'string'),
                sourceChecksum: assignScalarFromPair(map, 'source-checksum', 'string'),
                sourceCommit: assignScalarFromPair(map, 'source-commit', 'string'),
                sourceDepth: assignScalarFromPair(map, 'source-depth', 'integer'),
                sourceSubdir: assignScalarFromPair(map, 'source-subdir', 'string'),
                sourceSubmodules: assignArrayOfScalarsFromPair(map, 'source-submodules', 'string'),
                sourceTag: assignScalarFromPair(map, 'source-tag', 'string'),
                sourceType: assignStringEnumFromScalarPair(map, 'source-type', validRockPartSourceTypeValues),
                stage: assignArrayOfScalarsFromPair(map, 'stage', 'string'),
                stagePackages: assignArrayOfScalarsFromPair(map, 'stage-packages', 'string'),
                stageSnaps: assignArrayOfScalarsFromPair(map, 'stage-snaps', 'string'),
            };

            entry.value.buildEnvironment = assignArrayOfMapsFromPair(map, 'build-environment');
            const buildEnvironment = entry.value.buildEnvironment;
            if (buildEnvironment?.elements) {
                entry.value.buildEnvironment = {
                    node: buildEnvironment.node,
                    elements: buildEnvironment.elements.map(e => ({
                        node: e.node,
                        value: e.value === undefined ? undefined : ((e: WithNode<any>) => {
                            return readMap<string>(e, (value, key, entry) => {
                                const v = value.value;
                                if (typeof v !== 'string') {
                                    entry.node.problems.push(YAML_PROBLEMS.generic.unexpectedScalarType('string'));
                                    return;
                                }
                                entry.value = v;
                            });
                        })(e),
                    })),
                };

                if (entry.value.buildEnvironment?.elements?.length) {
                    for (const x of entry.value.buildEnvironment.elements) {
                        if (x.value?.entries && Object.keys(x.value.entries).length !== 1) {
                            x.value.node.problems.push(YAML_PROBLEMS.rockcraftConfig.expectedSingleKeyMapForPartBuildEnvironment);
                        }
                    }
                }
            }

            // `after` must be a non-empty array of unique values.
            if (entry.value.after?.elements) {
                if (!entry.value.after.elements.length) {
                    entry.value.after.node.problems.push(YAML_PROBLEMS.generic.expectedNonEmptySequence);
                } else if (!_valuesAreUnique(Object.keys(entry.value.after.elements))) {
                    entry.value.after.node.problems.push(YAML_PROBLEMS.generic.expectedUniqueScalars);
                }
            }

            // `prime` must be a non-empty array of unique values.
            if (entry.value.prime?.elements) {
                if (!entry.value.prime.elements.length) {
                    entry.value.prime.node.problems.push(YAML_PROBLEMS.generic.expectedNonEmptySequence);
                } else if (!_valuesAreUnique(Object.keys(entry.value.prime.elements))) {
                    entry.value.prime.node.problems.push(YAML_PROBLEMS.generic.expectedUniqueScalars);
                }
            }

            // `sourceSubmodules` must be an array of unique items.
            if (entry.value?.sourceSubmodules?.elements && !_valuesAreUnique(Object.keys(entry.value.sourceSubmodules.elements))) {
                entry.value.sourceSubmodules.node.problems.push(YAML_PROBLEMS.generic.expectedUniqueScalars);
            }

            // `stage` must be a non-empty array of unique values.
            if (entry.value.stage?.elements) {
                if (!entry.value.stage.elements.length) {
                    entry.value.stage.node.problems.push(YAML_PROBLEMS.generic.expectedNonEmptySequence);
                } else if (!_valuesAreUnique(Object.keys(entry.value.stage.elements))) {
                    entry.value.stage.node.problems.push(YAML_PROBLEMS.generic.expectedUniqueScalars);
                }
            }
        });
    }

    function _valuesAreUnique(v: string[]) {
        return v.length === new Set(v).size;
    }
}

const PEBBLE_DURATION_PATTERN = /^\d+(?:ms|s|m|h)$/;
export function isPebbleDuration(v: string): boolean {
    return !!v.match(PEBBLE_DURATION_PATTERN);
}
