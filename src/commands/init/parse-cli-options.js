'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const cli_options_1 = require("./cli-options");
const dashdash = require('dashdash');
const residence = require("residence");
const chalk_1 = require("chalk");
const allowUnknown = process.argv.indexOf('--allow-unknown') > 0;
const parser = dashdash.createParser({ options: cli_options_1.default, allowUnknown });
const pkgJSON = require('../../../package.json');
const logger_1 = require("../../logger");
let opts;
exports.opts = opts;
try {
    exports.opts = opts = parser.parse(process.argv);
}
catch (e) {
    logger_1.default.error(chalk_1.default.magenta('r2g init: cli parsing error:'), chalk_1.default.magentaBright.bold(e.message));
    process.exit(1);
}
if (opts.help) {
    let help = parser.help({ includeEnv: true }).trimRight();
    console.log('usage: r2g init [OPTIONS]\n' + help);
    process.exit(0);
}
if (opts.version) {
    console.log('r2g version:', pkgJSON.version);
    process.exit(0);
}
const cwd = process.cwd();
exports.cwd = cwd;
const projectRoot = residence.findProjectRoot(cwd);
exports.projectRoot = projectRoot;
if (!projectRoot) {
    throw chalk_1.default.magenta('Could not find a project root given your current working directory => ') + chalk_1.default.magenta.bold(cwd);
}
