'use strict';

import cp = require('child_process');
import fs = require('fs');
import os = require('os');
import path = require('path');

// project
import log from '../../logger';
import chalk from 'chalk';
import pt from 'prepend-transform';

///////////////////////////////////////////////

export const defaultImage = 'node:22';
export const defaultContainerCmd = 'node';
export const containerProjectMount = '/r2g/project';
export const containerHome = '/home/r2g';

export interface ContainerSpec {
  image: string;
  cmd?: string;
}

const shQuote = (v: string): string => {
  return `'${String(v).replace(/'/g, `'\\''`)}'`;
};

export const isDockerOnPath = (): boolean => {
  try {
    cp.execSync('docker --version', {stdio: 'ignore'});
    return true;
  }
  catch (_) {
    return false;
  }
};

// which phase-skip flags get forwarded to the `r2g run` invocation inside the container
export const getForwardedRunFlags = (opts: any): string[] => {
  const flags: string[] = [];
  if (opts.z) {
    flags.push('-z');
  }
  if (opts.s) {
    flags.push('-s');
  }
  if (opts.t) {
    flags.push('-t');
  }
  if (opts.c) {
    flags.push('-c');
  }
  if (opts.ignore_dirty_git_index) {
    flags.push('--ignore-dirty-git-index');
  }
  return flags;
};

export const containerPkgMount = '/r2g/pkg';
export const containerPkgTarballMount = '/r2g/pkg.tgz';

// R2G_CONTAINER_PKG can be a registry spec ("r2g", "r2g@1.2.3") or a local path
// (a checkout dir or an `npm pack` tarball). Local paths are mounted read-only
// into the container and installed from there, so the exact local build — not
// whatever is on the npm registry — runs the phases inside the container.
export const isLocalPkgPath = (pkg: string): boolean => {
  return /^(\/|\.\/|\.\.\/|~\/)/.test(pkg) || /\.(tgz|tar\.gz)$/.test(pkg);
};

// pure function: builds the `docker <args>` list for a whole-run --containerized invocation.
// the host project is mounted read-only and copied to a writable dir inside the container,
// so nothing on the host filesystem is ever written to. All the normal phases (Z, S, T,
// and phase-C if configured) run inside the container exactly as they would on the host.
export const buildContainerizedArgs = (projectRoot: string, opts: any): string[] => {

  const image = String(opts.image || '').trim() || defaultImage;
  const pkg = String((opts && opts.containerPkg) || process.env.R2G_CONTAINER_PKG || '').trim() || 'r2g';
  const flags = getForwardedRunFlags(opts);
  // No docker-in-docker: phases Z/S/T run inside the container as normal, but
  // phase-C is always skipped there — the host run is the one driving containers.
  if (!flags.includes('-c')) {
    flags.push('-c');
  }
  const forwarded = flags.join(' ');

  const mounts = ['-v', `${projectRoot}:${containerProjectMount}:ro`];
  let installSpec = shQuote(pkg);
  const preinstall: string[] = [];

  if (isLocalPkgPath(pkg)) {
    const isTarball = /\.(tgz|tar\.gz)$/.test(pkg);
    if (isTarball) {
      mounts.push('-v', `${pkg}:${containerPkgTarballMount}:ro`);
      installSpec = containerPkgTarballMount;
    }
    else {
      // A dir install symlinks and then chmods through the symlink, which
      // fails on a read-only mount — copy to a writable dir first. Exclude
      // node_modules: host-compiled native addons (e.g. flags2env.node) are
      // the wrong platform, so deps must resolve inside the container.
      mounts.push('-v', `${pkg}:${containerPkgMount}:ro`);
      preinstall.push(
        `mkdir -p "$HOME/r2g-pkg"`,
        `(cd ${containerPkgMount} && tar -cf - --exclude=./node_modules .) | (cd "$HOME/r2g-pkg" && tar -xf -)`,
        // A global folder install only symlinks — deps must be installed in place.
        `(cd "$HOME/r2g-pkg" && npm install --omit=dev --loglevel=warn --no-audit --no-fund)`,
      );
      installSpec = `"$HOME/r2g-pkg"`;
    }
  }

  const script = [
    `set -e`,
    // The npm phase runner needs rsync; the default node images don't ship it.
    `command -v rsync >/dev/null 2>&1 || { command -v apt-get >/dev/null 2>&1 && apt-get update -qq >/dev/null && apt-get install -qq -y rsync >/dev/null; }`,
    `mkdir -p "$HOME/project"`,
    `cp -r ${containerProjectMount}/. "$HOME/project"`,
    ...preinstall,
    `npm install -g --loglevel=warn ${installSpec}`,
    `cd "$HOME/project"`,
    `r2g run ${forwarded}`.trim()
  ].join('\n');

  return [
    'run', '--rm',
    ...mounts,
    '-e', `HOME=${containerHome}`,
    image,
    'sh', '-c', script
  ];
};

// pure function: builds the `docker <args>` list for one phase-C container.
// mounts the whole r2g temp workspace ($HOME/.r2g/temp — project + copy) read-only,
// copies it to a writable dir inside the container, and runs each file in
// project/tests with the configured cmd. Mounting the full workspace (not just
// project/) matters because the dummy project's package.json references the
// packed tarball by relative path (file:../copy/...), which npm re-resolves
// during any install a test performs inside the container.
export const buildPhaseCArgs = (tempWorkspaceDir: string, container: ContainerSpec): string[] => {

  const image = String(container && container.image || '').trim() || defaultImage;
  const cmd = String(container && container.cmd || '').trim() || defaultContainerCmd;

  const script = [
    `set -e`,
    `mkdir -p "$HOME/r2g-temp"`,
    `cp -r ${containerProjectMount}/. "$HOME/r2g-temp"`,
    `cd "$HOME/r2g-temp/project"`,
    `for t in tests/*; do`,
    `  [ -f "$t" ] || continue`,
    `  echo "running test file: $t"`,
    `  ${cmd} "$t"`,
    `done`
  ].join('\n');

  return [
    'run', '--rm',
    '-v', `${tempWorkspaceDir}:${containerProjectMount}:ro`,
    '-e', `HOME=${containerHome}`,
    image,
    'sh', '-c', script
  ];
};

// runs the entire r2g pipeline inside a disposable container — nothing is written on the host fs.
export const runContainerized = (projectRoot: string, opts: any): Promise<number> => {

  return new Promise((resolve, reject) => {

    if (!isDockerOnPath()) {
      return reject(new Error(
        'The --containerized flag requires the "docker" executable to be on your PATH. ' +
        'Install Docker (https://docs.docker.com/get-docker) or drop the --containerized flag.'
      ));
    }

    const rawPkg = String((opts && opts.containerPkg) || process.env.R2G_CONTAINER_PKG || '').trim() || 'r2g';
    if (isLocalPkgPath(rawPkg)) {
      const abs = path.resolve(rawPkg.replace(/^~(?=\/)/, os.homedir()));
      if (!fs.existsSync(abs)) {
        return reject(new Error(`R2G_CONTAINER_PKG points to a local path that does not exist: ${abs}`));
      }
      opts = Object.assign({}, opts, {containerPkg: abs});
    }

    const args = buildContainerizedArgs(projectRoot, opts);
    const image = String(opts.image || '').trim() || defaultImage;

    log.info(`Running the whole r2g pipeline inside a disposable container (image: ${chalk.bold(image)}) ...`);
    log.info('The project dir is mounted read-only — nothing on the local filesystem will be written.');
    log.info(chalk.gray(`docker ${args.slice(0, args.length - 1).join(' ')} <script>`));

    const k = cp.spawn('docker', args);
    k.stdout.pipe(pt(chalk.gray('containerized: '))).pipe(process.stdout);
    k.stderr.pipe(pt(chalk.yellow('containerized: '))).pipe(process.stderr);

    k.once('error', reject);
    k.once('exit', code => {
      if (code > 0) {
        log.error(`The containerized r2g run failed with exit code: ${code}.`);
      }
      resolve(code || 0);
    });

  });

};
