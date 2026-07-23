
## A Better Workflow

One nice thing about testing locally instead of on a remote CI/CD server, is you don't have to leave your IDE to see the results, the dev loop is a bit tighter.
You can run this tool <b>before</b> pushing to a Git remote. r2g will smoke test your library in about as much time as it takes to `npm install --production` your project.
<b>If r2g smoke tests do not pass, it means your package is not publishable!</b> <br>

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


## r2g steps / order of operations

This is how r2g works when you run `r2g run`.

---------------------------------------------------------------------------------------------

r2g uses the following steps to do its thing:

1. Copies X to `"$HOME/.r2g/temp/copy"` with `rsync --copy-links -r --exclude=".git" --exclude="node_modules"`

2. Next, `npm pack` is run against X, which provides us with a `<X-version>.tgz` file

3. We `rm -rf $HOME/.r2g/temp`, then do `mkdir -p $HOME/.r2g/temp`, then generate a fresh dummy NPM project there

4. We take the above .tgz file, and install it to T, using: `npm install --production /path/to/tarball.tgz`

5. To be completed later.

