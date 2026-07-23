# r2g multi-ecosystem plan

## Implemented foundation

The first adapter slice is now implemented for npm, Rust/Cargo, Python/PyPI,
Gleam/Hex, and Go modules. Rust, Python, Gleam, and Go use run-scoped subject,
artifact, and downstream-consumer directories; failed workspaces are retained
with `results.json`. Custom consumer skeletons and placeholder substitution are
documented in `docs/multi-ecosystem.md`.

The CLI now takes its schema from the repository-root `.cli-flags.toml` and is
parsed by `flags-2-env`. Tagged GitHub Actions releases build one checksummed npm
artifact for npm, GitHub Releases, Homebrew, Scoop, Chocolatey, and the curl
installer. Remaining adapters and the migration of the legacy npm phases onto
the cross-platform core stay on this plan.

## Goal

r2g should prove that a library works after it has been packaged and installed
as a dependency of a separate consumer project. The current implementation does
this for npm packages. The next version should support multi-language libraries
like `ORESoftware/flags-2-env`, where one source repository publishes clients to
many package managers and registries.

The core idea stays the same for every ecosystem:

1. Create an isolated temporary workspace.
2. Package the subject library the same way it would be published.
3. Create a third-party consumer skeleton in the temp workspace.
4. Install the packaged library into that consumer skeleton.
5. Run tests from the consumer skeleton as the current working directory.
6. Keep logs, artifacts, and the generated consumer project for debugging.

The primary user experience should be GitHub Actions. Local execution should
still work, but GitHub-hosted runners make it much easier to test Linux,
macOS, and Windows without asking every library author to install every toolchain
locally.

## Why flags-2-env is the target shape

`flags-2-env` is a useful model because it has a native C core and many runtime
clients. The repo currently contains clients for Node, Bun, Deno, C, C++, Rust,
Java, Kotlin, Scala, Groovy, Clojure, Python, Ruby, PHP, Go, Dart, Erlang,
Elixir, Gleam, Swift, C#, F#, Lua, Nim, OCaml, ReasonML, Haskell, R, Julia,
Crystal, Fortran, Perl, Zig, MATLAB, and Solidity.

That means r2g cannot only understand one build tool. It needs a package-manager
adapter system.

## Product model

r2g should become:

> A tool that verifies a library can be consumed from a clean downstream project,
> across languages, package managers, operating systems, and CI runners.

For a multi-client repo, a maintainer should be able to run:

```console
$ r2g run --ecosystem=all
```

or in GitHub Actions:

```yaml
- uses: ORESoftware/r2g@v1
  with:
    ecosystem: all
```

For a single client:

```console
$ r2g run --ecosystem=rust
$ r2g run --ecosystem=java-maven
$ r2g run --ecosystem=python
```

## Workspace model

Use a run-scoped temp directory:

```text
$R2G_TEMP_BASE/r2g/<run-id>/
  subject/
  artifacts/
  consumers/
    npm/
    rust/
    java-maven/
    python/
  logs/
  results.json
```

Temp base selection:

1. If `R2G_TEMP_BASE` is set, use it.
2. If `GITHUB_ACTIONS=true` and `RUNNER_TEMP` is set, use `$RUNNER_TEMP`.
3. Otherwise use `$HOME/.r2g/temp`.

The old fixed temp paths should remain as compatibility aliases for npm until
the adapter refactor is complete.

## Core architecture

Split r2g into a core engine and ecosystem adapters.

```text
r2g core
  project detection
  temp workspace management
  artifact management
  skeleton management
  process runner
  logging
  result reporting
  GitHub Actions output/summary integration

ecosystem adapters
  npm
  bun
  deno
  rust-cargo
  java-maven
  java-gradle
  python
  ruby
  php-composer
  go
  dart
  dotnet
  swift
  cpp-cmake
  c-make
  beam
  lua
  nim
  ocaml
  haskell
  r
  julia
  zig

runner adapters
  local
  github-actions
  docker-linux
```

The core should not know how Maven, Cargo, npm, or PyPI packaging works. It
should only orchestrate adapters.

## Adapter contract

Each ecosystem adapter should implement the same lifecycle.

```ts
interface EcosystemAdapter {
  name: string;
  detect(ctx: DetectContext): Promise<DetectionResult>;
  plan(ctx: PlanContext): Promise<EcosystemPlan>;
  prepareSubject(ctx: RunContext): Promise<void>;
  packageSubject(ctx: RunContext): Promise<Artifact[]>;
  createConsumer(ctx: RunContext): Promise<void>;
  installArtifacts(ctx: RunContext, artifacts: Artifact[]): Promise<void>;
  runConsumerTests(ctx: RunContext): Promise<TestResult>;
  collectDebugInfo(ctx: RunContext): Promise<void>;
}
```

