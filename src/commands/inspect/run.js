'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const cp = require("child_process");
const path = require("path");
const async = require("async");
const clean_trace_1 = require("clean-trace");
const stdio = require("json-stdio");
const execSh = path.resolve(__dirname + '/../../../assets/exec.sh');
const contents = path.resolve(__dirname + '/../../../assets/contents');
const Dockerfile = path.resolve(__dirname + '/../../../assets/Dockerfile.r2g.original');
const docker_r2g = '.r2g';
const logger_1 = require("../../logger");
const chalk_1 = require("chalk");
const util = require("util");
const shortid = require("shortid");
const prepend_transform_1 = require("prepend-transform");
exports.run = function (cwd, projectRoot, opts) {
    const id = shortid.generate();
    const fifoDir = path.resolve(process.env.HOME + `/.r2g/temp/fifo/${id}`);
    const extractDir = path.resolve(process.env.HOME + `/.r2g/temp/extract/${id}`);
    const publishDir = path.resolve(process.env.HOME + `/.r2g/temp/inspect/${id}`);
    async.autoInject({
        mkdir(cb) {
            const k = cp.spawn('bash');
            k.stdin.end(`
        
          set -e;
          mkdir -p "${publishDir}";
          mkdir -p "${extractDir}";
          mkdir -p "${fifoDir}";
          mkfifo "${fifoDir}/fifo";
      
        `);
            k.stderr.pipe(prepend_transform_1.default('mkdir: ')).pipe(process.stderr);
            k.once('exit', code => {
                if (code > 0) {
                    logger_1.default.error('Could not create dir at path:', publishDir);
                }
                cb(code);
            });
        },
        copyProject(mkdir, cb) {
            const k = cp.spawn('bash');
            const cmd = [
                `rsync --perms --copy-links`,
                `-r --exclude=.github --exclude=.r2g --exclude=.idea`,
                `--exclude=LICENSE --exclude=LICENSE.md --exclude=license.md`,
                `--exclude=readme.md --exclude README.md --exclude readme --exclude README`,
                `--exclude=node_modules --exclude=.git "${projectRoot}/" "${publishDir}/";`
            ].join(' ');
            k.stdin.end(cmd);
            k.stderr.pipe(prepend_transform_1.default('rsync: ')).pipe(process.stderr);
            k.once('exit', code => {
                if (code > 0) {
                    logger_1.default.error('Could not run the following command:');
                    logger_1.default.error(cmd);
                }
                cb(code);
            });
        },
        createTarball(copyProject, cb) {
            const k = cp.spawn('bash');
            const cmd = `
          set -e;
          cd "${publishDir}";
          pack=$(npm pack --loglevel=warn);
          cat <<END \n{"@json-stdio":true,"value":"$pack"} \nEND
         `;
            const pack = {
                value: ''
            };
            k.stdout
                .pipe(stdio.createParser())
                .once(stdio.stdEventName, v => {
                if (!(v && typeof v === 'string')) {
                    return logger_1.default.error('type of json-parsed value was not a string:', util.inspect(v));
                }
                pack.value = path.resolve(publishDir + '/' + v);
            });
            k.stderr.pipe(prepend_transform_1.default(chalk_1.default.magenta('npm pack: '))).pipe(process.stderr);
            k.stdin.end(cmd);
            k.once('exit', code => {
                if (code > 0) {
                    logger_1.default.error('Could not pack tarball.');
                    logger_1.default.error('Could not run the following command:');
                    logger_1.default.error(cmd);
                }
                cb(null, { code, pack });
            });
        },
        inspectAllFiles(createTarball, cb) {
            if (!(createTarball.pack && createTarball.pack.value)) {
                logger_1.default.error('No tarball could be found.');
                return process.nextTick(cb);
            }
            logger_1.default.info();
            logger_1.default.info('Tarball was packed here:', chalk_1.default.blueBright.bold((createTarball.pack.value)));
            const k = cp.spawn('bash');
            logger_1.default.info();
            logger_1.default.info(chalk_1.default.bold.underline.italic('Results from the "tar --list" command:'));
            logger_1.default.info();
            const cmd = `tar -z --list --file="${createTarball.pack.value}" | grep '^package/' | cut -c 9- ;`;
            k.stdin.end(`
            ${cmd}
        `);
            k.stdout.pipe(prepend_transform_1.default(chalk_1.default.gray('the tarball contents: '))).pipe(process.stdout);
            k.stderr.pipe(prepend_transform_1.default(chalk_1.default.magenta('the tarball: '))).pipe(process.stderr);
            k.once('exit', code => {
                if (code > 0) {
                    logger_1.default.error('Could not run this command:', cmd);
                }
                cb(createTarball.code);
            });
        },
        extract(inspectAllFiles, createTarball, cb) {
            if (!(createTarball.pack && createTarball.pack.value)) {
                logger_1.default.error('No tarball could be found.');
                return process.nextTick(cb);
            }
            logger_1.default.info();
            logger_1.default.info('Tarball will be extracted here:', chalk_1.default.blueBright.bold(extractDir));
            const cmd = ` cd "${extractDir}/package" && find . -type f | xargs du  --threshold=5KB | sort`;
            console.log('Running this command to inspect your tarball for large files:');
            console.log(chalk_1.default.blueBright(cmd));
            const fifo = cp.spawn('bash');
            fifo.stdout.setEncoding('utf8');
            fifo.stdout
                .pipe(prepend_transform_1.default(chalk_1.default.yellow.bold('warning: this is a big file (>5KB) according to du: ')))
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
                fifoStatus.exited = true;
            });
            {
                const k = cp.spawn('bash');
                k.stdin.end(`
            
            set -e;
            
            echo;
            echo -e ${chalk_1.default.italic.underline('results from the du file-size check command:')};
            tar -xzvf "${createTarball.pack.value}" -C "${extractDir}" > /dev/null;
            ${cmd} > "${fifoDir}/fifo";
            kill -INT ${fifo.pid} | cat;

        `);
                k.stdout
                    .pipe(process.stdout);
                k.stderr
                    .pipe(prepend_transform_1.default(chalk_1.default.magenta('du stderr: ')))
                    .pipe(process.stderr);
                k.once('exit', code => {
                    if (code > 0) {
                        logger_1.default.error('Could not rimraf dir at path:', publishDir);
                    }
                    cb(code);
                });
            }
        },
        inspectOnlyFolders(extract, createTarball, cb) {
            if (!(createTarball.pack && createTarball.pack.value)) {
                logger_1.default.error('No tarball could be found.');
                return process.nextTick(cb);
            }
            logger_1.default.info();
            logger_1.default.info('Tarball was packed here:', chalk_1.default.blueBright.bold((createTarball.pack.value)));
            const k = cp.spawn('bash');
            logger_1.default.info();
            logger_1.default.info(chalk_1.default.bold.underline.italic('Results from the "find . -type d -maxdepth 2" command:'));
            logger_1.default.info();
            k.stdin.end(`
        
            cd "${extractDir}/package" && find . -type d -mindepth 1 -maxdepth 2 | sort ;
         
        `);
            k.stdout.pipe(prepend_transform_1.default(chalk_1.default.gray('the tarball folders: '))).pipe(process.stdout);
            k.stderr.pipe(prepend_transform_1.default(chalk_1.default.magenta('the tarball folders stderr: '))).pipe(process.stderr);
            k.once('exit', code => {
                if (code > 0) {
                    logger_1.default.error('Could not rimraf dir at path:', publishDir);
                }
                cb(createTarball.code);
            });
        },
        duOnFolders(inspectOnlyFolders, createTarball, cb) {
            if (!(createTarball.pack && createTarball.pack.value)) {
                logger_1.default.error('No tarball could be found.');
                return process.nextTick(cb);
            }
            logger_1.default.info();
            logger_1.default.info('Tarball was packed here:', chalk_1.default.blueBright.bold((createTarball.pack.value)));
            const k = cp.spawn('bash');
            logger_1.default.info();
            logger_1.default.info(chalk_1.default.bold.underline.italic('Results from the "find . -type d -maxdepth 2" command:'));
            logger_1.default.info();
            k.stdin.end(`
        
            cd "${extractDir}/package" && ( find . -type d -mindepth 1 -maxdepth 2 | du --max-depth=1 -h --threshold=2KB ) ;
         
        `);
            k.stdout.pipe(prepend_transform_1.default(chalk_1.default.gray('the tarball folders: '))).pipe(process.stdout);
            k.stderr.pipe(prepend_transform_1.default(chalk_1.default.magenta('the tarball folders stderr: '))).pipe(process.stderr);
            k.once('exit', code => {
                if (code > 0) {
                    logger_1.default.error('Could not rimraf dir at path:', publishDir);
                }
                cb(createTarball.code);
            });
        },
        rimraf(duOnFolders, createTarball, cb) {
            const k = cp.spawn('bash');
            k.stdin.end(`rm -rf "${publishDir}"; rm -rf "${extractDir}"; rm -rf "${fifoDir}";`);
            k.once('exit', code => {
                if (code > 0) {
                    logger_1.default.error('Could not rimraf dir at path:', extractDir);
                    logger_1.default.error('Could not rimraf dir at path:', publishDir);
                }
                cb(createTarball.code);
            });
        }
    }, (err, results) => {
        console.log();
        if (err && err.OK) {
            logger_1.default.warn(chalk_1.default.blueBright('Your package may have been published with some problems:'));
            logger_1.default.warn(util.inspect(err));
        }
        else if (err) {
            throw clean_trace_1.getCleanTrace(err);
        }
        else {
            logger_1.default.info(chalk_1.default.green('Successfully inspected tarball.'));
        }
    });
};
