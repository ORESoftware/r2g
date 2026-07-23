#!/usr/bin/env node
'use strict';


import chalk from 'chalk';
import log from '../../logger';

process.once('exit', code => {
  log.info('r2g is exiting with code:', code);
});

import {opts, projectRoot, cwd} from './parse-cli-opts';

log.info('Your project root:', projectRoot);
log.info(chalk.bold.cyan('To see help for r2g run, using "r2g run --help".'));
log.info(chalk.bold.cyan('To see help for r2g init, using "r2g init --help".'));
log.info(chalk.bold('Otherwise, run "r2g --help"'));
process.exit(1);
