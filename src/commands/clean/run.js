'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const cp = require("child_process");
const path = require("path");
const async = require("async");
const clean_trace_1 = require("clean-trace");
const logger_1 = require("../../logger");
const chalk_1 = require("chalk");
const util = require("util");
const prepend_transform_1 = require("prepend-transform");
exports.run = function (cwd, projectRoot, opts) {
    const dir = path.resolve(process.env.HOME + `/.r2g/temp`);
    async.autoInject({
        clean(cb) {
            const k = cp.spawn('bash');
            k.stdin.end(`set -e; mkdir -p "${dir}"; rm -rf "${dir}"; mkdir -p "${dir}"`);
            k.stderr.pipe(prepend_transform_1.default('clean: ')).pipe(process.stderr);
            k.once('exit', code => {
                if (code > 0) {
                    logger_1.default.error('Could not clean dir at path:', dir);
                }
                cb(code);
            });
        },
    }, (err, results) => {
        if (err && err.OK) {
            logger_1.default.warn(chalk_1.default.blueBright('Your package may have been published with some problems:'));
            logger_1.default.warn(util.inspect(err));
        }
        else if (err) {
            throw clean_trace_1.getCleanTrace(err);
        }
        else {
            logger_1.default.info(chalk_1.default.green('Successfully cleaned all contents in dir:', chalk_1.default.bold(dir)));
        }
    });
};
