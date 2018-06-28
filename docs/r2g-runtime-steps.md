

## r2g steps / order of operations

This is how r2g works when you run `r2g run`.

---------------------------------------------------------------------------------------------

r2g uses the following steps to do its thing:

1. Copies X to `"$HOME/.r2g/temp/copy"` with `rsync -r --exclude="node_modules" ...`

2. Next, `npm pack` is run against X, which provides us with a `<X-version>-.tgz` file

3. We rm -rf T, then do mkdir -p T, then create a fresh NPM project there with `npm init -f`

4. We take the above .tgz file, and install it to T, using: `npm install --production /path/to/tarball.tgz`

5. To be completed later.