Detection should be based on manifest files, not only folder names. Examples:

```text
package.json          npm, node, bun, deno depending on fields/files
Cargo.toml            rust-cargo
pom.xml               java-maven
build.gradle          java-gradle, kotlin, groovy
pyproject.toml        python
*.gemspec             ruby
composer.json         php-composer
go.mod                go
pubspec.yaml          dart
mix.exs               elixir
rebar.config          erlang
Package.swift         swift
*.csproj, *.fsproj    dotnet
CMakeLists.txt        c, cpp
Makefile              c, cpp, generic native
*.cabal               haskell
*.opam                ocaml, reasonml
*.rockspec            lua
*.nimble              nim
Project.toml          julia
DESCRIPTION           r
build.zig             zig
```

## Skeleton model

r2g should ship built-in skeletons for common ecosystems:

```text
assets/skeletons/npm/
assets/skeletons/bun/
assets/skeletons/deno/
assets/skeletons/rust-cargo/
assets/skeletons/java-maven/
assets/skeletons/java-gradle/
assets/skeletons/python/
assets/skeletons/ruby/
assets/skeletons/php-composer/
assets/skeletons/go/
assets/skeletons/dart/
assets/skeletons/dotnet/
assets/skeletons/swift/
assets/skeletons/cmake/
```

Each skeleton should be a minimal third-party consumer project. It should import
or load the installed library and run one tiny smoke test.

Repos should also be able to provide custom skeletons:

```text
.r2g/skeletons/npm/
.r2g/skeletons/rust-cargo/
.r2g/skeletons/java-maven/
```

Custom skeletons are important for libraries like `flags-2-env`, where the
correct downstream test is not just "can import package" but "can call the
client, load the native core, parse a fixture config, and free native memory."

## GitHub Actions as the default runner

The recommended path should be a GitHub Action wrapper around the r2g CLI.

Example workflow:

```yaml
name: r2g

on:
  pull_request:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

jobs:
  r2g:
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]

    runs-on: ${{ matrix.os }}

    steps:
      - uses: actions/checkout@v6

      - uses: ORESoftware/r2g@v1
        with:
          ecosystem: all
```

r2g should use `$RUNNER_TEMP` for generated files and write a Markdown summary
to `$GITHUB_STEP_SUMMARY` when available.

The action should support:

```yaml
with:
  ecosystem: all
  include: npm,rust-cargo,java-maven,python
  exclude: swift,r
  keep-temp: false
  publish-dry-run: true
  test-command: auto
```

## Docker and Windows

Docker should be optional, not the default.

Docker is useful for Linux image testing:

```console
$ r2g run --ecosystem=rust-cargo --runner=docker --image=rust:1
$ r2g run --ecosystem=java-maven --runner=docker --image=maven:3-eclipse-temurin-21
```

Docker is not the right primary answer for Windows because Windows containers
require Windows hosts. GitHub Actions should use native hosted runners for
Windows:

```yaml
matrix:
  os: [ubuntu-latest, windows-latest, macos-latest]
```

The implementation should avoid POSIX-only assumptions:

```text
Use Node fs APIs instead of shell-only copy/remove commands.
Use child_process spawn with argv arrays instead of shell strings.
Use path.join/path.resolve instead of hard-coded slash paths.
Avoid bash wrappers in the core execution path.
Make scripts runnable through node, npm, cargo, mvn, gradle, python, etc.
```

## Package-manager adapter plan

### npm / Node

Package:

```console
npm pack
```

Install into consumer:

```console
npm install --production /path/to/package.tgz
```

Test:

```console
npm test
```

This is the existing r2g flow and should be refactored into the first adapter
without changing behavior.

### Bun

Package:

```console
bun pm pack
```

or render/copy the client package, then use npm-compatible package metadata.

Install into consumer:

```console
bun add /path/to/package.tgz
```

Test:

```console
bun test
```

### Deno

Deno is commonly consumed by source URL or JSR. r2g should support source
consumer tests first, then JSR dry-run support later.

Install/consume:

```ts
import { parse } from "../subject/mod.ts";
```

Test:

```console
deno test --allow-read
```

### Rust / Cargo

Package:

```console
cargo package --allow-dirty
```

Consumer dependency:

```toml
[dependencies]
flags2env = { path = "../unpacked-package" }
```

Test:

```console
cargo test
```

Later, add a crates.io dry-run mode:

```console
cargo publish --dry-run
```

### Java / Maven

Use an isolated Maven repo inside the r2g temp workspace.

Package/install subject:

```console
mvn -Dmaven.repo.local=<temp-m2> install
```

Consumer dependency:

