'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const cp = require("child_process");
const path = require("path");
const async = require("async");
const clean_trace_1 = require("clean-trace");
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
    const publishDir = path.resolve(process.env.HOME + `/.r2g/temp/publish/${id}`);
    async.autoInject({
        checkForUntrackedFiles(cb) {
            if (opts.ignore_dirty_git_index) {
                return process.nextTick(cb);
            }
            logger_1.default.info('Checking for dirty git status...');
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
                    logger_1.default.error('Changes to (untracked) files need to be committed. Check your git index using the `git status` command.');
                    logger_1.default.error('Looks like the git index was dirty. Use "--ignore-dirty-git-index" to skip this warning.');
                }
                cb(code);
            });
        },
        checkForDirtyGitIndex(checkForUntrackedFiles, cb) {
            if (opts.ignore_dirty_git_index) {
                return process.nextTick(cb);
            }
            logger_1.default.info('Checking for dirty git index...');
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
                    logger_1.default.error('Looks like the git index was dirty. Use "--ignore-dirty-git-index" to skip this warning.');
                }
                cb(code);
            });
        },
        mkdir(checkForDirtyGitIndex, cb) {
            const k = cp.spawn('bash');
            k.stdin.end(`mkdir -p "${publishDir}"`);
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
                `rsync --perms --copy-links -r`,
                `--exclude=.r2g --exclude=node_modules --exclude=.github --exclude=.idea`,
                `--exclude=LICENSE --exclude=LICENSE.md --exclude=license.md`,
                `--exclude=readme.md --exclude README.md --exclude readme --exclude README`,
                `--exclude=.git "${projectRoot}/" "${publishDir}/";`
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
        packAndPublish(copyProject, cb) {
            const k = cp.spawn('bash');
            const cmd = `
          set -e;
          cd "${publishDir}";
          npm publish --loglevel=warn --access=${opts.access};
         `;
            k.stdout.pipe(prepend_transform_1.default('npm publish:')).pipe(process.stdout);
            k.stderr.pipe(prepend_transform_1.default('npm publish: ')).pipe(process.stderr);
            k.stdin.end(cmd);
            k.once('exit', code => {
                if (code > 0) {
                    logger_1.default.error('Could not publish tarball.');
                    logger_1.default.error('Could not run the following command:');
                    logger_1.default.error(cmd);
                }
                cb(null, code);
            });
        },
        rimraf(packAndPublish, cb) {
            const k = cp.spawn('bash');
            k.stdin.end(`rm -rf "${publishDir}"`);
            k.once('exit', code => {
                if (code > 0) {
                    logger_1.default.error('Could not rimraf dir at path:', publishDir);
                }
                cb(packAndPublish);
            });
        }
    }, (err, results) => {
        if (err && err.OK) {
            logger_1.default.warn(chalk_1.default.blueBright('Your package may have been published with some problems:'));
            logger_1.default.warn(util.inspect(err));
        }
        else if (err) {
            throw clean_trace_1.getCleanTrace(err);
        }
        else {
            logger_1.default.info(chalk_1.default.green('Successfully published your package.'));
        }
    });
};
