#!/usr/bin/env node
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("../../logger");
process.once('exit', code => {
    logger_1.default.info('r2g is exiting with code:', code);
});
const parse_cli_options_1 = require("./parse-cli-options");
const m = require("./run");
m.run(parse_cli_options_1.cwd, parse_cli_options_1.projectRoot, parse_cli_options_1.opts);
