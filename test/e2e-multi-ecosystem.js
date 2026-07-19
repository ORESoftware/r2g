'use strict';

const cp = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.resolve(__dirname, '..');
const requested = process.env.R2G_E2E_ECOSYSTEMS || 'rust,go,gleam,python';
const ecosystems = requested.split(',').map(value => value.trim()).filter(Boolean);
const tempBase = fs.mkdtempSync(path.join(os.tmpdir(), 'r2g-e2e-'));

for (const ecosystem of ecosystems) {
  const fixture = path.join(root, 'test', 'fixtures', ecosystem);
  process.stdout.write(`\n=== r2g downstream-consumer e2e: ${ecosystem} ===\n`);
  const result = cp.spawnSync(
    process.execPath,
    [
      path.join(root, 'cli', 'r2g.js'),
      'run',
      '--ecosystem', ecosystem,
      '--project', fixture,
      '--ignore-dirty-git-index'
    ],
    {
      cwd: root,
      env: {...process.env, R2G_TEMP_BASE: tempBase},
      stdio: 'inherit'
    }
  );
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

fs.rmSync(tempBase, {recursive: true, force: true});
console.log('\nall downstream-consumer e2e fixtures passed');
