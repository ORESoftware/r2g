'use strict';

import cp = require('child_process');
import path = require("path");
import fs = require('fs');
import async = require('async');
import {getCleanTrace} from 'clean-trace';

// project
const execSh = path.resolve(__dirname + '/../../../assets/exec.sh');
const contents = path.resolve(__dirname + '/../../../assets/contents');
const Dockerfile = path.resolve(__dirname + '/../../../assets/Dockerfile.r2g.original');
const docker_r2g = '.r2g';
import log from '../../logger';
import chalk from "chalk";
import * as util from "util";
import shortid = require("shortid");
import pt from 'prepend-transform';
import {EVCb} from "../../index";

///////////////////////////////////////////////

export const run = function (cwd: string, projectRoot: string, opts: any) {
  
  const id = shortid.generate();
  const publishDir = path.resolve(process.env.HOME + `/.r2g/temp/publish/${id}`);
  
  async.autoInject({
    
      checkForUntrackedFiles(cb: EVCb<any>) {
        
        if (opts.ignore_dirty_git_index) {
          return process.nextTick(cb);
        }
      
        log.info('Checking for dirty git status...');
      
        const k = cp.spawn('bash');
        k.stderr.pipe(process.stderr);
      
        k.stdin.end(`
            set -e;
            cd ${projectRoot};
            if [[ ! -d '.git' ]]; then
               exit 0;
            fi
            
           if  test $(git status --porcelain | wc -l) != '0'; then
            exit 1;
           fi
        `);
      
        k.once('exit', code => {
          if (code > 0) {
            log.error('Changes to (untracked) files need to be committed. Check your git index using the `git status` command.');
            log.error('Looks like the git index was dirty. Use "--ignore-dirty-git-index" to skip this warning.');
          }
          cb(code);
        });
      },
    
      checkForDirtyGitIndex(checkForUntrackedFiles: any, cb: EVCb<any>) {
      
        if (opts.ignore_dirty_git_index) {
          return process.nextTick(cb);
        }
      
        log.info('Checking for dirty git index...');
        const k = cp.spawn('bash');
        k.stderr.pipe(process.stderr);
      
        k.stdin.end(`
          set -e;
          cd ${projectRoot};
          if [[ -d '.git' ]]; then
               git diff --quiet
          fi
        `);
      
        k.once('exit', code => {
          if (code > 0) {
            log.error('Looks like the git index was dirty. Use "--ignore-dirty-git-index" to skip this warning.');
          }
          cb(code);
        });
      
      },
      
      mkdir(checkForDirtyGitIndex: any, cb: any) {
        
        const k = cp.spawn('bash');
        k.stdin.end(`mkdir -p "${publishDir}"`);
        k.stderr.pipe(pt('mkdir: ')).pipe(process.stderr);
        k.once('exit', code => {
          if (code > 0) {
            log.error('Could not create dir at path:', publishDir);
          }
          cb(code);
        });
        
      },
      
      copyProject(mkdir: any, cb: any) {
        
        const k = cp.spawn('bash');
        const cmd = `rsync --perms --copy-links -r --exclude=".r2g" --exclude="node_modules" --exclude=".git" "${projectRoot}/" "${publishDir}/";`;
        k.stdin.end(cmd);
        k.stderr.pipe(pt('rsync: ')).pipe(process.stderr);
        k.once('exit', code => {
          if (code > 0) {
            log.error('Could not run the following command:');
            log.error(cmd);
          }
          cb(code);
        });
      },
      
      packAndPublish(copyProject: any, cb: any) {
        
        const k = cp.spawn('bash');
        const cmd = `
          set -e;
          cd "${publishDir}";
          npm publish --loglevel=warn --access=${opts.access};
         `;
        
        k.stdout.pipe(pt('npm publish:')).pipe(process.stdout);
        k.stderr.pipe(pt('npm publish: ')).pipe(process.stderr);
        k.stdin.end(cmd);
        
        k.once('exit', code => {
          if (code > 0) {
            log.error('Could not publish tarball.');
            log.error('Could not run the following command:');
            log.error(cmd);
          }
          cb(null, code);
        });
      },
      
      rimraf(packAndPublish: number, cb: any) {
        
        const k = cp.spawn('bash');
        k.stdin.end(`rm -rf "${publishDir}"`);
        k.once('exit', code => {
          
          if (code > 0) {
            log.error('Could not rimraf dir at path:', publishDir);
          }
          
          cb(packAndPublish);
        });
      }
    },
    
    (err: any, results) => {
      
      if (err && err.OK) {
        log.warn(chalk.blueBright('Your package may have been published with some problems:'));
        log.warn(util.inspect(err));
      }
      else if (err) {
        throw getCleanTrace(err);
      }
      else {
        log.info(chalk.green('Successfully published your package.'))
      }
      
    });
  
};

