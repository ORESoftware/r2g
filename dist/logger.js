'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = require("chalk");
const isDebug = process.env.r2g_is_debug === 'yes';
exports.log = {
    info: console.log.bind(console, chalk_1.default.gray('[r2g info]')),
    warn: console.error.bind(console, chalk_1.default.bold.magenta.bold('[r2g warn]')),
    error: console.error.bind(console, chalk_1.default.redBright.bold('[r2g error]')),
    debug: function (...args) {
        isDebug && console.log('[r2g]', ...arguments);
    }
};
exports.default = exports.log;
