'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const async = require("async");
const logger_1 = require("../../logger");
const util = require("util");
const chalk_1 = require("chalk");
exports.renameDeps = function (projectMap, pkgJSONPath, cb) {
    logger_1.default.info('here is the project map now:');
    Object.keys(projectMap).forEach(function (k) {
        logger_1.default.info(chalk_1.default.bold(k), chalk_1.default.blueBright(util.inspect(projectMap[k])));
    });
    async.autoInject({
        rereadPkgJSON: function (cb) {
            fs.readFile(pkgJSONPath, function (err, data) {
                if (err) {
                    return cb(err, null);
                }
                try {
                    return cb(null, JSON.parse(String(data)));
                }
                catch (err) {
                    return cb(err, null);
                }
            });
        },
        saveNewJSONFileToDisk: function (rereadPkgJSON, cb) {
            const updateTheDepKV = function () {
                [
                    rereadPkgJSON.dependencies,
                    rereadPkgJSON.devDependencies,
                    rereadPkgJSON.optionalDependencies
                ]
                    .forEach(function (d) {
                    d = d || {};
                    Object.keys(d).forEach(function (k) {
                        const v = d[k];
                        if (v && projectMap[k]) {
                            d[k] = 'file://' + projectMap[k];
                        }
                        else if (v && String(v).startsWith('file:')) {
                            logger_1.default.error('The following dep has a file:// key, but does not exist in generated map => ' + k);
                            throw 'Please check your package.json file: ' + util.inspect(rereadPkgJSON);
                        }
                    });
                });
            };
            let str = null;
            try {
                updateTheDepKV();
                str = JSON.stringify(rereadPkgJSON, null, 2);
                logger_1.default.debug('Updated package.json file:', rereadPkgJSON);
            }
            catch (err) {
                return process.nextTick(cb, err, null);
            }
            fs.writeFile(pkgJSONPath, str, function (err) {
                if (err) {
                    return cb(err, null);
                }
                fs.readFile(pkgJSONPath, 'utf8', function (err, data) {
                    if (err) {
                        return cb(err, null);
                    }
                    logger_1.default.info(chalk_1.default.bold('here is the updated package.json file:'), data);
                    cb(null, null);
                });
            });
        }
    }, cb);
};
