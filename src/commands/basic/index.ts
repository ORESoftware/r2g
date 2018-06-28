#!/usr/bin/env node
'use strict';

import chalk from 'chalk';
import log from '../../logger';
import {opts, projectRoot, cwd} from './parse-cli-opts';

log.info('Your project root:', projectRoot);
log.info('Here were your command line args:');


process.argv.forEach((v,i) => {
  log.info(i, chalk.green(v));
});


log.info(chalk.bold.cyan('To see help for r2g run, using "r2g run --help".'));
log.info(chalk.bold.cyan('To see help for r2g init, using "r2g init --help".'));
process.exit(1);
