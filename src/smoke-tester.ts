#!/usr/bin/env node
'use strict';

import fs = require('fs');
import path = require('path');
import * as util from "util";
import * as assert from "assert";

////////////////////////////////////////////////////////////

const colors = <{ [key: string]: [number, number] }>{
  'bold': [1, 22],
  'italic': [3, 23],
  'underline': [4, 24],
  'inverse': [7, 27],
  'white': [37, 39],
  'grey': [90, 39],
  'black': [30, 39],
  'blue': [34, 39],
  'cyan': [36, 39],
  'green': [32, 39],
  'magenta': [35, 39],
  'red': [31, 39],
  'yellow': [33, 39]
};

const stylize = (color: string, str: string) => {
  const [start, end] = colors[color];
  return `\u001b[${start}m${str}\u001b[${end}m`;
};

/////////////////////

process.chdir(__dirname);
const nm = path.resolve(__dirname + '/node_modules');
const pkgJSON = require(__dirname + '/package.json');
const deps = Object.assign({}, pkgJSON.dependencies || {}, pkgJSON.devDependencies || {});
const links = Object.keys(deps);

if (links.length < 1) {
  throw new Error(stylize('red', 'no requireable packages in package.json to smoke test with r2g.'));
}

const getAllPromises = (links: Array<string>) => {
  return Promise.all(links.map(l => {
    
    let mod: any;
    
    try {
      console.log('loading the following module:', l);
      mod = require(l);
    }
    catch (err) {
      
      if (new RegExp(l).test(err.message)) {
        console.error(stylize('red', 'Could not load your package with name:'), stylize('bold', l));
        console.error(stylize('red', 'Because your module could not be loaded, it is likely that you have not built/compiled your project, or that your package.json name/main field is incorrect.'));
      }
      else {
        console.error(stylize('red', 'You may have a missing dependency in your project, or a dependency that should be in "dependencies" not in "devDependencies".'));
      }
      throw err;
    }
    
    try {
      assert.equal(typeof mod.r2gSmokeTest, 'function');
    }
    catch (err) {
      console.error(stylize('red', 'A module failed to export a function from "main" with key "r2gSmokeTest".'));
      console.error('The module/package missing this export has the following name:');
      console.error(stylize('red', l));
      throw err;
    }
    
    return Promise.resolve(mod.r2gSmokeTest()).then((v: any) => {
      console.log('resolved result for:', l, 'result is:', v);
      return {path: l, result: v};
    });
  }));
};

getAllPromises(links)
  .then(results => {
    
    console.log('This many packages were tested:', results.length);
    
    const failures = results.filter(v => {
      return !(v && v.result === true);
    });
    
    if (failures.length > 0) {
      console.error('At least one exported "r2gSmokeTest" function failed.');
      throw new Error(util.inspect(failures, {breakLength: Infinity}));
    }
    
    console.log('Your exported r2gSmokeTest function(s) have all passed');
    process.exit(0);
    
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });


