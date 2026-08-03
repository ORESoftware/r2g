'use strict';

type FlagType = 'bool' | 'integer' | 'string';

type Writable = NodeJS.WritableStream;

interface FlagDefinition {
  env: string;
  aliases: string[];
  short?: string;
  type: FlagType;
  defaultValue?: string;
  help: string;
}

export type FallbackFlagsResult = {[key: string]: string} & {
  isHelpMenu?: boolean;
  printTable?: (target?: Writable) => string;
};

export interface FallbackFlagsModule {
  completionScript: (shell: string, command: string, opts: {configPath: string}) => string;
  parse: (argv: string[], opts: {configPath: string}) => FallbackFlagsResult;
}

const globalFlags: FlagDefinition[] = [
  {env: 'R2G_HELP', aliases: ['help'], short: 'h', type: 'bool', defaultValue: 'false', help: 'Print generated help and exit.'},
  {env: 'R2G_VERSION_REQUESTED', aliases: ['version', 'vn'], type: 'bool', defaultValue: 'false', help: 'Print the r2g version and exit.'},
  {env: 'R2G_VERBOSITY', aliases: ['verbosity'], short: 'v', type: 'integer', defaultValue: '1', help: 'Verbosity level, from 1 through 3.'},
  {env: 'R2G_FORCE', aliases: ['force'], short: 'f', type: 'bool', defaultValue: 'false', help: 'Allow a command-specific non-interactive operation.'},
  {env: 'R2G_ALLOW_UNKNOWN', aliases: ['allow-unknown'], type: 'bool', defaultValue: 'false', help: 'Allow options that r2g does not recognize.'},
  {env: 'R2G_IGNORE_DIRTY_GIT_INDEX', aliases: ['ignore-dirty-git-index', 'ignore-dirty-index'], type: 'bool', defaultValue: 'false', help: 'Allow packaging from a dirty Git worktree.'},
  {env: 'R2G_PROJECT', aliases: ['project', 'project-dir', 'package-dir'], type: 'string', help: 'Package directory; defaults to the nearest supported manifest.'},
  {env: 'R2G_JSON', aliases: ['json'], type: 'bool', defaultValue: 'false', help: 'Write machine-readable JSON where supported.'},
  {env: 'R2G_COMPLETION', aliases: ['bash-completion', 'completion'], type: 'bool', defaultValue: 'false', help: 'Generate shell completion.'},
];

const commandFlags: {[command: string]: FlagDefinition[]} = {
  run: [
    {env: 'R2G_ECOSYSTEM', aliases: ['ecosystem', 'language', 'package-manager'], short: 'e', type: 'string', defaultValue: 'auto', help: 'Package ecosystem: auto, npm, rust, python, gleam, or go.'},
    {env: 'R2G_KEEP_TEMP', aliases: ['keep-temp', 'keep-workspace'], type: 'bool', defaultValue: 'false', help: 'Keep the run-scoped workspace.'},
    {env: 'R2G_SEARCH_ROOT', aliases: ['search-root', 'search'], type: 'string', help: 'Filesystem root used to find local dependencies.'},
    {env: 'R2G_PACK', aliases: ['pack'], type: 'bool', defaultValue: 'false', help: 'Pack local npm dependencies before installing them.'},
    {env: 'R2G_SKIP', aliases: ['skip'], type: 'string', help: 'Skip npm phases, for example --skip=s,t,z.'},
    {env: 'R2G_SKIP_Z', aliases: ['z', 'skip-z'], short: 'z', type: 'bool', defaultValue: 'false', help: 'Skip npm phase Z.'},
    {env: 'R2G_SKIP_T', aliases: ['t', 'skip-t'], short: 't', type: 'bool', defaultValue: 'false', help: 'Skip npm phase T.'},
    {env: 'R2G_SKIP_S', aliases: ['s', 'skip-s'], short: 's', type: 'bool', defaultValue: 'false', help: 'Skip npm phase S.'},
    {env: 'R2G_SKIP_C', aliases: ['c', 'skip-c'], short: 'c', type: 'bool', defaultValue: 'false', help: 'Skip npm phase C.'},
    {env: 'R2G_CONTAINERIZED', aliases: ['containerized'], type: 'bool', defaultValue: 'false', help: 'Run the pipeline inside a disposable container.'},
    {env: 'R2G_IMAGE', aliases: ['image'], type: 'string', help: 'Docker image for containerized runs.'},
    {env: 'R2G_FULL', aliases: ['full'], type: 'bool', defaultValue: 'false', help: 'Use selected local npm dependencies.'},
    {env: 'R2G_KEEP', aliases: ['keep', 'multi'], type: 'bool', defaultValue: 'false', help: 'Keep the previous npm installation.'},
  ],
  init: [
    {env: 'R2G_DOCKER', aliases: ['docker'], type: 'bool', defaultValue: 'false', help: 'Include Docker files while initializing.'},
    {env: 'R2G_SEARCH_ROOT', aliases: ['search-root', 'search'], type: 'string', help: 'Filesystem root used to find local dependencies.'},
  ],
  publish: [
    {env: 'R2G_OTP', aliases: ['otp'], type: 'string', help: 'One-time passcode for publication.'},
    {env: 'R2G_ACCESS', aliases: ['access'], type: 'string', defaultValue: 'restricted', help: 'Publication access: public or restricted.'},
  ],
};

