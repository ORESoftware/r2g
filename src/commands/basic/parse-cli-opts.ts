'use strict';

import path = require('path');
import {completionScript, findProjectRoot, parseCommand} from '../../cli/flags';

const pkgJSON = require('../../../package.json');
const opts = parseCommand('basic');
let handled = false;

if (opts.version) {
  const output = opts.json
    ? JSON.stringify({versions: {r2g: pkgJSON.version}})
    : `r2g version: ${pkgJSON.version}`;
  process.stdout.write(output + '\n');
  handled = true;
}
else if (opts.bash_completion) {
  process.stdout.write(completionScript('bash') + '\n');
  handled = true;
}

const cwd = process.cwd();
const projectRoot = findProjectRoot(cwd, 'npm', opts.project) || path.resolve(cwd);

export {opts, cwd, projectRoot, handled};
