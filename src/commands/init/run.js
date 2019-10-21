'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const cp = require("child_process");
const path = require("path");
const fs = require("fs");
const async = require("async");
const clean_trace_1 = require("clean-trace");
const execSh = path.resolve(__dirname + '/../../../assets/exec.sh');
const contents = path.resolve(__dirname + '/../../../assets/contents');
const Dockerfile = path.resolve(__dirname + '/../../../assets/Dockerfile.r2g.original');
const docker_r2g = '.r2g';
const logger_1 = require("../../logger");
const chalk_1 = require("chalk");
const util = require("util");
exports.run = function (cwd, projectRoot, opts) {
    const dockerfileDest = path.resolve(projectRoot + '/Dockerfile.r2g');
    const execShDest = path.resolve(projectRoot + '/.r2g/exec.sh');
    async.autoInject({
        mkdir(cb) {
            const k = cp.spawn('bash');
            k.stdin.end(`mkdir "${projectRoot}/${docker_r2g}"`);
            k.once('exit', code => cb(null, code));
        },
        copyContents(mkdir, cb) {
            if (mkdir) {
                logger_1.default.info(chalk_1.default.yellow('Could not create .r2g folder (already exists?).'));
                return process.nextTick(cb);
            }
            const k = cp.spawn('bash');
            k.stdin.end(`cp -R ${contents}/* "${cwd}/${docker_r2g}"`);
            k.once('exit', cb);
        },
        checkIfExecShExists(cb) {
            if (!opts.docker) {
                return process.nextTick(cb);
            }
            fs.lstat(execShDest, (err, stats) => cb(null, stats));
        },
        copyExecSh(mkdir, checkIfExecShExists, copyContents, cb) {
            if (!opts.docker) {
                return process.nextTick(cb);
            }
            if (checkIfExecShExists) {
                logger_1.default.info(chalk_1.default.yellow('Could not create .r2g/exec.sh file (already exists?).'));
                return process.nextTick(cb);
            }
            fs.createReadStream(execSh)
                .pipe(fs.createWriteStream(execShDest))
                .once('error', cb)
                .once('end', cb);
        },
        checkIfDockerfileExists: function (cb) {
            fs.lstat(dockerfileDest, function (err, stats) {
                cb(null, stats);
            });
        },
        createDockerfile(checkIfDockerfileExists, cb) {
            if (!opts.docker) {
                return process.nextTick(cb);
            }
            if (checkIfDockerfileExists) {
                logger_1.default.info(chalk_1.default.yellow('Could not create Dockerfile.r2g file (already exists?).'));
                return process.nextTick(cb);
            }
            fs.createReadStream(Dockerfile)
                .pipe(fs.createWriteStream(dockerfileDest))
                .once('error', cb)
                .once('end', cb);
        }
    }, function (err, results) {
        if (err && err.OK) {
            logger_1.default.warn(chalk_1.default.blueBright('r2g/r2g.docker may have been initialized with some problems.'));
            logger_1.default.warn(util.inspect(err));
        }
        else if (err) {
            throw clean_trace_1.getCleanTrace(err);
        }
        else {
            logger_1.default.info(chalk_1.default.green('Successfully initialized r2g/r2g.docker'));
        }
    });
};
