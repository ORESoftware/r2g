
<img width="200px" align="right" src="https://raw.githubusercontent.com/oresoftware/media/master/namespaces/r2g/oresoftware-r2g-rounded.png?foo">

[<img src="https://img.shields.io/badge/slack-@oresoftware/r2g-yellowgreen.svg?logo=slack">](https://oresoftware.slack.com/messages/CCAHLN77B)

[![Gitter](https://badges.gitter.im/oresoftware/r2g.svg)](https://gitter.im/oresoftware/r2g?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)

<br>

#  @oresoftware/r2g 

>
> Properly test your NPM packages before publishing. <br>
> This tool allows you to test your package in the published format, without having to publish to an NPM registry.
>

<br>

#### Caveats + Disclaimer

>
> This will not work with MS Windows. Only MacOS and *nix. 
> If you are interested in getting to work on Windows, pls file a ticket.
>

<br>

## Video demo

Watch this video to learn how to use r2g: <br>


The video references this example repo: <br>
https://github.com/ORESoftware/r2g.example

<br>

### Installation

```console
$ npm i -g r2g
```

<i>Optionally</i>, you can add the following to your ~/.bashrc and/or ~/.bash_profile files:

```shell
. "$HOME/.oresoftware/shell.sh"
```

<i> => Note you will also get bash completion for r2g, if you source the above. </i>

<br>
_____________________________________________________________________________________________


### Introduction

r2g tests your package after using `npm pack` and `npm install --production`. You can use your current test suite for testing, and also write some new smoke tests
that are specific to r2g. r2g current has 3 <i>phases</i>, each phase is optional:

<br>

* <b> phase-Z:</b> packs your project and installs the packed project as a dependency of itself then runs `npm test` on your project. You can override `npm test` with `r2g.test` in package.json.
* <b> phase-S:</b> installs your project as a dependency of a dummy package in `$HOME/.r2g/temp/project`, then it executes the `r2gSmokeTest` function exported from your main.
* <b> phase-T:</b> Copies the test scripts from `.r2g/tests` in your project, to `$HOME/.r2g/temp/project/tests`, and runs them.

<br>

By default all phases are run, but you can skip phases with the `--skip=z,s,t` option.

<br>

r2g is part of multi-pronged attack to make multi-repos easier to manage with NPM.

<b> The current pieces are: </b>

* [npm-link-up (NLU)](https://github.com/ORESoftware/npm-link-up) => links multiple NPM packages together for local development
* [r2g](https://github.com/ORESoftware/r2g) => tests local packages <i>properly</i> before publishing to NPM
* [npp](https://github.com/ORESoftware/npp) => publish multiple packages and sync their semver versions

<br>

## Quick reference

<br>

note: `r2g test` is an alias of `r2g run`.

<br>

>
>```console
>$ r2g run
>```
>
> * Runs all phases.
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
> * Installs other locally developed dependencies to your main package, defined in `.r2g/config.js`, and tests everything together
>

<br>

>
>```console
>$ r2g run --full --pack
>```
>
> * Installs other locally developed dependencies to your main package, *npm packs them too*, and tests everything together
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
exports.r2gSmokeTest = function(){  // this function can be async
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
Your new `.r2g` folder contains a file called: `.r2g/smoke-test.js`.

<br>

Now when `r2g run` executes, it will run `.r2g/smoke-test.js`,  *but* it will run this test in the context of the main project, meaning it will copy: 

<br>

   `$HOME/.r2g/temp/project/node_modules/X/.r2g/smoke-test.js` -->  `$HOME/.r2g/temp/project/smoke-test.js`

<br>

The above is very important to understand, because it means that this smoke test *should not include any dependencies* from X-package.json.
In fact, the *only* dependency `.r2g/smoke-test.js` should require, besides core modules, is X itself.

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
To use r2g in a Docker container, see: https://github.com/ORESoftware/docker.r2g

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
https://github.com/ORESoftware/docker.r2g


<br>

### For the future:

* Instead a dummy NPM project which will depend on X, we can allow users to use their own test projects, and pull those in with `git clone` or what not.

