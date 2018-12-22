'use strict';

import cp = require('child_process');
import path = require("path");
import fs = require('fs');
import async = require('async');
import {getCleanTrace} from 'clean-trace';
import * as stdio from 'json-stdio';

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
import {EVCb} from '../../index';

///////////////////////////////////////////////

interface CreateTarball {
  code: number,
  pack: {
    value: string
  }
}

export const run = function (cwd: string, projectRoot: string, opts: any) {
  
  const id = shortid.generate();
  
  const extractDir = path.resolve(process.env.HOME + `/.r2g/temp/extract/${id}`);
  const publishDir = path.resolve(process.env.HOME + `/.r2g/temp/inspect/${id}`);
  
  async.autoInject({
      
      mkdir(cb: any) {
        
        const k = cp.spawn('bash');
        k.stdin.end(`mkdir -p "${publishDir}"; mkdir -p "${extractDir}";`);
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
        const cmd = `rsync --copy-links -r --exclude=".r2g" --exclude="node_modules" --exclude=".git" "${projectRoot}/" "${publishDir}/";`;
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
      
      createTarball(copyProject: any, cb: EVCb<CreateTarball>) {
        
        const k = cp.spawn('bash');
        const cmd = `
          set -e;
          cd "${publishDir}";
          pack=$(npm pack --loglevel=warn);
          cat <<END \n{"@json-stdio":true,"value":"$pack"} \nEND
         `;
        
        const pack: CreateTarball['pack'] = {
          value: ''
        };
        
        k.stdout
          .pipe(stdio.createParser())
          .once(stdio.stdEventName, v => {
            if (!(v && typeof v === 'string')) {
              return log.error('type of json-parsed value was not a string:', util.inspect(v));
            }
            pack.value = path.resolve(publishDir + '/' + v);
          });
        
        k.stderr.pipe(pt(chalk.magenta('npm pack: '))).pipe(process.stderr);
        k.stdin.end(cmd);
        
        k.once('exit', code => {
          if (code > 0) {
            log.error('Could not pack tarball.');
            log.error('Could not run the following command:');
            log.error(cmd);
          }
          cb(null, {code, pack});
        });
      },
      
      inspect(createTarball: CreateTarball, cb: EVCb<any>) {
        
        if (!(createTarball.pack && createTarball.pack.value)) {
          log.error('No tarball could be found.');
          return process.nextTick(cb);
        }
        
        log.info('Tarball was packed here:', chalk.blueBright.bold((createTarball.pack.value)));
        
        const k = cp.spawn('bash');
        
        // k.stdin.end(`tar --list --verbose --file="${createTarball.pack.value}"`);
        k.stdin.end(`
            echo; echo; echo 'tar --list results:'; echo;
            tar -z --list --file="${createTarball.pack.value}" | grep '^package/' | cut -c 9- ;
         
          `);
        
        k.stdout.pipe(pt(chalk.gray('the tarball: '))).pipe(process.stdout);
        k.stderr.pipe(pt(chalk.magenta('the tarball: '))).pipe(process.stderr);
        
        k.once('exit', code => {
          
          if (code > 0) {
            log.error('Could not rimraf dir at path:', publishDir);
          }
          
          cb(createTarball.code);
        });
      },
      
      extract(inspect: any, createTarball: CreateTarball, cb: EVCb<any>) {
        
        if (!(createTarball.pack && createTarball.pack.value)) {
          log.error('No tarball could be found.');
          return process.nextTick(cb);
        }
        
        log.info('Tarball will be extracted here:', chalk.blueBright.bold(extractDir));
        
        const cmd = ` cd "${extractDir}/package" && find . -type f | xargs du  --threshold=5KB `;
        
        console.log({cmd});
        
        const k = cp.spawn('bash');
        
        // k.stdin.end(`tar --list --verbose --file="${createTarball.pack.value}"`);
        k.stdin.end(`
            
            set -e;
            
           handle_json(){
              while read line; do
                cat <<EOF\n{"@json-stdio":true,"value":{"type":"$1","line":"$line"}}\nEOF
              done
           }
            
           # ( echo; echo; echo 'du results:'; ) | handle_json 'foo';
            tar -xzvf "${createTarball.pack.value}" -C "${extractDir}" > /dev/null;
            ${cmd} ;
            ${cmd} | handle_json 'du';
            
        `);
        
        k.stdout.pipe(stdio.createParser()).on(stdio.stdEventName, v => {
          
          console.log({v});
          
          if (!(v && v.type === 'du')) {
            
            if (v && typeof v.line === 'string') {
              console.log(v.line);
            }
            return;
          }
          
          console.log(chalk.redBright('this is a big file (>500KB) according to du: ', v.line));
        });
        
        k.stderr.pipe(pt(chalk.magenta('du stderr: '))).pipe(process.stderr);
        
        k.once('exit', code => {
          
          if (code > 0) {
            log.error('Could not rimraf dir at path:', publishDir);
          }
          
          cb(code);
        });
        
      },
      
      rimraf(extract: any, createTarball: CreateTarball, cb: EVCb<any>) {
        
        const k = cp.spawn('bash');
        
        // k.stdin.end(`exit 0;`);
        k.stdin.end(`rm -rf "${publishDir}"; rm -rf "${extractDir}";`);
        
        k.once('exit', code => {
          
          if (code > 0) {
            log.error('Could not rimraf dir at path:', extractDir);
            log.error('Could not rimraf dir at path:', publishDir);
          }
          
          cb(createTarball.code);
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
        log.info(chalk.green('Successfully inspected tarball.'))
      }
      
    });
  
};

