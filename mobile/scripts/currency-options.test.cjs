const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const approved = "USD EUR GBP UAH PLN CHF CAD AUD SEK NOK JPY CZK DKK HUF RON MDL TRY CNY HKD TWD SGD KRW INR THB IDR MYR PHP BRL MXN ILS AED SAR ZAR NZD KZT GEL".split(" ");
const load = (file, dependencies = {}) => {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports,
    require: (name) => {
      assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  });
  return exports;
};
const { buildCurrencyOptions } = load("src/shared/utils/currencyOptions.ts");
const values = (options) => Array.from(options, (option) => option.value);

test("all 36 approved currencies are selectable, with user base then popular then alphabetical", () => {
  const input = [...approved];
  const actual = values(buildCurrencyOptions(input, "GEL"));
  assert.deepEqual(actual.slice(0, 6), ["GEL", "USD", "EUR", "GBP", "UAH", "PLN"]);
  assert.deepEqual(actual.slice(6), approved.filter((code) => !actual.slice(0, 6).includes(code)).sort());
  assert.equal(actual.length, 36);
  assert.deepEqual(input, approved);
});

test("popular base currency appears once and unsupported currencies are never injected", () => {
  assert.deepEqual(values(buildCurrencyOptions(["EUR", "USD", "EUR", "GEL"], "EUR")), ["EUR", "USD", "GEL"]);
  assert.deepEqual(values(buildCurrencyOptions(["GEL", "AED"], "USD")), ["AED", "GEL"]);
  assert.deepEqual(values(buildCurrencyOptions([])), []);
});

test("mobile CurrencyCode matches the 36 approved currencies", () => {
  const source = ts.createSourceFile("dto.ts", fs.readFileSync(path.join(root, "src/shared/api/dto.ts"), "utf8"), ts.ScriptTarget.Latest, true);
  const type = source.statements.find((node) => ts.isTypeAliasDeclaration(node) && node.name.text === "CurrencyCode");
  assert.deepEqual(type.type.types.map((node) => node.literal.text).sort(), [...approved].sort());
});

test("every approved currency formats with a symbol or its ISO code", () => {
  const { formatCurrency } = load("src/shared/utils/format.ts", {
    "../../localization": { getCurrentIntlLocale: () => "en" },
  });
  for (const code of approved) {
    const text = formatCurrency(42.5, code);
    assert.ok(text.endsWith(" 42.50"), `${code}: ${text}`);
    assert.ok(!text.includes("undefined"), code);
  }
});
