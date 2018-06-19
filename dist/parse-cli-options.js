'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const cli_options_1 = require("./cli-options");
const dashdash = require('dashdash');
const residence = require("residence");
const parser = dashdash.createParser({ options: cli_options_1.default });
let opts;
exports.opts = opts;
try {
    exports.opts = opts = parser.parse(process.argv);
}
catch (e) {
    console.error('foo: error: %s', e.message);
    process.exit(1);
}
if (opts.help) {
    let help = parser.help({ includeEnv: true }).trimRight();
    console.log('usage: node foo.js [OPTIONS]\n' + 'options:\n' + help);
    process.exit(0);
}
if (opts.version) {
    console.log('version:', 'foo');
    process.exit(0);
}
const cwd = process.cwd();
exports.cwd = cwd;
const projectRoot = residence.findProjectRoot(cwd);
exports.projectRoot = projectRoot;
