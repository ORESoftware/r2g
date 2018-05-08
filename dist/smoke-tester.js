"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const util = require("util");
const assert = require("assert");
process.chdir(__dirname);
const nm = path.resolve(__dirname + '/node_modules');
const pkgJSON = require(__dirname + '/package.json');
const deps = Object.assign({}, pkgJSON.dependencies || {}, pkgJSON.devDependencies || {});
const match = [/:[0-9]/];
const notMatch = [
    /bootstrap_node\.js/,
    /Function\.Module\.runMain/,
    /process\._tickCallback/,
    /at Module\._compile/,
    /\/node_modules\//
];
const getUsefulStack = function (e) {
    let err = (e && e.stack || e);
    if (typeof err !== 'string') {
        err = util.inspect(err, { breakLength: Infinity });
    }
    return String(err).split('\n')
        .filter(function (v, i) {
        if (i < 2)
            return true;
        return match.some(function (r) {
            return r.test(v);
        });
    })
        .filter(function (v, i) {
        if (i < 2)
            return true;
        return !notMatch.some(function (r) {
            return r.test(v);
        });
    })
        .join('\n');
};
const links = fs.readdirSync(nm).filter(function (v) {
    return deps[v];
})
    .map(function (v) {
    return path.join(nm, v);
});
const getAllPromises = function (links) {
    return __awaiter(this, void 0, void 0, function* () {
        return Promise.all(links.map(function (l) {
            let mod;
            try {
                mod = require(l);
            }
            catch (err) {
                console.error('Could not load your package with path:', l);
                throw getUsefulStack(err);
            }
            try {
                assert.equal(typeof mod.r2gSmokeTest, 'function');
            }
            catch (err) {
                console.error('A module failed to export a function from "main" with key "r2gSmokeTest".');
                console.error('The module missing this export has the following path:');
                console.error(l);
                throw getUsefulStack(err);
            }
            return Promise.resolve(mod.r2gSmokeTest())
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
        throw new Error(util.inspect(failure, { breakLength: Infinity }));
    }
    console.log('r2g smoke test passed');
    process.exit(0);
})
    .catch(function (err) {
    console.log('r2g smoke test failed:');
    console.error(getUsefulStack(err));
    process.exit(1);
});
