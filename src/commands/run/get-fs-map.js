'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fs = require("fs");
const async = require("async");
const logger_1 = require("../../logger");
const util = require("util");
const chalk_1 = require("chalk");
const searchedPaths = {};
const isPathSearchableBasic = function (item) {
    item = path.normalize(item);
    if (!path.isAbsolute(item)) {
        throw new Error('Path to be searched is not absolute:' + item);
    }
    if (searchedPaths[item]) {
        return false;
    }
    return true;
};
const q = async.queue((task, cb) => task(cb), 8);
exports.getFSMap = function (opts, searchRoots, packages, cb) {
    const pths = [];
    searchRoots.map(d => String(d || '').trim())
        .filter(Boolean)
        .sort((a, b) => (a.length - b.length))
        .forEach(v => {
        const s = !pths.some(p => {
            return p.startsWith(v + '/');
        });
        if (s) {
            pths.push(v);
        }
    });
    const map = {};
    const searchDir = function (dir, cb) {
        searchedPaths[dir] = true;
        q.push(callback => {
            fs.readdir(dir, (err, items) => {
                callback(null);
                if (err) {
                    logger_1.default.warn('Could not read directory at path:', dir);
                    if (String(err.message || err).match(/permission denied/)) {
                        return cb(null);
                    }
                    return cb(err);
                }
                const mappy = (itemv, cb) => {
                    const item = path.resolve(dir + '/' + itemv);
                    fs.lstat(item, (err, stats) => {
                        if (err) {
                            logger_1.default.warn(err.message);
                            return cb(null);
                        }
                        if (stats.isSymbolicLink()) {
                            opts.verbosity > 2 && logger_1.default.warn('looks like a symbolic link:', item);
                            return cb(null);
                        }
                        if (stats.isDirectory()) {
                            if (!isPathSearchableBasic(item)) {
                                return cb(null);
                            }
                            for (let v of ['/.npm', '/.cache', '/node_modules', '/.nvm']) {
                                if (item.endsWith(v)) {
                                    return cb(null);
                                }
                            }
                            return searchDir(item, cb);
                        }
                        if (!item.endsWith('/package.json')) {
                            return cb(null);
                        }
                        if (!stats.isFile()) {
                            logger_1.default.warn('unexpected non-file here:', item);
                            return cb(null);
                        }
                        fs.readFile(item, (err, data) => {
                            if (err) {
                                return cb(err);
                            }
                            let parsed = null, linkable = null;
                            try {
                                parsed = JSON.parse(String(data));
                            }
                            catch (err) {
                                logger_1.default.error('trouble parsing package.json file at path => ', item);
                                logger_1.default.error(err.message);
                                return cb(err);
                            }
                            try {
                                linkable = parsed.r2g.linkable;
                            }
                            catch (err) {
                            }
                            if (linkable === false) {
                                return cb(null);
                            }
                            if (parsed && parsed.name) {
                                let nm = parsed.name;
                                if (map[nm] && packages[nm]) {
                                    logger_1.default.warn('the following package may exist in more than one place on your fs =>', chalk_1.default.magenta(nm));
                                    logger_1.default.warn('pre-existing place => ', chalk_1.default.blueBright(map[nm]));
                                    logger_1.default.warn('new place => ', chalk_1.default.blueBright(item));
                                    return cb(new Error('The following requested package name exists in more than 1 location on disk, and r2g does not know which one to use ... ' +
                                        chalk_1.default.magentaBright.bold(util.inspect({ name: nm, locations: [map[nm], item] }))));
                                }
                                else if (packages[parsed.name]) {
                                    logger_1.default.info('added the following package name to the map:', parsed.name);
                                    map[parsed.name] = item;
                                }
                            }
                            cb(null);
                        });
                    });
                };
                async.eachLimit(items, 4, mappy, cb);
            });
        });
    };
    pths.forEach(v => {
        if (isPathSearchableBasic(v)) {
            searchDir(v, function (err) {
                err && logger_1.default.error('unexpected error:', err.message || err);
                cb(err, map);
            });
        }
    });
};
