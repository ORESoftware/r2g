#!/usr/bin/env node
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = require("chalk");
const logger_1 = require("../../logger");
process.once('exit', code => {
    logger_1.default.info('r2g is exiting with code:', code);
});
const parse_cli_opts_1 = require("./parse-cli-opts");
logger_1.default.info('Your project root:', parse_cli_opts_1.projectRoot);
logger_1.default.info(chalk_1.default.bold.cyan('To see help for r2g run, using "r2g run --help".'));
logger_1.default.info(chalk_1.default.bold.cyan('To see help for r2g init, using "r2g init --help".'));
logger_1.default.info(chalk_1.default.bold('Otherwise, run "r2g --help"'));
process.exit(1);
