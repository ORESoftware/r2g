'use strict';

//core
import path = require('path');
import fs = require('fs');

//project
const cwd = process.cwd();
const down = [];
let found = false, p, cd;

const stat = function (p: string) {
  try {
    return fs.statSync(p).isFile();
  }
  catch (err) {
    if (!String(err.stack || err).match(/ENOENT: no such file or directory/i)) {
      throw err;
    }
    //explicit for your pleasure
    return false;
  }
};

while (true) {
  
  cd = path.resolve(cwd + down.join(''));
  
  if (String(cd) === String(path.sep)) {
    // We are down to the root => fail
    break;
  }
  
  p = path.resolve(cd + '/package.json');
  
  if (stat(p)) {
    // Found local node_modules/.bin folder
    found = true;
    break;
  }
  
  down.push('/../');
}

if (found) {
  console.log(path.dirname(p));
  process.exit(0);
}
else {
  process.exit(1);
}
