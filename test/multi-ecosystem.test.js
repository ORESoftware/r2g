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

// --- subcommand contract through flags-2-env ---

const f2e = loadFlags2Env();

// each command scopes its flags; the resolved path arrives in R2G_COMMAND
const runParsed = f2e.parse(['r2g', 'run', '--pack', '-z', '--containerized'], {configPath});
assert.strictEqual(runParsed.R2G_COMMAND, 'run');
assert.strictEqual(runParsed.R2G_PACK, 'true');
assert.strictEqual(runParsed.R2G_SKIP_Z, 'true');
assert.strictEqual(runParsed.R2G_CONTAINERIZED, 'true');

// command aliases resolve to the canonical name
const aliasParsed = f2e.parse(['r2g', 'test', '-c'], {configPath});
assert.strictEqual(aliasParsed.R2G_COMMAND, 'run');
assert.strictEqual(aliasParsed.R2G_SKIP_C, 'true');

// a flag scoped to another command is reported unknown
const wrongScope = f2e.parse(['r2g', 'init', '--pack'], {configPath});
assert.strictEqual(wrongScope.R2G_COMMAND, 'init');
assert.deepStrictEqual(JSON.parse(wrongScope.R2G_UNKNOWN_OPTIONS), ['--pack']);

// wrapper scripts may strip the command token; with no command matched,
// unambiguous scoped flags still resolve leniently instead of erroring
const lenient = f2e.parse(['r2g', '--pack', '--otp', '123456'], {configPath});
assert.strictEqual(lenient.R2G_COMMAND, '');
assert.strictEqual(lenient.R2G_PACK, 'true');
assert.strictEqual(lenient.R2G_OTP, '123456');
assert.strictEqual(lenient.R2G_UNKNOWN_OPTIONS, undefined);

// genuine typos are still collected in lenient mode
const typo = f2e.parse(['r2g', '--pakc'], {configPath});
assert.deepStrictEqual(JSON.parse(typo.R2G_UNKNOWN_OPTIONS), ['--pakc']);

// end-to-end through the real launcher
const r2gBin = path.resolve(__dirname, '..', 'cli', 'r2g.js');
const runCli = args => cp.spawnSync(process.execPath, [r2gBin, ...args], {
  encoding: 'utf8',
  env: {...process.env, COLUMNS: '100'}
});

const topHelp = runCli(['--help']);
assert.strictEqual(topHelp.status, 0, topHelp.stderr);
assert.ok(topHelp.stdout.includes('Command: r2g [COMMAND] [OPTIONS]'), topHelp.stdout);
assert.ok(topHelp.stdout.includes('Commands:'), topHelp.stdout);
assert.ok(topHelp.stdout.includes('run, test'), topHelp.stdout);

const runHelp = runCli(['run', '--help']);
assert.strictEqual(runHelp.status, 0, runHelp.stderr);
assert.ok(runHelp.stdout.includes('Command: r2g run [OPTIONS]'), runHelp.stdout);
assert.ok(runHelp.stdout.includes('--containerized'), runHelp.stdout);
assert.ok(!runHelp.stdout.includes('--otp'), runHelp.stdout);

const wrongScopeCli = runCli(['inspect', '--otp', '123456']);
assert.notStrictEqual(wrongScopeCli.status, 0);
assert.ok(wrongScopeCli.stderr.includes('Unknown option(s): --otp'), wrongScopeCli.stderr);

// --- shell completion ---

// completion output must be a clean, sourceable script: scope-aware for
// subcommands and free of logger noise on stdout
const completionBash = runCli(['completion', 'bash']);
assert.strictEqual(completionBash.status, 0, completionBash.stderr);
assert.ok(completionBash.stdout.includes("complete -o default -F _flags2env_complete_r2g"), completionBash.stdout);
assert.ok(completionBash.stdout.includes('--containerized'), completionBash.stdout);
assert.ok(!completionBash.stdout.includes('exiting'), completionBash.stdout);

// bash is the default shell
const completionDefault = runCli(['completion']);
assert.strictEqual(completionDefault.status, 0, completionDefault.stderr);
assert.strictEqual(completionDefault.stdout, completionBash.stdout);

const completionZsh = runCli(['completion', 'zsh']);
assert.strictEqual(completionZsh.status, 0, completionZsh.stderr);
assert.ok(completionZsh.stdout.includes('#compdef r2g'), completionZsh.stdout);
assert.ok(!completionZsh.stdout.includes('exiting'), completionZsh.stdout);

const completionBad = runCli(['completion', 'fish']);
assert.notStrictEqual(completionBad.status, 0);
assert.ok(completionBad.stderr.includes('bash and zsh'), completionBad.stderr);

// legacy --completion flag stays a clean alias for the bash script
const completionFlag = runCli(['--completion']);
assert.strictEqual(completionFlag.status, 0, completionFlag.stderr);
assert.ok(completionFlag.stdout.includes("complete -o default -F _flags2env_complete_r2g"), completionFlag.stdout);
assert.ok(!completionFlag.stdout.includes('exiting'), completionFlag.stdout);

console.log('multi-ecosystem detection and CLI contract tests passed');
