'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = require("chalk");
const isDebug = process.env.r2g_is_debug === 'yes';
exports.log = {
    info: console.log.bind(console),
    warning: console.error.bind(console, chalk_1.default.bold.yellow.bold('r2g warn:')),
    warn: console.error.bind(console, chalk_1.default.bold.magenta.bold('r2g warn:')),
    error: console.error.bind(console, chalk_1.default.redBright.bold('r2g error:')),
    debug: function (...args) {
        isDebug && console.log(chalk_1.default.yellowBright('r2g debug:'), ...arguments);
    }
};
exports.default = exports.log;
