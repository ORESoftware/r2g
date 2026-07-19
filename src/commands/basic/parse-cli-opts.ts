'use strict';

import path = require('path');
import {completionScript, findProjectRoot, parseCommand} from '../../cli/flags';

const pkgJSON = require('../../../package.json');
const opts = parseCommand('basic');

if (opts.version) {
  if (opts.json) {
    console.log(JSON.stringify({versions: {r2g: pkgJSON.version}}));
  }
  else {
    console.log('r2g version:', pkgJSON.version);
  }
  process.exit(0);
}

if (opts.bash_completion) {
  console.log(completionScript('bash'));
  process.exit(0);
}

const cwd = process.cwd();
const projectRoot = findProjectRoot(cwd, 'npm', opts.project) || path.resolve(cwd);

export {opts, cwd, projectRoot};
