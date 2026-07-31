'use strict';

const assert = require('node:assert/strict');
const cp = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const version = '1.2.3';
const sha256 = 'ab'.repeat(32);
const commit = 'cd'.repeat(20);

const runGenerator = (script, args, outputRoot) => cp.spawnSync(
  process.execPath,
  [path.join(root, 'scripts', 'release', script), ...args],
  {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      R2G_GITHUB_REPOSITORY: 'ORESoftware/r2g',
      R2G_RELEASE_ROOT: outputRoot
    }
  }
);

test('installer metadata targets immutable assets and the main branch', t => {
  const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'r2g-installers-'));
  t.after(() => fs.rmSync(outputRoot, {recursive: true, force: true}));

  const result = runGenerator('generate-installers.mjs', [version, sha256], outputRoot);
  assert.equal(result.status, 0, result.stderr);

  const formula = fs.readFileSync(path.join(outputRoot, 'Formula', 'r2g.rb'), 'utf8');
  const scoop = JSON.parse(
    fs.readFileSync(path.join(outputRoot, 'packaging', 'scoop', 'r2g.json'), 'utf8')
  );
  const nuspec = fs.readFileSync(
    path.join(outputRoot, 'packaging', 'chocolatey', 'r2g.nuspec'),
    'utf8'
  );
  const install = fs.readFileSync(
    path.join(outputRoot, 'packaging', 'chocolatey', 'tools', 'chocolateyinstall.ps1'),
    'utf8'
  );
  const assetUrl = `https://github.com/ORESoftware/r2g/releases/download/v${version}/r2g-${version}.tgz`;

  assert.match(formula, new RegExp(assetUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(formula, new RegExp(sha256));
  assert.equal(scoop.url, assetUrl);
  assert.equal(scoop.hash, sha256);
  assert.match(nuspec, /github\.com\/ORESoftware\/r2g\/blob\/main\/license\.md/);
  assert.match(install, new RegExp(sha256));
  assert.doesNotMatch(`${formula}\n${JSON.stringify(scoop)}\n${nuspec}\n${install}`, /\/dev\//);
});

test('release-set generation is deterministic and binds routes to source identity', t => {
  const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'r2g-release-set-'));
  t.after(() => fs.rmSync(outputRoot, {recursive: true, force: true}));

  const args = [version, sha256, commit];
  const first = runGenerator('generate-release-set.mjs', args, outputRoot);
  assert.equal(first.status, 0, first.stderr);

  const output = path.join(outputRoot, 'release', `r2g-${version}.release-set.json`);
  const firstBytes = fs.readFileSync(output, 'utf8');
  const second = runGenerator('generate-release-set.mjs', args, outputRoot);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(fs.readFileSync(output, 'utf8'), firstBytes);

  const record = JSON.parse(firstBytes);
  assert.equal(record.schemaVersion, 1);
  assert.deepEqual(record.package, {ecosystem: 'npm', name: 'r2g', version});
  assert.equal(record.source.commit, commit);
  assert.equal(record.source.tag, `v${version}`);
  assert.equal(record.artifact.sha256, sha256);
  assert.equal(record.routes.find(route => route.manager === 'npm').publication,
    'trusted-publishing-with-provenance');
  assert.deepEqual(
    record.routes.map(route => route.manager),
    ['npm', 'github', 'homebrew', 'scoop', 'chocolatey', 'shell']
  );
});

test('checked-in public install routes do not depend on the legacy dev branch', () => {
  const files = [
    'docs/distribution.md',
    'scripts/release/generate-installers.mjs',
    'packaging/chocolatey/r2g.nuspec'
  ];
  const contents = files.map(file => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');

  assert.doesNotMatch(contents, /raw\.githubusercontent\.com\/ORESoftware\/r2g\/dev\//);
  assert.doesNotMatch(contents, /github\.com\/ORESoftware\/r2g\/blob\/dev\//);
});
