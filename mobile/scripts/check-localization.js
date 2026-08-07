const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const sourceRoots = [path.join(root, "app"), path.join(root, "src")];
const sourceExtensions = new Set([".ts", ".tsx"]);
const ignoredDirectories = new Set(["localization"]);
const cyrillicPattern = /[А-Яа-яЁёЄєІіЇїҐґ]/;
const latinPattern = /[A-Za-z]/;
const translatedCallNames = new Set(["translate", "localizeSystemMessage"]);
const translatableAttributes = new Set(["title", "placeholder", "label"]);
const messageSetters = new Set([
  "setError",
  "setErrorMessage",
  "setFormError",
  "setPasswordError",
  "setSuccessMessage",
]);

const files = [];
const collect = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) {
      continue;
    }
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collect(target);
    } else if (sourceExtensions.has(path.extname(entry.name))) {
      files.push(target);
    }
  }
};

sourceRoots.forEach(collect);

const violations = [];
for (const file of files) {
  const sourceText = fs.readFileSync(file, "utf8");
  const sourceFile = ts.createSourceFile(
    file,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const addViolation = (node, reason, text) => {
    const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    violations.push(`${path.relative(root, file)}:${position.line + 1}: ${reason}: ${text.trim()}`);
  };

  const callName = (expression) => {
    if (ts.isIdentifier(expression)) {
      return expression.text;
    }
    if (ts.isPropertyAccessExpression(expression)) {
      return expression.name.text;
    }
    return null;
  };

  const isWrapped = (node) => {
    let current = node.parent;
    while (current) {
      if (ts.isCallExpression(current) && translatedCallNames.has(callName(current.expression))) {
        return true;
      }
      if (ts.isFunctionLike(current) || ts.isSourceFile(current)) {
        return false;
      }
      current = current.parent;
    }
    return false;
  };

  const isAtModuleScope = (node) => {
    let current = node.parent;
    while (current) {
      if (ts.isFunctionLike(current)) {
        return false;
      }
      if (ts.isSourceFile(current)) {
        return true;
      }
      current = current.parent;
    }
    return false;
  };

  const isInsideJsxChildExpression = (node) => {
    let current = node;
    while (current.parent) {
      const parent = current.parent;
      if (ts.isJsxExpression(parent)) {
        return parent.expression === current && !ts.isJsxAttribute(parent.parent);
      }

      if (ts.isConditionalExpression(parent) && parent.condition === current) {
        return false;
      }
      if (ts.isCallExpression(parent) && parent.arguments.includes(current)) {
        return false;
      }
      if (
        ts.isJsxAttribute(parent) ||
        ts.isJsxElement(parent) ||
        ts.isJsxSelfClosingElement(parent) ||
        ts.isFunctionLike(parent) ||
        ts.isSourceFile(parent)
      ) {
        return false;
      }
      current = parent;
    }
    return false;
  };

  const visit = (node) => {
    const isTextNode =
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node) ||
      ts.isJsxText(node);
    if (isTextNode && cyrillicPattern.test(node.text)) {
      addViolation(node, "Cyrillic text outside a locale catalog", node.text);
    }

    if (ts.isJsxText(node) && latinPattern.test(node.text)) {
      addViolation(node, "untranslated JSX text", node.text);
    }

    if (
      isTextNode &&
      !ts.isJsxText(node) &&
      latinPattern.test(node.text) &&
      !/^[A-Z]{3}$/.test(node.text) &&
      isInsideJsxChildExpression(node) &&
      !isWrapped(node)
    ) {
      addViolation(node, "untranslated JSX expression text", node.text);
    }

    if (ts.isJsxAttribute(node) && translatableAttributes.has(node.name.text) && node.initializer) {
      if (ts.isStringLiteral(node.initializer) && latinPattern.test(node.initializer.text)) {
        addViolation(node.initializer, `untranslated ${node.name.text}`, node.initializer.text);
      }
      if (
        ts.isJsxExpression(node.initializer) &&
        node.initializer.expression &&
        (ts.isStringLiteral(node.initializer.expression) || ts.isNoSubstitutionTemplateLiteral(node.initializer.expression)) &&
        latinPattern.test(node.initializer.expression.text)
      ) {
        addViolation(node.initializer.expression, `untranslated ${node.name.text}`, node.initializer.expression.text);
      }
    }

    if (ts.isNewExpression(node) && callName(node.expression) === "Error") {
      const argument = node.arguments?.[0];
      if (argument && (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument)) && latinPattern.test(argument.text)) {
        addViolation(argument, "untranslated Error message", argument.text);
      }
    }

    if (ts.isCallExpression(node)) {
      const name = callName(node.expression);
      if (name === "alert" && ts.isPropertyAccessExpression(node.expression) && node.expression.expression.getText(sourceFile) === "Alert") {
        node.arguments.slice(0, 2).forEach((argument) => {
          if ((ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument)) && latinPattern.test(argument.text)) {
            addViolation(argument, "untranslated Alert message", argument.text);
          }
        });
      }
      if (name && messageSetters.has(name)) {
        const argument = node.arguments[0];
        if (argument && (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument)) && latinPattern.test(argument.text)) {
          addViolation(argument, `untranslated ${name} message`, argument.text);
        }
      }
      if (name === "translate" && isAtModuleScope(node)) {
        addViolation(node, "translate() evaluated at module load", node.getText(sourceFile));
      }
    }

    if (
      (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) &&
      /^(?:uk-UA|ru-RU)$/.test(node.text) &&
      !isWrapped(node)
    ) {
      addViolation(node, "hard-coded UI locale", node.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
}

if (violations.length > 0) {
  process.stderr.write(`Found localization source violations:\n${violations.join("\n")}\n`);
  process.exit(1);
}

process.stdout.write(`Localization source audit passed (${files.length} files checked).\n`);
