'use strict';

const assert = require('assert');
const path = require('path');
const {
  detectEcosystems,
  findProjectRoot,
  normalizeEcosystem,
  resolveEcosystem
} = require('../dist/cli/flags');

const fixture = name => path.resolve(__dirname, 'fixtures', name);

assert.deepStrictEqual(detectEcosystems(fixture('rust')), ['rust']);
assert.deepStrictEqual(detectEcosystems(fixture('python')), ['python']);
assert.deepStrictEqual(detectEcosystems(fixture('gleam')), ['gleam']);
assert.deepStrictEqual(detectEcosystems(fixture('go')), ['go']);
assert.strictEqual(normalizeEcosystem('cargo'), 'rust');
assert.strictEqual(normalizeEcosystem('pypi'), 'python');
assert.strictEqual(normalizeEcosystem('golang'), 'go');
assert.strictEqual(findProjectRoot(path.join(fixture('rust'), 'src'), 'auto'), fixture('rust'));
assert.strictEqual(resolveEcosystem(fixture('gleam'), 'auto'), 'gleam');
assert.throws(() => normalizeEcosystem('unknown-manager'), /Unsupported ecosystem/);

console.log('multi-ecosystem detection and CLI contract tests passed');
