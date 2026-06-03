#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const fixturesDir = path.resolve(__dirname, '../fixtures');
const matrixPath = path.resolve(fixturesDir, 'phase-matrix.json');
const samplePath = path.resolve(fixturesDir, 'sample-input.txt');
const readmePath = path.resolve(fixturesDir, 'readme.md');

assert.strictEqual(fs.existsSync(matrixPath), true, 'phase matrix fixture was not copied.');
assert.strictEqual(fs.existsSync(samplePath), true, 'sample text fixture was not copied.');
assert.strictEqual(fs.existsSync(readmePath), true, 'fixtures readme was not copied.');

const matrix = require(matrixPath);
assert.strictEqual(matrix.phaseCommands.t, '.r2g/tests');
assert.strictEqual(matrix.features.fixtures, '.r2g/fixtures');
assert.strictEqual(matrix.features.packageOverride, '.r2g/package.override.js');
assert.deepStrictEqual(Object.keys(matrix.phaseCommands).sort(), ['s', 't', 'z']);

const tempPackageJSONPath = path.resolve(__dirname, '../package.json');
if (fs.existsSync(tempPackageJSONPath)) {
  const tempPackageJSON = require(tempPackageJSONPath);
  assert.strictEqual(tempPackageJSON.r2g.packageOverride, true);
  assert.strictEqual(tempPackageJSON.r2g.packageOverrideSource, '.r2g/package.override.js');
}

const sample = fs.readFileSync(samplePath, 'utf8').trim().split(/\r?\n/);
assert.deepStrictEqual(sample, [
  'fixture-token: r2g-phase-t',
  'package: r2g',
  'expected-export: r2gSmokeTest'
]);

console.log('phase-T fixture copy contract ok');