```xml
<dependency>
  <groupId>...</groupId>
  <artifactId>...</artifactId>
  <version>...</version>
</dependency>
```

Consumer test:

```console
mvn -Dmaven.repo.local=<temp-m2> test
```

### Java / Gradle, Kotlin, Scala, Groovy

Use an isolated Gradle user home and a temp Maven repo.

Package subject:

```console
gradle publishToMavenLocal
```

or preferably:

```console
gradle publish -PmavenRepoUrl=<temp-repo>
```

Consumer test:

```console
gradle test
```

Gradle adapters should support Kotlin DSL and Groovy DSL.

### Clojure

Package/install through deps.edn or Maven-compatible coordinates.

Consumer test:

```console
clojure -M:test
```

If the client publishes through Maven, reuse the Java/Maven artifact path.

### Python / PyPI

Package:

```console
python -m build
twine check dist/*
```

Install into consumer venv:

```console
python -m venv .venv
.venv/bin/python -m pip install /path/to/wheel-or-sdist
```

On Windows, use `.venv\Scripts\python.exe`.

Test:

```console
python -m pytest
```

or a built-in smoke script when pytest is not present.

### Ruby / RubyGems

Package:

```console
gem build *.gemspec
```

Install into consumer:

```console
gem install --install-dir <temp-gems> /path/to/package.gem
```

Test with isolated gem paths:

```console
ruby test.rb
```

### PHP / Composer / Packagist

Package validation:

```console
composer validate --strict
```

Install into consumer:

```json
{
  "repositories": [
    { "type": "path", "url": "../subject", "options": { "symlink": false } }
  ],
  "require": {
    "oresoftware/flags2env": "*"
  }
}
```

Test:

```console
composer test
```

or:

```console
php test.php
```

### Go modules

Go modules are usually consumed from VCS tags. For local r2g verification, use a
consumer module with `replace`.

Consumer `go.mod`:

```text
require github.com/oresoftware/flags-2-env/clients/golang v0.0.0
replace github.com/oresoftware/flags-2-env/clients/golang => ../subject/clients/golang
```

Test:

```console
go test ./...
```

### Dart / pub.dev

Package validation:

```console
dart pub publish --dry-run
```

Install into consumer with path dependency:

```yaml
dependencies:
  flags2env:
    path: ../subject
```

Test:

```console
dart test
```

### BEAM / Erlang, Elixir, Gleam, Hex

Erlang:

```console
rebar3 compile
rebar3 eunit
```

Elixir:

```console
mix deps.get
mix test
mix hex.build
```

Gleam:

```console
gleam test
```

The adapters should reuse the same packaged native NIF artifact when possible.

### Swift / SwiftPM

Consumer dependency:

```swift
.package(path: "../subject")
```

Test:

```console
swift test
```

Swift should run on macOS by default and can run on Linux when the package
supports it.

### .NET / NuGet

Package:

```console
dotnet pack
```

Install into consumer through a temp NuGet source:

```console
dotnet nuget add source <temp-packages>
dotnet add package Flags2Env --source <temp-packages>
```

Test:

```console
dotnet test
```

### C and C++

C and C++ do not have a single universal package manager. Start with Make and
CMake:

```console
make all
make test
cmake -S . -B build
cmake --build build
ctest --test-dir build
```

For consumer tests, compile a tiny downstream executable that links against the
packaged static or shared library.

### Lua / LuaRocks

Package:

```console
luarocks make --pack-binary-rock
```

Consumer test:

```console
lua test.lua
```

### Nim / Nimble

Package/test:

```console
nimble test
```

Consumer test should depend on the local package path.

### OCaml / ReasonML / opam

Package/test:

```console
opam lint
dune runtest
```

Consumer test should create a minimal dune project with a local opam pin.

### Haskell / Cabal

Package:

```console
cabal sdist
cabal check
```

Consumer test:

```console
cabal test
```

### R

Package:

```console
R CMD build .
R CMD check *.tar.gz
```

Consumer test should install the tarball into a temp library path.

### Julia

Consumer test:

```console
julia --project=. -e 'using Pkg; Pkg.test()'
```

Use a temp depot path with `JULIA_DEPOT_PATH`.

### Zig

Package/test:

```console
zig build test
```

Consumer test should create a small `build.zig` project that imports the local
package.

## Native library concerns

For native-core libraries like `flags-2-env`, r2g must track more than package
manager metadata.

Adapters need to record:

```text
compiled shared library path
compiled static library path
native header paths
runtime loader search paths
platform-specific names: .so, .dylib, .dll
architecture
toolchain version
```

Consumer tests should verify:

```text
the package imports or loads
the native library can be found at runtime
a real function can be called
allocated memory can be released safely
fixtures are included in the published artifact
```

