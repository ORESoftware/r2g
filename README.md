
# r2g (@oresoftware/r2g)

>
> This tool allows you to test your package in the published format, without actually having to publish to NPM. <br>
> Everything happens locally. For packages that do more complex/system things, it will be useful to use a Docker container.
> <b> To use r2g in a Docker container</b>, see: https://github.com/ORESoftware/docker.r2g
>

### Installation

```bash
npm i -g @oresoftware/r2g
```

<i>Optionally</i>, you can add the following to your ~/.bashrc and/or ~/.bash_profile files:

```bash
. "$HOME/.oresoftware/shell.sh"
```

_____________________________________________________________________________________________

#### Quick reference

```bash
r2g run
````

>
> * Copies your package to "$HOME/.r2g/temp/copy", npm pack it, and install it as a dependency of a temp package in "$HOME/.r2g/temp/project"
> * Runs smoke tests
>

```bash
r2g run -z
````

> * Copies your package to "$HOME/.r2g/temp/copy", npm pack it, and install the packed dependency as a dependency of itself and run your regular test suite against itself

```bash
r2g run --full
````

> * Installs other locally developed dependencies to your main package, defined by .r2g/config.js, and tests everything together

```bash
r2g run --full --pack
````

> * Installs other locally developed dependencies to your main package, *npm packs them too*, and tests everything together

