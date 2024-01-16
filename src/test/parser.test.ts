import { assert } from "chai";
import { suite, test } from "mocha";
import { Range } from "../model/common";
import { SequenceWithNode, WithNode } from "../model/rock";
import { YAMLParser, isPebbleDuration, parseRockcraftYAML } from "../parser";

function newRange(startLine: number, startCharacter: number, endLine: number, endCharacter: number): Range {
    return {
        start: { line: startLine, character: startCharacter },
        end: { line: endLine, character: endCharacter },
    };
}

function unindent(s: string): string {
    const lines = s.split('\n');
    if (lines[0] !== '') {
        throw new Error('First line should be empty');
    }
    lines.splice(0, 1);

    let indent = 0;
    let index = 0;
    const pattern = /^(\s+)/;
    for (; index < lines.length; index++) {
        const match = lines[index].match(pattern);
        if (match) {
            indent = match[1].length;
            break;
        }
    }
    return lines.map((x, i) => i >= index ? x.substring(indent) : x).join('\n').trimEnd();
}

suite(YAMLParser.name, function () {
    suite(YAMLParser.prototype.parse.name, function () {
        function parse(content: string) {
            return new YAMLParser(content).parse().tree;
        }

        suite('empty', function () {
            type TestCase = {
                name: string;
                content: string;
                expectedRange: Range;
            };
            const tests: TestCase[] = [
                {
                    name: 'empty',
                    content: '',
                    expectedRange: newRange(0, 0, 0, 0),
                }, {
                    name: 'whitespace',
                    content: ' ',
                    expectedRange: newRange(0, 0, 1, 0),
                }, {
                    name: '\\n',
                    content: '\n',
                    expectedRange: newRange(0, 0, 1, 0),
                }, {
                    name: 'mixed whitespace and \\n',
                    content: ' \n  \n ',
                    expectedRange: newRange(0, 0, 3, 0),
                },
            ];

            for (const t of tests) {
                const tt = t;
                test(tt.name, function () {
                    assert.deepInclude(parse(tt.content), {
                        value: {},
                        node: {
                            kind: 'map',
                            problems: [],
                            text: tt.content,
                            range: tt.expectedRange,
                        },
                    });
                });
            }
        });

        test('map', function () {
            const content = unindent(`
                a:
                  aa: 0
                b:
                  bb: 0
                c: 0
            `);

            const root = parse(content)!;

            assert.isDefined(root);
            assert.deepInclude(root.node, {
                kind: 'map',
                problems: [],
                range: newRange(0, 0, 5, 0),
                text: content,
            });
            assert.hasAllKeys(root.value, ['a', 'b', 'c']);

            // a
            assert.deepInclude(root.value['a'].node, {
                kind: 'pair',
                problems: [],
                range: newRange(0, 0, 2, 0),
                text: 'a:\n  aa: 0',
                pairKeyRange: newRange(0, 0, 0, 1),
                pairValueRange: newRange(1, 2, 2, 0),
            });

            assert.deepInclude(root.value['a'].value.node, {
                kind: 'map',
                problems: [],
                range: newRange(1, 2, 2, 0),
                text: 'aa: 0',
            });
            assert.hasAllKeys(root.value['a'].value.value, ['aa']);

            assert.deepInclude(root.value['a'].value.value['aa'].node, {
                kind: 'pair',
                problems: [],
                range: newRange(1, 2, 2, 0),
                text: 'aa: 0',
                pairKeyRange: newRange(1, 2, 1, 4),
                pairValueRange: newRange(1, 6, 2, 0),
            });

            assert.deepInclude(root.value['a'].value.value['aa'].value.node, {
                kind: 'scalar',
                problems: [],
                range: newRange(1, 6, 2, 0),
                text: '0',
            });
            assert.deepStrictEqual(root.value['a'].value.value['aa'].value.value, 0);

            // b
            assert.deepInclude(root.value['b'].node, {
                kind: 'pair',
                problems: [],
                range: newRange(2, 0, 4, 0),
                text: 'b:\n  bb: 0',
                pairKeyRange: newRange(2, 0, 2, 1),
                pairValueRange: newRange(3, 2, 4, 0),
            });

            assert.deepInclude(root.value['b'].value.node, {
                kind: 'map',
                problems: [],
                range: newRange(3, 2, 4, 0),
                text: 'bb: 0',
            });
            assert.hasAllKeys(root.value['b'].value.value, ['bb']);

            assert.deepInclude(root.value['b'].value.value['bb'].node, {
                kind: 'pair',
                problems: [],
                range: newRange(3, 2, 4, 0),
                text: 'bb: 0',
                pairKeyRange: newRange(3, 2, 3, 4),
                pairValueRange: newRange(3, 6, 4, 0),
            });

            assert.deepInclude(root.value['b'].value.value['bb'].value.node, {
                kind: 'scalar',
                problems: [],
                range: newRange(3, 6, 4, 0),
                text: '0',
            });
            assert.deepStrictEqual(root.value['b'].value.value['bb'].value.value, 0);

            // c
            assert.deepInclude(root.value['c'].node, {
                kind: 'pair',
                problems: [],
                range: newRange(4, 0, 5, 0),
                text: 'c: 0',
                pairKeyRange: newRange(4, 0, 4, 1),
                pairValueRange: newRange(4, 3, 5, 0),
            });

            assert.deepInclude(root.value['c'].value.node, {
                kind: 'scalar',
                problems: [],
                range: newRange(4, 3, 5, 0),
                text: '0',
            });
            assert.deepStrictEqual(root.value['c'].value.value, 0);
        });

        test('sequence', function () {
            const content = unindent(`
                - 0
                - 1
            `);

            const root = parse(content)!;

            assert.isDefined(root);
            assert.deepInclude(root.node, {
                kind: 'sequence',
                problems: [],
                range: newRange(0, 0, 2, 0),
                text: content,
            });

            // 0
            assert.deepInclude(root.value[0].node, {
                kind: 'scalar',
                problems: [],
                range: newRange(0, 2, 1, 0),
                text: '0',
            });
            assert.deepStrictEqual(root.value[0].value, 0);

            // 1
            assert.deepInclude(root.value[1].node, {
                kind: 'scalar',
                problems: [],
                range: newRange(1, 2, 2, 0),
                text: '1',
            });
            assert.deepStrictEqual(root.value[1].value, 1);
        });

        test('scalar types', function () {
            const content = unindent(`
                a-null:
                an-empty-string: ""
                a-string: something
                a-number: 999
                a-false: false
                a-true: true
            `);

            const root = parse(content)!;

            assert.isDefined(root);
            assert.deepInclude(root.node, {
                kind: 'map',
                problems: [],
                range: newRange(0, 0, 6, 0),
                text: content,
            });
            assert.hasAllKeys(root.value, ['a-null', 'an-empty-string', 'a-string', 'a-number', 'a-false', 'a-true']);

            // a-null
            assert.deepInclude(root.value['a-null'].node, {
                kind: 'pair',
                problems: [],
                range: newRange(0, 0, 0, 7),
                text: 'a-null:',
                pairKeyRange: newRange(0, 0, 0, 6),
                pairValueRange: newRange(0, 7, 0, 7),
            });
            assert.deepInclude(root.value['a-null'].value.node, {
                kind: 'scalar',
                problems: [],
                range: newRange(0, 7, 0, 7),
                text: '',
            });
            assert.deepStrictEqual(root.value['a-null'].value.value, null);

            // an-empty-string
            assert.deepInclude(root.value['an-empty-string'].node, {
                kind: 'pair',
                problems: [],
                range: newRange(1, 0, 2, 0),
                text: 'an-empty-string: ""',
                pairKeyRange: newRange(1, 0, 1, 15),
                pairValueRange: newRange(1, 17, 2, 0),
            });
            assert.deepInclude(root.value['an-empty-string'].value.node, {
                kind: 'scalar',
                problems: [],
                range: newRange(1, 17, 2, 0),
                text: '""',
            });
            assert.deepStrictEqual(root.value['an-empty-string'].value.value, '');

            // a-string
            assert.deepInclude(root.value['a-string'].node, {
                kind: 'pair',
                problems: [],
                range: newRange(2, 0, 3, 0),
                text: 'a-string: something',
                pairKeyRange: newRange(2, 0, 2, 8),
                pairValueRange: newRange(2, 10, 3, 0),
            });
            assert.deepInclude(root.value['a-string'].value.node, {
                kind: 'scalar',
                problems: [],
                range: newRange(2, 10, 3, 0),
                text: 'something',
            });
            assert.deepStrictEqual(root.value['a-string'].value.value, 'something');

            // a-number
            assert.deepInclude(root.value['a-number'].node, {
                kind: 'pair',
                problems: [],
                range: newRange(3, 0, 4, 0),
                text: 'a-number: 999',
                pairKeyRange: newRange(3, 0, 3, 8),
                pairValueRange: newRange(3, 10, 4, 0),
            });
            assert.deepInclude(root.value['a-number'].value.node, {
                kind: 'scalar',
                problems: [],
                range: newRange(3, 10, 4, 0),
                text: '999',
            });
            assert.deepStrictEqual(root.value['a-number'].value.value, 999);

            // a-false
            assert.deepInclude(root.value['a-false'].node, {
                kind: 'pair',
                problems: [],
                range: newRange(4, 0, 5, 0),
                text: 'a-false: false',
                pairKeyRange: newRange(4, 0, 4, 7),
                pairValueRange: newRange(4, 9, 5, 0),
            });
            assert.deepInclude(root.value['a-false'].value.node, {
                kind: 'scalar',
                problems: [],
                range: newRange(4, 9, 5, 0),
                text: 'false',
            });
            assert.deepStrictEqual(root.value['a-false'].value.value, false);

            // a-true
            assert.deepInclude(root.value['a-true'].node, {
                kind: 'pair',
                problems: [],
                range: newRange(5, 0, 6, 0),
                text: 'a-true: true',
                pairKeyRange: newRange(5, 0, 5, 6),
                pairValueRange: newRange(5, 8, 6, 0),
            });
            assert.deepInclude(root.value['a-true'].value.node, {
                kind: 'scalar',
                problems: [],
                range: newRange(5, 8, 6, 0),
                text: 'true',
            });
            assert.deepStrictEqual(root.value['a-true'].value.value, true);
        });
    });
});

