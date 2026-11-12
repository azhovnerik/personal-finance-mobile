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

// Exercise the provider's hooks and rendered controls without a native runtime.
function providerHarness(initialStatus) {
  const slots = [];
  let cursor = 0;
  let effects = [];
  let status = initialStatus;
  const tokens = { value: 'token' };
  const router = { replace() {}, push() {}, canGoBack: () => false };
  const changed = (old, deps) => !old || deps.some((value, i) => !Object.is(value, old[i]));
  const react = {
    createContext: () => ({ Provider: 'AccessProvider' }),
    useContext: () => {},
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], value => { slots[index] = value; }];
    },
    useRef(initial) {
      const index = cursor++;
      return slots[index] ??= { current: initial };
    },
    useCallback(fn, deps) {
      const index = cursor++;
      if (!slots[index] || changed(slots[index].deps, deps)) slots[index] = { fn, deps };
      return slots[index].fn;
    },
    useEffect(fn, deps) {
      const index = cursor++;
      if (!slots[index] || changed(slots[index].deps, deps)) {
        slots[index]?.cleanup?.();
        slots[index] = { deps };
        effects.push(() => { slots[index].cleanup = fn(); });
      }
    },
  };
  const jsx = (type, props) => ({ type, props });
  const dependencies = {
    'react': react,
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { Modal: 'Modal', Pressable: 'Pressable', View: 'View', StyleSheet: { create: x => x } },
    'react-native-safe-area-context': {
      SafeAreaView: 'SafeAreaView', SafeAreaInsetsContext: { Provider: 'InsetsProvider' },
      useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
    },
    'expo-router': { usePathname: () => '/', useSegments: () => ['(tabs)'], useRouter: () => router },
    '../../shared/ui': { Text: 'Text', Button: 'Button', colors: {}, spacing: {} },
    '../../localization': { translate: key => key },
    './accessRoutes': { isPublicSubscriptionPath: () => false },
    '../../storage/auth': { getToken: async () => tokens.value },
    './useSubscriptionStatus': { useSubscriptionStatus: () => status },
    './financialAccessEvents': { subscribeFinancialSubscription: () => () => {} },
    './readOnlyPromptStorage': { hasSeenReadOnlyPrompt: async () => true, markReadOnlyPromptSeen: async () => {} },
  };
  const source = fs.readFileSync(path.join(__dirname, '../src/features/subscriptions/FinancialAccessProvider.tsx'), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  });
  const exports = {};
  vm.runInNewContext(outputText, { exports, require: name => {
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
    return dependencies[name];
  } });
  return {
    setStatus: value => { status = value; },
    render() {
      cursor = 0;
      const tree = exports.FinancialAccessProvider({ children: 'screen' });
      const pending = effects;
      effects = [];
      pending.forEach(fn => fn());
      return tree;
    },
  };
}

function elements(tree, type) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(node => elements(node, type));
  return [...(tree.type === type ? [tree] : []), ...elements(tree.props?.children, type)];
}

test('unknown status waits for auth, reports errors, allows field editing and offers retry', async () => {
  let refreshes = 0;
  const status = { statusResponse: null, error: 'Offline', isLoadingStatus: false, isRefreshingStatus: false, refresh: async () => { refreshes++; } };
  const app = providerHarness(status);
  assert.equal(app.render().props.value.isLoading, true, 'deep link waits for token lookup');
  await Promise.resolve();
  let tree = app.render();
  assert.equal(tree.props.value.isLoading, false, 'failed query does not leave deep link waiting forever');
  assert.equal(tree.props.value.isReadOnly, false, 'unknown status does not lock fields');
  assert.equal(tree.props.value.allowWrite(), false);
  tree = app.render();
  const visible = elements(tree, 'Modal').filter(modal => modal.props.visible);
  assert.equal(visible.length, 1);
  assert.equal(elements(visible[0], 'Text')[0].props.children, 'Unable to load subscription status.');
  assert.equal(refreshes, 1);
  elements(visible[0], 'Button').find(button => button.props.title === 'Retry').props.onPress();
  assert.equal(refreshes, 2);
  app.setStatus({ ...status, error: null, statusResponse: { canWriteFinancialData: true } });
  app.render(); // effects close status dialog after successful retry
  tree = app.render();
  assert.equal(tree.props.value.canWrite, true);
  assert.equal(tree.props.value.allowWrite(), true);
  assert.equal(elements(tree, 'Modal').filter(modal => modal.props.visible).length, 0);
});

test('slow query shows loading feedback without duplicate requests or locking fields', async () => {
  const app = providerHarness({ statusResponse: null, error: null, isLoadingStatus: true, isRefreshingStatus: true,
    refresh: async () => assert.fail('Request already running') });
  app.render();
  await Promise.resolve();
  let tree = app.render();
  assert.equal(tree.props.value.isLoading, true);
  assert.equal(tree.props.value.isReadOnly, false);
  assert.equal(tree.props.value.allowWrite(), false);
  tree = app.render();
  const modal = elements(tree, 'Modal').find(modal => modal.props.visible);
  assert.equal(elements(modal, 'Text')[0].props.children, 'Loading subscription status...');
  assert.equal(elements(modal, 'Button').find(button => button.props.title === 'Retry').props.disabled, true);
});

test('known read-only state locks fields and consumes top inset once', async () => {
  const app = providerHarness({ statusResponse: { canWriteFinancialData: false }, error: null,
    isLoadingStatus: false, isRefreshingStatus: false, refresh: async () => {} });
  app.render();
  await Promise.resolve();
  const tree = app.render();
  assert.equal(tree.props.value.isReadOnly, true);
  assert.equal(elements(tree, 'SafeAreaView')[0].props.edges[0], 'top');
  assert.equal(elements(tree, 'InsetsProvider')[0].props.value.top, 0);
  assert.equal(elements(tree, 'InsetsProvider')[0].props.value.bottom, 34);
});