```bash
r2g run --full --pack -z
````

> * This will do all of the above.


### Important Info

* This tool is only proven on MacOS/*nix, not tested on Windows. If you do Windows and want something to do - fork this and make it work for Windows - it won't be hard.
* You can use r2g with zero-config, or with some sophisticated config, depending on what you want to do.
* Testing does not happen in your local codebase - before anything, your codebase is copied to `"$HOME/.r2g/temp/copy"`, and all writes happen within `"$HOME/.r2g/temp"`.
* If you use the `--full` option, the local deps of your package will copied to: `"$HOME/.r2g/temp/deps"`
* You can and should put your regular tests in `.npmignore`, but your .r2g folder should not be in `.npmignore`

<b>To make this README as clear and concise as possible:</b>

* Your NPM package is referred to as `X`. X is the name of the package you publish to NPM, which is the "name" field of your package.json.
* `T` is the r2g test project directory => `"$HOME/.r2g/temp/project"`
* When X is tested, it will be installed as a dependency of Y. So it will be `T/node_modules/X`.
* Y is the package name of the package in T
* The package.json file for X is simply referred to as `X-package.json`.
* Your index.js file (whatever "main" points to in X-package.json), is referred to as `X-main`

When X is tested with r2g, it will be installed to: `$HOME/.r2g/temp/project/node_modules/X` which is of course the same as: `T/node_modules/X`

<br>

______________________________________________________________________________________________

## Purpose

This tool <i>complements</i> your standard CI/CD testing for NPM libraries. You might already be using Travis, CircleCI, etc, to test your library
when you do a `git push`. Keep doing that. <i>However, what you are already doing is likely to be insufficient because:</i>

1. You install using `npm install` instead of `npm install --production`, because you need your devDependencies for your tests. (whoops!).
2. You are testing your package directly, instead of testing it as a dependency of another project. In reality, someone will be using your package via `node_modules/X`, and for example, your postinstall routine may behave differently here.
3. You are not using `npm pack` to package your project before testing it. Your `.npmignore`  file could mean you will be missing files, when someone goes to use your package in the wild. Likewise, if
the "files" property in X-package.json is too passive, you might be missing files as well. Using `npm pack` before testing solves that.

The above things are why you need to take some extra pre-cautions before publishing NPM packages. I think everyone has had an `.npmignore` file that accidentally ignored files we need in production.
And we have all had dependencies listed in devDependencies instead of dependencies, which caused problems when people try to use the library. Those are the motivations for using this tool,
to *prove* that X works in its final format.

* There is a secret feature which is extremely badass - install other locally developed projects which are dependencies of X, as part of r2g testing.
See "Linking with existing local dependencies" below.

## A Better Workflow

One nice thing about testing locally instead of on a remote CI/CD server, is you don't have to leave your IDE, and therefore you won't get distracted by the internet lol.
You can run this tool <b>before</b> pushing to a Git remote. r2g will smoke test your library in about as much time as it takes to `npm install --production` your project.
<b>If r2g smoke tests do not pass, it means your package is not publishable!</b> <br>

This tool allows you to test your package in the published format, without actually having to publish to NPM. <br>
Everything happens locally. For packages that do more complex/system things, it will be useful to use a Docker container. <br>
<b> To use r2g in a Docker container</b>, see: https://github.com/ORESoftware/docker.r2g

Running tests in local Docker containers has some advantages, but you can also run r2g as part of your regular test suite on CI/CD servers,
just make sure you have write access to `"$HOME/.r2g"`

How you use this tool locally:

*What you do:* Write some smoke tests that will run after (a) your library is in the published format, and (b) is
installed in another project as dependency. This provides the answer to two important questions: 1. does it actually install
properly when --production is used?, and 2. can it be loaded and run with at least some basic functionality <i>by another package</i>?

<b> To re-iterate: here are the 3 big benefits of using r2g in combination with your existing CI/CD test process: </b>

* Uses `npm pack` which will convert the project into published format which help avoid problems with overly-aggressive `.npmignore` files, or an overly-passive `"files"` property in X-package.json
* Tests your dependency in the actual format, which is as a dependency residing in `node_modules` of <i>another</i> project Y.
* Uses the `--production` flag, as in `npm install --production`, when it installs your package to Y.

<br>

### How it works in detail
To learn more about how r2g works in detail, see: `docs/r2g-runtime-steps.md`

<br>

# Basic usage / Getting started

You can use r2g with zero-config - you just need to implement a single function. <br>
To start, execute this in a shell at the root of your project:

```bash
$ r2g run
```

This command will then fail. That's expected. <br>
To get your test to pass, add this to X-main (your package's index file, whatever "main" in package.json points to):

```js
exports.r2gSmokeTest = function(){  // this function can be async
  return Promise.resolve(true);
};
```

the above function is called with `Promise.resolve(X.r2gSmokeTest())`, and in order to pass it must resolve to `true` (not just truthy). <br>

<b>To read more about the exported r2gSmokeTest function, see:</b> `docs/r2g-smoke-test-exported-main-function.md`

<br>

Note: the exported function `r2gSmokeTest` allows you to smoke test your package. When this function is run you <i>may</i> use the production dependencies declared in your project.
<i> However, for other r2g tests, you may *not* directly use the dependencies declared in X-package.json, *you may only require X itself*. </i>

<br>

## Adding more tests beyond the `r2gSmokeTest` function

To do more sophisticated tests, we add some configuration in a folder called .r2g in the root of your project. <br>
To do this, run:

```bash
r2g init
```

this will add a folder to your project called `.r2g`. Your `.r2g` folder should never be in `.npmignore`. (Running `r2g init` is safe, it will not overwrite any existing files).
Your new `.r2g` folder contains a file called: `.r2g/smoke-test.js`.

<br>

Now when `r2g run` executes, it will run `.r2g/smoke-test.js`,  *but* it will run this test in the context of the main project, meaning it will copy: <br>

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

So using `r2g run --full` => we install local deps instead of the deps from NPM. <br>
And using `r2g run --full --pack` => we pack the local deps before installing them. <br>

Awesome.

<b>To read more about using local deps for testing instead of installing your local deps from NPM, see:</b> <br> => `docs/r2g-using-local-deps.md`

<br>

## Usage in a Docker image/container

First, make sure you have Docker installed on your local machine. See standard installation instructions for MacOS/*nix.
Run this in the root of your project:

```bash
$ r2g init   # you only need to run this once per project, but won't hurt if you do it more than once
```

Then run this:

```bash
$ r2g docker
```

The above command actually uses this command line tool: <br>
https://github.com/ORESoftware/docker.r2g


<br>

## Experimental usage

The following usage is *experimental*, don't use it yet.

1. Add the following scripts to your `package.json` file:

```json
 "r2g": {
    "copy-tests": "cp -r ./test $HOME/.r2g/temp/project",
    "run-tests": "npm test"
  },
