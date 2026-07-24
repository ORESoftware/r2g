#!/usr/bin/env node
'use strict';


import chalk from 'chalk';
import log from '../../logger';

// parse-cli-opts handles --version/--completion by exiting early; the exit
// hook is registered after it so their stdout stays clean (completion
// output gets sourced by the shell).
import {opts, projectRoot, cwd} from './parse-cli-opts';

process.once('exit', code => {
  log.info('r2g is exiting with code:', code);
});

log.info('Your project root:', projectRoot);
log.info(chalk.bold.cyan('To see help for r2g run, using "r2g run --help".'));
log.info(chalk.bold.cyan('To see help for r2g init, using "r2g init --help".'));
log.info(chalk.bold('Otherwise, run "r2g --help"'));
process.exit(1);
