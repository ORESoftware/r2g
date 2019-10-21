#!/usr/bin/env node
'use strict';

import chalk from 'chalk';
import log from '../../logger';
import * as stdio from 'json-stdio';

process.once('exit', code => {
  log.info('r2g is exiting with code:', code);
});

const pkgJSON = require('../../../package.json');


import {opts} from './parse-cli-opts';

if (opts.json) {
  stdio.log({versions: {r2g: pkgJSON.version}});
}
else {
  console.log('r2g version:', chalk.bold(pkgJSON.version));
}

process.exit(0);