```

In the above, we don't publish the test directory to NPM, but we want to test our tarballed contents,
so we have to copy the test directory over.

Note that you might actually publish the relevant tests when your run `npm publish` (gets tarballed).*
So you might need to copy any other files -
in other words, you won't need to do anything in r2g-copy-tests, so just do this


```json
 "r2g": {
    "copy-tests": "echo 'copying test no-op'",
    "run-tests": "npm test"
 },

```



## Sample output

r2g is setup for this project itself, so we run `r2g run` against this codebase.

```terminal

$ time r2g run

r2g: [r2g info] Removing existing files within "$HOME/.r2g/temp"...
r2g: [r2g info] we are not creating a deps map since the --full option was not used.
r2g: [r2g info] Making sure the right folders exist using mkdir -p ...
r2g: [r2g info] Recreating "$HOME/.r2g/temp"...
r2g: [r2g info] Copying your project to "$HOME/.r2g/temp/copy" using rsync ...
r2g: [r2g info] Copying the smoke-tester.js file to "/home/oleg/.r2g/temp/project" ...
r2g: [r2g info] Copying a "blank" package.json file to "/home/oleg/.r2g/temp/project" ...
r2g: [r2g info] Removing existing files within "$HOME/.r2g.temp"...
r2g: copying new package.json file to: /home/oleg/.r2g/temp/project
r2g: [r2g info] Copying your user defined tests to: "/home/oleg/.r2g/temp/project" ...
r2g: [r2g info] Running "npm pack" against your project ...
r2g: Copying user defined smoke test
r2g: [r2g info] Running the following command via this dir: "/home/oleg/.r2g/temp/project" ...
r2g: [r2g info] npm install --loglevel=warn --cache-min 9999999 --production "/home/oleg/.r2g/temp/copy/r2g/oresoftware-r2g-0.0.134.tgz";
r2g: [r2g info] Running your exported r2gSmokeTest function(s) in "/home/oleg/.r2g/temp/project" ...
r2g: This many packages were tested: 1
r2g: Your exported r2gSmokeTest functions have all passed
r2g: [r2g info] Running user defined tests in "/home/oleg/.r2g/temp/project" ...
r2g: Now running the user defined smoke test...
r2g: r2g user defined smoke test passed.
r2g: [r2g info] Successfully ran r2g.

real    0m2.144s
user    0m2.124s
sys     0m0.332s

```


If we run `r2g run --full --pack` we get:

```terminal

