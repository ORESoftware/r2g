'use strict';

import cp = require('child_process');
import fs = require('fs');
import os = require('os');
import path = require('path');
import log from '../../logger';

const tar: any = require('tar');

interface CommandRecord {
  args: string[];
  command: string;
  cwd: string;
  label: string;
}

interface RunContext {
  artifactDir: string;
  commands: CommandRecord[];
  consumerDir: string;
  ecosystem: string;
  originalRoot: string;
  stagedRoot: string;
  workspace: string;
}

const skippedDirectories: {[name: string]: boolean} = {
  '.dart_tool': true,
  '.git': true,
  '.hg': true,
  '.svn': true,
  '.venv': true,
  '_build': true,
  'build': true,
  'node_modules': true,
  'target': true
};

const ensureDirectory = (directory: string): void => {
  if (fs.existsSync(directory)) {
    return;
  }
  const parent = path.dirname(directory);
  if (parent !== directory) {
    ensureDirectory(parent);
  }
  try {
    fs.mkdirSync(directory);
  }
  catch (err) {
    if (!fs.existsSync(directory)) {
      throw err;
    }
  }
};

const copyTree = (source: string, destination: string, isRoot = true): void => {
  const name = path.basename(source);
  if (!isRoot && skippedDirectories[name]) {
    return;
  }

  const stats = fs.statSync(source);
  if (stats.isDirectory()) {
    ensureDirectory(destination);
    fs.readdirSync(source).forEach(child => {
      copyTree(path.join(source, child), path.join(destination, child), false);
    });
    fs.chmodSync(destination, stats.mode);
  }
  else if (stats.isFile()) {
    ensureDirectory(path.dirname(destination));
    fs.copyFileSync(source, destination);
    fs.chmodSync(destination, stats.mode);
  }
};

const removeTree = (directory: string): void => {
  if (!fs.existsSync(directory)) {
    return;
  }
  fs.readdirSync(directory).forEach(name => {
    const child = path.join(directory, name);
    const stats = fs.lstatSync(child);
    if (stats.isDirectory() && !stats.isSymbolicLink()) {
      removeTree(child);
    }
    else {
      fs.unlinkSync(child);
    }
  });
  fs.rmdirSync(directory);
};

const tempRoot = (): string => {
  if (process.env.R2G_TEMP_BASE) {
    return path.resolve(process.env.R2G_TEMP_BASE);
  }
  if (process.env.GITHUB_ACTIONS === 'true' && process.env.RUNNER_TEMP) {
    return path.resolve(process.env.RUNNER_TEMP);
  }
  return path.join(os.homedir(), '.r2g', 'temp');
};

