# r2g for zed-pkg: hardening plan and Rust rewrite

Status: proposal — 2026-07-24

## 1. The new mission

zed-pkg (github.com/zed-pkg) is a universal package manager: one CLI that
installs a dependency into a Maven, Cargo, npm, or any other supported project
by inferring the ecosystem from shell and filesystem context. r2g's role in
that world is the **verification and publishing engine**: prove that a
library/SDK, in its *published* form, installs and works as a dependency of a
real downstream consumer — then publish it to the zed dep hosts (zed cloud).

That changes r2g's identity from "an npm publishing helper that grew adapters"
to "a language-agnostic artifact verifier that npm happens to be one adapter
for". Everything below follows from that shift.

## 2. Honest audit of what r2g is today

Strengths worth preserving:

- **The core idea is already language-agnostic.** The Z/S/T/C phase model
  (pack → install into a dummy consumer → run smoke tests → container tests)
  applies unchanged to any ecosystem.
- **The CLI contract is externalized.** `.cli-flags.toml` + flags-2-env means
  the command/flag surface is data, not code — parseable from any language
  with a flags-2-env client. This is the single most rewrite-friendly design
  decision in the repo.
- **Five adapters exist and are tested**: npm, Rust/cargo, Python, Gleam, Go,
  with a documented workspace contract
  (`$R2G_TEMP_BASE/r2g/<run-id>/{subject,artifacts,consumers,results.json}`)
  and an e2e suite that proves downstream consumption.
- **Containers exist twice**: phase-C runs user tests in a container, and
  `--containerized` runs the whole pipeline in one.

Weaknesses that block the zed-pkg role:

1. **The Node runtime requirement contradicts the positioning.** Telling a
   Maven or Cargo user to install Node 22 to *test their library* is real
   friction, and every installer (brew, scoop, choco) drags nodejs in as a
   dependency.
2. **Two generations of code.** The npm flow (`src/commands/run/run.ts`,
   ~1,000 lines) is 2018-era callback style that pipes heredoc strings into
   `bash` and shells out to `rsync`; the non-npm flow
   (`ecosystem-runner.ts`) is modern `spawn(cmd, argv)` promise code. The
   legacy flow is POSIX-only (no Windows), and interpolating paths into bash
   strings is a standing quoting/injection hazard even with `shQuote`.
3. **Security posture is below what a publishing gatekeeper needs.** r2g runs
   untrusted project scripts (prepack, test hooks) directly on the host by
   default; archives are extracted with library defaults (we just patched a
   node-tar DoS advisory); artifacts carry no checksums, signatures, or
   provenance; there is no sandbox story besides "use phase-C".
4. **Containers are bolted on, not first-class.** Docker CLI only (no podman
   / nerdctl / rootless), image tags not digest-pinned, one hardcoded default
   image (`node:22`) regardless of ecosystem, and containerization is opt-in
   rather than the default boundary for untrusted code.
5. **Adapter onboarding is code, not data.** Each ecosystem is a hand-written
   TypeScript function. Reaching "80%+ of languages" (Maven/Gradle, NuGet,
   Composer, RubyGems, Hex, Pub, SwiftPM, CocoaPods, …) needs a declarative
   adapter format plus a small trusted core, or the adapter matrix will not
   scale.
6. **The machine interface is partial.** `--json` exists on a few paths,
   `results.json` only covers non-npm runs, the schema is unversioned, and
   exit codes are not catalogued. zed-pkg needs r2g to be a *subprocess with a
   stable wire contract*, not a human-oriented log stream.

## 3. Should r2g be rewritten in Rust?

**Yes — and incrementally, not big-bang.** The reasoning:

**For:**

- **Distribution.** A single static binary per platform removes the Node
  dependency, collapses the brew/scoop/choco formulas to "download, checksum,
  link", enables `cargo-binstall`-style installs, and matches how zed-pkg
  itself will ship.
- **The CLI contract ports for free.** flags-2-env already ships a Rust
  client (`clients/rust/`) wrapping the same C parser core; the Rust binary
  can static-link `parser.c` and read the *identical* `.cli-flags.toml`,
  keeping every flag, alias, env var, help table, and completion script
  byte-compatible from day one.
