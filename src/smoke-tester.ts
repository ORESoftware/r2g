#!/usr/bin/env node
'use strict';

import fs = require('fs');
import path = require('path');
import * as util from "util";
import * as assert from "assert";

////////////////////////////////////////////////////////////

process.chdir(__dirname);
const nm = path.resolve(__dirname + '/node_modules');
const pkgJSON = require(__dirname + '/package.json');
const deps = Object.assign({}, pkgJSON.dependencies || {}, pkgJSON.devDependencies || {});
const links = Object.keys(deps);

if (links.length < 1) {
  throw new Error('no requireable packages in package.json to smoke test with r2g.');
}

const getAllPromises = async function (links: Array<string>) {
  return Promise.all(links.map(function (l) {

    let mod: any;
    try {
      console.log('loading the following module:', l);
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
    .then((v: any) => {
      console.log('resolved result for:', l);
      console.log('result is:',v);
      return {path: l, result: v};
    });
  }));
};

getAllPromises(links).then(function (results) {

  console.log('This many packages were tested:', results.length);

  const failures = results.filter(function (v) {
    return v.result !== true;
  });

  if (failures.length > 0) {
    console.error('At least one exported "r2gSmokeTest" function failed.');
    throw new Error(util.inspect(failures, {breakLength: Infinity}));
  }

  console.log('Your exported r2gSmokeTest function(s) have all passed');
  process.exit(0);

})
.catch(function (err) {

  console.error(err);
  process.exit(1);

});


