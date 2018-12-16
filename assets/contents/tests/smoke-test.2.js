#!/usr/bin/env node
'use strict';

// see .r2g/tests/smoke-test.1.js for some instructions
// essentially, do not import any code here except core libraries

const assert = require('assert');
const path = require('path');
const cp = require('child_process');
const os = require('os');
const fs = require('fs');
const EE = require('events');


process.on('unhandledRejection', (reason, p) => {
  // note: unless we force process to exit with 1, process may exit with 0 upon an unhandledRejection
  console.error(reason);
  process.exit(1);
});

const to = setTimeout(() => {
  console.error('r2g phase-T test timed out.');
  process.exit(1);
}, 4000);
