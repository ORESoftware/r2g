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
  
  const fifoDir = path.resolve(process.env.HOME + `/.r2g/temp/fifo/${id}`);
  const extractDir = path.resolve(process.env.HOME + `/.r2g/temp/extract/${id}`);
  const publishDir = path.resolve(process.env.HOME + `/.r2g/temp/inspect/${id}`);
  
  async.autoInject({
      
      mkdir(cb: any) {
        
        const k = cp.spawn('bash');
        k.stdin.end(`
        
          set -e;
          mkdir -p "${publishDir}";
          mkdir -p "${extractDir}";
          mkdir -p "${fifoDir}";
          mkfifo "${fifoDir}/fifo";
      
        `);
        
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
      
      inspectAllFiles(createTarball: CreateTarball, cb: EVCb<any>) {
        
        if (!(createTarball.pack && createTarball.pack.value)) {
          log.error('No tarball could be found.');
          return process.nextTick(cb);
        }
        
        log.info();
        log.info('Tarball was packed here:', chalk.blueBright.bold((createTarball.pack.value)));
        
        const k = cp.spawn('bash');
        
        log.info();
        log.info(chalk.bold.underline.italic('Results from the "tar --list" command:'));
        log.info();
        
        const cmd = `tar -z --list --file="${createTarball.pack.value}" | grep '^package/' | cut -c 9- ;`;
        
        k.stdin.end(`
            ${cmd}
        `);
        
        k.stdout.pipe(pt(chalk.gray('the tarball contents: '))).pipe(process.stdout);
        k.stderr.pipe(pt(chalk.magenta('the tarball: '))).pipe(process.stderr);
        
        k.once('exit', code => {
          
          if (code > 0) {
            log.error('Could not run this command:', cmd);
          }
          
          cb(createTarball.code);
        });
      },
    
      
      extract(inspectAllFiles: any, createTarball: CreateTarball, cb: EVCb<any>) {
        
        if (!(createTarball.pack && createTarball.pack.value)) {
          log.error('No tarball could be found.');
          return process.nextTick(cb);
        }
        
        log.info();
        log.info('Tarball will be extracted here:', chalk.blueBright.bold(extractDir));
        
        const cmd = ` cd "${extractDir}/package" && find . -type f | xargs du  --threshold=5KB | sort`;
        console.log('Running this command to inspect your tarball for large files:');
        console.log(chalk.blueBright(cmd));
        
        const fifo = cp.spawn('bash');
        fifo.stdout.setEncoding('utf8');
        
        fifo.stdout
          .pipe(pt(chalk.yellow.bold('warning: this is a big file (>5KB) according to du: ')))
          .pipe(process.stdout);
        
        fifo.stdin.end(`
        
            on_sigint(){
               export has_sigint=yes;
               sleep 0.25;
               exit 0;
            }
            
            export -f on_sigint;
        
            trap on_sigint INT
            trap on_sigint SIGINT

            while [[ "$has_sigint" != "yes" ]]; do
              exec cat "${fifoDir}/fifo"
            done
        
        `);
        
        const fifoStatus = {
          exited: false
        };
        
        fifo.once('exit', code => {
           fifoStatus.exited  = true;
        });
        
        {
  
          const k = cp.spawn('bash');
  
          k.stdin.end(`
            
            set -e;
            
            echo;
            echo -e ${chalk.italic.underline('results from the du file-size check command:')};
            tar -xzvf "${createTarball.pack.value}" -C "${extractDir}" > /dev/null;
            ${cmd} > "${fifoDir}/fifo";
            kill -INT ${fifo.pid} | cat;

        `);
  
          k.stdout
            .pipe(process.stdout);
  
          k.stderr
            .pipe(pt(chalk.magenta('du stderr: ')))
            .pipe(process.stderr);
  
          k.once('exit', code => {
    
            if (code > 0) {
              log.error('Could not rimraf dir at path:', publishDir);
            }
    
            cb(code);
          });
        }
       
        
      },
    
      inspectOnlyFolders(extract: any, createTarball: CreateTarball, cb: EVCb<any>) {
      
        if (!(createTarball.pack && createTarball.pack.value)) {
          log.error('No tarball could be found.');
          return process.nextTick(cb);
        }
      
        log.info();
        log.info('Tarball was packed here:', chalk.blueBright.bold((createTarball.pack.value)));
      
        const k = cp.spawn('bash');
      
        log.info();
        log.info(chalk.bold.underline.italic('Results from the "find . -type d -maxdepth 2" command:'));
        log.info();
      
        k.stdin.end(`
        
            cd "${extractDir}/package" && find . -type d -mindepth 1 -maxdepth 2 | sort ;
         
        `);
      
        k.stdout.pipe(pt(chalk.gray('the tarball folders: '))).pipe(process.stdout);
        k.stderr.pipe(pt(chalk.magenta('the tarball folders stderr: '))).pipe(process.stderr);
      
        k.once('exit', code => {
        
          if (code > 0) {
            log.error('Could not rimraf dir at path:', publishDir);
          }
        
          cb(createTarball.code);
        });
      },
    
    
      duOnFolders(inspectOnlyFolders: any, createTarball: CreateTarball, cb: EVCb<any>) {
      
        if (!(createTarball.pack && createTarball.pack.value)) {
          log.error('No tarball could be found.');
          return process.nextTick(cb);
        }
      
        log.info();
        log.info('Tarball was packed here:', chalk.blueBright.bold((createTarball.pack.value)));
      
        const k = cp.spawn('bash');
      
        log.info();
        log.info(chalk.bold.underline.italic('Results from the "find . -type d -maxdepth 2" command:'));
        log.info();
      
        k.stdin.end(`
        
            cd "${extractDir}/package" && ( find . -type d -mindepth 1 -maxdepth 2 | du --max-depth=1 -h --threshold=2KB ) ;
         
        `);
      
        k.stdout.pipe(pt(chalk.gray('the tarball folders: '))).pipe(process.stdout);
        k.stderr.pipe(pt(chalk.magenta('the tarball folders stderr: '))).pipe(process.stderr);
      
        k.once('exit', code => {
        
          if (code > 0) {
            log.error('Could not rimraf dir at path:', publishDir);
          }
        
          cb(createTarball.code);
        });
      },
      
      rimraf(duOnFolders: any, createTarball: CreateTarball, cb: EVCb<any>) {
        
        const k = cp.spawn('bash');
        
        k.stdin.end(`rm -rf "${publishDir}"; rm -rf "${extractDir}"; rm -rf "${fifoDir}";`);
        
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
      
      console.log();
      
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
      
      // process.exit(0);
      
    });
  
};

