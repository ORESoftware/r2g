'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const cp = require("child_process");
const path = require("path");
const fs = require("fs");
const async = require("async");
const clean_trace_1 = require("clean-trace");
const util = require("util");
const assert = require("assert");
const Domain = require("domain");
const logger_1 = require("../../logger");
const chalk_1 = require("chalk");
const get_fs_map_1 = require("./get-fs-map");
const rename_deps_1 = require("./rename-deps");
const copy_deps_1 = require("./copy-deps");
const prepend_transform_1 = require("prepend-transform");
const deep_mixin_1 = require("@oresoftware/deep.mixin");
const r2gProject = path.resolve(process.env.HOME + '/.r2g/temp/project');
const r2gProjectCopy = path.resolve(process.env.HOME + '/.r2g/temp/copy');
const smokeTester = require.resolve('../../smoke-tester.js');
const defaultPackageJSONPath = require.resolve('../../../assets/default.package.json');
const flattenDeep = (a) => {
    return a.reduce((acc, val) => Array.isArray(val) ? acc.concat(flattenDeep(val)) : acc.concat(val), []);
};
const handleTask = (r2gProject) => {
    return (t, cb) => {
        process.nextTick(() => {
            const d = Domain.create();
            let first = true;
            const finish = (err, isTimeout) => {
                clearTimeout(to);
                if (err) {
                    logger_1.default.error(err);
                    logger_1.default.error('The following function experienced an error:', t);
                }
                if (isTimeout) {
                    logger_1.default.error('The following task timed out:', t);
                }
                if (first) {
                    process.nextTick(() => {
                        d.exit();
                        cb(err);
                    });
                }
            };
            const to = setTimeout(() => {
                finish(new Error('timeout'), true);
            }, 5000);
            d.once('error', err => {
                logger_1.default.error('Could not successfully run task:');
                logger_1.default.error(String(t));
                finish(err, false);
            });
            d.run(() => {
                t(r2gProject, function (err) {
                    if (arguments.length > 1) {
                        logger_1.default.error('The following callback arguments were ignored:', Array.from(arguments).slice(0));
                    }
                    finish(err, false);
                });
            });
        });
    };
};
exports.run = (cwd, projectRoot, opts) => {
    const userHome = path.resolve(process.env.HOME);
    ``;
    let pkgJSON = null, r2gConf = null, packages = null, searchRoots = null, pkgName = '', cleanPackageName = '', zTest = null;
    if (opts.skip) {
        const skipped = String(opts.skip).split(',').map(v => String(v || '').trim().toLowerCase()).filter(Boolean);
        opts.z = opts.z || skipped.includes('z');
        opts.s = opts.s || skipped.includes('s');
        opts.t = opts.t || skipped.includes('t');
    }
    const pkgJSONOverridePth = path.resolve(projectRoot + '/.r2g/package.override.js');
    const pkgJSONPth = path.resolve(projectRoot + '/package.json');
    const customActionsPath = path.resolve(projectRoot + '/.r2g/custom.actions.js');
    try {
        pkgJSON = require(pkgJSONPth);
        pkgName = pkgJSON.name;
        cleanPackageName = pkgJSON.name || '';
    }
    catch (err) {
        logger_1.default.error(chalk_1.default.magentaBright('Could not read your projects package.json file.'));
        throw clean_trace_1.getCleanTrace(err);
    }
    if (!(pkgName && typeof pkgName === 'string')) {
        throw new Error('Your package.json file does not appear to have a proper name field. Here is the file:\n' + util.inspect(pkgJSON));
    }
    let customActions = null, customActionsStats = null;
    try {
        customActionsStats = fs.statSync(customActionsPath);
    }
    catch (err) {
    }
    try {
        if (customActionsStats) {
            customActions = require(customActionsPath);
            customActions = customActions.default || customActions;
            assert(customActions, 'custom.actions.js is missing certain exports.');
        }
    }
    catch (err) {
        logger_1.default.error('Could not load custom.actions.js');
        logger_1.default.error(err.message);
        process.exit(1);
    }
    let packageJSONOverride = null, packageJSONOverrideStats = null;
    try {
        packageJSONOverrideStats = fs.statSync(pkgJSONOverridePth);
    }
    catch (err) {
    }
    try {
        if (packageJSONOverrideStats) {
            assert(packageJSONOverrideStats.isFile(), 'package.override.js should be a file, but it is not.');
            packageJSONOverride = require(pkgJSONOverridePth);
            packageJSONOverride = packageJSONOverride.default || packageJSONOverride;
            assert(packageJSONOverride && !Array.isArray(packageJSONOverride) && typeof packageJSONOverride === 'object', 'package.override.js does not export the right object.');
        }
    }
    catch (err) {
        logger_1.default.error('Could not run stat on file at path:', pkgJSONOverridePth);
        logger_1.default.error(err.message);
        process.exit(1);
    }
    try {
        zTest = pkgJSON.r2g.test;
    }
    catch (err) {
        if (!opts.z) {
            logger_1.default.info('using "npm test" to run phase-Z.');
        }
    }
    zTest = zTest || 'npm test';
    assert(typeof zTest === 'string', 'z-test is not a string => check the r2g.test property in your package.json.');
    pkgName = String(pkgName).replace(/[^0-9a-z]/gi, '_');
    if (pkgName.startsWith('_')) {
        pkgName = pkgName.slice(1);
    }
    const confPath = path.resolve(projectRoot + '/.r2g/config.js');
    try {
        r2gConf = require(confPath);
        r2gConf = r2gConf.default || r2gConf;
    }
    catch (err) {
        if (opts.verbosity > 0) {
            logger_1.default.warning(err.message);
        }
        logger_1.default.warning(chalk_1.default.yellow('Could not read your .r2g/config.js file at path:', chalk_1.default.bold(confPath)));
        if (process.env.r2g_is_docker === 'yes') {
            throw clean_trace_1.getCleanTrace(err);
        }
        r2gConf = require('../../../assets/default.r2g.config.js');
        r2gConf = r2gConf.default || r2gConf;
        process.once('exit', code => {
            if (code < 1) {
                if (opts.verbosity > 2) {
                    logger_1.default.warning(chalk_1.default.yellow.bold('Note that during this run, r2g could not read your .r2g/config.js file.'));
                }
            }
        });
    }
    packages = r2gConf.packages;
    searchRoots = flattenDeep([r2gConf.searchRoots, path.resolve(r2gConf.searchRoot || '')])
        .map(v => String(v || '').trim())
        .filter(Boolean);
    if (!(packages && typeof packages === 'object')) {
        logger_1.default.error(r2gConf);
        throw new Error('You need a property called "packages" in your .r2g/config.js file.');
    }
    searchRoots.forEach(v => {
        if (!(v && typeof v === 'string')) {
            logger_1.default.error(r2gConf);
            throw chalk_1.default.redBright('You need a property called "searchRoot"/"searchRoots" in your .r2g/config.js file.');
        }
        if (!path.isAbsolute(v)) {
            logger_1.default.error(r2gConf);
            logger_1.default.error('The following path is not absolute:', chalk_1.default.magenta(v));
            throw chalk_1.default.redBright('Your "searchRoot"/"searchRoots" property in your .r2g/config.js file, needs to be an absolute path.');
        }
        try {
            assert(fs.lstatSync(v).isDirectory());
        }
        catch (err) {
            logger_1.default.error('Your "searchRoot" property does not seem to exist as a directory on the local/host filesystem.');
            logger_1.default.error('In other words, the following path does not seem to be a directory:');
            logger_1.default.error(v);
            throw clean_trace_1.getCleanTrace(err);
        }
        if (!v.startsWith(userHome)) {
            throw new Error('Your searchRoot needs to be within your user home directory.');
        }
    });
    const dependenciesToInstall = Object.keys(packages);
    if (dependenciesToInstall.length < 1) {
        logger_1.default.debug('There were no local dependencies to install.');
        logger_1.default.debug('Here is your configuration:\n', r2gConf);
    }
    const deps = [
        pkgJSON.dependencies || {},
        pkgJSON.devDependencies || {},
        pkgJSON.optionalDependencies || {}
    ];
    const allDeps = deps.reduce(Object.assign, {});
    Object.keys(packages).forEach(function (k) {
        if (!allDeps[k]) {
            logger_1.default.warn(chalk_1.default.gray('You have the following packages key in your .r2g/config.js file:'), chalk_1.default.magentaBright(k));
            logger_1.default.warn(chalk_1.default.bold(`But "${chalk_1.default.magentaBright(k)}" is not present as a dependency in your package.json file.`));
        }
    });
    const depsDir = path.resolve(process.env.HOME + `/.r2g/temp/deps`);
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
        removeExistingProject(checkForDirtyGitIndex, cb) {
            if (opts.keep || opts.multi) {
                logger_1.default.info("We are keeping the previously installed packages because '--keep' / '--multi' was used.");
                return process.nextTick(cb);
            }
            logger_1.default.info('Removing existing files within "$HOME/.r2g/temp"...');
            const k = cp.spawn('bash');
            k.stdin.end(`rm -rf "$HOME/.r2g/temp"`);
            k.once('exit', cb);
        },
        mkdirpProject(removeExistingProject, cb) {
            logger_1.default.info('Making sure the right folders exist using mkdir -p ...');
            const k = cp.spawn('bash');
            k.stderr.pipe(process.stderr);
            k.stdin.end(`mkdir -p "${r2gProject}"; mkdir -p "${r2gProjectCopy}";`);
            k.once('exit', code => {
                if (code > 0) {
                    logger_1.default.error("Could not create temp/project or temp/copy directory.");
                }
                cb(code);
            });
        },
        rimrafDeps(mkdirpProject, cb) {
            logger_1.default.info('Removing existing files within "$HOME/.r2g.temp"...');
            const k = cp.spawn('bash');
            k.stdin.end(`rm -rf "${depsDir}"`);
            k.once('exit', cb);
        },
        mkdirDeps(rimrafDeps, cb) {
            logger_1.default.info('Re-creating folders "$HOME/.r2g/temp"...');
            const k = cp.spawn('bash');
            k.stdin.end(`mkdir -p "${depsDir}"`);
            k.once('exit', cb);
        },
        getMap(cb) {
            if (!opts.full) {
                logger_1.default.info('we are not creating a deps map since the --full option was not used.');
                return process.nextTick(cb, null, {});
            }
            if (process.env.r2g_is_docker === 'yes') {
                logger_1.default.info('we are not creating a deps map since we are using r2g.docker');
                return process.nextTick(cb, null, {});
            }
            get_fs_map_1.getFSMap(opts, searchRoots, packages, cb);
        },
        copyProjectsInMap(getMap, cb) {
            if (Object.keys(getMap).length < 1) {
                return process.nextTick(cb, null, {});
            }
            copy_deps_1.installDeps(getMap, dependenciesToInstall, opts, cb);
        },
        renamePackagesToAbsolute(copyProjectsInMap, copyProject, cb) {
            if (Object.keys(copyProjectsInMap).length < 1) {
                return process.nextTick(cb, null, {});
            }
            const pkgJSONPath = path.resolve(copyProject + '/package.json');
            rename_deps_1.renameDeps(copyProjectsInMap, pkgJSONPath, cb);
        },
        copyProject(mkdirpProject, cb) {
            if (process.env.r2g_is_docker === 'yes') {
                logger_1.default.info('We are not copying the project since we are using r2g.docker');
                return process.nextTick(cb, null, projectRoot);
            }
            logger_1.default.info('Copying your project to "$HOME/.r2g/temp/copy" using rsync ...');
            const k = cp.spawn('bash');
            k.stderr.pipe(process.stderr);
            k.stdin.end(`
          rm -rf "${r2gProjectCopy}";
          rsync --perms --copy-links -r --exclude=".git" --exclude="node_modules" "${projectRoot}" "${r2gProjectCopy}";
        `);
            k.once('exit', code => {
                if (code > 0) {
                    logger_1.default.error('Could not rimraf project copy path or could not copy to it using rsync.');
                }
                cb(code, path.resolve(r2gProjectCopy + '/' + path.basename(projectRoot)));
            });
        },
        runNpmPack(renamePackagesToAbsolute, copyProject, cb) {
            const cmd = `npm pack --loglevel=warn;`;
            logger_1.default.info(chalk_1.default.bold('Running the following command from your project copy root:'), chalk_1.default.cyan.bold(cmd));
            const k = cp.spawn('bash');
            k.stdin.end(`cd "${copyProject}" && ` + cmd);
            let stdout = '';
            k.stdout.on('data', d => {
                stdout += String(d || '').trim();
            });
            k.stderr.pipe(process.stderr);
            k.once('exit', code => {
                if (code > 0) {
                    logger_1.default.error(`Could not run "npm pack" for this project => ${copyProject}.`);
                }
                cb(code, path.resolve(copyProject + '/' + stdout));
            });
        },
        linkPackage(runNPMInstallInCopy, copyProject, cb) {
            if (opts.z) {
                return process.nextTick(cb);
            }
            const getBinMap = function (bin, path, name) {
                if (!bin) {
                    return ` echo "no bin items in package.json for package with name: ${name}" `;
                }
                if (typeof bin === 'string') {
                    return ` mkdir -p "node_modules/.bin" && ln -s "${path}/${bin}" "node_modules/.bin/${name}" `;
                }
                const keys = Object.keys(bin);
                if (keys.length < 1) {
                    return ` echo "no bin items in package.json for package with name: ${name}" `;
                }
                return keys.map(function (k) {
                    return ` mkdir -p node_modules/.bin && ln -sf "${path}/${bin[k]}" "node_modules/.bin/${k}" `;
                })
                    .join(' && ');
            };
            const cmd = [
                `mkdir -p "node_modules/${cleanPackageName}"`,
                `rm -rf "node_modules/${cleanPackageName}"`,
                `ln -sf "${r2gProject}/node_modules/${cleanPackageName}" "node_modules/${cleanPackageName}"`,
                getBinMap(pkgJSON.bin, `${copyProject}/node_modules/${cleanPackageName}`, cleanPackageName)
            ]
                .join(' && ');
            const cwd = String(copyProject).slice(0);
            logger_1.default.info(chalk_1.default.bold(`Running the following command from "${cwd}":`), chalk_1.default.bold.cyan(cmd));
            const k = cp.spawn('bash');
            k.stderr.pipe(process.stderr);
            k.stdin.end(`cd "${cwd}" && ` + cmd);
            k.once('exit', code => {
                if (code > 0) {
                    logger_1.default.error('Could not link from project to copy.');
                }
                cb(code);
            });
        },
        runNPMInstallInCopy(runNpmInstall, copyProject, cb) {
            if (opts.z) {
                return process.nextTick(cb);
            }
            const cmd = `npm install --cache-min 9999999 --loglevel=warn`;
            logger_1.default.info(`Running "${cmd}" in project copy.`);
            const k = cp.spawn('bash');
            k.stderr.pipe(process.stderr);
            k.stdin.end(`cd "${copyProject}" && ` + cmd);
            k.once('exit', code => {
                if (code > 0) {
                    logger_1.default.error('Could not link from project to copy.');
                }
                cb(code);
            });
        },
        runZTest(linkPackage, copyProject, cb) {
            if (opts.z) {
                logger_1.default.warn('Skipping phase-Z');
                return process.nextTick(cb);
            }
            const cmd = String(zTest).slice(0);
            logger_1.default.info(chalk_1.default.bold('Running the following command from the copy project dir:'), chalk_1.default.cyan.bold(cmd));
            const k = cp.spawn('bash', [], {
                env: Object.assign({}, process.env, {
                    PATH: path.resolve(copyProject + '/node_modules/.bin') + ':' + process.env.PATH
                })
            });
            k.stdin.end(`cd "${copyProject}" && ${cmd}`);
            k.stdout.pipe(prepend_transform_1.default(chalk_1.default.gray('phase-Z: '))).pipe(process.stdout);
            k.stderr.pipe(prepend_transform_1.default(chalk_1.default.yellow('phase-Z: '))).pipe(process.stderr);
            k.once('exit', code => {
                if (code > 0) {
                    logger_1.default.error(`Could not run your z-test command: ${cmd}`);
                }
                cb(code);
            });
        },
        copySmokeTester(mkdirpProject, cb) {
            if (opts.s) {
                return process.nextTick(cb);
            }
            logger_1.default.info(`Copying the smoke-tester.js file to "${r2gProject}" ...`);
            fs.createReadStream(smokeTester)
                .pipe(fs.createWriteStream(path.resolve(r2gProject + '/smoke-tester.js')))
                .once('error', cb)
                .once('finish', cb);
        },
        copyPackageJSON(mkdirpProject, cb) {
            if (opts.keep) {
                logger_1.default.warn(`Re-using the existing package.json file at path '${r2gProject}/package.json'...`);
                return process.nextTick(cb);
            }
            logger_1.default.info(`Copying package.json file to "${r2gProject}" ...`);
            const defaultPkgJSON = require(defaultPackageJSONPath);
            const packageJSONPath = path.resolve(r2gProject + '/package.json');
            let override = null;
            if (packageJSONOverride) {
                override = deep_mixin_1.default(defaultPkgJSON, packageJSONOverride);
                logger_1.default.warning('package.json overriden with:', { override });
            }
            else {
                override = Object.assign({}, defaultPkgJSON);
            }
            const strm = fs.createWriteStream(packageJSONPath)
                .once('error', cb)
                .once('finish', cb);
            strm.end(JSON.stringify(override, null, 2) + '\n');
        },
        customActionsBeforeInstall(copyPackageJSON, cb) {
            if (!customActions) {
                logger_1.default.info('No custom actions registered. Use custom.actions.js to add custom actions.');
                return process.nextTick(cb);
            }
            logger_1.default.info('Running custom actions...');
            async.series({
                inProject(cb) {
                    const tasks = flattenDeep([customActions.inProjectBeforeInstall]).filter(Boolean);
                    if (tasks.length < 1) {
                        return process.nextTick(cb);
                    }
                    async.eachSeries(tasks, handleTask(r2gProject), cb);
                }
            }, cb);
        },
        runNpmInstall(copyPackageJSON, customActionsBeforeInstall, runNpmPack, cb) {
            if (opts.t && opts.s) {
                return process.nextTick(cb);
            }
            const cmd = `npm install --loglevel=warn --cache-min 9999999 --no-optional --production "${runNpmPack}";\n` +
                `npm i --loglevel=warn --cache-min 9999999 --no-optional --production;`;
            logger_1.default.info(`Running the following command via this dir: "${r2gProject}" ...`);
            logger_1.default.info(chalk_1.default.blueBright(cmd));
            const k = cp.spawn('bash');
            k.stdin.end(`cd "${r2gProject}" && ` + cmd);
            k.stderr.pipe(process.stderr);
            k.once('exit', code => {
                if (code > 0) {
                    logger_1.default.error(`Could not run the following command: ${cmd}.`);
                }
                cb(code);
            });
        },
        customActionsAfterInstall(runNpmInstall, cb) {
            if (!customActions) {
                logger_1.default.info('No custom actions registered. Use custom.actions.js to add custom actions.');
                return process.nextTick(cb);
            }
            logger_1.default.info('Running custom actions...');
            async.series({
                inProject(cb) {
                    const tasks = flattenDeep([customActions.inProjectAfterInstall]).filter(Boolean);
                    if (tasks.length < 1) {
                        return process.nextTick(cb);
                    }
                    async.eachSeries(tasks, handleTask(r2gProject), cb);
                }
            }, cb);
        },
        r2gSmokeTest(runZTest, customActionsAfterInstall, copySmokeTester, cb) {
            if (opts.s) {
                logger_1.default.warn('Skipping phase-S.');
                return process.nextTick(cb);
            }
            logger_1.default.info(`Running your exported r2gSmokeTest function(s) in "${r2gProject}" ...`);
            const k = cp.spawn('bash', [], {
                env: Object.assign({}, process.env, {
                    PATH: path.resolve(r2gProject + '/node_modules/.bin') + ':' + process.env.PATH
                })
            });
            k.stderr.pipe(prepend_transform_1.default(chalk_1.default.yellow('phase-S: '))).pipe(process.stderr);
            k.stdout.pipe(prepend_transform_1.default(chalk_1.default.gray('phase-S: '))).pipe(process.stdout);
            k.stdin.end(`cd "${r2gProject}" && node smoke-tester.js;`);
            k.once('exit', code => {
                if (code > 0) {
                    logger_1.default.error('r2g smoke test failed => one of your exported r2gSmokeTest function calls failed to resolve to true.');
                    logger_1.default.error(chalk_1.default.magenta('for help fixing this error, see: https://github.com/ORESoftware/r2g/blob/master/docs/r2g-smoke-test-exported-main-fn-type-a.md'));
                }
                cb(code);
            });
        },
        copyUserDefinedTests(copyProject, cb) {
            if (opts.t) {
                return process.nextTick(cb);
            }
            logger_1.default.info(`Copying your user defined tests to: "${r2gProject}" ...`);
            const k = cp.spawn('bash');
            k.stdout.pipe(process.stdout);
            k.stderr.pipe(process.stderr);
            k.stdin.end([
                `cd "${copyProject}"`,
                `mkdir -p .r2g/tests`,
                `mkdir -p .r2g/fixtures`,
                `rsync --perms --copy-links -r .r2g/tests "${r2gProject}"`,
                `rsync --perms --copy-links -r .r2g/fixtures "${r2gProject}"`
            ].join(' && '));
            k.once('exit', cb);
        },
        runUserDefinedTests(copyUserDefinedTests, r2gSmokeTest, runNpmInstall, cb) {
            if (opts.t) {
                logger_1.default.warn('Skipping phase-T');
                return process.nextTick(cb);
            }
            logger_1.default.info(`Running user defined tests in "${r2gProject}/tests" ...`);
            const k = cp.spawn('bash', [], {
                env: Object.assign({}, process.env, {
                    PATH: path.resolve(r2gProject + '/node_modules/.bin') + ':' + process.env.PATH
                })
            });
            k.stdout.pipe(prepend_transform_1.default(chalk_1.default.gray('phase-T: '))).pipe(process.stdout);
            k.stderr.pipe(prepend_transform_1.default(chalk_1.default.yellow('phase-T: '))).pipe(process.stderr);
            k.once('exit', code => {
                if (code > 0) {
                    logger_1.default.error('an r2g test failed => a script in this dir failed to exit with code 0:', chalk_1.default.bold(path.resolve(process.env.HOME + '/.r2g/temp/project/tests')));
                    logger_1.default.error(chalk_1.default.magenta('for help fixing this error, see: https://github.com/ORESoftware/r2g/blob/master/docs/r2g-smoke-test-type-b.md'));
                }
                cb(code);
            });
            const tests = path.resolve(r2gProject + '/tests');
            let items;
            try {
                items = fs.readdirSync(tests);
                if (false) {
                    const cmd = ` set -e;\n cd "${r2gProject}";\n echo 'Now we are in phase-T...'; \n` +
                        items
                            .filter(v => fs.lstatSync(tests + '/' + v).isFile())
                            .map(v => ` chmod u+x ./tests/${v} && ./tests/${v}; `)
                            .join('\n');
                    logger_1.default.info('About to run tests in your .r2g/tests dir, the command is:');
                    logger_1.default.info(chalk_1.default.blueBright(cmd));
                    k.stdin.end(cmd);
                }
            }
            catch (err) {
                return process.nextTick(cb, err);
            }
            const cmd = items.filter(v => {
                try {
                    return fs.lstatSync(path.resolve(tests + '/' + v)).isFile();
                }
                catch (err) {
                    logger_1.default.error(err.message);
                    return false;
                }
            })
                .map(v => ` ( echo 'running test' && chmod u+x './tests/${v}' && './tests/${v}' ) | r2g_handle_stdio '${v}' ; `)
                .join(' ');
            logger_1.default.info('About to run tests in your .r2g/tests dir.');
            k.stdin.end(`
          
              set -eo pipefail
              
              echo 'Now we are in phase-T...';
              
              r2g_handle_stdio() {
                  # REPLY is a built-in, see:
                  while read; do echo -e "\${r2g_gray}$1:\${r2g_no_color} $REPLY"; done
              }

              export -f r2g_handle_stdio;
          
             cd "${r2gProject}";
             ${cmd}
             
          `);
        }
    }, (err, results) => {
        if (err && err.OK) {
            logger_1.default.warn(chalk_1.default.blueBright(' => r2g may have run with some problems.'));
            logger_1.default.warn(util.inspect(err));
        }
        else if (err) {
            throw clean_trace_1.getCleanTrace(err);
        }
        else {
            logger_1.default.info(chalk_1.default.green('Successfully ran r2g.'));
        }
        process.exit(0);
    });
};
