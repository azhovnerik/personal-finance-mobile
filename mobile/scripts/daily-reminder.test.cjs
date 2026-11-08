const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const loadTypeScript = (relativePath, dependencies = {}) => {
  const source = fs.readFileSync(path.join(root, relativePath), "utf8");
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

const fixture = ({ platform = "ios", preference, granted = true, canAskAgain = true } = {}) => {
  const stored = new Map(preference === undefined ? [] : [["daily_reminder_enabled", String(preference)]]);
  const scheduled = new Map();
  const dismissed = [];
  let token = "signed-in";
  let locale = "en";
  let permission = { granted, canAskAgain };
  let prompts = 0;
  let nativeCalls = 0;
  let onPrompt = () => permission;
  let failSchedule = false;
  const api = loadTypeScript("src/features/notifications/dailyReminder.ts", {
    "react-native": { Platform: { OS: platform } },
    "expo-secure-store": {
      getItemAsync: async (key) => stored.get(key) ?? null,
      setItemAsync: async (key, value) => { stored.set(key, value); },
    },
    "../../storage/auth": { getToken: async () => token },
    "../../localization": { translate: (message) => `${locale}:${message}` },
    "expo-notifications": {
      IosAuthorizationStatus: { PROVISIONAL: 3 },
      SchedulableTriggerInputTypes: { DAILY: "daily" },
      getPermissionsAsync: async () => { nativeCalls++; return permission; },
      requestPermissionsAsync: async () => { prompts++; permission = await onPrompt(); return permission; },
      getAllScheduledNotificationsAsync: async () => [...scheduled.values()],
      scheduleNotificationAsync: async (request) => {
        nativeCalls++;
        if (failSchedule) throw new Error("Scheduler unavailable");
        scheduled.set(request.identifier, request);
      },
      cancelScheduledNotificationAsync: async (id) => { nativeCalls++; scheduled.delete(id); },
      dismissNotificationAsync: async (id) => { dismissed.push(id); },
    },
  });
  return {
    api, scheduled, stored, dismissed,
    setToken: (value) => { token = value; },
    setLocale: (value) => { locale = value; },
    setPermission: (value) => { permission = value; },
    setPrompt: (value) => { onPrompt = value; },
    failSchedule: (value) => { failSchedule = value; },
    get prompts() { return prompts; },
    get nativeCalls() { return nativeCalls; },
  };
};

test("schedules one repeating local 21:00 request and replaces it on restart/language change", async () => {
  const f = fixture();
  await f.api.synchronizeDailyReminder("once");
  f.setLocale("ua");
  await Promise.all([f.api.synchronizeDailyReminder(), f.api.synchronizeDailyReminder()]);
  assert.equal(f.scheduled.size, 1);
  const request = f.scheduled.get(f.api.DAILY_REMINDER_ID);
  assert.equal(request.trigger.type, "daily");
  assert.equal(request.trigger.hour, 21);
  assert.equal(request.trigger.minute, 0);
  assert.equal(request.trigger.timezone, undefined);
  assert.equal(request.content.body, "ua:Have you recorded today's expenses?");
  assert.equal((await f.api.getDailyReminderState()).enabled, true);
  assert.equal(f.prompts, 0);
});

test("automatic permission prompt appears once after refusal; explicit enable can ask again", async () => {
  const f = fixture({ granted: false });
  await f.api.synchronizeDailyReminder("once");
  await f.api.synchronizeDailyReminder("once");
  assert.equal(f.prompts, 1);
  assert.equal(f.scheduled.size, 0);
  f.setPrompt(() => ({ granted: true, canAskAgain: true }));
  await f.api.setDailyReminderEnabled(true);
  assert.equal(f.prompts, 2);
  assert.equal(f.scheduled.size, 1);
});

test("system denial keeps the switch off and offers system settings without prompting", async () => {
  const f = fixture({ granted: false, canAskAgain: false });
  await f.api.setDailyReminderEnabled(true);
  assert.equal(f.prompts, 0);
  assert.equal((await f.api.getDailyReminderState()).enabled, false);
  assert.equal((await f.api.getDailyReminderState()).blocked, true);
});

test("turning off persists across synchronization and clears pending/delivered reminder only", async () => {
  const f = fixture();
  f.scheduled.set("other-feature", { identifier: "other-feature" });
  await f.api.synchronizeDailyReminder();
  await f.api.setDailyReminderEnabled(false);
  await f.api.synchronizeDailyReminder("once");
  assert.equal(f.stored.get("daily_reminder_enabled"), "false");
  assert.equal(f.scheduled.size, 1);
  assert.ok(f.scheduled.has("other-feature"));
  assert.ok(f.dismissed.includes(f.api.DAILY_REMINDER_ID));
  assert.equal((await f.api.getDailyReminderState()).enabled, false);
});

test("previously saved opt-out does not prompt after launch or sign-in", async () => {
  const f = fixture({ preference: false, granted: false });
  await f.api.synchronizeDailyReminder("once");
  assert.equal(f.prompts, 0);
  assert.equal(f.scheduled.size, 0);
});

test("revoking permission clears the schedule; restoring permission enables it on foreground sync", async () => {
  const f = fixture();
  await f.api.synchronizeDailyReminder();
  f.setPermission({ granted: false, canAskAgain: false });
  await f.api.synchronizeDailyReminder();
  assert.equal(f.scheduled.size, 0);
  f.setPermission({ granted: true, canAskAgain: false });
  await f.api.synchronizeDailyReminder();
  assert.equal(f.scheduled.size, 1);
});

test("logout during a permission prompt cannot leave a new scheduled reminder", async () => {
  const f = fixture({ granted: false });
  f.setPrompt(() => {
    f.setToken(null);
    return { granted: true, canAskAgain: true };
  });
  await f.api.synchronizeDailyReminder("once");
  assert.equal(f.scheduled.size, 0);
});

test("queued logout cancellation wins over concurrent scheduling and preserves the preference", async () => {
  const f = fixture();
  const synchronizing = f.api.synchronizeDailyReminder();
  const canceling = f.api.cancelDailyReminder();
  await Promise.all([synchronizing, canceling]);
  assert.equal(f.scheduled.size, 0);
  assert.notEqual(f.stored.get("daily_reminder_enabled"), "false");
});

test("a scheduler error is exposed and does not block subsequent operations", async () => {
  const f = fixture();
  f.failSchedule(true);
  await assert.rejects(f.api.setDailyReminderEnabled(true), /Scheduler unavailable/);
  assert.equal((await f.api.getDailyReminderState()).enabled, false);
  f.failSchedule(false);
  await f.api.synchronizeDailyReminder();
  assert.equal((await f.api.getDailyReminderState()).enabled, true);
});

test("signed-out users have no schedule and are never prompted", async () => {
  const f = fixture({ granted: false });
  f.setToken(null);
  await f.api.synchronizeDailyReminder("once");
  assert.equal(f.prompts, 0);
  assert.equal(f.scheduled.size, 0);
});

test("Android/web do not call native notification APIs or save a preference", async () => {
  for (const platform of ["android", "web"]) {
    const f = fixture({ platform });
    await f.api.synchronizeDailyReminder("once");
    await f.api.setDailyReminderEnabled(true);
    await f.api.cancelDailyReminder();
    assert.equal((await f.api.getDailyReminderState()).enabled, false);
    assert.equal(f.nativeCalls, 0);
    assert.equal(f.stored.size, 0);
  }
});

test("every supported non-English catalog contains all reminder translations", () => {
  const messages = [
    "Daily reminder",
    "Remind me at 21:00 local time.",
    "Turn this reminder off here, or manage notifications in iOS Settings.",
    "Notifications are disabled in iOS Settings.",
    "Open iOS Settings",
    "Unable to update reminder settings. Please try again.",
    "Have you recorded today's expenses?",
  ];
  const catalogs = fs.readdirSync(path.join(root, "src/localization/catalogs"));
  assert.equal(catalogs.length, 14);
  for (const file of catalogs) {
    const catalog = loadTypeScript(`src/localization/catalogs/${file}`).default;
    for (const message of messages) {
      assert.equal(typeof catalog[message], "string", `${file}: ${message}`);
      assert.ok(catalog[message].length > 0);
    }
  }
});
