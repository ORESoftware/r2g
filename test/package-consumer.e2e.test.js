'use strict';

const assert = require('node:assert/strict');
const cp = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {after, test} = require('node:test');

const root = path.resolve(__dirname, '..');
const packageJson = require('../package.json');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'r2g-package-e2e-'));
const artifactDir = path.join(tempRoot, 'artifacts');
const consumerDir = path.join(tempRoot, 'consumer');
fs.mkdirSync(artifactDir, {recursive: true});
fs.mkdirSync(consumerDir, {recursive: true});

after(() => fs.rmSync(tempRoot, {recursive: true, force: true}));

let packed;
const getPackedArtifact = () => {
  if (packed) {
    return packed;
  }

  const result = cp.spawnSync(
    'npm',
    ['pack', '--json', '--ignore-scripts', '--pack-destination', artifactDir],
    {
      cwd: root,
      encoding: 'utf8',
      env: {...process.env, npm_config_audit: 'false', npm_config_fund: 'false'},
    },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const records = JSON.parse(result.stdout);
  assert.equal(records.length, 1, result.stdout);
  packed = {
    metadata: records[0],
    tarball: path.join(artifactDir, records[0].filename),
  };
  assert.ok(fs.statSync(packed.tarball).isFile());
  return packed;
};

let installedConsumer;
const getInstalledConsumer = () => {
  if (installedConsumer) {
    return installedConsumer;
  }

  const {tarball} = getPackedArtifact();
  fs.writeFileSync(
    path.join(consumerDir, 'package.json'),
    JSON.stringify({name: 'r2g-downstream-e2e', version: '1.0.0', private: true}),
  );
  const install = cp.spawnSync(
    'npm',
    [
      'install',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--package-lock=false',
      tarball,
    ],
    {cwd: consumerDir, encoding: 'utf8'},
  );
  assert.equal(install.status, 0, install.stderr || install.stdout);

  const executable = path.join(
    consumerDir,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'r2g.cmd' : 'r2g',
  );
  assert.ok(fs.existsSync(executable), `missing installed executable: ${executable}`);
  installedConsumer = {executable};
  return installedConsumer;
};

test('packed artifact contains the release CLI and excludes local-only state', () => {
  const {metadata} = getPackedArtifact();
  const files = new Set(metadata.files.map(file => file.path));

  for (const required of [
    'cli/r2g.js',
    'dist/commands/basic/index.js',
    'dist/index.js',
    'package.json',
    'readme.md',
  ]) {
    assert.ok(files.has(required), `packed artifact is missing ${required}`);
  }

  for (const file of files) {
    assert.doesNotMatch(file, /(^|\/)(?:\.env(?:\.|$)|node_modules|output\.log)(?:\/|$)/);
    assert.doesNotMatch(file, /\.r2g\/temp(?:\/|$)/);
  }
  assert.match(metadata.integrity, /^sha512-/);
  assert.match(metadata.shasum, /^[0-9a-f]{40}$/);
  assert.ok(metadata.size > 0);
});

test('a scratch downstream consumer runs the installed r2g bin and reads its version', () => {
  const {executable} = getInstalledConsumer();
  const result = cp.spawnSync(executable, ['--version', '--json'], {
    cwd: consumerDir,
    encoding: 'utf8',
    env: {...process.env, FORCE_COLOR: '0'},
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.deepEqual(JSON.parse(result.stdout), {
    versions: {r2g: packageJson.version},
  });
});

test('the installed CLI refuses recursive self-launch before command dispatch', () => {
  const {executable} = getInstalledConsumer();
  const result = cp.spawnSync(executable, ['--version'], {
    cwd: consumerDir,
    encoding: 'utf8',
    env: {...process.env, r2g_is_running: 'yes', FORCE_COLOR: '0'},
  });

  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /refused to launch itself recursively/i);
});
