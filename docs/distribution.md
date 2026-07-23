# CLI distribution and tagged releases

Releases are driven only by immutable semantic-version tags such as `v0.3.0`.
The tag must match the version in `package.json` exactly.

The release workflow:

1. installs the pinned GitHub revision of `@oresoftware/f2e`;
2. audits `.cli-flags.toml` with flags-2-env;
3. runs unit tests plus Rust, Python, Gleam, and Go downstream-consumer tests;
4. builds the npm tarball and its SHA-256 checksum;
5. publishes npm through trusted publishing;
6. creates a GitHub Release with the tarball, checksum, curl installer, Homebrew formula, Scoop manifest, and Chocolatey sources;
7. builds and optionally pushes a Chocolatey package when `CHOCO_API_KEY` is configured;
8. opens a GitOps pull request updating the checked-in Homebrew, Scoop, and Chocolatey metadata to the released checksum.

Before the first tag, configure npm trusted publishing for this repository and
the workflow filename `release.yml`. Chocolatey publication is optional; without
its secret the `.nupkg` is still attached to the GitHub Release.

## Install routes

With npm:

```console
npm install --global r2g
```

With Homebrew:

```console
brew tap ORESoftware/r2g https://github.com/ORESoftware/r2g
brew install r2g
```

With Scoop:

```powershell
scoop install https://raw.githubusercontent.com/ORESoftware/r2g/dev/packaging/scoop/r2g.json
```

With Chocolatey:

```powershell
choco install r2g
```

With the checksum-verifying curl installer:

```console
curl -fsSL https://raw.githubusercontent.com/ORESoftware/r2g/dev/install.sh | sh
```

Pin a version by passing it after `sh -s --`:

```console
curl -fsSL https://raw.githubusercontent.com/ORESoftware/r2g/dev/install.sh | sh -s -- v0.3.0
```

All routes install the same npm package artifact. Node.js 18 or newer is the
runtime dependency.
