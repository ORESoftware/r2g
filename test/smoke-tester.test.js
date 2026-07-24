'use strict';

const assert = require('node:assert/strict');
const cp = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const writeJSON = (file, value) => {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
};

const writePackage = (project, name, packageJSON, sourceName, source) => {
  const packageRoot = path.join(project, 'node_modules', name);
  fs.mkdirSync(packageRoot, {recursive: true});
  writeJSON(path.join(packageRoot, 'package.json'), {
    name,
    version: '1.0.0',
    ...packageJSON
  });
  fs.writeFileSync(path.join(packageRoot, sourceName), source);
};

test('phase-S smoke tester loads CommonJS and ESM packages', t => {
  const root = path.resolve(__dirname, '..');
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'r2g-phase-s-'));
  t.after(() => fs.rmSync(project, {recursive: true, force: true}));

  const dependencies = {
    'r2g-cjs-smoke-fixture': '1.0.0',
    'r2g-esm-smoke-fixture': '1.0.0'
  };
  writeJSON(path.join(project, 'package.json'), {
    name: 'r2g-phase-s-consumer',
    private: true,
    dependencies
  });

  writePackage(
    project,
    'r2g-cjs-smoke-fixture',
    {main: './index.cjs'},
    'index.cjs',
    "exports.r2gSmokeTest = async () => true;\n"
  );
  writePackage(
    project,
    'r2g-esm-smoke-fixture',
    {type: 'module', exports: './index.js'},
    'index.js',
    "await Promise.resolve();\nexport async function r2gSmokeTest() { return true; }\n"
  );

  fs.copyFileSync(
    path.join(root, 'dist', 'smoke-tester.js'),
    path.join(project, 'smoke-tester.js')
  );

  const result = cp.spawnSync(process.execPath, ['smoke-tester.js'], {
    cwd: project,
    encoding: 'utf8'
  });
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;

  assert.equal(result.status, 0, output);
  assert.match(output, /r2g-cjs-smoke-fixture/);
  assert.match(output, /r2g-esm-smoke-fixture/);
  assert.match(output, /loading as an ES module/);
  assert.match(output, /have all passed/);
});

test('r2g packages and smoke-tests itself as a downstream dependency', t => {
  const root = path.resolve(__dirname, '..');
  const tempBase = fs.mkdtempSync(path.join(os.tmpdir(), 'r2g-self-test-'));
  t.after(() => fs.rmSync(tempBase, {recursive: true, force: true}));

  const result = cp.spawnSync(
    process.execPath,
    [
      path.join(root, 'cli', 'r2g.js'),
      'run',
      '--ecosystem', 'npm',
      '--project', root,
      '--ignore-dirty-git-index',
      '--skip=z,t'
    ],
    {
      cwd: root,
      encoding: 'utf8',
      env: {...process.env, R2G_TEMP_BASE: tempBase},
      timeout: 120000
    }
  );
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;

  assert.equal(result.status, 0, output);
  assert.match(output, /loading the following module: r2g/);
  assert.match(output, /Your exported r2gSmokeTest function\(s\) have all passed/);
  assert.match(output, /Successfully ran r2g/);
});

test('legacy npm flow packs and loads an ESM TypeScript package', t => {
  const root = path.resolve(__dirname, '..');
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'r2g-esm-e2e-'));
  const subject = path.join(workspace, 'subject');
  const tempBase = path.join(workspace, 'temp');
  fs.mkdirSync(path.join(subject, '.r2g'), {recursive: true});
  fs.mkdirSync(path.join(subject, 'src'), {recursive: true});
  t.after(() => fs.rmSync(workspace, {recursive: true, force: true}));

  writeJSON(path.join(subject, 'package.json'), {
    name: 'r2g-esm-typescript-fixture',
    version: '1.0.0',
    type: 'module',
    exports: './dist/index.js',
    files: ['dist'],
    scripts: {prepack: 'tsc -p tsconfig.json'},
    devDependencies: {typescript: '5.9.3'}
  });
  writeJSON(path.join(subject, 'tsconfig.json'), {
    compilerOptions: {
      declaration: true,
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      outDir: './dist',
      rootDir: './src',
      strict: true,
      target: 'ES2022'
    },
    include: ['src']
  });
  fs.writeFileSync(
    path.join(subject, 'src', 'index.ts'),
    "await Promise.resolve();\nexport async function r2gSmokeTest(): Promise<true> { return true; }\n"
  );
  fs.writeFileSync(
    path.join(subject, '.r2g', 'config.js'),
    "const searchRoot = await Promise.resolve(process.env.HOME);\nexport default {packages: {}, searchRoot};\n"
  );

  const result = cp.spawnSync(
    process.execPath,
    [
      path.join(root, 'cli', 'r2g.js'),
      'run',
      '--ecosystem', 'npm',
      '--project', subject,
      '--ignore-dirty-git-index',
      '--skip=z,t'
    ],
    {
      cwd: root,
      encoding: 'utf8',
      env: {...process.env, R2G_TEMP_BASE: tempBase},
      timeout: 120000
    }
  );
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;

  assert.equal(result.status, 0, output);
  assert.match(output, /Installing copied-project dependencies before npm pack/);
  assert.match(output, /loading the following module: r2g-esm-typescript-fixture/);
  assert.match(output, /loading as an ES module/);
  assert.match(output, /Your exported r2gSmokeTest function\(s\) have all passed/);
});
