import fs = require('fs');
import path = require('path');
import * as util from "util";
import * as assert from "assert";

process.chdir(__dirname);
const nm = path.resolve(__dirname + '/node_modules');
const pkgJSON = require(__dirname + '/package.json');

const deps = Object.assign({}, pkgJSON.dependencies || {}, pkgJSON.devDependencies || {});

const match = [/:[0-9]/];
const notMatch = [/bootstrap_node\.js/, /Function\.Module\.runMain/, /process\._tickCallback/];

const getUsefulStack = function (err: Error) {
  return String(err.stack).split('\n')
  .filter(function (v, i) {
    if (i === 0) return true;
    return match.some(function (r) {
      return r.test(v);
    })
  })
  .filter(function (v, i) {
    if (i === 0) return true;
    return !notMatch.some(function (r) {
      return r.test(v);
    });
  })
  .join('\n')
};

const links = fs.readdirSync(nm).filter(function (v) {
  // return fs.statSync(v).isSymbolicLink();
  return deps[v];
})
.map(function (v) {
  return path.join(nm, v);
});

const getAllPromises = function (links: Array<string>) {
  return Promise.resolve(null).then(function () {
    return Promise.all(links.map(function (l) {
      
      let mod: any;
      
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
        console.error('Your module must export a function with key "r2gSmokeTest".');
        throw getUsefulStack(err);
      }
      
      return Promise.resolve(mod.r2gSmokeTest())
      .then((v: any) => ({path: l, result: v}));
    }));
  });
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


