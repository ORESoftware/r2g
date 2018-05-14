import fs = require('fs');
import path = require('path');
import * as util from "util";
import * as assert from "assert";
import {getCleanTrace} from 'clean-trace';

process.chdir(__dirname);
const nm = path.resolve(__dirname + '/node_modules');
const pkgJSON = require(__dirname + '/package.json');
const deps = Object.assign({}, pkgJSON.dependencies || {}, pkgJSON.devDependencies || {});

const links = fs.readdirSync(nm).filter(function (v) {
  // return fs.statSync(v).isSymbolicLink();
  return deps[v];
})
.map(function (v) {
  return path.join(nm, v);
});

const getAllPromises = async function (links: Array<string>) {
  return Promise.all(links.map(function (l) {
    
    let mod: any;
    try {
      mod = require(l);
    }
    catch (err) {
      console.error('Could not load your package with path:', l);
      throw getCleanTrace(err);
    }
    try {
      assert.equal(typeof mod.r2gSmokeTest, 'function');
    }
    catch (err) {
      console.error('A module failed to export a function from "main" with key "r2gSmokeTest".');
      console.error('The module missing this export has the following path:');
      console.error(l);
      throw getCleanTrace(err);
    }
    
    return Promise.resolve(mod.r2gSmokeTest())
    .then((v: any) => ({path: l, result: v}));
  }));
};

getAllPromises(links)
.then(function (results) {
  
  console.log('This many packages were tested:', results.length);
  
  let failure = null;
  
  const every = results.every(function (v) {
    const r = Boolean(v.result);
    if (r === false) failure = v;
    return r;
  });
  
  if (!every) {
    if (!failure) {
      throw new Error('Missing failure object.');
    }
    throw new Error(util.inspect(failure, {breakLength: Infinity}));
  }
  
  console.log('r2g smoke test passed');
  process.exit(0);
  
})
.catch(function (err) {
  
  console.log('r2g smoke test failed:');
  console.error(getCleanTrace(err));
  process.exit(1);
  
});


