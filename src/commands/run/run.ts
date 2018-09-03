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
import {EVCb} from "../../index";
import {getFSMap} from "./get-fs-map";
import {renameDeps} from "./rename-deps";
import {installDeps} from "./copy-deps";
import pt from "prepend-transform";

///////////////////////////////////////////////

const r2gProject = path.resolve(process.env.HOME + '/.r2g/temp/project');
const r2gProjectCopy = path.resolve(process.env.HOME + '/.r2g/temp/copy');
const smokeTester = require.resolve('../../smoke-tester.js');

export interface Packages {
  [key: string]: boolean | string
}

interface BinFieldObject {
  [key: string]: string
}

const flattenDeep = function (a: Array<any>): Array<any> {
  return a.reduce((acc, val) => Array.isArray(val) ? acc.concat(flattenDeep(val)) : acc.concat(val), []);
};

export const run = (cwd: string, projectRoot: string, opts: any): void => {
  
  const userHome = path.resolve(process.env.HOME);
  
  let pkgJSON: any = null, r2gConf: any = null,
    packages: Packages = null, searchRoots: Array<string> = null,
    pkgName = '', cleanPackageName = '', zTest: string = null;
  
  if (opts.skip) {
    const skipped = String(opts.skip).split(',').map(v => String(v || '').trim().toLowerCase()).filter(Boolean);
    opts.z = opts.z || skipped.includes('z');
    opts.s = opts.s || skipped.includes('s');
    opts.t = opts.t || skipped.includes('t');
  }
  
  const pkgJSONPth = path.resolve(projectRoot + '/package.json');
  
  try {
    pkgJSON = require(pkgJSONPth);
    pkgName = pkgJSON.name;
    cleanPackageName = pkgJSON.name || '';
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
  
  try {
    zTest = pkgJSON.r2g.test;
  }
  catch (err) {
    if (!opts.z) {
      log.info('using "npm test" to run phase-Z.');
    }
  }
  
  zTest = zTest || 'npm test';
  assert(typeof zTest === 'string', 'z-test is not a string => check the r2g.test property in your package.json.');
  
  pkgName = String(pkgName).replace(/[^0-9a-z]/gi, '_');
  
  if (pkgName.startsWith('_')) {
    pkgName = pkgName.slice(1);
  }
  
  try {
    r2gConf = require(projectRoot + '/.r2g/config.js');
    r2gConf = r2gConf.default || r2gConf;
  }
  catch (err) {
    
    if (opts.verbosity > 2) {
      log.warning(chalk.yellow('Could not read your .r2g/config.js file.'));
    }
    
    if (process.env.r2g_is_docker === 'yes') {
      throw getCleanTrace(err);
    }
    
    r2gConf = require('../../../assets/default.r2g.config.js');
    r2gConf = r2gConf.default || r2gConf;
    
    process.once('exit', code => {
      if (code < 1) {
        if (opts.verbosity > 2) {
          log.warning(chalk.yellow.bold('Note that during this run, r2g could not read your .r2g/config.js file.'))
        }
      }
    });
    
  }
  
  packages = r2gConf.packages;
  searchRoots = flattenDeep([r2gConf.searchRoots, path.resolve(r2gConf.searchRoot || '')])
  .map(v => String(v || '').trim())
  .filter(Boolean);
  
  if (!(packages && typeof packages === 'object')) {
    log.error(r2gConf);
    throw new Error('You need a property called "packages" in your .r2g/config.js file.');
  }
  
  searchRoots.forEach(v => {
    
    if (!(v && typeof v === 'string')) {
      log.error(r2gConf);
      throw chalk.redBright('You need a property called "searchRoot"/"searchRoots" in your .r2g/config.js file.');
    }
    
    if (!path.isAbsolute(v)) {
      log.error(r2gConf);
      log.error('The following path is not absolute:', chalk.magenta(v));
      throw chalk.redBright('Your "searchRoot"/"searchRoots" property in your .r2g/config.js file, needs to be an absolute path.');
    }
    
    try {
      assert(fs.lstatSync(v).isDirectory());
    }
    catch (err) {
      log.error('Your "searchRoot" property does not seem to exist as a directory on the local/host filesystem.');
      log.error('In other words, the following path does not seem to be a directory:');
      log.error(v);
      throw getCleanTrace(err);
    }
    
    if (!v.startsWith(userHome)) {
      throw new Error('Your searchRoot needs to be within your user home directory.');
    }
    
  });
  
  const dependenciesToInstall = Object.keys(packages);
  if (dependenciesToInstall.length < 1) {
    log.debug('There were no local dependencies to install.');
    log.debug('Here is your configuration:\n', r2gConf);
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
  
  const depsDir = path.resolve(process.env.HOME + `/.r2g/temp/deps`);
  
  async.autoInject({
      
      removeExistingProject(cb: EVCb) {
        
        if (opts.keep || opts.multi) {
          log.info("We are keeping the previously installed packages because '--keep' / '--multi' was used.");
          return process.nextTick(cb);
        }
        
        log.info('Removing existing files within "$HOME/.r2g/temp"...');
        const k = cp.spawn('bash');
        k.stdin.end(`rm -rf "$HOME/.r2g/temp"`);
        k.once('exit', cb);
        
      },
      
      mkdirpProject(removeExistingProject: any, cb: EVCb) {
        
        log.info('Making sure the right folders exist using mkdir -p ...');
        const k = cp.spawn('bash');
        k.stderr.pipe(process.stderr);
        k.stdin.end(`mkdir -p "${r2gProject}"; mkdir -p "${r2gProjectCopy}";`);
        k.once('exit', code => {
          if (code > 0) log.error("Could not create temp/project or temp/copy directory.");
          cb(code);
        });
        
      },
      
      rimrafDeps(mkdirpProject: any, cb: EVCb) {
        
        log.info('Removing existing files within "$HOME/.r2g.temp"...');
        const k = cp.spawn('bash');
        k.stdin.end(`rm -rf "${depsDir}"`);
        k.once('exit', cb);
        
      },
      
      mkdirDeps(rimrafDeps: any, cb: EVCb) {
        
        log.info('Re-creating folders "$HOME/.r2g/temp"...');
        const k = cp.spawn('bash');
        k.stdin.end(`mkdir -p "${depsDir}"`);
        k.once('exit', cb);
        
      },
      
      getMap(cb: EVCb) {
        
        if (!opts.full) {
          log.info('we are not creating a deps map since the --full option was not used.');
          return process.nextTick(cb, null, {});
        }
        
        if (process.env.r2g_is_docker === 'yes') {
          log.info('we are not creating a deps map since we are using docker.r2g');
          return process.nextTick(cb, null, {});
        }
        
        getFSMap(opts, searchRoots, packages, cb);
      },
      
      copyProjectsInMap(getMap: any, cb: EVCb) {
        
        if (Object.keys(getMap).length < 1) {
          return process.nextTick(cb, null, {});
        }
        
        installDeps(getMap, dependenciesToInstall, opts, cb);
      },
      
      renamePackagesToAbsolute(copyProjectsInMap: any, copyProject: any, cb: EVCb) {
        
        if (Object.keys(copyProjectsInMap).length < 1) {
          return process.nextTick(cb, null, {});
        }
        
        const pkgJSONPath = path.resolve(copyProject + '/package.json');
        renameDeps(copyProjectsInMap, pkgJSONPath, cb);
      },
      
      copyProject(mkdirpProject: any, cb: EVCb) {
        
        if (process.env.r2g_is_docker === 'yes') {
          log.info('We are not copying the project since we are using r2g.docker');
          return process.nextTick(cb, null, projectRoot);
        }
        
        log.info('Copying your project to "$HOME/.r2g/temp/copy" using rsync ...');
        
        const k = cp.spawn('bash');
        k.stderr.pipe(process.stderr);
        k.stdin.end(`rm -rf ${r2gProjectCopy}; rsync -r --exclude="node_modules" "${projectRoot}" "${r2gProjectCopy}";`);
        k.once('exit', code => {
          if (code > 0) log.error('Could not rimraf project copy path or could not copy to it using rsync.');
          cb(code, path.resolve(r2gProjectCopy + '/' + path.basename(projectRoot)));
        });
        
      },
      
      runNpmPack(renamePackagesToAbsolute: any, copyProject: string, cb: EVCb<string>) {
        
        const cmd = `npm pack --loglevel=warn;`;
        log.info(chalk.bold('Running the following command from your project copy root:'), chalk.cyan.bold(cmd));
        
        const k = cp.spawn('bash', [], {
          cwd: copyProject
        });
        
        k.stdin.end(cmd);
        let stdout = '';
        k.stdout.on('data', d => {
          stdout += String(d || '').trim();
        });
        k.stderr.pipe(process.stderr);
        k.once('exit', code => {
          if (code > 0) log.error(`Could not run "npm pack" for this project => ${copyProject}.`);
          cb(code, path.resolve(copyProject + '/' + stdout));
        });
      },
      
      linkPackage(runNPMInstallInCopy: any, copyProject: string, cb: EVCb) {
        
        if (opts.z) {
          return process.nextTick(cb);
        }
        
        const getBinMap = function (bin: string | BinFieldObject, path: string, name: string) {
          
          if (!bin) {
            return ` echo "no bin items in package.json for package with name: ${name}" `;
          }
          
          if (typeof bin === 'string') {
            return ` mkdir -p "node_modules/.bin" && ln -s "${path}/${bin}" "node_modules/.bin/${name}" `
          }
          
          const keys = Object.keys(bin);
          
          if (keys.length < 1) {
            return ` echo "no bin items in package.json for package with name: ${name}" `;
          }
          
          return keys.map(function (k) {
            return ` mkdir -p node_modules/.bin && ln -sf "${path}/${bin[k]}" "node_modules/.bin/${k}" `
          })
          .join(' && ');
        };
        
        const cmd = [
          `mkdir -p "node_modules/${cleanPackageName}"`,
          `rm -rf "node_modules/${cleanPackageName}"`,
          `ln -sf "${r2gProject}/node_modules/${cleanPackageName}" "node_modules/${cleanPackageName}"`,
          // `rsync -r "${r2gProject}/node_modules/${cleanPackageName}" "node_modules"`,
          getBinMap(pkgJSON.bin, `${copyProject}/node_modules/${cleanPackageName}`, cleanPackageName)
        ]
        .join(' && ');
        
        const cwd = String(copyProject).slice(0);
        log.info(chalk.bold(`Running the following command from "${cwd}":`), chalk.bold.cyan(cmd));
        
        const k = cp.spawn('bash', [], {
          cwd
        });
        
        k.stderr.pipe(process.stderr);
        k.stdin.end(cmd);
        
        k.once('exit', code => {
          if (code > 0) log.error('Could not link from project to copy.');
          cb(code);
        });
        
      },
      
      runNPMInstallInCopy(runNpmInstall: any, copyProject: string, cb: EVCb) {
        
        if (opts.z) {
          return process.nextTick(cb);
        }
        
        const cmd = `npm install --cache-min 9999999 --loglevel=warn`;
        log.info(`Running "${cmd}" in project copy.`);
        
        const k = cp.spawn('bash', [], {
          cwd: copyProject
        });
        
        k.stderr.pipe(process.stderr);
        k.stdin.end(cmd);
        
        k.once('exit', code => {
          if (code > 0) log.error('Could not link from project to copy.');
          cb(code);
        });
        
      },
      
      runZTest(linkPackage: any, copyProject: string, cb: EVCb) {
        
        if (opts.z) {
          log.warn('Skipping phase-Z');
          return process.nextTick(cb);
        }
        
        const cmd = String(zTest).slice(0);
        
        log.info(chalk.bold('Running the following command from the copy project dir:'), chalk.cyan.bold(cmd));
        
        const k = cp.spawn('bash', [], {
          
          cwd: copyProject,
          env: Object.assign(process.env, {}, {
            PATH: path.resolve(copyProject + '/node_modules/.bin') + ':' + process.env.PATH
          })
        });
        
        k.stdin.end(`${cmd}`);
        k.stdout.pipe(pt(chalk.gray('phase-Z: '))).pipe(process.stdout);
        k.stderr.pipe(pt(chalk.yellow('phase-Z: '))).pipe(process.stderr);
        
        k.once('exit', code => {
          if (code > 0) log.error(`Could not run your z-test command: ${cmd}`);
          cb(code);
        });
        
      },
      
      runNpmInstall(copyPackageJSON: any, runNpmPack: string, cb: EVCb) {
        
        if (opts.t && opts.s) {
          return process.nextTick(cb);
        }
        
        // note that runNpmPack is the path to .tgz file
        const cmd = `npm install --loglevel=warn --cache-min 9999999 --no-optional --production "${runNpmPack}";`;
        log.info(`Running the following command via this dir: "${r2gProject}" ...`);
        log.info(chalk.blueBright(cmd));
        
        const k = cp.spawn('bash', [], {
          cwd: r2gProject
        });
        k.stdin.end(cmd);
        k.stderr.pipe(process.stderr);
        k.once('exit', code => {
          if (code > 0) log.error(`Could not run the following command: ${cmd}.`);
          cb(code);
        });
      },
      
      copySmokeTester(mkdirpProject: any, cb: EVCb) {
        
        if (opts.s) {
          return process.nextTick(cb);
        }
        
        log.info(`Copying the smoke-tester.js file to "${r2gProject}" ...`);
        
        fs.createReadStream(smokeTester)
        .pipe(fs.createWriteStream(path.resolve(r2gProject + '/smoke-tester.js')))
        .once('error', cb)
        .once('finish', cb);
      },
      
      copyPackageJSON(mkdirpProject: any, cb: EVCb) {
        
        log.info(`Copying a "blank" package.json file to "${r2gProject}" ...`);
        
        const k = cp.spawn('bash', [], {
          cwd: r2gProject
        });
        
        k.stderr.pipe(process.stderr);
        k.stdin.end(`r2g_copy_package_json "${r2gProject}" ${opts.keep || ''};`);
        
        k.once('exit', cb);
      },
      
      r2gSmokeTest(runZTest: any, runNpmInstall: any, copySmokeTester: any, cb: EVCb) {
        
        if (opts.s) {
          log.warn('Skipping phase-S.');
          return process.nextTick(cb);
        }
        
        log.info(`Running your exported r2gSmokeTest function(s) in "${r2gProject}" ...`);
        
        const k = cp.spawn('bash', [], {
          cwd: r2gProject,
          env: Object.assign(process.env, {}, {
            PATH: path.resolve(r2gProject + '/node_modules/.bin') + ':' + process.env.PATH
          })
        });
        
        k.stderr.pipe(pt(chalk.yellow('phase-S: '))).pipe(process.stderr);
        k.stdout.pipe(pt(chalk.gray('phase-S: '))).pipe(process.stdout);
        
        k.stdin.end(`node smoke-tester.js;`);
        k.once('exit', code => {
          if (code > 0) {
            log.error('r2g smoke test failed => one of your exported r2gSmokeTest function calls failed to resolve to true.');
            log.error(chalk.magenta('for help fixing this error, see: https://github.com/ORESoftware/r2g/blob/master/docs/r2g-smoke-test-exported-main-fn-type-a.md'));
          }
          cb(code);
        });
      },
      
      copyUserDefinedTests(copyProject: string, cb: EVCb) {
        
        if (opts.t) {
          return process.nextTick(cb);
        }
        
        log.info(`Copying your user defined tests to: "${r2gProject}" ...`);
        
        const k = cp.spawn('bash', [], {
          cwd: copyProject
        });
        
        k.stdout.pipe(process.stdout);
        k.stderr.pipe(process.stderr);
        
        k.stdin.end([
          `mkdir -p .r2g/tests`,
          `mkdir -p .r2g/fixtures`,
          `rsync -r .r2g/tests "${r2gProject}"`,
          `rsync -r .r2g/fixtures "${r2gProject}"`
        ].join(' && '));
        
        k.once('exit', cb);
        
      },
      
      runUserDefinedTests(copyUserDefinedTests: any, r2gSmokeTest: any, runNpmInstall: any, cb: EVCb) {
        
        if (opts.t) {
          log.warn('Skipping phase-T');
          return process.nextTick(cb);
        }
        
        log.info(`Running user defined tests in "${r2gProject}/tests" ...`);
        
        const k = cp.spawn('bash', [], {
          cwd: r2gProject,
          env: Object.assign(process.env, {}, {
            PATH: path.resolve(r2gProject + '/node_modules/.bin') + ':' + process.env.PATH
          })
        });
        
        k.stdout.pipe(pt(chalk.gray('phase-T: '))).pipe(process.stdout);
        k.stderr.pipe(pt(chalk.yellow('phase-T: '))).pipe(process.stderr);
        
        k.once('exit', code => {
          if (code > 0) {
            log.error('an r2g test failed => a script in this dir failed to exit with code 0:', chalk.bold(path.resolve(process.env.HOME + '/.r2g/temp/project/tests')));
            log.error(chalk.magenta('for help fixing this error, see: https://github.com/ORESoftware/r2g/blob/master/docs/r2g-smoke-test-type-b.md'));
          }
          cb(code);
        });
        
        const tests = path.resolve(r2gProject + '/tests');
        
        try {
          
          const items = fs.readdirSync(tests);
          
          const cmd = ` echo 'Now we are in phase-T...';` +
            items.filter(v => fs.lstatSync(tests + '/' + v).isFile())
            .map(v => ` chmod u+x ./tests/${v} && ./tests/${v} && `)
            .concat(' exit "$?" ').join(' ');
          
          log.info('About to run tests in your .r2g/tests dir.');
          k.stdin.end(`${cmd}`);
        }
        catch (err) {
          return cb(err);
        }
      }
      
    },
    
     (err: any, results) => {
      
      if (err && err.OK) {
        log.warn(chalk.blueBright(' => r2g may have run with some problems.'));
        log.warn(util.inspect(err));
      }
      else if (err) {
        throw getCleanTrace(err);
      }
      else {
        log.info(chalk.green('Successfully ran r2g.'))
      }
      
      process.exit(0);
      
    });
  
};