r2g: /home/oleg/.nvm/versions/node/v10.5.0/bin/r2g_run is sourcing the r2g shell script.
r2g: [r2g info] Removing existing files within "$HOME/.r2g/temp"...
r2g: [r2g info] Making sure the right folders exist using mkdir -p ...
r2g: [r2g info] added the following package name to the map: clean-trace
r2g: [r2g info] Recreating "$HOME/.r2g/temp"...
r2g: [r2g info] Copying your project to "$HOME/.r2g/temp/copy" using rsync ...
r2g: [r2g info] Copying the smoke-tester.js file to "/home/oleg/.r2g/temp/project" ...
r2g: [r2g info] Copying a "blank" package.json file to "/home/oleg/.r2g/temp/project" ...
r2g: [r2g info] Removing existing files within "$HOME/.r2g.temp"...
r2g: copying new package.json file to: /home/oleg/.r2g/temp/project
r2g: [r2g info] Copying your user defined tests to: "/home/oleg/.r2g/temp/project" ...
r2g: Copying user defined smoke test
r2g: [r2g warn] unexpected non-file here: /home/oleg/WebstormProjects/oresoftware/quicklock/test/xxx
r2g: [r2g info] added the following package name to the map: residence
r2g: [r2g info] About to run the following command: 'set -e; mkdir -p "/home/oleg/.r2g/temp/deps/r1uUFZMzQ"; rsync -r --exclude="node_modules" "/home/oleg/WebstormProjects/oresoftware/clean-trace" "/home/oleg/.r2g/temp/deps/r1uUFZMzQ";'
r2g: [r2g info] About to run the following command: 'set -e; mkdir -p "/home/oleg/.r2g/temp/deps/ryg_LKWzGQ"; rsync -r --exclude="node_modules" "/home/oleg/WebstormProjects/oresoftware/residence" "/home/oleg/.r2g/temp/deps/ryg_LKWzGQ";'
r2g: [r2g info] Running the following command: 'npm pack --loglevel=warn;', in this directory: "/home/oleg/.r2g/temp/deps/r1uUFZMzQ/clean-trace".
r2g: [r2g info] Running the following command: 'npm pack --loglevel=warn;', in this directory: "/home/oleg/.r2g/temp/deps/ryg_LKWzGQ/residence".
r2g: [r2g info] here is the project map now:
r2g: [r2g info] residence '/home/oleg/.r2g/temp/deps/ryg_LKWzGQ/residence/residence-0.0.210.tgz'
r2g: [r2g info] clean-trace '/home/oleg/.r2g/temp/deps/r1uUFZMzQ/clean-trace/clean-trace-0.0.104.tgz'
r2g: [r2g info] here is updated the package.json file: {
r2g: "name": "@oresoftware/r2g",
r2g: "version": "0.0.134",
r2g: "description": "Semver-oriented TypeScript library skeleton.",
r2g: "main": "dist/index.js",
r2g: "bin": {
r2g: "r2g": "cli/r2g.sh",
r2g: "r2g_run": "cli/r2g_run.sh",
r2g: "r2g_init": "cli/r2g_init.sh",
r2g: "r2g_basic": "cli/r2g_basic.sh"
r2g: },
r2g: "types": "dist/index.d.ts",
r2g: "typings": "dist/index.d.ts",
r2g: "scripts": {
r2g: "postinstall": "./assets/postinstall.sh",
r2g: "test": "suman test"
r2g: },
r2g: "repository": {
r2g: "type": "git",
r2g: "url": "git+https://github.com/ORESoftware/r2g.git"
r2g: },
r2g: "keywords": [
r2g: "typescript",
r2g: "library",
r2g: "skeleton",
r2g: "scaffold"
r2g: ],
r2g: "author": "TODO Yo.Mama",
r2g: "license": "SEE LICENSE IN LICENSE.md",
r2g: "bugs": {
r2g: "url": "https://github.com/ORESoftware/r2g/issues"
r2g: },
r2g: "homepage": "https://github.com/ORESoftware/r2g#readme",
r2g: "dependencies": {
r2g: "@oresoftware/shell": "latest",
r2g: "async": "^2.6.1",
r2g: "chalk": "^2.4.1",
r2g: "clean-trace": "file:///home/oleg/.r2g/temp/deps/r1uUFZMzQ/clean-trace/clean-trace-0.0.104.tgz",
r2g: "dashdash": "^1.14.1",
r2g: "residence": "file:///home/oleg/.r2g/temp/deps/ryg_LKWzGQ/residence/residence-0.0.210.tgz",
r2g: "shortid": "^2.2.8"
r2g: },
r2g: "devDependencies": {
r2g: "@types/async": "^2.0.49",
r2g: "@types/core-js": "^0.9.46",
r2g: "@types/node": "^9.6.2",
r2g: "@types/shortid": "0.0.29"
r2g: },
r2g: "r2gz": {
r2g: "copy-tests": "cp -r ./test $HOME/.r2g/temp/project && cp -r ./dist $HOME/.r2g/temp/project",
r2g: "run-tests": "node test"
r2g: },
r2g: "b3val": 3
r2g: }
r2g: [r2g info] Running "npm pack" against your project ...
r2g: [r2g info] Running the following command via this dir: "/home/oleg/.r2g/temp/project" ...
r2g: [r2g info] npm install --loglevel=warn --cache-min 9999999 --production "/home/oleg/.r2g/temp/copy/r2g/oresoftware-r2g-0.0.134.tgz";
r2g: [r2g info] Running your exported r2gSmokeTest function(s) in "/home/oleg/.r2g/temp/project" ...
r2g: This many packages were tested: 1
r2g: Your exported r2gSmokeTest functions have all passed
r2g: [r2g info] Running user defined tests in "/home/oleg/.r2g/temp/project" ...
r2g: Now running the user defined smoke test...
r2g: r2g user defined smoke test passed.
r2g: [r2g info] Successfully ran r2g.

real    0m3.092s
user    0m3.832s
sys     0m0.980s

```
