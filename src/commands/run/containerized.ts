'use strict';

import cp = require('child_process');

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

// pure function: builds the `docker <args>` list for a whole-run --containerized invocation.
// the host project is mounted read-only and copied to a writable dir inside the container,
// so nothing on the host filesystem is ever written to.
export const buildContainerizedArgs = (projectRoot: string, opts: any): string[] => {

  const image = String(opts.image || '').trim() || defaultImage;
  const pkg = String((opts && opts.containerPkg) || process.env.R2G_CONTAINER_PKG || '').trim() || 'r2g';
  const forwarded = getForwardedRunFlags(opts).join(' ');

  const script = [
    `set -e`,
    `mkdir -p "$HOME/project"`,
    `cp -r ${containerProjectMount}/. "$HOME/project"`,
    `npm install -g --loglevel=warn ${shQuote(pkg)}`,
    `cd "$HOME/project"`,
    `r2g run ${forwarded}`.trim()
  ].join('\n');

  return [
    'run', '--rm',
    '-v', `${projectRoot}:${containerProjectMount}:ro`,
    '-e', `HOME=${containerHome}`,
    image,
    'sh', '-c', script
  ];
};

// pure function: builds the `docker <args>` list for one phase-C container.
// mounts the built dummy project ($HOME/.r2g/temp/project) read-only, copies it to a
// writable dir inside the container, and runs each file in tests/ with the configured cmd.
export const buildPhaseCArgs = (dummyProjectDir: string, container: ContainerSpec): string[] => {

  const image = String(container && container.image || '').trim() || defaultImage;
  const cmd = String(container && container.cmd || '').trim() || defaultContainerCmd;

  const script = [
    `set -e`,
    `mkdir -p "$HOME/project"`,
    `cp -r ${containerProjectMount}/. "$HOME/project"`,
    `cd "$HOME/project"`,
    `for t in tests/*; do`,
    `  [ -f "$t" ] || continue`,
    `  echo "running test file: $t"`,
    `  ${cmd} "$t"`,
    `done`
  ].join('\n');

  return [
    'run', '--rm',
    '-v', `${dummyProjectDir}:${containerProjectMount}:ro`,
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
