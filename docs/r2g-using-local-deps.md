

## Installing local deps (instead of using them from NPM)

Many OSS devs will have multiple projects, some interdependent, on their local fs.

Say we have this on our local fs:

```
your_projects/
   a/package.json
   b/package.json
   c/package.json
```

say we want to test package a.

package `a` has this in package.json:

```json
{
  "dependencies":{
    "b":"latest"
    "c":"latest"
  }
}
````

so normally, when we run this for package a:

```bash
r2g run
```

the above command will install `b` and `c` via NPM cache or registry

however, if we do this:

```bash
r2g run --full
```

then `b` and `c` will be **discovered** on your fs, and installed to `a`, for testing!

And if we do this:


```bash
r2g run --full --pack
```

then `b` and `c` will be tarballed first with `npm pack` before being installed.

So how do we accomplish this?

In project/package `a`, run `r2g init`..then in `a/.r2g/config.js`, add:

```js

exports.default = {

   searchRoot: path.resolve(process.env.HOME + '/my_projects'),

   packages: {
      'b': true,
      'c': true
   }
}


```


now run this from project `a`:

```bash
r2g run --full
```

or

```bash
r2g run --full --pack
```

Now you can test multiple projects together as dependencies of each other.

For local development (not testing), see npm-link-up, which does amazing things with symlinks:
https://github.com/ORESoftware/npm-link-up



