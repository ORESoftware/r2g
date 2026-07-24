'use strict';

const assert = require('assert');
const cp = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  configPath,
  detectEcosystems,
  findProjectRoot,
  normalizeEcosystem,
  resolveEcosystem
} = require('../dist/cli/flags');

// mirrors loadFlags2Env in src/cli/flags.ts
const loadFlags2Env = () => {
  const localRoot = process.env.R2G_FLAGS2ENV_PATH || path.join(os.homedir(), 'codes', 'ores', 'flags-2-env');
  const localClient = path.join(localRoot, 'clients', 'nodejs', 'lib.cjs');
  const localAddon = path.join(localRoot, 'clients', 'nodejs', 'build', 'Release', 'flags2env.node');
  if (fs.existsSync(localClient) && fs.existsSync(localAddon)) {
    if (!process.env.FLAGS2ENV_NODE_ADDON) {
      process.env.FLAGS2ENV_NODE_ADDON = localAddon;
    }
    return require(localClient);
  }
  return require('@oresoftware/f2e');
};

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
