#!/usr/bin/env node
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var path = require("path");
var pkg = process.argv[2];
var keyv = process.argv[3] || '';
if (!pkg) {
    throw new Error('must pass a path to package.json');
}
if (!path.isAbsolute(pkg)) {
    pkg = path.resolve(process.cwd() + '/' + pkg);
}
var pkgJSON = require(pkg);
var keys = String(keyv).split('.').filter(Boolean);
try {
    var result = keys.reduce(function (a, b) {
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