suite(parseRockcraftYAML.name, function () {
    /**
     * Bare minimum content, with required fields assigned.
     */
    const bareMinimum = unindent(`
        name: my-rock
        summary: my-rock-summary
        description: my-rock-description
        version: 1.0.0
        base: ubuntu@22.04
        license: mit
        platforms:
            amd64:
        parts:
            main:
    `);

    test('valid (complete)', function () {
        /**
         * Here:
         * - Values are valid.
         * - All fields (both optional or required) are assigned.
         * - Fields that accept an array of values or a map of key/value pairs, are
         *   assigned with more than one element/pair.
         */
        const content = unindent(`
            name: my-rock
            title: my-rock-title
            summary: my-rock-summary
            description: my-rock-description
            version: 1.0.0
            base: ubuntu@22.04
            build-base: ubuntu@20.04
            license: mit
            run-user: _daemon_
            environment:
                A: VALUE-A
                B: VALUE-B
            services:
                service-a:
                    override: replace
                    command: /usr/bin/somedaemon --db=/db/path [ --port 8080 ]
                    summary: service-a-summary
                    description: service-a-description
                    startup: disabled
                    after: []
                    before:
                        - service-b
                    requires: [] 
                    environment:
                        A: VALUE-A
                        B: VALUE-B 
                    user: some-user
                    user-id: 999
                    group: some-group
                    group-id: 888
                    working-dir: /some/dir
                    on-success: restart
                    on-failure: ignore
                    on-check-failure: 
                        check-http: restart
                        check-tcp: shutdown
                        check-exec: ignore
                    backoff-delay: 100ms
                    backoff-factor: 12
                    backoff-limit: 1m
                    kill-delay: 1h
                service-b:
                    override: merge
                    command: /usr/bin/somedaemon
                    summary: service-b-summary
                    description: service-b-description
                    startup: enabled
                    after:
                        - service-a
                    before: []
                    requires:
                        - service-a
                    environment:
                        A: VALUE-A
                        B: VALUE-B 
                    user: some-user
                    user-id: 999
                    group: some-group
                    group-id: 888
                    working-dir: /some/dir
                    on-success: restart
                    on-failure: ignore
                    on-check-failure: 
                        check-http: restart
                        check-tcp: shutdown
                        check-exec: ignore
                    backoff-delay: 100ms
                    backoff-factor: 12
                    backoff-limit: 1m
                    kill-delay: 1h
            entrypoint-service: service-a
            checks:
                check-http:
                    override: merge
                    level: alive
                    period: 1m
                    timeout: 10s
                    threshold: 99
                    http:
                        url: some.url/path
                        headers:
                            header-a: value-a
                            header-b: value-b
                check-tcp:
                    override: replace
                    level: ready
                    period: 1m
                    timeout: 10s
                    threshold: 99
                    tcp:
                        host: some.host
                        port: 9999
                check-exec:
                    override: merge
                    level: alive
                    period: 1m
                    timeout: 10s
                    threshold: 99
                    exec: 
                        command: some-command --option value
                        service-context: service-a
                        environment:
                            A: VALUE-A
                            B: VALUE-B 
                        user: some-user
                        user-id: 999
                        group: some-group
                        group-id: 888
                        working-dir: /some/dir
            platforms:
                amd64:
                armhf:
                    build-on: 
                        - armhf
                        - arm64
                    build-for:
                        - armhf
                ibm:
                    build-on: 
                        - s390x
                    build-for: s390x
                other:
                    build-on:
                        - amd64
                    build-for:
                        - amd64
            parts:
                part-a:
                    # Shouldn't have 'after' because, as of docs, 'after' cannot be an empty array.
                    # after: []
                    build-environment:
                        - A: VALUE-A
                        - B: VALUE-B
                    build-packages:
                        - pkg-a 
                        - pkg-b
                    build-snaps:
                        - snap-a
                        - snap-b
                    organize:
                        file-a: /path/file-a
                        file-b: /path/file-b
                    override-build: override-build
                    override-prime: override-prime
                    override-pull: override-pull
                    override-stage: override-stage
                    parse-info: something
                    plugin: nil
                    prime:
                        - file-a
                        - file-b
                    source: source-location
                    source-branch: main
                    source-checksum: checksum-#######
                    source-commit: commit-#######
                    source-depth: 99
                    source-subdir: sub/dir
                    source-submodules:
                        - submodule-a
                        - submodule-b
                    source-tag: some-tag
                    source-type: git
                    stage:
                        - file-a
                        - file-b
                    stage-packages:
                        - pkg-a
                        - pkg-b
                    stage-snaps:
                        - snap-a
                        - snap-b
                part-b:
                    after:
                        - part-a
                    build-environment:
                        - A: VALUE-A
                        - B: VALUE-B
                    build-packages:
                        - pkg-a 
                        - pkg-b
                    build-snaps:
                        - snap-a
                        - snap-b
                    organize:
                        file-a: /path/file-a
                        file-b: /path/file-b
                    override-build: override-build
                    override-prime: override-prime
                    override-pull: override-pull
                    override-stage: override-stage
                    parse-info: something
                    plugin: nil
                    prime:
                        - file-a
                        - file-b
                    source: source-location
                    source-branch: main
                    source-checksum: checksum-#######
                    source-commit: commit-#######
                    source-depth: 99
                    source-subdir: sub/dir
                    source-submodules:
                        - submodule-a
                        - submodule-b
                    source-tag: some-tag
                    source-type: git
                    stage:
                        - file-a
                        - file-b
                    stage-packages:
                        - pkg-a
                        - pkg-b
                    stage-snaps:
                        - snap-a
                        - snap-b
        `);

        const parsed = parseRockcraftYAML(content);

        assert.isEmpty(parsed.node.problems, 'expected no file-scope problem');
        assert.strictEqual(parsed.node.text, content);

        assert.strictEqual(parsed.name?.value, 'my-rock');
        assert.strictEqual(parsed.title?.value, 'my-rock-title');
        assert.strictEqual(parsed.summary?.value, 'my-rock-summary');
        assert.strictEqual(parsed.description?.value, 'my-rock-description');
        assert.strictEqual(parsed.version?.value, '1.0.0');
        assert.strictEqual(parsed.base?.value, 'ubuntu@22.04');
        assert.strictEqual(parsed.buildBase?.value, 'ubuntu@20.04');
        assert.strictEqual(parsed.license?.value, 'mit');
        assert.strictEqual(parsed.runUser?.value, '_daemon_');

        assert.strictEqual(parsed.environment?.entries?.['A']?.value, 'VALUE-A');
        assert.strictEqual(parsed.environment?.entries?.['B']?.value, 'VALUE-B');

        assert.strictEqual(parsed.services?.entries?.['service-a']?.value?.override?.value, 'replace');
        assert.strictEqual(parsed.services?.entries?.['service-a']?.value?.command?.value, '/usr/bin/somedaemon --db=/db/path [ --port 8080 ]');
        assert.strictEqual(parsed.services?.entries?.['service-a']?.value?.summary?.value, 'service-a-summary');
        assert.strictEqual(parsed.services?.entries?.['service-a']?.value?.description?.value, 'service-a-description');
        assert.strictEqual(parsed.services?.entries?.['service-a']?.value?.startup?.value, 'disabled');
        assert.strictEqual(parsed.services?.entries?.['service-a']?.value?.after?.elements?.length, 0);
        assert.strictEqual(parsed.services?.entries?.['service-a']?.value?.before?.elements?.length, 1);
        assert.strictEqual(parsed.services?.entries?.['service-a']?.value?.before?.elements?.[0]?.value, 'service-b');
        assert.strictEqual(parsed.services?.entries?.['service-a']?.value?.requires?.elements?.length, 0);
        assert.strictEqual(parsed.services?.entries?.['service-a']?.value?.environment?.entries?.['A']?.value, 'VALUE-A');
        assert.strictEqual(parsed.services?.entries?.['service-a']?.value?.environment?.entries?.['B']?.value, 'VALUE-B');
        assert.strictEqual(parsed.services?.entries?.['service-a']?.value?.user?.value, 'some-user');
        assert.strictEqual(parsed.services?.entries?.['service-a']?.value?.userId?.value, 999);
        assert.strictEqual(parsed.services?.entries?.['service-a']?.value?.group?.value, 'some-group');
        assert.strictEqual(parsed.services?.entries?.['service-a']?.value?.groupId?.value, 888);
        assert.strictEqual(parsed.services?.entries?.['service-a']?.value?.workingDir?.value, '/some/dir');
        assert.strictEqual(parsed.services?.entries?.['service-a']?.value?.onSuccess?.value, 'restart');
        assert.strictEqual(parsed.services?.entries?.['service-a']?.value?.onFailure?.value, 'ignore');
        assert.strictEqual(Object.keys(parsed.services?.entries?.['service-a']?.value?.onCheckFailure?.entries ?? {}).length, 3);
        assert.strictEqual(parsed.services?.entries?.['service-a']?.value?.onCheckFailure?.entries?.['check-http']?.value, 'restart');
        assert.strictEqual(parsed.services?.entries?.['service-a']?.value?.onCheckFailure?.entries?.['check-tcp']?.value, 'shutdown');
        assert.strictEqual(parsed.services?.entries?.['service-a']?.value?.onCheckFailure?.entries?.['check-exec']?.value, 'ignore');
        assert.strictEqual(parsed.services?.entries?.['service-a']?.value?.backoffDelay?.value, '100ms');
        assert.strictEqual(parsed.services?.entries?.['service-a']?.value?.backoffFactor?.value, 12);
        assert.strictEqual(parsed.services?.entries?.['service-a']?.value?.backoffLimit?.value, '1m');
        assert.strictEqual(parsed.services?.entries?.['service-a']?.value?.killDelay?.value, '1h');

        assert.strictEqual(parsed.services?.entries?.['service-b']?.value?.override?.value, 'merge');
        assert.strictEqual(parsed.services?.entries?.['service-b']?.value?.command?.value, '/usr/bin/somedaemon');
        assert.strictEqual(parsed.services?.entries?.['service-b']?.value?.summary?.value, 'service-b-summary');
        assert.strictEqual(parsed.services?.entries?.['service-b']?.value?.description?.value, 'service-b-description');
        assert.strictEqual(parsed.services?.entries?.['service-b']?.value?.startup?.value, 'enabled');
        assert.strictEqual(parsed.services?.entries?.['service-b']?.value?.after?.elements?.length, 1);
        assert.strictEqual(parsed.services?.entries?.['service-b']?.value?.after?.elements?.[0]?.value, 'service-a');
        assert.strictEqual(parsed.services?.entries?.['service-b']?.value?.before?.elements?.length, 0);
        assert.strictEqual(parsed.services?.entries?.['service-b']?.value?.requires?.elements?.length, 1);
        assert.strictEqual(parsed.services?.entries?.['service-b']?.value?.requires?.elements?.[0]?.value, 'service-a');
        assert.strictEqual(parsed.services?.entries?.['service-b']?.value?.environment?.entries?.['A']?.value, 'VALUE-A');
        assert.strictEqual(parsed.services?.entries?.['service-b']?.value?.environment?.entries?.['B']?.value, 'VALUE-B');
        assert.strictEqual(parsed.services?.entries?.['service-b']?.value?.user?.value, 'some-user');
        assert.strictEqual(parsed.services?.entries?.['service-b']?.value?.userId?.value, 999);
        assert.strictEqual(parsed.services?.entries?.['service-b']?.value?.group?.value, 'some-group');
        assert.strictEqual(parsed.services?.entries?.['service-b']?.value?.groupId?.value, 888);
        assert.strictEqual(parsed.services?.entries?.['service-b']?.value?.workingDir?.value, '/some/dir');
        assert.strictEqual(parsed.services?.entries?.['service-b']?.value?.onSuccess?.value, 'restart');
        assert.strictEqual(parsed.services?.entries?.['service-b']?.value?.onFailure?.value, 'ignore');
        assert.strictEqual(Object.keys(parsed.services?.entries?.['service-b']?.value?.onCheckFailure?.entries ?? {}).length, 3);
        assert.strictEqual(parsed.services?.entries?.['service-b']?.value?.onCheckFailure?.entries?.['check-http']?.value, 'restart');
        assert.strictEqual(parsed.services?.entries?.['service-b']?.value?.onCheckFailure?.entries?.['check-tcp']?.value, 'shutdown');
        assert.strictEqual(parsed.services?.entries?.['service-b']?.value?.onCheckFailure?.entries?.['check-exec']?.value, 'ignore');
        assert.strictEqual(parsed.services?.entries?.['service-b']?.value?.backoffDelay?.value, '100ms');
        assert.strictEqual(parsed.services?.entries?.['service-b']?.value?.backoffFactor?.value, 12);
        assert.strictEqual(parsed.services?.entries?.['service-b']?.value?.backoffLimit?.value, '1m');
        assert.strictEqual(parsed.services?.entries?.['service-b']?.value?.killDelay?.value, '1h');

        assert.strictEqual(parsed.entrypointService?.value, 'service-a');

        assert.strictEqual(Object.keys(parsed.checks?.entries ?? {}).length, 3);

        assert.strictEqual(parsed.checks?.entries?.['check-http']?.value?.override?.value, 'merge');
        assert.strictEqual(parsed.checks?.entries?.['check-http']?.value?.level?.value, 'alive');
        assert.strictEqual(parsed.checks?.entries?.['check-http']?.value?.period?.value, '1m');
        assert.strictEqual(parsed.checks?.entries?.['check-http']?.value?.timeout?.value, '10s');
        assert.strictEqual(parsed.checks?.entries?.['check-http']?.value?.threshold?.value, 99);
        assert.strictEqual(parsed.checks?.entries?.['check-http']?.value?.http?.value?.url?.value, 'some.url/path');
        assert.strictEqual(Object.keys(parsed.checks?.entries?.['check-http']?.value?.http?.value?.headers?.entries ?? {}).length, 2);
        assert.strictEqual(parsed.checks?.entries?.['check-http']?.value?.http?.value?.headers?.entries?.['header-a']?.value, 'value-a');
        assert.strictEqual(parsed.checks?.entries?.['check-http']?.value?.http?.value?.headers?.entries?.['header-b']?.value, 'value-b');

        assert.strictEqual(parsed.checks?.entries?.['check-tcp']?.value?.override?.value, 'replace');
        assert.strictEqual(parsed.checks?.entries?.['check-tcp']?.value?.level?.value, 'ready');
        assert.strictEqual(parsed.checks?.entries?.['check-tcp']?.value?.period?.value, '1m');
        assert.strictEqual(parsed.checks?.entries?.['check-tcp']?.value?.timeout?.value, '10s');
        assert.strictEqual(parsed.checks?.entries?.['check-tcp']?.value?.threshold?.value, 99);
        assert.strictEqual(parsed.checks?.entries?.['check-tcp']?.value?.tcp?.value?.host?.value, 'some.host');
        assert.strictEqual(parsed.checks?.entries?.['check-tcp']?.value?.tcp?.value?.port?.value, 9999);

        assert.strictEqual(parsed.checks?.entries?.['check-exec']?.value?.override?.value, 'merge');
        assert.strictEqual(parsed.checks?.entries?.['check-exec']?.value?.level?.value, 'alive');
        assert.strictEqual(parsed.checks?.entries?.['check-exec']?.value?.period?.value, '1m');
        assert.strictEqual(parsed.checks?.entries?.['check-exec']?.value?.timeout?.value, '10s');
        assert.strictEqual(parsed.checks?.entries?.['check-exec']?.value?.threshold?.value, 99);
        assert.strictEqual(parsed.checks?.entries?.['check-exec']?.value?.exec?.value?.command?.value, 'some-command --option value');
        assert.strictEqual(parsed.checks?.entries?.['check-exec']?.value?.exec?.value?.serviceContext?.value, 'service-a');
        assert.strictEqual(Object.keys(parsed.checks?.entries?.['check-exec']?.value?.exec?.value?.environment?.entries ?? {}).length, 2);
        assert.strictEqual(parsed.checks?.entries?.['check-exec']?.value?.exec?.value?.environment?.entries?.['A']?.value, 'VALUE-A');
        assert.strictEqual(parsed.checks?.entries?.['check-exec']?.value?.exec?.value?.environment?.entries?.['B']?.value, 'VALUE-B');
        assert.strictEqual(parsed.checks?.entries?.['check-exec']?.value?.exec?.value?.user?.value, 'some-user');
        assert.strictEqual(parsed.checks?.entries?.['check-exec']?.value?.exec?.value?.userId?.value, 999);
        assert.strictEqual(parsed.checks?.entries?.['check-exec']?.value?.exec?.value?.group?.value, 'some-group');
        assert.strictEqual(parsed.checks?.entries?.['check-exec']?.value?.exec?.value?.groupId?.value, 888);
        assert.strictEqual(parsed.checks?.entries?.['check-exec']?.value?.exec?.value?.workingDir?.value, '/some/dir');

        assert.strictEqual(Object.keys(parsed.platforms?.entries ?? {}).length, 4);

        assert.strictEqual(parsed.platforms?.entries?.['amd64']?.value?.buildOn, undefined);
        assert.strictEqual(parsed.platforms?.entries?.['amd64']?.value?.buildFor, undefined);

        assert.strictEqual(parsed.platforms?.entries?.['armhf']?.value?.buildOn?.elements?.length, 2);
        assert.strictEqual(parsed.platforms?.entries?.['armhf']?.value?.buildOn?.elements?.[0].value, 'armhf');
        assert.strictEqual(parsed.platforms?.entries?.['armhf']?.value?.buildOn?.elements?.[1].value, 'arm64');
        assert.strictEqual((parsed.platforms?.entries?.['armhf']?.value?.buildFor as SequenceWithNode<string>)?.elements?.length, 1);
        assert.strictEqual((parsed.platforms?.entries?.['armhf']?.value?.buildFor as SequenceWithNode<string>)?.elements?.[0].value, 'armhf');

        assert.strictEqual(parsed.platforms?.entries?.['ibm']?.value?.buildOn?.elements?.length, 1);
        assert.strictEqual(parsed.platforms?.entries?.['ibm']?.value?.buildOn?.elements?.[0].value, 's390x');
        assert.strictEqual((parsed.platforms?.entries?.['ibm']?.value?.buildFor as WithNode<string>)?.value, 's390x');

        assert.strictEqual(parsed.platforms?.entries?.['other']?.value?.buildOn?.elements?.length, 1);
        assert.strictEqual(parsed.platforms?.entries?.['other']?.value?.buildOn?.elements?.[0].value, 'amd64');
        assert.strictEqual((parsed.platforms?.entries?.['other']?.value?.buildFor as SequenceWithNode<string>)?.elements?.length, 1);
        assert.strictEqual((parsed.platforms?.entries?.['other']?.value?.buildFor as SequenceWithNode<string>)?.elements?.[0].value, 'amd64');

        assert.strictEqual(Object.keys(parsed.parts?.entries ?? {}).length, 2);

        assert.isUndefined(parsed.parts!.entries!['part-a']!.value!.after);
        assert.strictEqual(parsed.parts?.entries?.['part-a']?.value?.buildEnvironment?.elements?.length, 2);
        assert.strictEqual(Object.keys(parsed.parts?.entries?.['part-a']?.value?.buildEnvironment?.elements?.[0]?.value?.entries ?? {}).length, 1);
        assert.strictEqual(parsed.parts?.entries?.['part-a']?.value?.buildEnvironment?.elements?.[0]?.value?.entries?.['A'].value, 'VALUE-A');
        assert.strictEqual(Object.keys(parsed.parts?.entries?.['part-a']?.value?.buildEnvironment?.elements?.[1]?.value?.entries ?? {}).length, 1);
        assert.strictEqual(parsed.parts?.entries?.['part-a']?.value?.buildEnvironment?.elements?.[1]?.value?.entries?.['B'].value, 'VALUE-B');
        assert.strictEqual(parsed.parts?.entries?.['part-a']?.value?.buildPackages?.elements?.length, 2);
        assert.strictEqual(parsed.parts?.entries?.['part-a']?.value?.buildPackages?.elements?.[0]?.value, 'pkg-a');
        assert.strictEqual(parsed.parts?.entries?.['part-a']?.value?.buildPackages?.elements?.[1]?.value, 'pkg-b');
        assert.strictEqual(parsed.parts?.entries?.['part-a']?.value?.buildSnaps?.elements?.length, 2);
        assert.strictEqual(parsed.parts?.entries?.['part-a']?.value?.buildSnaps?.elements?.[0]?.value, 'snap-a');
        assert.strictEqual(parsed.parts?.entries?.['part-a']?.value?.buildSnaps?.elements?.[1]?.value, 'snap-b');
        assert.strictEqual(Object.keys(parsed.parts?.entries?.['part-a']?.value?.organize?.entries ?? {}).length, 2);
        assert.strictEqual(parsed.parts?.entries?.['part-a']?.value?.organize?.entries?.['file-a']?.value, '/path/file-a');
        assert.strictEqual(parsed.parts?.entries?.['part-a']?.value?.organize?.entries?.['file-b']?.value, '/path/file-b');
        assert.strictEqual(parsed.parts?.entries?.['part-a']?.value?.overrideBuild?.value, 'override-build');
        assert.strictEqual(parsed.parts?.entries?.['part-a']?.value?.overridePrime?.value, 'override-prime');
        assert.strictEqual(parsed.parts?.entries?.['part-a']?.value?.overridePull?.value, 'override-pull');
        assert.strictEqual(parsed.parts?.entries?.['part-a']?.value?.overrideStage?.value, 'override-stage');
        assert.strictEqual(parsed.parts?.entries?.['part-a']?.value?.parseInfo?.value, 'something');
        assert.strictEqual(parsed.parts?.entries?.['part-a']?.value?.plugin?.value, 'nil');
        assert.strictEqual(parsed.parts?.entries?.['part-a']?.value?.prime?.elements?.length, 2);
        assert.strictEqual(parsed.parts?.entries?.['part-a']?.value?.prime?.elements?.[0]?.value, 'file-a');
        assert.strictEqual(parsed.parts?.entries?.['part-a']?.value?.prime?.elements?.[1]?.value, 'file-b');
        assert.strictEqual(parsed.parts?.entries?.['part-a']?.value?.source?.value, 'source-location');
        assert.strictEqual(parsed.parts?.entries?.['part-a']?.value?.sourceBranch?.value, 'main');
        assert.strictEqual(parsed.parts?.entries?.['part-a']?.value?.sourceChecksum?.value, 'checksum-#######');
        assert.strictEqual(parsed.parts?.entries?.['part-a']?.value?.sourceCommit?.value, 'commit-#######');
        assert.strictEqual(parsed.parts?.entries?.['part-a']?.value?.sourceDepth?.value, 99);
        assert.strictEqual(parsed.parts?.entries?.['part-a']?.value?.sourceSubdir?.value, 'sub/dir');
        assert.strictEqual(parsed.parts?.entries?.['part-a']?.value?.sourceSubmodules?.elements?.length, 2);
        assert.strictEqual(parsed.parts?.entries?.['part-a']?.value?.sourceSubmodules?.elements?.[0]?.value, 'submodule-a');
        assert.strictEqual(parsed.parts?.entries?.['part-a']?.value?.sourceSubmodules?.elements?.[1]?.value, 'submodule-b');
        assert.strictEqual(parsed.parts?.entries?.['part-a']?.value?.sourceTag?.value, 'some-tag');
        assert.strictEqual(parsed.parts?.entries?.['part-a']?.value?.sourceType?.value, 'git');
        assert.strictEqual(parsed.parts?.entries?.['part-a']?.value?.stage?.elements?.length, 2);
        assert.strictEqual(parsed.parts?.entries?.['part-a']?.value?.stage?.elements?.[0]?.value, 'file-a');
        assert.strictEqual(parsed.parts?.entries?.['part-a']?.value?.stage?.elements?.[1]?.value, 'file-b');
        assert.strictEqual(parsed.parts?.entries?.['part-a']?.value?.stagePackages?.elements?.length, 2);
        assert.strictEqual(parsed.parts?.entries?.['part-a']?.value?.stagePackages?.elements?.[0]?.value, 'pkg-a');
        assert.strictEqual(parsed.parts?.entries?.['part-a']?.value?.stagePackages?.elements?.[1]?.value, 'pkg-b');
        assert.strictEqual(parsed.parts?.entries?.['part-a']?.value?.stageSnaps?.elements?.length, 2);
        assert.strictEqual(parsed.parts?.entries?.['part-a']?.value?.stageSnaps?.elements?.[0]?.value, 'snap-a');
        assert.strictEqual(parsed.parts?.entries?.['part-a']?.value?.stageSnaps?.elements?.[1]?.value, 'snap-b');

        assert.strictEqual(parsed.parts?.entries?.['part-b']?.value?.after?.elements?.length, 1);
        assert.strictEqual(parsed.parts?.entries?.['part-b']?.value?.after?.elements?.[0]?.value, 'part-a');
        assert.strictEqual(parsed.parts?.entries?.['part-b']?.value?.buildEnvironment?.elements?.length, 2);
        assert.strictEqual(Object.keys(parsed.parts?.entries?.['part-b']?.value?.buildEnvironment?.elements?.[0]?.value?.entries ?? {}).length, 1);
        assert.strictEqual(parsed.parts?.entries?.['part-b']?.value?.buildEnvironment?.elements?.[0]?.value?.entries?.['A'].value, 'VALUE-A');
        assert.strictEqual(Object.keys(parsed.parts?.entries?.['part-b']?.value?.buildEnvironment?.elements?.[1]?.value?.entries ?? {}).length, 1);
        assert.strictEqual(parsed.parts?.entries?.['part-b']?.value?.buildEnvironment?.elements?.[1]?.value?.entries?.['B'].value, 'VALUE-B');
        assert.strictEqual(parsed.parts?.entries?.['part-b']?.value?.buildPackages?.elements?.length, 2);
        assert.strictEqual(parsed.parts?.entries?.['part-b']?.value?.buildPackages?.elements?.[0]?.value, 'pkg-a');
        assert.strictEqual(parsed.parts?.entries?.['part-b']?.value?.buildPackages?.elements?.[1]?.value, 'pkg-b');
        assert.strictEqual(parsed.parts?.entries?.['part-b']?.value?.buildSnaps?.elements?.length, 2);
        assert.strictEqual(parsed.parts?.entries?.['part-b']?.value?.buildSnaps?.elements?.[0]?.value, 'snap-a');
        assert.strictEqual(parsed.parts?.entries?.['part-b']?.value?.buildSnaps?.elements?.[1]?.value, 'snap-b');
        assert.strictEqual(Object.keys(parsed.parts?.entries?.['part-b']?.value?.organize?.entries ?? {}).length, 2);
        assert.strictEqual(parsed.parts?.entries?.['part-b']?.value?.organize?.entries?.['file-a']?.value, '/path/file-a');
        assert.strictEqual(parsed.parts?.entries?.['part-b']?.value?.organize?.entries?.['file-b']?.value, '/path/file-b');
        assert.strictEqual(parsed.parts?.entries?.['part-b']?.value?.overrideBuild?.value, 'override-build');
        assert.strictEqual(parsed.parts?.entries?.['part-b']?.value?.overridePrime?.value, 'override-prime');
        assert.strictEqual(parsed.parts?.entries?.['part-b']?.value?.overridePull?.value, 'override-pull');
        assert.strictEqual(parsed.parts?.entries?.['part-b']?.value?.overrideStage?.value, 'override-stage');
        assert.strictEqual(parsed.parts?.entries?.['part-b']?.value?.parseInfo?.value, 'something');
        assert.strictEqual(parsed.parts?.entries?.['part-b']?.value?.plugin?.value, 'nil');
        assert.strictEqual(parsed.parts?.entries?.['part-b']?.value?.prime?.elements?.length, 2);
        assert.strictEqual(parsed.parts?.entries?.['part-b']?.value?.prime?.elements?.[0]?.value, 'file-a');
        assert.strictEqual(parsed.parts?.entries?.['part-b']?.value?.prime?.elements?.[1]?.value, 'file-b');
        assert.strictEqual(parsed.parts?.entries?.['part-b']?.value?.source?.value, 'source-location');
        assert.strictEqual(parsed.parts?.entries?.['part-b']?.value?.sourceBranch?.value, 'main');
        assert.strictEqual(parsed.parts?.entries?.['part-b']?.value?.sourceChecksum?.value, 'checksum-#######');
        assert.strictEqual(parsed.parts?.entries?.['part-b']?.value?.sourceCommit?.value, 'commit-#######');
        assert.strictEqual(parsed.parts?.entries?.['part-b']?.value?.sourceDepth?.value, 99);
        assert.strictEqual(parsed.parts?.entries?.['part-b']?.value?.sourceSubdir?.value, 'sub/dir');
        assert.strictEqual(parsed.parts?.entries?.['part-b']?.value?.sourceSubmodules?.elements?.length, 2);
        assert.strictEqual(parsed.parts?.entries?.['part-b']?.value?.sourceSubmodules?.elements?.[0]?.value, 'submodule-a');
        assert.strictEqual(parsed.parts?.entries?.['part-b']?.value?.sourceSubmodules?.elements?.[1]?.value, 'submodule-b');
        assert.strictEqual(parsed.parts?.entries?.['part-b']?.value?.sourceTag?.value, 'some-tag');
        assert.strictEqual(parsed.parts?.entries?.['part-b']?.value?.sourceType?.value, 'git');
        assert.strictEqual(parsed.parts?.entries?.['part-b']?.value?.stage?.elements?.length, 2);
        assert.strictEqual(parsed.parts?.entries?.['part-b']?.value?.stage?.elements?.[0]?.value, 'file-a');
        assert.strictEqual(parsed.parts?.entries?.['part-b']?.value?.stage?.elements?.[1]?.value, 'file-b');
        assert.strictEqual(parsed.parts?.entries?.['part-b']?.value?.stagePackages?.elements?.length, 2);
        assert.strictEqual(parsed.parts?.entries?.['part-b']?.value?.stagePackages?.elements?.[0]?.value, 'pkg-a');
        assert.strictEqual(parsed.parts?.entries?.['part-b']?.value?.stagePackages?.elements?.[1]?.value, 'pkg-b');
        assert.strictEqual(parsed.parts?.entries?.['part-b']?.value?.stageSnaps?.elements?.length, 2);
        assert.strictEqual(parsed.parts?.entries?.['part-b']?.value?.stageSnaps?.elements?.[0]?.value, 'snap-a');
        assert.strictEqual(parsed.parts?.entries?.['part-b']?.value?.stageSnaps?.elements?.[1]?.value, 'snap-b');
    });

    test('missing required fields', function () {
        const content = unindent(`
            z-custom-field: something
        `);

        const metadata = parseRockcraftYAML(content);

        assert.isUndefined(metadata.name);
        assert.isUndefined(metadata.summary);
        assert.isUndefined(metadata.description);
        assert.isUndefined(metadata.version);
        assert.isUndefined(metadata.base);
        assert.isUndefined(metadata.license);
        assert.isUndefined(metadata.platforms);
        assert.isUndefined(metadata.parts);

        assert.includeDeepMembers(metadata.node.problems, [
            {
                id: 'missingKey',
                key: 'name',
                message: 'Missing `name` key.',
            },
            {
                id: 'missingKey',
                key: 'summary',
                message: 'Missing `summary` key.',
            },
            {
                id: 'missingKey',
                key: 'description',
                message: 'Missing `description` key.',
            },
            {
                id: 'missingKey',
                key: 'version',
                message: 'Missing `version` key.',
            },
            {
                id: 'missingKey',
                key: 'base',
                message: 'Missing `base` key.',
            },
            {
                id: 'missingKey',
                key: 'license',
                message: 'Missing `license` key.',
            },
            {
                id: 'missingKey',
                key: 'platforms',
                message: 'Missing `platforms` key.',
            },
            {
                id: 'missingKey',
                key: 'parts',
                message: 'Missing `parts` key.',
            },
        ]);
    });

    // TODO add tests for 'parts' errors.
    // TODO add tests for 'build-base' required if `build` is missing.
    // TODO add tests for 'license' match SPDX names.
    // TODO add tests for 'services' errors.
    // TODO add tests for 'entrypoint-service' errors.
    // TODO add tests for 'checks' errors.
    // TODO add tests for 'platforms' errors.
});

suite(isPebbleDuration.name, function () {
    test('valid', function () {
        const tests = [
            '999s',
            '999ms',
            '999m',
            '999h',
        ];

        for (const t of tests) {
            assert.isTrue(isPebbleDuration(t));
        }
    });

    test('invalid', function () {
        const tests = [
            '',
            ' ',
            '\t',
            '1',
            '1S',
            '1MS',
            '1M',
            '1H',
            's',
            'ms',
            'm',
            'h',
        ];

        for (const t of tests) {
            assert.isFalse(isPebbleDuration(t));
        }
    });
});