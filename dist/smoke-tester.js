"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const util = require("util");
process.chdir(__dirname);
const nm = path.resolve(__dirname + '/node_modules');
const links = fs.readdirSync(nm).map(function (v) {
    return path.join(nm, v);
})
    .filter(function (v) {
    return fs.statSync(v).isSymbolicLink();
});
Promise.all(links.map(function (l) {
    return require(l).r2gSmokeTest().then((v) => ({ path: l, result: v }));
}))
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
