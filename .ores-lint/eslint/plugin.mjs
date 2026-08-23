/**
 * ores-lint :: vendored ESLint plugin
 *
 * Plain ESM. No build step, no registry dependencies. The only thing it needs
 * is an `eslint` that already exists in the repo.
 *
 * Rules
 *   ores/require-send  - a logging chain that reaches a level method must end
 *                        in a terminal call (.send(), .send(true), ...).
 *                        Generalised from the ores-otel next-loggers plugin.
 *   ores/semi          - fallback semicolon rule, used only when core `semi`
 *                        is unavailable. See base.mjs.
 */

const DEFAULT_LEVEL_METHODS = ['trace', 'debug', 'info', 'log', 'warn', 'error', 'fatal'];
const DEFAULT_TERMINAL_METHODS = ['send'];

const LOGGER_EXPORTS = new Set([
  'logger', 'browserLogger', 'edgeLogger', 'cloudflareWorkerLogger',
  'nodeLogger', 'bunLogger', 'denoLogger',
]);
const FACTORY_EXPORTS = new Set([
  'createLogger', 'createBrowserLogger', 'createEdgeLogger',
  'createCloudflareWorkerLogger', 'createNodeLogger', 'createBunLogger',
  'createDenoLogger',
]);
const CLASS_EXPORTS = new Set([
  'BaseLogger', 'BrowserLogger', 'EdgeLogger', 'CloudflareWorkerLogger',
  'NodeLogger', 'BunLogger', 'DenoLogger',
]);

function hasType(node, ...types) {
  return Boolean(node && types.includes(String(node.type)));
}

/** Strip wrappers that do not change the identity of the underlying expression. */
function unwrap(node) {
  let current = node;
  while (
    current &&
    (hasType(current, 'ChainExpression', 'AwaitExpression', 'TSAsExpression', 'TSTypeAssertion', 'TSNonNullExpression') ||
      (current.type === 'UnaryExpression' && current.operator === 'void'))
  ) {
    current = current.expression || current.argument;
  }
  return current || undefined;
}

function getPropertyName(node) {
  if (!hasType(node, 'MemberExpression', 'OptionalMemberExpression')) return undefined;
  const property = node.property;
  if (!property) return undefined;
  if (!node.computed && property.type === 'Identifier') return property.name;
  if (node.computed && property.type === 'Literal' && typeof property.value === 'string') return property.value;
  return undefined;
}

function getQualifiedName(node) {
  const current = unwrap(node);
  if (!current) return undefined;
  if (current.type === 'Identifier') return current.name;
  if (current.type === 'ThisExpression') return 'this';
  if (hasType(current, 'MemberExpression', 'OptionalMemberExpression')) {
    const objectName = getQualifiedName(current.object);
    const propertyName = getPropertyName(current);
    return objectName && propertyName ? `${objectName}.${propertyName}` : undefined;
  }
  return undefined;
}

/** Walk a call chain back to its root, collecting method names left-to-right. */
function collectCallChain(node, methods) {
  const current = unwrap(node);
  if (!current) return undefined;
  if (hasType(current, 'CallExpression', 'OptionalCallExpression')) {
    const callee = unwrap(current.callee);
    if (callee && hasType(callee, 'MemberExpression', 'OptionalMemberExpression')) {
      const root = collectCallChain(callee.object, methods);
      const method = getPropertyName(callee);
      if (method) methods.push(method);
      return root;
    }
    return getQualifiedName(callee);
  }
  return getQualifiedName(current);
}

function isTrackedModule(source, moduleNames) {
  if (typeof source !== 'string') return false;
  for (const moduleName of moduleNames) {
    if (source === moduleName || source.startsWith(`${moduleName}/`)) return true;
  }
  return false;
}

