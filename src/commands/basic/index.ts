#!/usr/bin/env node
'use strict';


import chalk from 'chalk';
import log from '../../logger';

// Version and completion output must drain naturally when stdout is a pipe.
// Immediate process.exit() can truncate generated completion scripts.
import {handled, projectRoot} from './parse-cli-opts';

if (!handled) {
  process.once('exit', code => {
    log.info('r2g is exiting with code:', code);
  });

  log.info('Your project root:', projectRoot);
  log.info(chalk.bold.cyan('To see help for r2g run, using "r2g run --help".'));
  log.info(chalk.bold.cyan('To see help for r2g init, using "r2g init --help".'));
  log.info(chalk.bold('Otherwise, run "r2g --help"'));
  process.exitCode = 1;
}
