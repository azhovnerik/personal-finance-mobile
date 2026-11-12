const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

function load(name, globals = {}, dependencies = {}) {
  const source = fs.readFileSync(path.join(__dirname, '../src/features/subscriptions', name + '.ts'), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const exports = {};
  vm.runInNewContext(outputText, { exports, ...globals, require: (name) => {
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
    return dependencies[name];
  } });
  return exports;
}

test('subscription rejection opens offer and preserves response for the caller', async () => {
  const response = new Response(JSON.stringify({ code: 'SUBSCRIPTION_REQUIRED' }), { status: 403 });
  const api = load('financialAccessEvents', { fetch: async () => response });
  let offers = 0;
  const unsubscribe = api.subscribeFinancialSubscription(() => { offers++; });
  const actual = await api.financialFetch('/api/v2/transactions', { method: 'POST' });
  assert.equal(actual, response);
  assert.equal(offers, 1);
  assert.equal((await actual.json()).code, 'SUBSCRIPTION_REQUIRED');
  unsubscribe();
  api.requestFinancialSubscription();
  assert.equal(offers, 1);
});

test('other failures and successful reads do not open the offer', async () => {
  for (const status of [200, 401, 403, 500]) {
    const response = new Response('{}', { status });
    const api = load('financialAccessEvents', { fetch: async () => response });
    api.subscribeFinancialSubscription(() => assert.fail('Unexpected offer'));
    assert.equal(await api.financialFetch('/api/v2/accounts'), response);
  }
});

test('network error is propagated without converting it to a subscription restriction', async () => {
  const failure = new Error('Offline');
  const api = load('financialAccessEvents', { fetch: async () => { throw failure; } });
  api.subscribeFinancialSubscription(() => assert.fail('Unexpected offer'));
  await assert.rejects(api.financialFetch('/api/v2/accounts'), (error) => error === failure);
});

for (const native of [true, false]) {
  test(`prompt dismissal survives module reload and is scoped to account and period (${native ? 'native' : 'web'})`, async () => {
    const stored = new Map();
    const globals = { localStorage: { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value) } };
    const dependencies = { 'expo-secure-store': {
      isAvailableAsync: async () => native,
      getItemAsync: async key => stored.get(key),
      setItemAsync: async (key, value) => { assert.match(key, /^[\w.-]+$/); stored.set(key, value); },
    } };
    let storage = load('readOnlyPromptStorage', globals, dependencies);
    assert.equal(await storage.hasSeenReadOnlyPrompt('account1:period1'), false);
    await storage.markReadOnlyPromptSeen('account1:period1');
    storage = load('readOnlyPromptStorage', globals, dependencies);
    assert.equal(await storage.hasSeenReadOnlyPrompt('account1:period1'), true);
    assert.equal(await storage.hasSeenReadOnlyPrompt('account1:period2'), false);
    assert.equal(await storage.hasSeenReadOnlyPrompt('account2:period1'), false);
  });
}

test('unavailable device storage does not block continued viewing', async () => {
  const storage = load('readOnlyPromptStorage', {}, { 'expo-secure-store': {
    isAvailableAsync: async () => { throw new Error('Unavailable'); },
  } });
  assert.equal(await storage.hasSeenReadOnlyPrompt('account:period'), false);
  await storage.markReadOnlyPromptSeen('account:period');
});

test('dashboard at root stays protected while public login paths are excluded', () => {
  const { isPublicSubscriptionPath } = load('accessRoutes');
  assert.equal(isPublicSubscriptionPath('/', '(tabs)'), false);
  assert.equal(isPublicSubscriptionPath('/', 'index'), true);
  assert.equal(isPublicSubscriptionPath('/login'), true);
  assert.equal(isPublicSubscriptionPath('/auth/google'), true);
  assert.equal(isPublicSubscriptionPath('/accounts'), false);
  assert.equal(isPublicSubscriptionPath('/onboarding'), false);
});