For Windows, tests must check DLL lookup behavior explicitly.

## Configuration

Add an `.r2g/config.js` format that can describe multiple clients:

```js
exports.default = {
  clients: {
    npm: {
      root: "clients/nodejs",
      package: "npm",
      skeleton: ".r2g/skeletons/npm"
    },
    rust: {
      root: "clients/rust",
      package: "cargo",
      skeleton: ".r2g/skeletons/rust-cargo"
    },
    java: {
      root: "clients/java",
      package: "maven",
      skeleton: ".r2g/skeletons/java-maven"
    },
    python: {
      root: "clients/python",
      package: "pypi",
      skeleton: ".r2g/skeletons/python"
    }
  }
};
```

Also support CLI overrides:

```console
$ r2g run --include=npm,rust,java
$ r2g run --exclude=swift,r
$ r2g run --client-root=clients/python --ecosystem=python
```

## Result reporting

Write machine-readable results:

```json
{
  "runId": "...",
  "os": "...",
  "ecosystems": [
    {
      "name": "rust-cargo",
      "status": "passed",
      "artifact": "artifacts/flags2env-0.1.0.crate",
      "consumer": "consumers/rust-cargo",
      "log": "logs/rust-cargo.log"
    }
  ]
}
```

In GitHub Actions, also write a Markdown summary:

```text
| Ecosystem | OS | Status | Artifact | Log |
| --- | --- | --- | --- | --- |
| rust-cargo | ubuntu-latest | passed | ... | ... |
```

## Milestones

### Phase 1: Refactor npm into an adapter

Keep current behavior but move npm-specific logic behind the adapter contract.
This gives the project a safe baseline and prevents the multi-language work from
breaking existing npm users.

Deliverables:

```text
npm adapter
workspace manager
process runner
results.json
basic GitHub Actions summary
```

### Phase 2: GitHub Action wrapper

Add `action.yml` and make the action run the r2g CLI.

Deliverables:

```text
action.yml
r2g run --ci
r2g init github-actions
linux/macOS/windows matrix example
```

### Phase 3: Rust and Java

Add `rust-cargo`, `java-maven`, and `java-gradle` adapters. These cover the
first major expansion beyond npm and exercise both native libraries and JVM
package flows.

Deliverables:

```text
cargo package consumer test
maven isolated repo consumer test
gradle temp repo consumer test
Windows path handling
```

### Phase 4: Python, Ruby, PHP, Go, Dart, .NET

Add the next group of widely used package managers.

Deliverables:

```text
PyPI wheel/sdist consumer test
RubyGems consumer test
Composer path repository consumer test
Go module replace consumer test
Dart pub dry-run and path consumer test
NuGet temp source consumer test
```

### Phase 5: Native and long-tail ecosystems

Add C/C++, Swift, BEAM, Lua, Nim, OCaml, Haskell, R, Julia, Zig, and other
clients as separate adapters.

Deliverables:

```text
native artifact tracking
shared-library runtime lookup checks
adapter-specific skeletons
per-OS compatibility rules
```

### Phase 6: Optional Docker runner

Add Docker for Linux image testing after the local and GitHub Actions runners
are stable.

Deliverables:

```text
--runner=docker
--image=<image>
volume mount strategy
user/permission handling
Linux-only documentation
```

A first slice of this exists today for npm: `r2g run --containerized [--image=<image>]`
runs the whole pipeline in a disposable container with the project mounted
read-only, and phase-C runs the `.r2g/tests` files inside each container listed
in the `containers` array of `.r2g/config.js` (skippable with `-c`/`--skip=c`).

## First flags-2-env workflow target

The first `flags-2-env` r2g workflow should focus on a small but representative
matrix:

```yaml
strategy:
  fail-fast: false
  matrix:
    os: [ubuntu-latest, windows-latest, macos-latest]
    ecosystem: [npm, rust-cargo, java-maven, python, ruby, go]
```

Each ecosystem should prove:

```text
package artifact can be produced
third-party consumer can install it
consumer can call parse against a fixture .cli-flags.toml
consumer receives expected env map values
native memory cleanup path is exercised where applicable
```

After that passes, expand to the remaining clients.

## Open questions

1. Should r2g publish one GitHub Action that installs the CLI, or should the
   compiled CLI be bundled inside the action?
2. Should `ecosystem=all` mean every detected adapter, or only adapters with
   known skeletons?
3. Should dry-run publish validation be mandatory or opt-in?
4. Should r2g keep temp folders by default on CI failures?
5. Should custom skeletons be copied from `.r2g/skeletons`, fetched from git, or
   both?
6. How should adapters share one native build when many clients depend on the
   same C core?