const commands = ['basic', 'clean', 'completion', 'init', 'inspect', 'publish', 'run'];

const definitionsFor = (command: string): FlagDefinition[] => {
  return globalFlags.concat(commandFlags[command] || []);
};

const flagLabel = (definition: FlagDefinition): string => {
  const labels = definition.aliases.map(alias => `--${alias}`);
  if (definition.short) {
    labels.unshift(`-${definition.short}`);
  }
  return labels.join(', ');
};

const helpText = (command: string, definitions: FlagDefinition[]): string => {
  const invocation = command && command !== 'basic' ? `r2g ${command}` : 'r2g';
  const rows = definitions.map(definition => {
    const type = definition.type === 'bool' ? '' : ` <${definition.type}>`;
    return `  ${flagLabel(definition)}${type}\n      ${definition.help}`;
  });
  return [
    `Usage: ${invocation} [options]`,
    '',
    'Options:',
    ...rows,
  ].join('\n');
};

const completionWords = (): string[] => {
  const flags = globalFlags.concat(...Object.keys(commandFlags).map(key => commandFlags[key]));
  const names = flags.reduce((all: string[], definition) => {
    definition.aliases.forEach(alias => all.push(`--${alias}`));
    if (definition.short) {
      all.push(`-${definition.short}`);
    }
    return all;
  }, []);
  return Array.from(new Set(commands.filter(command => command !== 'basic').concat(names))).sort();
};

const completionScript = (shell: string): string => {
  const words = completionWords().join(' ');
  if (String(shell || '').toLowerCase() === 'zsh') {
    return `#compdef r2g\n_arguments '*:r2g command or option:(${words})'`;
  }
  return [
    '_r2g_complete() {',
    `  COMPREPLY=( $(compgen -W '${words}' -- "${'${COMP_WORDS[COMP_CWORD]}'}") )`,
    '}',
    'complete -F _r2g_complete r2g',
  ].join('\n');
};

const parseBoolean = (raw: string | undefined, name: string, errors: string[]): string => {
  if (raw === undefined || raw === '') {
    return 'true';
  }
  const normalized = String(raw).toLowerCase();
  if (['1', 'true', 'yes', 'on'].indexOf(normalized) >= 0) {
    return 'true';
  }
  if (['0', 'false', 'no', 'off'].indexOf(normalized) >= 0) {
    return 'false';
  }
  errors.push(`${name} expected a boolean, received ${raw}`);
  return 'false';
};

const isBooleanLiteral = (value: string): boolean => {
  return ['0', '1', 'false', 'no', 'off', 'on', 'true', 'yes'].indexOf(String(value).toLowerCase()) >= 0;
};

