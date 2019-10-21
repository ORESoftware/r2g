'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const cli_options_1 = require("./cli-options");
const cli_options_2 = require("../init/cli-options");
const cli_options_3 = require("../run/cli-options");
const dashdash = require('dashdash');
const residence = require("residence");
const chalk_1 = require("chalk");
const allowUnknown = process.argv.indexOf('--allow-unknown') > 0;
const parser = dashdash.createParser({ options: cli_options_1.default, allowUnknown });
const pkgJSON = require('../../../package.json');
const logger_1 = require("../../logger");
const stdio = require("json-stdio");
let opts;
exports.opts = opts;
try {
    exports.opts = opts = parser.parse(process.argv);
}
catch (e) {
    console.error(chalk_1.default.magenta('r2g: cli parsing error:'), chalk_1.default.magentaBright.bold(e.message));
    process.exit(1);
}
if (opts.help) {
    logger_1.default.warning(chalk_1.default.bold.cyan('To get help for r2g run, use:', chalk_1.default.bold.blueBright('r2g run --help')));
    logger_1.default.warning(chalk_1.default.bold.cyan('To get help for r2g init, use:', chalk_1.default.bold.blueBright('r2g init --help')));
    let help = parser.help({ includeEnv: true }).trimRight();
    console.log();
    console.log('usage: r2g [OPTIONS]\n' + help);
    process.exit(0);
}
if (opts.version) {
    if (opts.json) {
        stdio.log({ versions: { r2g: pkgJSON.version } });
    }
    else {
        console.log('r2g version:', chalk_1.default.bold(pkgJSON.version));
    }
    process.exit(0);
}
const flattenDeep = function (arr1) {
    return arr1.reduce((acc, val) => Array.isArray(val) ? acc.concat(flattenDeep(val)) : acc.concat(val), []);
};
if (opts.bash_completion) {
    const allOpts = flattenDeep([cli_options_2.default, cli_options_3.default, cli_options_1.default]);
    let generatedBashCode = dashdash.bashCompletionFromOptions({
        name: 'r2g',
        options: allOpts,
        includeHidden: false
    });
    console.log(generatedBashCode);
    process.exit(0);
}
const cwd = process.cwd();
exports.cwd = cwd;
const projectRoot = residence.findProjectRoot(cwd);
exports.projectRoot = projectRoot;
if (!projectRoot) {
    throw chalk_1.default.magenta('Could not find a project root given your current working directory => ') + chalk_1.default.magenta.bold(cwd);
}
