
<img width="200px" align="right" src="https://raw.githubusercontent.com/oresoftware/media/master/namespaces/r2g/oresoftware-r2g-rounded.png?foo">

[<img src="https://img.shields.io/badge/slack-@oresoftware/r2g-yellowgreen.svg?logo=slack">](https://oresoftware.slack.com/messages/CCAHLN77B)

[![Gitter](https://badges.gitter.im/oresoftware/r2g.svg)](https://gitter.im/oresoftware/r2g?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)
[![Version](https://img.shields.io/npm/v/r2g.svg?colorB=green)](https://www.npmjs.com/package/r2g)

<br>

# r2g

>
> Properly test your NPM packages before publishing. <br>
> This CLI tool allows you to easily test your package in the published format, without having to publish to an NPM registry.

<br>

#### Platform note

>
> The `r2g` command and the Rust, Python, Gleam, and Go adapters are distributed
> for macOS, Linux, and Windows. The legacy npm phase runner still requires Bash
> and rsync while it is being moved onto the cross-platform adapter core.
>

<br>

## Video demo

Watch this video to learn how to use r2g: TBD (video demo coming in the future) <br>

The video will reference this example repo: <br>
https://github.com/ORESoftware/r2g.example

<br>

### Installation

With Homebrew:

```console
$ brew tap ORESoftware/r2g https://github.com/ORESoftware/r2g
$ brew install ORESoftware/r2g/r2g
```

Or with npm:

```console
$ npm i -g r2g
```

Windows users can install with Scoop or Chocolatey, and macOS/Linux users can
use the checksum-verifying curl route. See
[`docs/distribution.md`](docs/distribution.md) for every supported install path.

You can add the following to your ~/.bashrc and/or ~/.bash_profile files:

```shell
. "$HOME/.oresoftware/shell.sh"
```

<i> => Note you will also get bash completion for r2g, if you source the above shell script. </i>

<br>
_____________________________________________________________________________________________

### FAQ

see docs/faq.md

<br>

### About The Tool

r2g tests your package after using `npm pack` and `npm install --production`. You can use your current test suite for testing, and also write smoke tests
that are specific to r2g. r2g currently has 3 <i>phases</i>, each phase is optional:

For Rust, Python, Gleam, and Go, the same rule is implemented by ecosystem
adapters: create the publishable artifact, unpack or install it under a
run-scoped temp workspace, create a clean consumer, resolve the artifact as a
dependency, and run from the consumer directory. See
[`docs/multi-ecosystem.md`](docs/multi-ecosystem.md).

<br>

* <b> phase-Z:</b> packs your project, installs that packed package back into the copied project, then runs a package-level command. By default this is `npm test`; override it with `r2g.test` in package.json.
* <b> phase-S:</b> installs your packed project into `$HOME/.r2g/temp/project`, requires your package by name, then executes the `r2gSmokeTest` function exported from your package main.
* <b> phase-T:</b> copies executable scripts from `.r2g/tests` to `$HOME/.r2g/temp/project/tests`, copies `.r2g/fixtures` to `$HOME/.r2g/temp/project/fixtures`, and runs every file in the copied tests directory.

<br>

By default all phases are run, but you can skip phases with the `--skip=z,s,t` option.

<br>

The usual full coverage setup is:

* `package.json` has an `r2g.test` command for phase-Z.
* Your package main exports `r2gSmokeTest` for phase-S.
* `.r2g/tests` contains executable smoke scripts for phase-T.
* `.r2g/fixtures` contains only data that phase-T scripts need.
* `.r2g/config.js` declares `searchRoot` and optional local packages for `r2g run --full`.
* `.r2g/custom.actions.js` can run setup/assertion hooks inside the temp project before and after install.
* `.r2g/package.override.js` can adjust the temp project's package.json when the default dummy package is not enough.

<br>

r2g is one of several tools that makes managing multiple locally developed NPM packages easier.

<b> The current pieces are: </b>

* [npm-link-up (NLU)](https://github.com/ORESoftware/npm-link-up) => links multiple NPM packages together for local development
* [r2g](https://github.com/ORESoftware/r2g) => tests local packages <i>properly</i> before publishing to NPM
* [npp](https://github.com/ORESoftware/npp) => publish multiple packages and sync their semver versions

<br>

## Quick reference

<br>

>
>```console
>$ r2g run  ### note: `r2g test` is an alias of `r2g run`
>```
>
> * Runs the tool, and runs all phases.
>

<br>

>
>```console
>$ r2g run --skip=z,s
>```
>
> * This will skip phases Z and S
>

<br>

>
>```console
>$ r2g run -z -s
>```
>
> * This will also skip phases Z and S
>

<br>

>
>```console
>$ r2g run --full
>```
>
> * Installs other locally developed dependencies to your main package, defined in `.r2g/config.js`, and tests everything together.
> * Use this when X depends on another local package and you want to test both unpublished versions together.
>

<br>

>
>```console
>$ r2g run --full --pack
>```
>
> * Installs other locally developed dependencies to your main package, *npm packs them too*, and tests everything together.
> * This is the closest local simulation of publishing X and its local dependencies.
>

<br>

>
>```console
>$ r2g inspect
>```
>
> * Copies your project to a temp folder and logs info about a temp tarball that gets created
> * AKA, you can see which contents/folders/files will get included in the tarball
> * Also warns you about any especially large files that you may have accidentally included.
>

<br>

>
>```console
>$ r2g publish
>```
>
> * Publish your package and ignore the .r2g folder for an even leaner tarball
> * Copies your project to a temp folder and the .r2g folder is excluded/ignored
> * Also copies symlinks so you can include symlinked files/folders easily when publishing
> * Use `r2g publish --otp=123456` when npm requires a one-time password.
>

<br>


### Important Info

* This tool is only proven on MacOS/*nix, not tested on Windows. If you do Windows and want something to do - fork this and make it work for Windows - it won't be hard.
* You can use r2g with zero-config, depending on what you want to do.
* Testing does not happen in your local codebase - before anything, your codebase is copied to `"$HOME/.r2g/temp/copy"`, and all writes happen within `"$HOME/.r2g/temp"`.
* If you use the `--full` option, the local deps of your package will copied to: `"$HOME/.r2g/temp/deps"`
* You can and should put your regular tests in `.npmignore`, but your .r2g folder should not be in `.npmignore`

<b>To make this README as clear and concise as possible:</b>

* Your NPM package is referred to as `X`. X is the name of the package you publish to NPM, which is the "name" field of your package.json.
* The package.json file for X is simply referred to as `X-package.json`.
* Your index.js file (or whatever the "main" property points to in X-package.json), is referred to as `X-main`

<br>

______________________________________________________________________________________________

## Purpose

This tool <i>complements</i> your standard CI/CD testing for NPM libraries. You might already be using Travis, CircleCI, etc, to test your library
when you do a `git push`. Keep doing that. <i>However, what you are already doing is likely to be insufficient because:</i>

1. You install using `npm install` instead of `npm install --production`, because you need your devDependencies for your tests. (whoops!).
2. You are testing your package directly, instead of testing it as a dependency of another project. In reality, someone will be using your package via `node_modules/X`, and for example, your postinstall routine may behave differently here.
3. You are not using `npm pack` to package your project before testing it. Your [`.npmignore`](https://docs.npmjs.com/misc/developers#keeping-files-out-of-your-package)  file could mean you will be missing files, when someone goes to use your package in the wild. Likewise, if
the ["files"](https://docs.npmjs.com/files/package.json#files) property in X-package.json is too passive, you might be missing files as well. Using `npm pack` before testing solves that.
4. It is possible to check out a branch that has passed on a remote CI/CD platform but locally does not have the built/transpiled target files. This means the files will not make it into the tarball that gets published to NPM. 
Testing with r2g locally before publishing a local branch means you avoid this problem, because if the target files are not built, r2g tests will fail.

The above things are why you need to take some extra pre-cautions before publishing NPM packages. I think everyone has had an `.npmignore` file that accidentally ignored files we need in production.
And we have all had dependencies listed in devDependencies instead of dependencies, which caused problems when people try to use the library. Those are the motivations for using this tool,
to *prove* that X works in its final format.

* There is a secret feature which is extremely badass - install other locally developed packages which are dependencies of X, as part of r2g testing.
See "Linking with existing local dependencies" below.

<br>

### How it works in detail
To learn more about how r2g works in detail, see: `docs/r2g-runtime-steps.md`

<br>

# Basic usage / Getting started

You can use r2g with zero-config - you just need to implement a single function. 

<br>

To start, execute this in a shell at the root of your project:

```bash
$ r2g run
```

This command will then fail. That's expected. 

<br>

To get your test to pass, add this to X-main (your package's index file, whatever "main" in package.json points to):

```js
exports.r2gSmokeTest = async () => { 
  return Promise.resolve(true);
};
```

the above function is called with `Promise.resolve(X.r2gSmokeTest())`, and in order to pass it must resolve to `true` (not just truthy). 

<br>

<b>To read more about the exported r2gSmokeTest function, see:</b> `docs/r2g-smoke-test-exported-main-function.md`

<br>

Note: the exported function `r2gSmokeTest` allows you to smoke test your package. When this function is run you <i>may</i> use the production dependencies declared in your project.
<i> However, for other r2g tests, you may *not* directly use the dependencies declared in X-package.json, *you may only require X itself*. </i>

<br>

## Adding more tests beyond the `r2gSmokeTest` function

To do more sophisticated tests, we add some configuration in a folder called .r2g in the root of your project. 

<br>

To do this, run:

```bash
r2g init
```

this will add a folder to your project called `.r2g`. Your `.r2g` folder should never be in `.npmignore`. (Running `r2g init` is safe, it will not overwrite any existing files).
Your new `.r2g` folder contains `.r2g/tests` and `.r2g/fixtures`.

<br>

Now when `r2g run` executes phase-T, it runs each executable file in `.r2g/tests`,  *but* it runs those tests in the context of the temp project, meaning it copies:

<br>

   `$HOME/.r2g/temp/project/node_modules/X/.r2g/tests/*` -->  `$HOME/.r2g/temp/project/tests/*`

and:

   `$HOME/.r2g/temp/project/node_modules/X/.r2g/fixtures/*` -->  `$HOME/.r2g/temp/project/fixtures/*`

<br>

The above is very important to understand, because it means phase-T scripts *should not directly require dependencies* from X-package.json.
In fact, besides core modules and fixture files, phase-T scripts should require X itself by package name.

<br>

Example:

```js
#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fixture = require('../fixtures/phase-contract.json');
const x = require(fixture.packageName);

assert.strictEqual(typeof x.r2gSmokeTest, 'function');
assert.strictEqual(x.r2gSmokeTest(), true);
```

<br>

Make phase-Z explicit in package.json when `npm test` is too slow, too broad, or not focused on publishability:

```json
{
  "r2g": {
    "test": "node .r2g/tests/phase-contract.cjs --phase-z"
  }
}
```

<br>

Use `.r2g/custom.actions.js` when the temp project needs setup or extra lifecycle assertions:

```js
'use strict';

const fs = require('fs');
const path = require('path');

const marker = name => (root, cb) => {
  try {
    fs.mkdirSync(path.resolve(root, '.r2g-markers'), {recursive: true});
    fs.writeFileSync(path.resolve(root, '.r2g-markers', `${name}.txt`), `${name}\n`);
    cb();
  }
  catch (err) {
    cb(err);
  }
};

exports.default = {
  inProjectBeforeInstall: [marker('before-install')],
  inProjectAfterInstall: [marker('after-install')]
};
```

<br>

Use `.r2g/package.override.js` when the default temp package.json needs extra fields:

```js
'use strict';

exports.default = {
  r2g: {
    packageOverride: true
  }
};
```

<br>

## Linking with existing local dependencies:

Run `r2g init` and in your `.r2g/config.js` file, add local package names to the packages property:

```js
exports.default = {

  // ...

  packages: {
     // local packages will be installed to your project --> test your local dependencies instead of installing from NPM
     'your-local-package-b': true,
     'your-local-package-c': true
   }
}
```

If you execute `r2g run --full` these packages (b,c) will be *discovered* on your local fs, and copied to `"$HOME/.r2g/temp/deps/*"`, and then X's package.json will look like this:

```json
{
  "dependencies": {
   "your-local-package-b": "file:///home/user/.r2g/temp/deps/your-local-package-b",
   "your-local-package-c": "file:///home/user/.r2g/temp/deps/your-local-package-c",
  }
}
```

If you execute `r2g run --full --pack`, then this awesomeness happens:


```json
{
  "dependencies": {
   "your-local-package-b": "file:///home/user/.r2g/temp/deps/your-local-package-b.tgz",
   "your-local-package-c": "file:///home/user/.r2g/temp/deps/your-local-package-c.tgz",
  }
}
```

So using `r2g run --full` => we install local deps instead of the deps from NPM. 

<br>

And using `r2g run --full --pack` => we pack the local deps before installing them. 

<br>

Awesome.

<b>To read more about using local deps for testing instead of installing your local deps from NPM, see:</b> <br> => `docs/r2g-using-local-deps.md`

<br>

## Usage in a Docker image/container

Use a Docker container for a fresh/independent/isolated testing env. For packages that do more complex/system things, it will be useful to use a locally running Docker container.
To use r2g in a Docker container, see: https://github.com/ORESoftware/r2g.docker

<br>

Alternatively, you can just run r2g as part of your normal CI/CD library testing on remote servers.
First, make sure you have Docker installed on your local machine. See standard installation instructions for MacOS/*nix.

<br>

Run this in the root of your project:

```bash
$ r2g init --docker  # you only need to run this once per project, but won't hurt if you do it more than once
```

Then run this:

```bash
$ r2g docker
```

The above command actually uses this command line tool: <br>
https://github.com/ORESoftware/r2g.docker


<br>

## Containerized runs and phase-C

r2g has two built-in ways to use containers, both of which shell out to your local `docker` executable.
Like all r2g CLI flags, the flags below are declared in the flags-2-env based `.cli-flags.toml` file
(see: https://github.com/oresoftware/flags-2-env).

### Whole-run isolation: `--containerized`

```bash
$ r2g run --containerized                       # uses the default image, node:22
$ r2g run --containerized --image=node:20       # pick a different image
$ r2g run --containerized -z -s                 # phase-skip flags are forwarded into the container
```

With `--containerized`, the entire r2g pipeline runs inside a disposable Docker container and
does nothing on the local filesystem:

* your project dir is mounted **read-only** at `/r2g/project` and copied to a writable dir inside the container;
* r2g is installed inside the container with `npm install -g r2g` (override the package source/version
  with the env var `R2G_CONTAINER_PKG`, e.g. `R2G_CONTAINER_PKG=r2g@0.2.0`; a local path — an
  `npm pack` tarball like `R2G_CONTAINER_PKG=./r2g-0.2.0.tgz` or a checkout dir — is mounted
  read-only into the container and installed from there, so your exact local build runs the phases);
* the normal phases (Z, S, T, and phase-C when configured) run inside the container exactly as
  they would on the host — only the host filesystem is untouched;
* `$HOME` inside the container points at a container-local dir, so all `$HOME/.r2g/temp` writes stay in the container;
* the container is started with `--rm`, so nothing persists after the run.

`docker` must be on your PATH, otherwise r2g errors out with instructions.

### phase-C: running your `.r2g/tests` in containers

phase-C is a sibling of phase-S and phase-T. Declare a `containers` array in your `.r2g/config.js` file:

```js
exports.default = {
  // ...
  containers: [
    {image: 'node:22'},                          // cmd defaults to 'node'
    {image: 'oven/bun:latest', cmd: 'bun'}       // run each test file with bun instead
  ]
};
```

After phase-T completes, for each configured container r2g does a `docker run --rm` which mounts the
built dummy project (`$HOME/.r2g/temp/project` — it already contains your packed tarball installed into
`node_modules`, plus `tests/` and `fixtures/`) **read-only**, copies it to a writable dir inside the
container, and executes each file in `tests/` with the configured `cmd` (default `node`). Output is
prefixed with `phase-C:`, and the run fails if any container test fails.

If no `containers` are configured, phase-C is a no-op. If containers are configured but `docker` is not
on your PATH, the run fails with a clear message. Skip phase-C with `-c`, `--skip-c`, or `--skip=c`
(just like `-z`/`-s`/`-t`).

<br>

### For the future:

* Instead a dummy NPM project which will depend on X, we can allow users to use their own test projects, and pull those in with `git clone` or what not.


### TBD
Just adding some spaces here