const parseFallback = (argv: string[]): FallbackFlagsResult => {
  const tokens = argv.slice();
  if (tokens[0] === 'r2g') {
    tokens.shift();
  }

  let command = 'basic';
  if (tokens[0] && commands.indexOf(tokens[0]) >= 0) {
    command = tokens.shift() as string;
  }

  const definitions = definitionsFor(command);
  const longFlags = new Map<string, FlagDefinition>();
  const shortFlags = new Map<string, FlagDefinition>();
  definitions.forEach(definition => {
    definition.aliases.forEach(alias => longFlags.set(alias, definition));
    if (definition.short) {
      shortFlags.set(definition.short, definition);
    }
  });

  const result = {} as FallbackFlagsResult;
  definitions.forEach(definition => {
    if (process.env[definition.env] !== undefined) {
      result[definition.env] = String(process.env[definition.env]);
    }
    else if (definition.defaultValue !== undefined) {
      result[definition.env] = definition.defaultValue;
    }
  });

  const errors: string[] = [];
  const unknown: string[] = [];
  const positionals: string[] = ['r2g'];

  const assign = (definition: FlagDefinition, raw: string | undefined, label: string) => {
    if (definition.type === 'bool') {
      result[definition.env] = parseBoolean(raw, label, errors);
      return;
    }
    if (raw === undefined) {
      errors.push(`${label} requires a value`);
      return;
    }
    if (definition.type === 'integer' && !/^-?\d+$/.test(raw)) {
      errors.push(`${label} expected an integer, received ${raw}`);
      return;
    }
    result[definition.env] = raw;
  };

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === '--') {
      positionals.push(...tokens.slice(index + 1));
      break;
    }

    if (token.startsWith('--')) {
      const body = token.slice(2);
      const equalIndex = body.indexOf('=');
      let name = equalIndex >= 0 ? body.slice(0, equalIndex) : body;
      let raw = equalIndex >= 0 ? body.slice(equalIndex + 1) : undefined;
      let negated = false;
      if (name.startsWith('no-')) {
        name = name.slice(3);
        negated = true;
      }
      const definition = longFlags.get(name);
      if (!definition || (negated && definition.type !== 'bool')) {
        unknown.push(token);
        continue;
      }
      if (negated) {
        raw = 'false';
      }
      else if (raw === undefined && definition.type !== 'bool') {
        raw = tokens[++index];
      }
      else if (raw === undefined && tokens[index + 1] && isBooleanLiteral(tokens[index + 1])) {
        raw = tokens[++index];
      }
      assign(definition, raw, `--${name}`);
      continue;
    }

    if (token.startsWith('-') && token !== '-') {
      const body = token.slice(1);
      const first = shortFlags.get(body[0]);
      if (!first) {
        unknown.push(token);
        continue;
      }

      if (body.length > 1 && first.type !== 'bool') {
        assign(first, body.slice(1), `-${body[0]}`);
        continue;
      }

      if (body.length > 1) {
        let combinedValid = true;
        for (const shortName of body) {
          const definition = shortFlags.get(shortName);
          if (!definition || definition.type !== 'bool') {
            combinedValid = false;
            break;
          }
          assign(definition, undefined, `-${shortName}`);
        }
        if (!combinedValid) {
          unknown.push(token);
        }
        continue;
      }

      let raw: string | undefined;
      if (first.type !== 'bool') {
        raw = tokens[++index];
      }
      else if (tokens[index + 1] && isBooleanLiteral(tokens[index + 1])) {
        raw = tokens[++index];
      }
      assign(first, raw, `-${body}`);
      continue;
    }

    positionals.push(token);
  }

  result.R2G_COMMAND = command;
  result.R2G_POSITIONALS = JSON.stringify(positionals);
  result.R2G_UNKNOWN_OPTIONS = JSON.stringify(unknown);
  result.R2G_PARSE_ERRORS = JSON.stringify(errors);
  result.isHelpMenu = result.R2G_HELP === 'true';
  result.printTable = (target?: Writable): string => {
    const text = helpText(command, definitions);
    if (target) {
      target.write(text + '\n');
    }
    return text;
  };
  return result;
};

export const createFallbackFlags2Env = (): FallbackFlagsModule => ({
  completionScript: (shell: string) => completionScript(shell),
  parse: (argv: string[]) => parseFallback(argv),
});
