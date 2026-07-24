'use strict';

import fs = require('fs');
import os = require('os');
import path = require('path');

type Flags2EnvResult = {[key: string]: string} & {
  isHelpMenu?: boolean;
  printTable?: (target?: NodeJS.WritableStream) => string;
};

interface Flags2EnvModule {
  completionScript: (shell: string, command: string, opts: {configPath: string}) => string;
  parse: (argv: string[], opts: {configPath: string}) => Flags2EnvResult;
}

export interface CliContext {
  cwd: string;
  opts: any;
  projectRoot: string;
}

const manifestNames: {[name: string]: string[]} = {
  npm: ['package.json'],
  rust: ['Cargo.toml'],
  python: ['pyproject.toml', 'setup.cfg', 'setup.py'],
  gleam: ['gleam.toml'],
  go: ['go.mod']
};

const aliases: {[name: string]: string} = {
  auto: 'auto',
  cargo: 'rust',
  crates: 'rust',
  gleam: 'gleam',
  go: 'go',
  golang: 'go',
  node: 'npm',
  npm: 'npm',
  pypi: 'python',
  python: 'python',
  rust: 'rust',
  'rust-cargo': 'rust'
};

const exists = (file: string): boolean => {
  try {
    fs.statSync(file);
    return true;
  }
  catch (_) {
    return false;
  }
};

const packageRoot = path.resolve(__dirname, '..', '..');
export const configPath = process.env.R2G_CLI_FLAGS_CONFIG || path.join(packageRoot, '.cli-flags.toml');

const loadFlags2Env = (): Flags2EnvModule => {
  const localRoot = process.env.R2G_FLAGS2ENV_PATH || path.join(os.homedir(), 'codes', 'ores', 'flags-2-env');
  const localClient = path.join(localRoot, 'clients', 'nodejs', 'lib.cjs');
  const localAddon = path.join(localRoot, 'clients', 'nodejs', 'build', 'Release', 'flags2env.node');

  if (exists(localClient) && exists(localAddon)) {
    if (!process.env.FLAGS2ENV_NODE_ADDON) {
      process.env.FLAGS2ENV_NODE_ADDON = localAddon;
    }
    return require(localClient) as Flags2EnvModule;
  }
  return require('@oresoftware/f2e') as Flags2EnvModule;
};

const f2e = loadFlags2Env();

const booleanValue = (value: any, fallback = false): boolean => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  return String(value).toLowerCase() === 'true' || String(value) === '1';
};

const integerValue = (value: any, fallback = 0): number => {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const jsonArray = (value: any): string[] => {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed.map(String) : [];
  }
  catch (_) {
    return [];
  }
};

export const normalizeEcosystem = (value: string): string => {
  const key = String(value || 'auto').trim().toLowerCase();
  const ecosystem = aliases[key];
  if (!ecosystem) {
    throw new Error(
      `Unsupported ecosystem "${value}". Use auto, npm, rust, python, gleam, or go.`
    );
  }
  return ecosystem;
};

export const detectEcosystems = (directory: string): string[] => {
  return Object.keys(manifestNames).filter(ecosystem => {
    return manifestNames[ecosystem].some(name => exists(path.join(directory, name)));
  });
};

export const findProjectRoot = (cwd: string, ecosystemValue: string, explicit = ''): string | null => {
  const ecosystem = normalizeEcosystem(ecosystemValue);
  let current = path.resolve(explicit ? path.resolve(cwd, explicit) : cwd);

  if (explicit && !exists(current)) {
    throw new Error(`The requested project directory does not exist: ${current}`);
  }

  while (true) {
    if (ecosystem === 'auto') {
      if (detectEcosystems(current).length > 0) {
        return current;
      }
    }
    else if (manifestNames[ecosystem].some(name => exists(path.join(current, name)))) {
      return current;
    }

    if (explicit) {
      return null;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
};

export const resolveEcosystem = (projectRoot: string, requested: string): string => {
  const ecosystem = normalizeEcosystem(requested);
  if (ecosystem !== 'auto') {
    return ecosystem;
  }
  const detected = detectEcosystems(projectRoot);
  if (detected.length === 1) {
    return detected[0];
  }
  if (detected.length === 0) {
    throw new Error(`No supported package manifest was found in ${projectRoot}.`);
  }
  throw new Error(
    `Multiple ecosystems were detected in ${projectRoot}: ${detected.join(', ')}. ` +
    'Choose one with --ecosystem.'
  );
};

export const completionScript = (shell: string): string => {
  return f2e.completionScript(shell, 'r2g', {configPath});
};

export const parseCommand = (command: string): any => {
  const parsed = f2e.parse(['r2g'].concat(process.argv.slice(2)), {configPath});
  if (parsed.isHelpMenu || booleanValue(parsed.R2G_HELP)) {
    if (parsed.printTable) {
      parsed.printTable(process.stdout);
    }
    process.exit(0);
  }

  const errors = jsonArray(parsed.R2G_PARSE_ERRORS);
  const unknown = jsonArray(parsed.R2G_UNKNOWN_OPTIONS);
  if (errors.length > 0) {
    throw new Error(`Invalid command-line value(s): ${errors.join(', ')}`);
  }
  if (unknown.length > 0 && !booleanValue(parsed.R2G_ALLOW_UNKNOWN)) {
    throw new Error(`Unknown option(s): ${unknown.join(', ')}`);
  }

  const searchRoot = parsed.R2G_SEARCH_ROOT || '';
  return {
    _args: jsonArray(parsed.R2G_POSITIONALS),
    access: parsed.R2G_ACCESS || 'restricted',
    allow_unknown: booleanValue(parsed.R2G_ALLOW_UNKNOWN),
    bash_completion: booleanValue(parsed.R2G_COMPLETION),
    c: booleanValue(parsed.R2G_SKIP_C),
    containerized: booleanValue(parsed.R2G_CONTAINERIZED),
    docker: booleanValue(parsed.R2G_DOCKER),
    ecosystem: normalizeEcosystem(parsed.R2G_ECOSYSTEM || 'auto'),
    force: booleanValue(parsed.R2G_FORCE),
    full: booleanValue(parsed.R2G_FULL),
    help: false,
    ignore_dirty_git_index: booleanValue(parsed.R2G_IGNORE_DIRTY_GIT_INDEX),
    image: parsed.R2G_IMAGE || '',
    json: booleanValue(parsed.R2G_JSON),
    keep: booleanValue(parsed.R2G_KEEP),
    keep_temp: booleanValue(parsed.R2G_KEEP_TEMP),
    otp: parsed.R2G_OTP || '',
    pack: booleanValue(parsed.R2G_PACK),
    project: parsed.R2G_PROJECT || '',
    s: booleanValue(parsed.R2G_SKIP_S),
    search_root: command === 'init' ? (searchRoot ? [searchRoot] : []) : searchRoot,
    skip: parsed.R2G_SKIP || '',
    t: booleanValue(parsed.R2G_SKIP_T),
    verbosity: integerValue(parsed.R2G_VERBOSITY, 1),
    version: booleanValue(parsed.R2G_VERSION_REQUESTED),
    z: booleanValue(parsed.R2G_SKIP_Z)
  };
};

export const getCliContext = (command: string): CliContext => {
  const opts = parseCommand(command);
  const cwd = process.cwd();
  const ecosystem = command === 'run' ? opts.ecosystem : 'npm';
  const projectRoot = findProjectRoot(cwd, ecosystem, opts.project);
  if (!projectRoot) {
    throw new Error(`Could not find a supported project root from ${cwd}.`);
  }
  return {opts, cwd, projectRoot};
};
