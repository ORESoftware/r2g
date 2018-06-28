'use strict';

import cp = require('child_process');
import path = require("path");
import fs = require('fs');
import async = require('async');
import {getCleanTrace} from 'clean-trace';
import * as util from "util";
import * as assert from 'assert';

// project
import log from '../../logger';
import chalk from "chalk";
import {EVCallback} from "../../index";
import {getFSMap} from "./get-fs-map";
import {renameDeps} from "./rename-deps";
import {installDeps} from "./copy-deps";

///////////////////////////////////////////////

const r2gProject = path.resolve(process.env.HOME + '/.r2g/temp/project');
const r2gProjectCopy = path.resolve(process.env.HOME + '/.r2g/temp/copy');
const smokeTester = require.resolve('../../smoke-tester.js');

export interface Packages {
  [key: string]: boolean | string
}

export const run = function (cwd: string, projectRoot: string, opts: any) {

  const userHome = path.resolve(process.env.HOME);

  let pkgJSON = null, docker2gConf = null, packages: Packages = null, searchRoot = '', pkgName = '';

  const pkgJSONPth = path.resolve(projectRoot + '/package.json');

  try {
    pkgJSON = require(pkgJSONPth);
    pkgName = pkgJSON.name;
  }
  catch (err) {
    log.error(chalk.magentaBright('Could not read your projects package.json file.'));
    throw getCleanTrace(err);
  }

  if (!(pkgName && typeof pkgName === 'string')) {
    throw new Error(
      'Your package.json file does not appear to have a proper name field. Here is the file:\n' + util.inspect(pkgJSON)
    );
  }

  pkgName = String(pkgName).replace(/[^0-9a-z]/gi, '_');

  if (pkgName.startsWith('_')) {
    pkgName = pkgName.slice(1);
  }

  try {
    docker2gConf = require(projectRoot + '/.r2g/config.js');
    docker2gConf = docker2gConf.default || docker2gConf;
  }
  catch (err) {

    log.warn(chalk.magentaBright('Could not read your .r2g/config.js file.'));

    if (process.env.r2g_is_docker === 'yes') {
      throw getCleanTrace(err);
    }

    docker2gConf = require('../../../assets/default.r2g.config.js');
    docker2gConf = docker2gConf.default || docker2gConf;

    process.once('exit', code => {
      log.warn(chalk.magentaBright('Note that during this run, r2g could not read your .r2g/config.js file.'))
    });

  }

  packages = docker2gConf.packages;
  searchRoot = path.resolve(docker2gConf.searchRoot || '');

  if (!(packages && typeof packages === 'object')) {
    log.error(docker2gConf);
    throw new Error('You need a property called "packages" in your .r2g/config.js file.');
  }

  if (!(searchRoot && typeof searchRoot === 'string')) {
    log.error(docker2gConf);
    throw new Error('You need a property called "searchRoot" in your .r2g/config.js file.');
  }

  if (!path.isAbsolute(searchRoot)) {
    log.error(docker2gConf);
    throw new Error('Your "searchRoot" property in your .r2g/config.js file, needs to be an absolute path.');
  }

  try {
    assert(fs.lstatSync(searchRoot).isDirectory());
  }
  catch (err) {
    log.error('Your "searchRoot" property does not seem to exist as a directory on the local/host filesystem.');
    log.error('In other words, the following path does not seem to be a directory:');
    log.error(searchRoot);
    throw getCleanTrace(err);
  }

  if (!searchRoot.startsWith(userHome)) {
    throw new Error('Your searchRoot needs to be within your user home directory.');
  }

  const dependenciesToInstall = Object.keys(packages);
  if (dependenciesToInstall.length < 1) {
    log.warn('You should supply some packages to link, otherwise this is somewhat pointless.');
    log.warn('Here is your configuration:\n', docker2gConf);
  }

  const deps = [
    pkgJSON.dependencies || {},
    pkgJSON.devDependencies || {},
    pkgJSON.optionalDependencies || {}
  ];

  const allDeps = deps.reduce(Object.assign, {});

  Object.keys(packages).forEach(function (k) {
    if (!allDeps[k]) {
      log.warn(chalk.gray('You have the following packages key in your .r2g/config.js file:'), chalk.magentaBright(k));
      log.warn(chalk.bold(`But "${chalk.magentaBright(k)}" is not present as a dependency in your package.json file.`));
    }
  });

  let mapObject = function (obj: any, fn: Function, ctx?: object) {
    return Object.keys(obj).reduce((a: any, b) => {
      return (a[b] = fn.call(ctx || null, b, obj[b])), a;
    }, {});
  };

  const depsDir = path.resolve(process.env.HOME + `/.r2g/temp/deps`);

  async.autoInject({

      removeExistingProject(cb: EVCallback) {

        if (opts.keep || opts.multi) {
          log.info("We are keeping the previously installed packages because '--keep' / '--multi' was used.");
          return process.nextTick(cb);
        }

        log.info('Removing existing files within "$HOME/.r2g.temp"...');
        const k = cp.spawn('bash');
        k.stdin.end(`rm -rf "$HOME/.r2g/temp"`);
        k.once('exit', cb);

      },

      mkdirpProject(removeExistingProject: any, cb: EVCallback) {

        log.info('Making sure the right folders exist using mkdir -p ...');
        const k = cp.spawn('bash');
        k.stderr.pipe(process.stderr);
        k.stdin.end(`mkdir -p "${r2gProject}"; mkdir -p "${r2gProjectCopy}";`);
        k.once('exit', function (code) {
          if (code > 0) log.error("Could not create temp/project or temp/copy directory.");
          cb(code);
        });

      },

      rimrafDeps(mkdirpProject: any, cb: EVCallback) {

        log.info('Removing existing files within "$HOME/.r2g.temp"...');
        const k = cp.spawn('bash');
        k.stdin.end(`rm -rf "${depsDir}"`);
        k.once('exit', cb);

      },

      mkdirDeps(rimrafDeps: any, cb: EVCallback) {

        log.info('Removing existing files within "$HOME/.r2g.temp"...');
        const k = cp.spawn('bash');
        k.stdin.end(`mkdir -p "${depsDir}"`);
        k.once('exit', cb);

      },

      getMap(cb: EVCallback) {

        if (!opts.full) {
          log.info('we are not creating a deps map since the --full option was not used.');
          return process.nextTick(cb, null, {});
        }

        if (process.env.r2g_is_docker === 'yes') {
          log.info('we are not creating a deps map since we are using docker.r2g');
          return process.nextTick(cb, null, {});
        }

        getFSMap(opts, searchRoot, packages, cb);
      },

      copyProjectsInMap: function (getMap: any, cb: EVCallback) {

        if (Object.keys(getMap).length < 1) {
          return process.nextTick(cb, null, {});
        }

        installDeps(getMap, dependenciesToInstall, opts, cb);
      },

      renamePackagesToAbsolute: function (copyProjectsInMap: any, copyProject: any, cb: EVCallback) {

        if (Object.keys(copyProjectsInMap).length < 1) {
          return process.nextTick(cb, null, {});
        }

        const pkgJSONPath = path.resolve(copyProject + '/package.json');
        renameDeps(copyProjectsInMap, pkgJSONPath, cb);
      },

      copyProject(mkdirpProject: any, cb: EVCallback) {

        if (process.env.r2g_is_docker === 'yes') {
          log.info('We are not copying the project since we are using r2g.docker');
          return process.nextTick(cb, null, projectRoot);
        }

        log.info('Copying your project to "$HOME/.r2g/temp/copy" using rsync ...');

        const k = cp.spawn('bash');
        k.stderr.pipe(process.stderr);
        k.stdin.end(`rm -rf ${r2gProjectCopy}; rsync -r --exclude="node_modules" "${projectRoot}" "${r2gProjectCopy}";`);
        k.once('exit', function (code) {
          if (code > 0) log.error('Could not rimraf project copy path or could not copy to it using rsync.');
          cb(code, path.resolve(r2gProjectCopy + '/' + path.basename(projectRoot)));
        });

      },

      runNpmPack(renamePackagesToAbsolute: any, copyProject: string, cb: EVCallback) {

        log.info('Running "npm pack" against your project ...');

        const k = cp.spawn('bash', [], {
          cwd: copyProject
        });

        k.stdin.end(`npm pack --loglevel=warn;`);
        let stdout = '';
        k.stdout.on('data', d => {
          stdout += String(d || '').trim();
        });
        k.stderr.pipe(process.stderr);
        k.once('exit', function (code) {
          if (code > 0) log.error(`Could not run "npm pack" for this project => ${copyProject}.`);
          cb(code, path.resolve(copyProject + '/' + stdout));
        });
      },

      copySmokeTester(mkdirpProject: any, cb: EVCallback) {

        log.info(`Copying the smoke-tester.js file to "${r2gProject}" ...`);

        fs.createReadStream(smokeTester)
        .pipe(fs.createWriteStream(path.resolve(r2gProject + '/smoke-tester.js')))
        .once('error', cb)
        .once('finish', cb);
      },

      copyPackageJSON(mkdirpProject: any, cb: EVCallback) {

        log.info(`Copying a "blank" package.json file to "${r2gProject}" ...`);

        const k = cp.spawn('bash', [], {
          cwd: r2gProject
        });
        k.stderr.pipe(process.stderr);
        k.stdin.end(`r2g_copy_package_json "${r2gProject}" ${opts.keep || ''};`);
        k.once('exit', cb);
      },

      runNpmInstall(copyPackageJSON: any, runNpmPack: string, cb: EVCallback) {
        // runNpmPack is the path to .tgz file

        const cmd = `npm install --loglevel=warn --cache-min 9999999 --production "${runNpmPack}";`;
        log.info(`Running the following command via this dir: "${r2gProject}" ...`);
        log.info(chalk.blueBright(cmd));

        const k = cp.spawn('bash', [], {
          cwd: r2gProject
        });
        k.stdin.end(cmd);
        k.stderr.pipe(process.stderr);
        k.once('exit', cb);
      },

      r2gSmokeTest(runNpmInstall: any, copySmokeTester: any, cb: EVCallback) {

        log.info(`Running your exported r2gSmokeTest function(s) in "${r2gProject}" ...`);

        const k = cp.spawn('bash', [], {
          cwd: r2gProject
        });
        k.stderr.pipe(process.stderr);
        k.stdout.pipe(process.stdout);
        k.stdin.end(`node smoke-tester.js;`);
        k.once('exit', code => {
          if (code > 0) log.error('r2g smoke test failed.');
          cb(code);
        });
      },

      copyUserDefinedTests(copyProject: string, cb: EVCallback) {

        log.info(`Copying your user defined tests to: "${r2gProject}" ...`);

        const k = cp.spawn('bash', [], {
          cwd: copyProject
        });
        k.stdout.pipe(process.stdout);
        k.stderr.pipe(process.stderr);
        k.stdin.end(`r2g_copy_user_defined_tests "${r2gProject}";`);
        k.once('exit', cb);

      },

      runUserDefinedTests(copyUserDefinedTests: any, r2gSmokeTest: any, runNpmInstall: any, cb: EVCallback) {

        log.info(`Running user defined tests in "${r2gProject}" ...`);

        const k = cp.spawn('bash', [], {
          cwd: r2gProject
        });
        k.stdout.pipe(process.stdout);
        k.stderr.pipe(process.stderr);
        k.stdin.end(`r2g_run_user_defined_tests;`);
        k.once('exit', cb);
      }

    },

    function (err: any, results) {

      if (err && err.OK) {
        log.warn(chalk.blueBright('r2g may have run with some problems.'));
        log.warn(util.inspect(err));
      }
      else if (err) {
        throw getCleanTrace(err);
      }
      else {
        log.info(chalk.green('Successfully ran r2g/docker.r2g'))
      }

      process.exit(0);

    });

};

