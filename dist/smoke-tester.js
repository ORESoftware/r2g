"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const util = require("util");
process.chdir(__dirname);
const nm = path.resolve(__dirname + '/node_modules');
const pkgJSON = require(__dirname + '/package.json');
const deps = Object.assign({}, pkgJSON.dependencies || {}, pkgJSON.devDependencies || {});
const links = fs.readdirSync(nm).filter(function (v) {
    return deps[v];
})
    .map(function (v) {
    return path.join(nm, v);
});
const getAllPromises = function (links) {
    return Promise.resolve(null).then(function () {
        return Promise.all(links.map(function (l) {
            return Promise.resolve(require(l).r2gSmokeTest())
                .then((v) => ({ path: l, result: v }));
        }));
    });
};
getAllPromises(links)
    .then(function (results) {
    console.log('This many packages were tested:', results.length);
    let failure = null;
    const every = results.every(function (v) {
        const r = Boolean(v.result);
        if (r === false)
            failure = v;
        return r;
    });
    if (!every) {
        if (!failure) {
            throw new Error('Missing failure object.');
        }
        throw new Error(util.inspect(failure));
    }
    console.log('r2g smoke test passed');
    process.exit(0);
})
    .catch(function (err) {
    console.log('r2g smoke test failed:');
    console.error((err && err.stack) || (typeof err === 'string' ? err : util.inspect(err)));
    process.exit(1);
});
