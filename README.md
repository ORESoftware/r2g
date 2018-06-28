
# r2g (@oresoftware/r2g)

### Installation

```bash
npm i -g @oresoftware/r2g
```

<i>Optionally</i>, you can add the following to your ~/.bashrc and/or ~/.bash_profile files:

```bash
. "$HOME/.oresoftware/shell.sh"
```

_____________________________________________________________________________________________

### Important Info

* This tool is only proven on MacOS/*nix, not tested on Windows.
* Testing does not happen in your local codebase - before anything, your codebase is copied to `"$HOME/.r2g/temp/copy"`

<b>To make this README as clear and concise as possible:</b>

* Your NPM package is referred to as `X`. X is the name of the package you publish to NPM, which is the "name" field of your package.json.
* `T` is the r2g test project directory => `"$HOME/.r2g/temp/project"`
* The package.json file for X is simply referred to as `X-package.json`.
* Your index.js file (whatever "main" points to in X-package.json), is referred to as `X-main`

When X is tested with r2g, it will be installed to:
`$HOME/.r2g/temp/project/node_modules/X`

which is of course the same as:
`T/node_modules/X`

<br>

______________________________________________________________________________________________

## Purpose

This tool <i>complements</i> your standard CI/CD testing for NPM libraries. You might already be using Travis, CircleCI, etc, to test your library
when you do a `git push`. Keep doing that. <i>However, the reason why what you are already doing is likely to be insufficient is because:</i>

1. You install using `npm install` instead of `npm install --production`, because you need your devDependencies for your tests. (whoops!).
2. You are testing your package directly, instead of testing it as a dependency of another project. In reality, someone will be using your package via `node_modules/X`.
3. You are not using `npm pack` to package your project before testing it. Your `.npmignore`  file could mean you will be missing files, when someone goes to use your package in the wild.

The above things are why you need to take some extra pre-cautions before publishing NPM packages. I think we have all had `.npmignore` files that accidentally ignored files we need.
And we have all had dependencies in devDependencies instead of dependencies, which caused problems when people try to use the library. Those are the two motivations for using this tool,
to *prove* that X works in its final format.

## A Better Workflow

One nice thing about testing locally instead of on a CI/CD server, is you don't have to leave your IDE, and therefore you won't get distracted by the internet lol.
You can run this tool <b>before</b> pushing to a Git remote. r2g will smoke test your library in about as much time as it takes to `npm install --production` your project.
<b>If r2g smoke tests do not pass, it means your package is not publishable!</b>

<br>

This tool allows you to test your package in the published format, without actually having to publish to NPM. <br>
Everything happens locally. For packages that do more complex/system things, it will be useful to use a Docker container. <br>
For use in a Docker container, see: https://github.com/ORESoftware/docker.r2g

<br>

Using r2g, testing happens in `"$HOME/.r2g/temp/project"`.

<br>

What you do: Write some smoke tests that will run after (a) your library is in the published format, and (b) is
installed in another project as dependency. This serves the two obvious purposes: 1. does it actually install
properly when --production is used?, and 2. can it be loaded and run with at least some basic functionality <i>by another package</i>?

<b> To re-iterate: here are the 3 big benefits of using r2g in combination with your existing CI/CD test process: </b>

* Uses `npm pack` which will convert the project into published format which help avoid problems with overly-aggressive `.npmignore` files
* Tests your dependency in the actual format, which is as a dependency residing in `node_modules` of <i> another </i> project X.
* Uses the `--production` flag, as in `npm install --production`, when it installs your package to X.

<br>

# Basic usage / Getting started

All you have to do is execute this in a shell at the root of your project:

```bash
$ r2g run
```

This command will then fail. That's expected. <br>
To get your tests to pass, add this to X-main (your package's index file, whatever "main" in package.json points to):

```js
exports.r2gSmokeTest = function(){  // this function can be async
  return Promise.resolve(true);
};
```

the above function is called with `Promise.resolve(r2gSmokeTest())`, and in order to pass it must return `true` (not just truthy). <br>

To read more about this testing function, see:
#### `docs/r2g-smoke-test-exported-main-function.md`

This exported function `r2gSmokeTest` allows you to smoke test your package. When this function is run you <i>may</i> use the production dependencies declared in your project.

<br>

## Adding more tests beyond the `r2gSmokeTest` function

To add more sophisticated tests, run:

```bash
r2g init
```

this will add a folder to your project called `.r2g`. (Running `r2g init` is safe, it will not overwrite any existing files).
The `.r2g` folder contains a file called: `.r2g/smoke-test.js`.

<br>

Now when `r2g run` executes, it will run `.r2g/smoke-test.js`,  *but* it will run this test in the context of the main project, meaning it will copy: <br>

 `$HOME/.r2g/temp/project/node_modules/your_package/.r2g/smoke-test.js` -->  `$HOME/.r2g/temp/project/smoke-test.js`

<br>

The above is very important to understand, because it means that this smoke test *should not include any dependencies* from X-package.json.

<br>

## Linking with existing local dependencies:

In your .r2g/config.js file, add local package names to the packages property:

```js
exports.default = {

  // ...

  packages: {
     // local packages will be installed to your project, using: npm pack x && npm install x --production
     'your-local-package-a: true,
     'your-local-package-b: true
   }
}
```



## Usage in a Docker image/container

<br>

First, make sure you have Docker installed on your local machine. See standard installation instructions for MacOS/*nix.

<br>

Run this in the root of your project:

```bash
r2g init
```

Then run this:

```bash
r2g docker
```

The above command actually uses this command line tool: <br>
https://github.com/ORESoftware/docker.r2g



### Advanced usage

The following usage is *experimental*.

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


## How it works in detail

r2g uses the following steps to do its thing:

1. Copies your project to "$HOME/.r2g/temp/copy" with `rsync -r`
2. For the local project being directly tested: `npm pack`
3. Then in a testbed project we run: `npm install --production /path/to/tarball.tgz`

The testbed project is located here: "$HOME/.r2g/temp/project".
So your project would be installed here: "$HOME/.r2g/temp/project/node_modules/x"
