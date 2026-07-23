# Multi-ecosystem downstream verification

`r2g run` proves the artifact a registry would receive can be installed and used
from a separate consumer project. It does not treat a successful build in the
source checkout as sufficient.

## Supported adapters

| Ecosystem | Manifest | Publishable artifact | Downstream installation check |
| --- | --- | --- | --- |
| npm | `package.json` | `npm pack` tarball | Existing phase Z/S/T flow installs the tarball under `$HOME/.r2g/temp/project`. |
| Rust | `Cargo.toml` | `cargo package` `.crate` | Unpacks the crate and adds it as a path dependency of a new Cargo consumer. |
| Python | `pyproject.toml` | wheel and source distribution from `python -m build` | Creates a new venv, installs the wheel, runs `pip check`, verifies distribution metadata is inside the venv, then runs a custom smoke test when supplied. |
| Gleam | `gleam.toml` | Hex tarball from `gleam export hex-tarball` | Unpacks `contents.tar.gz` and resolves it as a path dependency of a new Gleam project. |
| Go | `go.mod` | portable source tarball matching the VCS-distributed module shape | Unpacks the module, adds a `replace` from a new module, then runs `go list -m all` and `go test ./...`. |

Run one explicitly:

```console
r2g run --ecosystem=rust
r2g run --ecosystem=python
r2g run --ecosystem=gleam
r2g run --ecosystem=go
```

`--ecosystem=auto` is the default. r2g walks upward to the nearest supported
manifest. If one directory contains multiple supported manifests, choose the
adapter explicitly.

## Workspace contract

Each non-npm run gets its own workspace:

```text
${R2G_TEMP_BASE:-$HOME/.r2g/temp}/r2g/<run-id>/
  subject/
  artifacts/<ecosystem>/
  consumers/<ecosystem>/
  results.json
```

On GitHub Actions, `$RUNNER_TEMP` is used automatically. A failed workspace is
always retained. Use `--keep-temp` to retain a successful one.

The source project is copied before packaging, generated build directories and
VCS metadata are excluded, and the consumer is never run with the source root as
its working directory.

## Custom consumer skeletons

Built-in consumers prove packaging, installation, dependency resolution, and
compilation. A library should also commit a small API-level smoke test under:

```text
.r2g/skeletons/rust/
.r2g/skeletons/python/
.r2g/skeletons/gleam/
.r2g/skeletons/go/
```

r2g copies that directory into the clean consumer before running the ecosystem
test. Text files may use:

| Token | Replacement |
| --- | --- |
| `__R2G_PACKAGE_NAME__` | Name read from the package manifest. |
| `__R2G_ARTIFACT_PATH__` | Absolute path to the unpacked artifact (or installed archive for Python). |
| `__R2G_SUBJECT_PATH__` | Absolute path to the staged source copy, useful only for negative assertions. |

Conventional smoke files are:

- Rust: any normal Cargo consumer source; r2g generates `Cargo.toml` if absent.
- Python: `smoke_test.py`, `smoke.py`, or `test.py`.
- Gleam: consumer source under `src/`; r2g generates `gleam.toml` if absent.
- Go: normal `*_test.go` consumer files; r2g generates `go.mod` if absent.

## Required toolchains

The selected package manager must be on `PATH`. Python additionally expects the
PyPA `build` package (`python -m pip install build`). r2g reports the exact failed
command and retains the workspace when a tool or package step fails.
