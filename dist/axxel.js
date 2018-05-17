#!/usr/bin/env node
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
let pkg = process.argv[2];
let keyv = process.argv[3] || '';
if (!pkg) {
    throw new Error('must pass a path to package.json');
}
if (!path.isAbsolute(pkg)) {
    pkg = path.resolve(process.cwd() + '/' + pkg);
}
const pkgJSON = require(pkg);
const keys = String(keyv).split('.').filter(Boolean);
try {
    let result = keys.reduce(function (a, b) {
        return a[b] || '';
    }, pkgJSON);
    if (typeof result !== 'string') {
        result = JSON.stringify(result);
    }
    console.log(result);
}
catch (err) {
    console.error(err.message);
}
