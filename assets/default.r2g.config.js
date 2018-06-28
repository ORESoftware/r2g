'use strict';

// NOTE : only include dependencies in this file, which are:
// 1. core modules
// 2. in your project's package.json file as dependencies (not devDependencies)

const path = require('path');

const searchRoot = path.resolve(process.env.MY_DOCKER_R2G_SEARCH_ROOT || process.env.HOME || '');

if (!path.isAbsolute(searchRoot)) {
  throw new Error('Please set the env var "MY_DOCKER_R2G_SEARCH_ROOT" to an absolute folder path,' +
    ' (note that user $HOME is usually not specific enough, and also that $HOME env var is empty).');
}

exports.default = {

  searchRoot,
  tests: '',
  packages: {}

};
