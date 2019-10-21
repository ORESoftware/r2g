'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const cp = require("child_process");
const path = require("path");
const async = require("async");
const logger_1 = require("../../logger");
const chalk_1 = require("chalk");
const shortid = require("shortid");
exports.installDeps = (createProjectMap, dependenciesToInstall, opts, cb) => {
    const finalMap = {};
    if (dependenciesToInstall.length < 1) {
        return process.nextTick(cb, null, finalMap);
    }
    const c = opts.pack ? 4 : 4;
    async.eachLimit(dependenciesToInstall, c, (dep, cb) => {
        if (!createProjectMap[dep]) {
            logger_1.default.info('dependency is not in the local map:', dep);
            return process.nextTick(cb, null);
        }
        const d = createProjectMap[dep];
        const c = path.dirname(d);
        const k = cp.spawn('bash');
        const id = shortid.generate();
        const dest = path.resolve(process.env.HOME + `/.r2g/temp/deps/${id}`);
        const basename = path.basename(c);
        const depRoot = path.resolve(dest + '/' + basename);
        const pack = (depRoot, cb) => {
            if (!opts.pack) {
                finalMap[dep] = depRoot;
                return process.nextTick(cb);
            }
            const k = cp.spawn('bash', [], {
                cwd: depRoot
            });
            const cmd = [
                `npm pack --loglevel=warn;`,
            ]
                .join(' ');
            logger_1.default.info(`Running the following command: '${chalk_1.default.cyan.bold(cmd)}', in this directory: "${depRoot}".`);
            let stdout = '';
            k.stdout.on('data', d => stdout += String(d).trim());
            k.stdin.end(cmd);
            k.stderr.pipe(process.stderr);
            k.once('exit', function (code) {
                if (code > 0) {
                    return cb(new Error('"npm pack" command exited with code greater than 0.'));
                }
                finalMap[dep] = path.resolve(dest + '/' + basename + '/' + stdout);
                cb(null);
            });
        };
        const cmd = [
            `set -e`,
            `mkdir -p "${dest}"`,
            `rsync --perms --copy-links -r --exclude="node_modules" --exclude=".git" "${c}" "${dest}";`,
        ]
            .join('; ');
        logger_1.default.info(`About to run the following command: '${chalk_1.default.cyan.bold(cmd)}'`);
        k.stdin.end(cmd);
        k.stderr.pipe(process.stderr);
        k.once('exit', code => {
            if (code < 1) {
                return pack(depRoot, cb);
            }
            logger_1.default.error('The following command failed:');
            logger_1.default.error(chalk_1.default.magentaBright.bold(cmd));
            cb(new Error(`The following command '${cmd}', exited with code: "${code}".`));
        });
    }, function (err) {
        process.nextTick(cb, err, finalMap);
    });
};
