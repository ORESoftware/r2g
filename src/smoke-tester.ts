#!/usr/bin/env node
'use strict';

import fs = require('fs');
import path = require('path');
import * as util from "util";
import * as assert from "assert";

// console.log('here is clean-trace location:',require.resolve('clean-trace'));

if (process.env.r2g_copy_smoke_tester !== 'yes') {
  
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
      .then((v: any) => ({path: l, result: v}));
    }));
  };
  
  getAllPromises(links).then(function (results) {
    
    console.log('This many packages were tested:', results.length);
    
    const failures = results.filter(function (v) {
      return !v.result;
    });
    
    if (failures.length > 1) {
      throw new Error(util.inspect(failures, {breakLength: Infinity}));
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
  // we write the file out
  fs.createReadStream(__filename).pipe(process.stdout);
}
