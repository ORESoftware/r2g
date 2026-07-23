#!/usr/bin/env node
'use strict';

/*

 docker.r2g notes:

 this file will be copied to this location:

 $HOME/.r2g/temp/project/smoke-test.js

 and it will then be executed with:

 node smoke-test.js


 so, write a smoke test in this file, which only calls require() against your library.
 for example if your library is named "foo.bar", then the *only* require call you
 should make is to require('foo.bar'). If you make require calls to any other library
 in node_modules, then you will got non-deterministic results. require calls to core/built-in libraries are fine.

*/


const assert = require('assert');
const path = require('path');
const fs = require('fs');

process.on('unhandledRejection', err => {
  console.error(err);
  process.exit(1);
});

const timeout = setTimeout(() => {
  console.error('r2g phase-T smoke test timed out.');
  process.exit(1);
}, 5000);

(async () => {
  const fixturesDir = path.resolve(__dirname, '../fixtures');
  const matrix = require(path.resolve(fixturesDir, 'phase-matrix.json'));
  const legacyFixture = require(path.resolve(fixturesDir, 'foo.js'));
  const sampleText = fs.readFileSync(path.resolve(fixturesDir, 'sample-input.txt'), 'utf8');

  assert.deepStrictEqual(matrix.phases, ['phase-Z', 'phase-S', 'phase-T']);
  assert.deepStrictEqual(matrix.skipFlags, ['z', 's', 't']);
  assert.strictEqual(matrix.packageName, 'r2g');
  assert.strictEqual(matrix.smokeExport, 'r2gSmokeTest');
  assert.strictEqual(legacyFixture.foo, 3, 'foo value should be 3.');
  assert.match(sampleText, /fixture-token: r2g-phase-t/);

  const pkg = require(matrix.packageName);
  assert.strictEqual(typeof pkg[matrix.smokeExport], 'function');

  const smokeResult = await Promise.resolve(pkg[matrix.smokeExport]());
  assert.strictEqual(smokeResult, true);

  clearTimeout(timeout);
  console.log('phase-T smoke export and fixtures ok');
})().catch(err => {
  clearTimeout(timeout);
  console.error(err);
  process.exit(1);
});