- **OCI is native territory.** `oci-spec`, `oci-client`/`oci-distribution`,
  containerd gRPC clients, and libcontainer/youki give first-class registry
  and runtime access without shelling to the docker CLI (retained only as a
  fallback driver).
- **Robustness where it matters.** Memory-safe parsing of untrusted archives
  (tar/zip bombs, path traversal), real cross-platform process control (no
  bash heredocs, works on Windows), structured concurrency for running
  adapter phases with timeouts, and `cargo audit`/`cargo deny`/SBOM for our
  own supply chain.
- **The port shrinks the code.** The legacy npm flow's bash/rsync scaffolding
  is *replaced by std/crates* (`fs`, `tar`, `walkdir`), not translated.

**Against (and mitigations):**

- The npm flow embodies years of edge-case behavior → keep the TS
  implementation as the executable spec and gate the port on a shared
  conformance suite (§5, phase 0).
- Rewrites stall when they chase feature parity with a moving target → freeze
  the contracts first, then port adapter-by-adapter behind the same CLI.
- Node/TS familiarity in the contributor base → the adapter layer becomes
  *declarative* (TOML) so most future contributions don't require Rust.

## 4. Target architecture (r2g-rs)

```
r2g/
  crates/
    r2g-cli        # main binary; flags-2-env Rust client (static-links parser.c)
    r2g-core       # phase engine, workspace mgr, results schema, exit codes
    r2g-adapters   # EcosystemAdapter trait + built-in adapters
    r2g-oci        # runtime drivers (docker|podman|nerdctl|containerd), registry client
    r2g-publish    # zed cloud publishing: upload, checksums, provenance
```

The adapter trait — the contract every ecosystem implements:

```rust
trait EcosystemAdapter {
    fn detect(&self, dir: &Path) -> Option<Confidence>;      // manifest sniffing
    fn package(&self, subject: &Workspace) -> Result<Artifact>;   // pack/zip/tarball
    fn scaffold_consumer(&self, ws: &Workspace) -> Result<Consumer>;
    fn install(&self, c: &Consumer, a: &Artifact) -> Result<InstallReport>;
    fn verify(&self, c: &Consumer) -> Result<VerifyReport>;  // build/load/smoke test
    fn default_image(&self) -> ImageRef;                     // digest-pinned
    fn publish(&self, a: &Artifact, host: &DepHost) -> Result<Receipt>;
}
```

Built-in adapters stay in Rust for the trusted core (npm, cargo, python,
gleam, go, maven/gradle, nuget as the next tranche). The long tail comes from
**declarative adapters**: an `adapter.toml` naming the manifest files, pack
command, artifact glob, consumer skeleton, install command, and verify
command — always executed inside the adapter's container image, never on the
host. That is what makes "80% of languages" tractable *and* safe.

OCI as a first-class citizen means:

- **Runtime abstraction**, autodetected: docker → podman → nerdctl →
  containerd socket; rootless supported; one `--runtime` override.
- **Sandbox by default**: `package`/`install`/`verify` for any project run in
  the adapter's container unless `--host` is explicitly passed. The host path
  remains for trusted local dev loops; the container path is the default in
  CI and for declarative adapters.
- **Digest-pinned per-ecosystem default images** (`node:22@sha256:…`,
  `rust:1.85@sha256:…`, …) recorded in `results.json` for reproducibility.
- **Artifacts as OCI objects**: optionally push the packed artifact +
  results to an OCI registry (ORAS media types), which gives zed cloud a
  standard transport, dedup, and signing surface (sigstore/cosign) with SLSA
  provenance attached to every publish.

Machine interface, frozen as **contract v1**:

- `results.json` (schema-versioned) for every run, npm included: subject,
  artifact digests (sha256), phase timings, per-phase pass/fail, image
  digests, adapter versions.