export const requireSendRule = {
  meta: {
    type: 'problem',
    docs: { description: 'require chainable logger events to call a terminal method such as send()' },
    schema: [{
      type: 'object',
      properties: {
        loggerNames: { type: 'array', items: { type: 'string' }, uniqueItems: true },
        moduleNames: { type: 'array', items: { type: 'string' }, uniqueItems: true },
        levelMethods: { type: 'array', items: { type: 'string' }, uniqueItems: true },
        terminalMethods: { type: 'array', items: { type: 'string' }, uniqueItems: true },
      },
      additionalProperties: false,
    }],
    messages: {
      missingSend: "Logging chain never calls {{terminal}} - this log event is built but never delivered.",
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const knownLoggers = new Set(['log', 'logger', 'ddlog', ...(options.loggerNames || [])]);
    const knownFactories = new Set();
    const knownClasses = new Set();
    const moduleNames = new Set(['@oresoftware/next-loggers', ...(options.moduleNames || [])]);
    const levelMethods = new Set(options.levelMethods || DEFAULT_LEVEL_METHODS);
    const terminalMethods = new Set(options.terminalMethods || DEFAULT_TERMINAL_METHODS);
    const terminalLabel = [...terminalMethods].map((m) => `.${m}()`).join(' or ');

    const isLoggerProducer = (node) => {
      const current = unwrap(node);
      if (!current) return false;
      const directName = getQualifiedName(current);
      if (directName && knownLoggers.has(directName)) return true;
      if (current.type === 'NewExpression') {
        const className = getQualifiedName(current.callee);
        return Boolean(className && knownClasses.has(className));
      }
      if (hasType(current, 'CallExpression', 'OptionalCallExpression')) {
        const calleeName = getQualifiedName(current.callee);
        if (calleeName && knownFactories.has(calleeName)) return true;
        const callee = unwrap(current.callee);
        if (callee && hasType(callee, 'MemberExpression', 'OptionalMemberExpression')) {
          const method = getPropertyName(callee);
          const owner = getQualifiedName(callee.object);
          return method === 'anew' && Boolean(owner && knownLoggers.has(owner));
        }
      }
      return false;
    };

    return {
      ImportDeclaration(node) {
        if (!isTrackedModule(node.source?.value, moduleNames)) return;
        for (const specifier of node.specifiers || []) {
          const localName = specifier.local?.name;
          if (!localName) continue;
          if (specifier.type === 'ImportDefaultSpecifier') { knownLoggers.add(localName); continue; }
          if (specifier.type === 'ImportNamespaceSpecifier') {
            for (const name of LOGGER_EXPORTS) knownLoggers.add(`${localName}.${name}`);
            for (const name of FACTORY_EXPORTS) knownFactories.add(`${localName}.${name}`);
            for (const name of CLASS_EXPORTS) knownClasses.add(`${localName}.${name}`);
            continue;
          }
          const importedName = specifier.imported?.name || specifier.imported?.value;
          if (typeof importedName !== 'string') continue;
          if (LOGGER_EXPORTS.has(importedName)) knownLoggers.add(localName);
          if (FACTORY_EXPORTS.has(importedName)) knownFactories.add(localName);
          if (CLASS_EXPORTS.has(importedName)) knownClasses.add(localName);
        }
      },

      VariableDeclarator(node) {
        if (node.id?.type === 'Identifier' && node.id.name && isLoggerProducer(node.init)) {
          knownLoggers.add(node.id.name);
        }
      },

      AssignmentExpression(node) {
        const assignedName = getQualifiedName(node.left);
        if (assignedName && isLoggerProducer(node.right)) knownLoggers.add(assignedName);
      },

      ExpressionStatement(node) {
        const methods = [];
        const root = collectCallChain(node.expression, methods);
        if (!root || !knownLoggers.has(root)) return;
        const levelIndex = methods.findIndex((method) => levelMethods.has(method));
        if (levelIndex < 0) return;
        const tail = methods.slice(levelIndex + 1);
        if (tail.some((method) => terminalMethods.has(method))) return;
        context.report({ node, messageId: 'missingSend', data: { terminal: terminalLabel } });
      },
    };
  },
};

/**
 * Fallback semicolon rule. Only wired up when core `semi` is missing, so in
 * practice this is dormant - it exists so the house style survives a future
 * ESLint that drops its formatting rules.
 */
const NEEDS_SEMI = new Set([
  'ExpressionStatement', 'ReturnStatement', 'ThrowStatement', 'BreakStatement',
  'ContinueStatement', 'DebuggerStatement', 'DoWhileStatement', 'ImportDeclaration',
  'ExportAllDeclaration', 'PropertyDefinition', 'TSTypeAliasDeclaration',
  'TSDeclareFunction', 'TSImportEqualsDeclaration',
]);

export const semiRule = {
  meta: {
    type: 'layout',
    fixable: 'code',
    schema: [],
    docs: { description: 'require semicolons at the end of statements (vendored fallback)' },
    messages: { missingSemi: 'Missing semicolon.' },
  },
  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode();

    const check = (node) => {
      const lastToken = sourceCode.getLastToken(node);
      if (!lastToken) return;
      if (lastToken.type === 'Punctuator' && lastToken.value === ';') return;
      context.report({
        node,
        loc: lastToken.loc.end,
        messageId: 'missingSemi',
        fix: (fixer) => fixer.insertTextAfter(lastToken, ';'),
      });
    };

    const handlers = {};
    for (const type of NEEDS_SEMI) handlers[type] = check;

    // `for (let i = 0 ...)` heads and `for (const x of y)` must not get one.
    handlers.VariableDeclaration = (node) => {
      const parent = node.parent;
      if (parent && (
        (parent.type === 'ForStatement' && parent.init === node) ||
        ((parent.type === 'ForInStatement' || parent.type === 'ForOfStatement') && parent.left === node)
      )) return;
      check(node);
    };

    // Only export forms that are expressions/re-exports need a semicolon;
    // `export function f() {}` and `export class C {}` do not.
    const checkExport = (node) => {
      const decl = node.declaration;
      if (decl && ['FunctionDeclaration', 'ClassDeclaration', 'TSInterfaceDeclaration', 'TSEnumDeclaration', 'TSModuleDeclaration'].includes(decl.type)) return;
      check(node);
    };
    handlers.ExportNamedDeclaration = checkExport;
    handlers.ExportDefaultDeclaration = checkExport;

    return handlers;
  },
};

export const rules = {
  'require-send': requireSendRule,
  semi: semiRule,
};

const plugin = { meta: { name: 'ores-lint', version: '1.0.0' }, rules };
export default plugin;
