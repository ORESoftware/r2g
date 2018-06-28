
# r2g (@oresoftware/r2g)

### Installation

```bash
npm i -g @oresoftware/r2g
```

<i> Optionally </i>, you can add the following to your ~/.bashrc and/or ~/.bash_profile files:

```bash
. "$HOME/.oresoftware/shell.sh"
```

<br>

## Purpose

This tool <b>complements</b> your standard CI/CD testing of libraries on Travis, CircleCI, etc.
You should run this tool <b> before </b> pushing to a Git remote.

<b>

This tool allows you to test your package in the published format, without actually having to publish to NPM. <br>
Everything happens locally. For packages that do some crazier things, it will be useful to use a Docker container. <br>
For use in a Docker container, see: https://github.com/ORESoftware/docker.r2g

<b>

Using r2g, testing happens in `"$HOME/.r2g/temp/project"`.

<br>

What you do: Write some smoke tests that will run after (a) your library is in the published format, and (b) is
installed in another project as dependency. This serves the two obvious purposes, 1. does it actually install
properly?, and 2. can it be loaded and run with at least some basic functionality?

<b> There are 3 main benefits of using r2g in combination with your existing CI/CD test process: </b>

* Uses `npm pack` which will convert the project into published format which help avoid problems with overly-aggressive `.npmignore` files
* Tests your dependency in the actual format, which is as a dependency residing in `node_modules` of <i> another </i> project X.
* Uses the `--production` flag, as in `npm install --production`, when it installs your package to X.

<p>


## Usage

All you have to do is execute this in your shell:

```bash
$ r2g run
```

This command will then fail. That's ok.

To get your tests to pass, add this to your package's index file:

```js
exports.r2gSmokeTest = function(){  // this function can be async
  return Promise.resolve(true);
};
```

the above function is called with `Promise.resolve(r2gSmokeTest())`,
and in order to pass it must return `true` (not just truthy).

So your function can look like:

```js
export const r2gSmokeTest = async () => {  // this function can be async
  return true;
};
```

or just like:

```js
export const r2gSmokeTest = () => {
  return true;
};
```


This exported function `r2gSmokeTest` allows you to smoke test your package.


## Adding more tests beyond `r2gSmokeTest`







## Usage in a Docker image/container

<br>

First, make sure you have Docker installed on your local machine.

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

The following usage is experimental.

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