const quote = (value: string): string => {
  return /^[A-Za-z0-9_./:@=+-]+$/.test(value) ? value : `'${value.replace(/'/g, `'\\''`)}'`;
};

const runCommand = (
  ctx: RunContext,
  label: string,
  command: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv = process.env
): Promise<string> => {
  ctx.commands.push({label, command, args, cwd});
  log.info(`${label}: ${[command].concat(args).map(quote).join(' ')}`);

  return new Promise<string>((resolve, reject) => {
    const child = cp.spawn(command, args, {cwd, env});
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => {
      const text = String(chunk);
      stdout += text;
      process.stdout.write(text);
    });
    child.stderr.on('data', chunk => {
      const text = String(chunk);
      stderr += text;
      process.stderr.write(text);
    });
    child.once('error', err => reject(new Error(`${label} could not start: ${err.message}`)));
    child.once('exit', (code, signal) => {
      if (code === 0) {
        return resolve(stdout);
      }
      const ending = signal ? `signal ${signal}` : `exit code ${code}`;
      const detail = stderr.trim() ? `\n${stderr.trim()}` : '';
      reject(new Error(`${label} failed with ${ending}.${detail}`));
    });
  });
};

const assertCleanTree = (projectRoot: string): void => {
  const result = cp.spawnSync('git', ['status', '--porcelain'], {
    cwd: projectRoot,
    encoding: 'utf8'
  });
  if (result.status !== 0) {
    throw new Error('r2g requires a Git worktree to prove which files enter the package.');
  }
  if (String(result.stdout || '').trim()) {
    throw new Error(
      'r2g requires a clean Git worktree before packaging. ' +
      'Commit or stash changes, or explicitly use --ignore-dirty-git-index.'
    );
  }
};

const walkFiles = (directory: string): string[] => {
  if (!fs.existsSync(directory)) {
    return [];
  }
  const output: string[] = [];
  fs.readdirSync(directory).forEach(name => {
    const child = path.join(directory, name);
    const stats = fs.statSync(child);
    if (stats.isDirectory()) {
      output.push(...walkFiles(child));
    }
    else if (stats.isFile()) {
      output.push(child);
    }
  });
  return output;
};

const newestFile = (files: string[], label: string): string => {
  if (files.length === 0) {
    throw new Error(`The package step did not produce ${label}.`);
  }
  return files.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
};

const parseManifestName = (file: string, section?: string): string => {
  const contents = fs.readFileSync(file, 'utf8');
  let selected = contents;
  if (section) {
    const start = contents.indexOf(`[${section}]`);
    if (start >= 0) {
      const rest = contents.slice(start + section.length + 2);
      const next = rest.search(/^\s*\[/m);
      selected = next >= 0 ? rest.slice(0, next) : rest;
    }
  }
  const match = selected.match(/^\s*name\s*=\s*["']([^"']+)["']/m);
  if (!match) {
    throw new Error(`Could not read a package name from ${file}.`);
  }
  return match[1];
};

const applyTokens = (directory: string, tokens: {[name: string]: string}): void => {
  walkFiles(directory).forEach(file => {
    const bytes = fs.readFileSync(file);
    if (bytes.indexOf(0) >= 0) {
      return;
    }
    let contents = bytes.toString('utf8');
    let changed = false;
    Object.keys(tokens).forEach(token => {
      const next = contents.split(token).join(tokens[token]);
      changed = changed || next !== contents;
      contents = next;
    });
    if (changed) {
      fs.writeFileSync(file, contents);
    }
  });
};

const prepareConsumer = (ctx: RunContext, packageName: string, artifactRoot: string): boolean => {
  const skeleton = path.join(ctx.originalRoot, '.r2g', 'skeletons', ctx.ecosystem);
  const custom = fs.existsSync(skeleton);
  ensureDirectory(ctx.consumerDir);
  if (custom) {
    copyTree(skeleton, ctx.consumerDir);
  }
  applyTokens(ctx.consumerDir, {
    '__R2G_ARTIFACT_PATH__': artifactRoot.replace(/\\/g, '/'),
    '__R2G_PACKAGE_NAME__': packageName,
    '__R2G_SUBJECT_PATH__': ctx.stagedRoot.replace(/\\/g, '/')
  });
  return custom;
};

const runRust = async (ctx: RunContext): Promise<string[]> => {
  const manifest = path.join(ctx.stagedRoot, 'Cargo.toml');
  const packageName = parseManifestName(manifest, 'package');
  await runCommand(
    ctx,
    'package Rust crate',
    'cargo',
    ['package', '--allow-dirty', '--manifest-path', manifest],
    ctx.stagedRoot,
    {...process.env, CARGO_TARGET_DIR: path.join(ctx.workspace, 'build', 'cargo-subject')}
  );

  const crate = newestFile(
    walkFiles(path.join(ctx.workspace, 'build', 'cargo-subject')).filter(file => file.endsWith('.crate')),
    'a .crate artifact'
  );
  const savedCrate = path.join(ctx.artifactDir, path.basename(crate));
  fs.copyFileSync(crate, savedCrate);
  const unpacked = path.join(ctx.artifactDir, 'unpacked');
  ensureDirectory(unpacked);
  await tar.x({cwd: unpacked, file: savedCrate, strict: true});
  const roots = fs.readdirSync(unpacked).map(name => path.join(unpacked, name));
  const packageRoot = roots.filter(file => fs.statSync(file).isDirectory())[0];
  if (!packageRoot) {
    throw new Error('The Rust crate did not contain a package root directory.');
  }

  prepareConsumer(ctx, packageName, packageRoot);
  if (!fs.existsSync(path.join(ctx.consumerDir, 'Cargo.toml'))) {
    ensureDirectory(path.join(ctx.consumerDir, 'src'));
    fs.writeFileSync(path.join(ctx.consumerDir, 'Cargo.toml'), [
      '[package]',
      'name = "r2g_consumer"',
      'version = "0.0.0"',
      'edition = "2021"',
      '',
      '[dependencies]',
      `r2g_subject = { package = "${packageName}", path = "${packageRoot.replace(/\\/g, '/')}" }`,
      ''
    ].join('\n'));
    const main = path.join(ctx.consumerDir, 'src', 'main.rs');
    if (!fs.existsSync(main)) {
      fs.writeFileSync(main, 'fn main() {}\n');
    }
  }
  applyTokens(ctx.consumerDir, {
    '__R2G_ARTIFACT_PATH__': packageRoot.replace(/\\/g, '/'),
    '__R2G_PACKAGE_NAME__': packageName,
    '__R2G_SUBJECT_PATH__': ctx.stagedRoot.replace(/\\/g, '/')
  });
  await runCommand(
    ctx,
    'test Rust downstream consumer',
    'cargo',
    ['test', '--manifest-path', path.join(ctx.consumerDir, 'Cargo.toml')],
    ctx.consumerDir,
    {...process.env, CARGO_TARGET_DIR: path.join(ctx.workspace, 'build', 'cargo-consumer')}
  );
  return [savedCrate];
};

const venvPython = (venv: string): string => {
  return process.platform === 'win32' ?
    path.join(venv, 'Scripts', 'python.exe') :
    path.join(venv, 'bin', 'python');
};

const runPython = async (ctx: RunContext): Promise<string[]> => {
  const python = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
  const packageName = parseManifestName(path.join(ctx.stagedRoot, 'pyproject.toml'), 'project');
  await runCommand(
    ctx,
    'build Python wheel and source distribution',
    python,
    ['-m', 'build', '--outdir', ctx.artifactDir],
    ctx.stagedRoot
  );
  const distributions = walkFiles(ctx.artifactDir).filter(file => /\.(whl|tar\.gz|zip)$/.test(file));
  const wheel = distributions.filter(file => file.endsWith('.whl'))[0];
  const installable = wheel || distributions[0];
  if (!installable) {
    throw new Error('The Python build did not produce a wheel or source distribution.');
  }

  prepareConsumer(ctx, packageName, installable);
  const venv = path.join(ctx.consumerDir, '.venv');
  await runCommand(ctx, 'create isolated Python consumer', python, ['-m', 'venv', venv], ctx.consumerDir);
  const isolatedPython = venvPython(venv);
  const isolatedEnv = {...process.env, PYTHONNOUSERSITE: '1', PYTHONPATH: ''};
  await runCommand(
    ctx,
    'install Python artifact into consumer',
    isolatedPython,
    ['-m', 'pip', 'install', installable],
    ctx.consumerDir,
    isolatedEnv
  );
  await runCommand(
    ctx,
    'check Python dependency resolution',
    isolatedPython,
    ['-m', 'pip', 'check'],
    ctx.consumerDir,
    isolatedEnv
  );
  const metadataCheck = [
    'import importlib.metadata as m, os, sys',
    'root = os.path.realpath(sys.prefix)',
    'installed = os.path.realpath(str(m.distribution(sys.argv[1]).locate_file("")))',
    'assert os.path.commonpath([root, installed]) == root, (root, installed)',
    'print(installed)'
  ].join('; ');
  await runCommand(
    ctx,
    'verify Python distribution comes from consumer environment',
    isolatedPython,
    ['-I', '-c', metadataCheck, packageName],
    ctx.consumerDir,
    isolatedEnv
  );

  const smoke = ['smoke_test.py', 'smoke.py', 'test.py']
    .map(name => path.join(ctx.consumerDir, name))
    .filter(fs.existsSync)[0];
  if (smoke) {
    await runCommand(
      ctx,
      'test Python downstream consumer',
      isolatedPython,
      ['-I', smoke],
      ctx.consumerDir,
      isolatedEnv
    );
  }
  return distributions;
};

const runGleam = async (ctx: RunContext): Promise<string[]> => {
  const packageName = parseManifestName(path.join(ctx.stagedRoot, 'gleam.toml'));
  await runCommand(ctx, 'build publishable Gleam Hex tarball', 'gleam', ['export', 'hex-tarball'], ctx.stagedRoot);
  const built = newestFile(
    walkFiles(ctx.stagedRoot).filter(file => file.endsWith('.tar') && file.indexOf(`${packageName}-`) >= 0),
    'a Gleam Hex tarball'
  );
  const savedTar = path.join(ctx.artifactDir, path.basename(built));
  fs.copyFileSync(built, savedTar);
  const outer = path.join(ctx.artifactDir, 'hex');
  ensureDirectory(outer);
  await tar.x({cwd: outer, file: savedTar, strict: true});
  const contents = path.join(outer, 'contents.tar.gz');
  if (!fs.existsSync(contents)) {
    throw new Error('The Gleam Hex artifact did not contain contents.tar.gz.');
  }
  const unpacked = path.join(ctx.artifactDir, 'unpacked');
  ensureDirectory(unpacked);
  await tar.x({cwd: unpacked, file: contents, strict: true});

  prepareConsumer(ctx, packageName, unpacked);
  if (!fs.existsSync(path.join(ctx.consumerDir, 'gleam.toml'))) {
    ensureDirectory(path.join(ctx.consumerDir, 'src'));
    fs.writeFileSync(path.join(ctx.consumerDir, 'gleam.toml'), [
      'name = "r2g_consumer"',
      'version = "0.0.0"',
      'target = "erlang"',
      '',
      '[dependencies]',
      `${packageName} = { path = "${unpacked.replace(/\\/g, '/')}" }`,
      ''
    ].join('\n'));
    const main = path.join(ctx.consumerDir, 'src', 'r2g_consumer.gleam');
    if (!fs.existsSync(main)) {
      fs.writeFileSync(main, 'pub fn main() { Nil }\n');
    }
  }
  applyTokens(ctx.consumerDir, {
    '__R2G_ARTIFACT_PATH__': unpacked.replace(/\\/g, '/'),
    '__R2G_PACKAGE_NAME__': packageName,
    '__R2G_SUBJECT_PATH__': ctx.stagedRoot.replace(/\\/g, '/')
  });
  await runCommand(ctx, 'test Gleam downstream consumer', 'gleam', ['build'], ctx.consumerDir);
  return [savedTar];
};

const goVersionForModule = (moduleName: string): string => {
  const match = moduleName.match(/\/v([2-9][0-9]*)$/);
  return match ? `v${match[1]}.0.0` : 'v0.0.0';
};

const runGo = async (ctx: RunContext): Promise<string[]> => {
  const goMod = fs.readFileSync(path.join(ctx.stagedRoot, 'go.mod'), 'utf8');
  const moduleMatch = goMod.match(/^\s*module\s+(.+)\s*$/m);
  if (!moduleMatch) {
    throw new Error('Could not read the module path from go.mod.');
  }
  const moduleName = moduleMatch[1].trim();
  const archive = path.join(ctx.artifactDir, 'module.tar');
  log.info(`archive publishable Go module source: ${archive}`);
  await tar.c({cwd: ctx.stagedRoot, file: archive, portable: true}, ['.']);
  const unpacked = path.join(ctx.artifactDir, 'unpacked');
  ensureDirectory(unpacked);
  await tar.x({cwd: unpacked, file: archive, strict: true});

  prepareConsumer(ctx, moduleName, unpacked);
  if (!fs.existsSync(path.join(ctx.consumerDir, 'go.mod'))) {
    fs.writeFileSync(path.join(ctx.consumerDir, 'go.mod'), [
      'module r2g.consumer',
      '',
      'go 1.21',
      '',
      `require ${moduleName} ${goVersionForModule(moduleName)}`,
      `replace ${moduleName} => ${unpacked.replace(/\\/g, '/')}`,
      ''
    ].join('\n'));
    fs.writeFileSync(path.join(ctx.consumerDir, 'main.go'), 'package main\n\nfunc main() {}\n');
  }
  applyTokens(ctx.consumerDir, {
    '__R2G_ARTIFACT_PATH__': unpacked.replace(/\\/g, '/'),
    '__R2G_PACKAGE_NAME__': moduleName,
    '__R2G_SUBJECT_PATH__': ctx.stagedRoot.replace(/\\/g, '/')
  });
  await runCommand(ctx, 'resolve Go module in downstream consumer', 'go', ['list', '-m', 'all'], ctx.consumerDir);
  await runCommand(ctx, 'test Go downstream consumer', 'go', ['test', './...'], ctx.consumerDir);
  return [archive];
};

const writeResult = (
  ctx: RunContext,
  status: 'passed' | 'failed',
  artifacts: string[],
  error?: any
): void => {
  const result = {
    artifacts,
    commands: ctx.commands,
    consumer: ctx.consumerDir,
    ecosystem: ctx.ecosystem,
    error: error ? String(error.message || error) : null,
    status,
    subject: ctx.stagedRoot,
    workspace: ctx.workspace
  };
  fs.writeFileSync(path.join(ctx.workspace, 'results.json'), JSON.stringify(result, null, 2) + '\n');
};

export const runEcosystem = async (
  projectRoot: string,
  ecosystem: string,
  opts: any
): Promise<void> => {
  if (!opts.ignore_dirty_git_index) {
    assertCleanTree(projectRoot);
  }

  const id = `${Date.now()}-${process.pid}-${Math.random().toString(16).slice(2, 10)}`;
  const workspace = path.join(tempRoot(), 'r2g', id);
  const ctx: RunContext = {
    artifactDir: path.join(workspace, 'artifacts', ecosystem),
    commands: [],
    consumerDir: path.join(workspace, 'consumers', ecosystem),
    ecosystem,
    originalRoot: projectRoot,
    stagedRoot: path.join(workspace, 'subject'),
    workspace
  };
  ensureDirectory(ctx.artifactDir);
  copyTree(projectRoot, ctx.stagedRoot);

  log.info(`r2g ${ecosystem}: staged subject at ${ctx.stagedRoot}`);
  let artifacts: string[] = [];
  try {
    if (ecosystem === 'rust') {
      artifacts = await runRust(ctx);
    }
    else if (ecosystem === 'python') {
      artifacts = await runPython(ctx);
    }
    else if (ecosystem === 'gleam') {
      artifacts = await runGleam(ctx);
    }
    else if (ecosystem === 'go') {
      artifacts = await runGo(ctx);
    }
    else {
      throw new Error(`No downstream-consumer adapter is registered for ${ecosystem}.`);
    }
    writeResult(ctx, 'passed', artifacts);
  }
  catch (err) {
    writeResult(ctx, 'failed', artifacts, err);
    log.error(`r2g kept the failed workspace for inspection: ${workspace}`);
    throw err;
  }

  if (opts.keep_temp) {
    log.info(`r2g kept the successful workspace at: ${workspace}`);
  }
  else {
    removeTree(workspace);
  }
  log.info(`r2g proved the ${ecosystem} artifact works as a downstream dependency.`);
};