- `--json` on every command; logs to stderr, data to stdout — always.
- Documented exit-code catalogue (0 ok; 2 packaging failed; 3 install
  failed; 4 verify failed; 5 publish refused; 10 environment/runtime
  missing; …).

## 5. Migration plan (strangler-fig)

**Phase 0 — freeze the contracts (in this repo, now):**
write down and version the four interfaces the rewrite must honor: the CLI
surface (already frozen in `.cli-flags.toml`), the workspace layout, the
`results.json` schema, and the exit-code catalogue. Turn the existing e2e
tests into a **black-box conformance suite** that takes `R2G_BIN` as input,
so the same suite gates the TS binary today and the Rust binary later.
Acceptance: `R2G_BIN=cli/r2g.js conformance/run` is green.

**Phase 1 — harden the TS tool in place (weeks, not months):**
these pay off immediately and shrink the port:

1. Port the legacy npm flow onto the `ecosystem-runner` style: `spawn` with
   argv arrays, no bash heredocs, replace `rsync` with a portable copy —
   this both fixes Windows and removes the quoting hazard.
2. Emit `results.json` + artifact sha256 for npm runs; add `--json` to `run`.
3. Extend `isDockerOnPath` into a runtime probe (docker/podman) and accept
   `--runtime`; digest-pin the default image.
4. Safe-extraction guards everywhere archives are opened (entry count/size
   caps, path-traversal checks) — the recent tar advisory is the warning shot.
5. Exit-code catalogue + logs-to-stderr discipline.

**Phase 2 — r2g-rs skeleton:** `r2g-cli` with the flags-2-env Rust client
reading the same `.cli-flags.toml`; port the leaf commands first
(`completion`, `inspect`, `clean`, `--version`). Ship as `r2g-rs` alongside
the npm package. Acceptance: CLI contract tests and completion tests pass
against the Rust binary unchanged.

**Phase 3 — port adapters, cleanest first:** go → gleam → python → cargo →
npm last (it has the most behavior; by then the trait is proven). Each
adapter flips only when the conformance suite passes with `R2G_BIN=r2g-rs`.
During the transition the Rust binary may delegate unported commands to the
installed TS version if present.

**Phase 4 — OCI first-class + declarative adapters:** runtime drivers,
sandbox-by-default, `adapter.toml` loader, per-ecosystem pinned images,
ORAS artifact push, sigstore signing. This phase is where Maven/Gradle,
NuGet, Composer, RubyGems, Hex, Pub land as a mix of built-in and
declarative adapters.

**Phase 5 — switchover and zed integration:** r2g 1.0 = the Rust binary.
brew/scoop/choco formulas flip to prebuilt binaries (no nodejs dependency);
the npm package remains as a thin wrapper that downloads the platform binary
(same trick esbuild uses). `r2g publish` gains the zed cloud dep-host
backend with provenance required. The TS implementation is archived once the
conformance suite has run green on Rust for a full release cycle.

## 6. Risks

| Risk | Mitigation |
| --- | --- |
| Rewrite stalls at 80% parity | Conformance suite is the only definition of done; adapters flip one at a time; TS stays shippable throughout. |
| npm-flow edge cases lost | npm ports **last**; TS code is the executable spec; delegation fallback during transition. |
| Container-by-default breaks host-only environments (bare CI) | `--host` escape hatch; runtime probe degrades gracefully with a clear exit code. |
| Declarative adapters become an arbitrary-code-execution vector | They only ever execute inside their declared container image; no host execution path exists for them. |
| flags-2-env native core on odd platforms | The C parser is dependency-free C99, static-linked into the Rust binary — strictly easier than today's node-gyp addon. |

## 7. Decision summary

- The phase model, the `.cli-flags.toml` contract, and the workspace/results
  contract are the durable assets — they survive the rewrite untouched.
- Rust is the right end-state for a language-agnostic, container-first,
  security-sensitive publishing gatekeeper distributed as a static binary.
- The path is incremental: freeze contracts → harden TS → port leaf commands
  → port adapters cleanest-first → make OCI the default execution boundary →
  flip distribution. At no point is there a "big switch" release.
