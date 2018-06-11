#!/usr/bin/env node
'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
var util = require("util");
var assert = require("assert");
if (process.env.r2g_copy_smoke_tester !== 'yes') {
    process.chdir(__dirname);
    var nm = path.resolve(__dirname + '/node_modules');
    var pkgJSON = require(__dirname + '/package.json');
    var deps = Object.assign({}, pkgJSON.dependencies || {}, pkgJSON.devDependencies || {});
    var links = Object.keys(deps);
    if (links.length < 1) {
        throw new Error('no requireable packages in package.json to smoke test with r2g.');
    }
    var getAllPromises = function (links) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2, Promise.all(links.map(function (l) {
                        var mod;
                        try {
                            mod = require(l);
                        }
                        catch (err) {
                            console.error('Could not load your package with path:', l);
                            throw err;
                        }
                        try {
                            assert.equal(typeof mod.r2gSmokeTest, 'function');
                        }
                        catch (err) {
                            console.error('A module failed to export a function from "main" with key "r2gSmokeTest".');
                            console.error('The module missing this export has the following path:');
                            console.error(l);
                            throw err;
                        }
                        return Promise.resolve(mod.r2gSmokeTest())
                            .then(function (v) { return ({ path: l, result: v }); });
                    }))];
            });
        });
    };
    getAllPromises(links).then(function (results) {
        console.log('This many packages were tested:', results.length);
        var failures = results.filter(function (v) {
            return !v.result;
        });
        if (failures.length > 1) {
            throw new Error(util.inspect(failures, { breakLength: Infinity }));
        }
        console.log('r2g smoke test passed');
        process.exit(0);
    })
        .catch(function (err) {
        console.log('r2g smoke test failed:');
        console.error(err);
        process.exit(1);
    });
}
else {
    fs.createReadStream(__filename).pipe(process.stdout);
}
