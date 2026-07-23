'use strict';

const test = require('node:test');
const assert = require('node:assert');

const {
  buildContainerizedArgs,
  buildPhaseCArgs,
  getForwardedRunFlags,
  isLocalPkgPath,
  defaultImage,
  defaultContainerCmd,
  containerProjectMount,
  containerPkgMount,
  containerPkgTarballMount,
  containerHome
} = require('../dist/commands/run/containerized');

const scriptOf = args => args[args.length - 1];

test('buildContainerizedArgs: read-only mount, --rm, and container HOME are present', () => {
  const args = buildContainerizedArgs('/home/me/proj', {});
  assert.strictEqual(args[0], 'run');
  assert.ok(args.includes('--rm'), 'docker args must include --rm');
  const vIdx = args.indexOf('-v');
  assert.ok(vIdx > -1, 'docker args must include a -v mount');
  assert.strictEqual(args[vIdx + 1], `/home/me/proj:${containerProjectMount}:ro`);
  const eIdx = args.indexOf('-e');
  assert.strictEqual(args[eIdx + 1], `HOME=${containerHome}`);
});

test('buildContainerizedArgs: image defaults to node:22 and can be overridden', () => {
  assert.ok(buildContainerizedArgs('/p', {}).includes(defaultImage));
  assert.strictEqual(defaultImage, 'node:22');
  const args = buildContainerizedArgs('/p', {image: 'node:20-alpine'});
  assert.ok(args.includes('node:20-alpine'));
  assert.ok(!args.includes(defaultImage));
});

test('buildContainerizedArgs: copies the read-only mount to a writable dir, installs r2g, runs r2g run', () => {
  const script = scriptOf(buildContainerizedArgs('/p', {}));
  assert.match(script, new RegExp(`cp -r ${containerProjectMount}/\\. "\\$HOME/project"`));
  assert.match(script, /npm install -g --loglevel=warn 'r2g'/);
  assert.match(script, /r2g run/);
});

test('buildContainerizedArgs: r2g package source can be overridden via R2G_CONTAINER_PKG', () => {
  process.env.R2G_CONTAINER_PKG = 'r2g@0.2.0';
  try {
    const script = scriptOf(buildContainerizedArgs('/p', {}));
    assert.match(script, /npm install -g --loglevel=warn 'r2g@0\.2\.0'/);
  }
  finally {
    delete process.env.R2G_CONTAINER_PKG;
  }
});

test('buildContainerizedArgs: forwards phase-skip flags to r2g run inside the container', () => {
  const script = scriptOf(buildContainerizedArgs('/p', {z: true, t: true, ignore_dirty_git_index: true}));
  assert.match(script, /r2g run -z -t --ignore-dirty-git-index -c/);
  const noSkips = scriptOf(buildContainerizedArgs('/p', {}));
  assert.match(noSkips, /r2g run -c\s*$/m);
});

test('getForwardedRunFlags: forwards each of -z, -s, -t, -c', () => {
  assert.deepStrictEqual(getForwardedRunFlags({}), []);
  assert.deepStrictEqual(getForwardedRunFlags({z: true, s: true, t: true, c: true}), ['-z', '-s', '-t', '-c']);
  assert.deepStrictEqual(getForwardedRunFlags({s: true}), ['-s']);
});

test('buildPhaseCArgs: read-only mount of the dummy project, --rm, container HOME', () => {
  const dummy = '/home/me/.r2g/temp/project';
  const args = buildPhaseCArgs(dummy, {image: 'node:22'});
  assert.strictEqual(args[0], 'run');
  assert.ok(args.includes('--rm'), 'docker args must include --rm');
  const vIdx = args.indexOf('-v');
  assert.strictEqual(args[vIdx + 1], `${dummy}:${containerProjectMount}:ro`);
  const eIdx = args.indexOf('-e');
  assert.strictEqual(args[eIdx + 1], `HOME=${containerHome}`);
});

test('buildPhaseCArgs: uses the configured image, defaults to node:22 if missing', () => {
  assert.ok(buildPhaseCArgs('/d', {image: 'oven/bun:latest'}).includes('oven/bun:latest'));
  assert.ok(buildPhaseCArgs('/d', {image: ''}).includes(defaultImage));
});

test('buildPhaseCArgs: per-container cmd defaults to node and is overridable', () => {
  assert.strictEqual(defaultContainerCmd, 'node');
  const nodeScript = scriptOf(buildPhaseCArgs('/d', {image: 'node:22'}));
  assert.match(nodeScript, /node "\$t"/);
  const bunScript = scriptOf(buildPhaseCArgs('/d', {image: 'oven/bun:latest', cmd: 'bun'}));
  assert.match(bunScript, /bun "\$t"/);
  assert.doesNotMatch(bunScript, /node "\$t"/);
});

test('buildPhaseCArgs: copies mount to a writable dir and iterates over tests/', () => {
  const script = scriptOf(buildPhaseCArgs('/d', {image: 'node:22'}));
  assert.match(script, new RegExp(`cp -r ${containerProjectMount}/\\. "\\$HOME/project"`));
  assert.match(script, /for t in tests\/\*/);
});

test('isLocalPkgPath: distinguishes registry specs from local paths', () => {
  assert.strictEqual(isLocalPkgPath('r2g'), false);
  assert.strictEqual(isLocalPkgPath('r2g@1.2.3'), false);
  assert.strictEqual(isLocalPkgPath('/abs/r2g-checkout'), true);
  assert.strictEqual(isLocalPkgPath('./r2g.tgz'), true);
  assert.strictEqual(isLocalPkgPath('~/codes/r2g'), true);
  assert.strictEqual(isLocalPkgPath('r2g-1.0.0.tgz'), true);
});

test('buildContainerizedArgs: local tarball pkg is mounted ro and installed from the mount', () => {
  const args = buildContainerizedArgs('/home/me/proj', {containerPkg: '/builds/r2g-9.9.9.tgz'});
  assert.ok(args.includes(`/builds/r2g-9.9.9.tgz:${containerPkgTarballMount}:ro`));
  const script = scriptOf(args);
  assert.match(script, new RegExp(`npm install -g --loglevel=warn ${containerPkgTarballMount}`));
  assert.doesNotMatch(script, /npm install -g --loglevel=warn 'r2g'/);
});

test('buildContainerizedArgs: local checkout dir pkg is mounted ro at the dir mount', () => {
  const args = buildContainerizedArgs('/home/me/proj', {containerPkg: '/home/me/codes/r2g'});
  assert.ok(args.includes(`/home/me/codes/r2g:${containerPkgMount}:ro`));
  const script = scriptOf(args);
  assert.match(script, new RegExp(`npm install -g --loglevel=warn ${containerPkgMount}`));
});

test('buildContainerizedArgs: registry spec pkg gets no extra mount', () => {
  const args = buildContainerizedArgs('/home/me/proj', {containerPkg: 'r2g@2.0.1'});
  assert.strictEqual(args.filter(a => a === '-v').length, 1);
  assert.match(scriptOf(args), /npm install -g --loglevel=warn 'r2g@2\.0\.1'/);
});

test('buildContainerizedArgs: always skips phase-C inside the container (no docker-in-docker)', () => {
  const plain = scriptOf(buildContainerizedArgs('/home/me/proj', {}));
  assert.match(plain, /r2g run -c/);
  const withSkips = scriptOf(buildContainerizedArgs('/home/me/proj', {z: true, c: true}));
  assert.match(withSkips, /r2g run -z -c/);
});
