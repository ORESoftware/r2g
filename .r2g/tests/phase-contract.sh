#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -d "./fixtures" ]] && [[ -d "./tests" ]]; then
  fixture_dir="./fixtures"
  test_dir="./tests"
else
  fixture_dir="$script_dir/../fixtures"
  test_dir="$script_dir"
fi

test -f "$fixture_dir/phase-matrix.json"
test -f "$fixture_dir/sample-input.txt"
test -f "$test_dir/smoke-test.js"

export R2G_PHASE_FIXTURE_DIR="$fixture_dir"

node <<'NODE'
'use strict';

const assert = require('assert');
const path = require('path');
const matrix = require(path.resolve(process.env.R2G_PHASE_FIXTURE_DIR, 'phase-matrix.json'));

assert.deepStrictEqual(matrix.phases, ['phase-Z', 'phase-S', 'phase-T']);
assert.deepStrictEqual(matrix.executionOrder, ['phase-Z', 'phase-S', 'phase-T']);
assert.strictEqual(matrix.phaseCommands.s, 'r2gSmokeTest');

console.log('phase-T shell contract ok');
NODE
