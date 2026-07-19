#!/usr/bin/env node
'use strict';

const cp = require('child_process');
const path = require('path');

if (process.env.r2g_is_running === 'yes') {
  process.stderr.write('r2g refused to launch itself recursively.\n');
  process.exit(1);
}
process.env.r2g_is_running = 'yes';

const args = process.argv.slice(2);
const requested = args[0] || '';
const aliases = {
  test: 'run'
};
const commands = new Set(['basic', 'clean', 'init', 'inspect', 'publish', 'run']);
const command = aliases[requested] || (commands.has(requested) ? requested : 'basic');
const commandArgs = command === 'basic' ? args : args.slice(1);
const packageRoot = path.resolve(__dirname, '..');

if (requested === 'symlink' || requested === 'link') {
  if (process.platform === 'win32') {
    process.stderr.write('r2g symlink is not available on Windows.\n');
    process.exit(1);
  }
  const script = path.join(__dirname, 'r2g_symlink.sh');
  const child = cp.spawnSync(script, args.slice(1), {stdio: 'inherit', env: process.env});
  process.exit(child.status === null ? 1 : child.status);
}

if (requested === 'docker') {
  const child = cp.spawnSync('dkr2g', ['exec', '--allow-unknown', ...args.slice(1)], {
    stdio: 'inherit',
    env: process.env
  });
  if (child.error) {
    process.stderr.write(`r2g docker requires dkr2g on PATH: ${child.error.message}\n`);
    process.exit(1);
  }
  process.exit(child.status === null ? 1 : child.status);
}

const entry = path.join(packageRoot, 'dist', 'commands', command, 'index.js');
process.argv = [process.execPath, entry, ...commandArgs];

try {
  require(entry);
}
catch (error) {
  process.stderr.write(`r2g: ${error && error.stack ? error.stack : error}\n`);
  process.exitCode = 1;
}
