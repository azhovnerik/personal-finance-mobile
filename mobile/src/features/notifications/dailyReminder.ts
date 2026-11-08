import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";

import { translate } from "../../localization";
import { getToken } from "../../storage/auth";

export const DAILY_REMINDER_ID = "daily-expense-reminder";
const ENABLED_KEY = "daily_reminder_enabled";
const PROMPTED_KEY = "daily_reminder_prompted";
const listeners = new Set<() => void>();
let pending: Promise<unknown> = Promise.resolve();

// Serialize permission prompts, language updates and logout cancellation.
const enqueue = <T>(operation: () => Promise<T>): Promise<T> => {
  const result = pending.then(operation);
  pending = result.catch(() => undefined);
  return result.finally(() => listeners.forEach((listener) => listener()));
};

const isAllowed = (permission: Notifications.NotificationPermissionsStatus) =>
  permission.granted || permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

export const subscribeDailyReminder = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export const getDailyReminderState = async () => {
  if (Platform.OS !== "ios") return { enabled: false, blocked: false };
  const [preference, permission, scheduled, token] = await Promise.all([
    SecureStore.getItemAsync(ENABLED_KEY),
    Notifications.getPermissionsAsync(),
    Notifications.getAllScheduledNotificationsAsync(),
    getToken(),
  ]);
  const allowed = isAllowed(permission);
  return {
    enabled: Boolean(token) && preference !== "false" && allowed &&
      scheduled.some((notification) => notification.identifier === DAILY_REMINDER_ID),
    blocked: !allowed && !permission.canAskAgain,
  };
};

const cancel = async () => {
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID);
  await Notifications.dismissNotificationAsync(DAILY_REMINDER_ID);
};

const synchronize = async (prompt: "never" | "once" | "always") => {
  const token = await getToken();
  const preference = await SecureStore.getItemAsync(ENABLED_KEY);
  if (!token || preference === "false") {
    await cancel();
    return;
  }

  let permission = await Notifications.getPermissionsAsync();
  if (!isAllowed(permission) && permission.canAskAgain && prompt !== "never") {
    const prompted = await SecureStore.getItemAsync(PROMPTED_KEY);
    if (prompt === "always" || prompted !== "true") {
      await SecureStore.setItemAsync(PROMPTED_KEY, "true");
      permission = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowSound: true, allowBadge: false },
      });
    }
  }

  // Logout may have happened while the system permission dialog was open.
  if (!isAllowed(permission) || !(await getToken())) {
    await cancel();
    return;
  }

  // A stable identifier replaces the existing request without a cancellation gap.
  // Matching local hour/minute (rather than a 24-hour interval) follows the iOS clock.
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: {
      title: "moneydrive.me",
      body: translate("Have you recorded today's expenses?"),
      sound: "default",
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 21, minute: 0 },
  });
};

export const synchronizeDailyReminder = (prompt: "never" | "once" = "never") => {
  if (Platform.OS !== "ios") return Promise.resolve();
  return enqueue(() => synchronize(prompt));
};

export const setDailyReminderEnabled = (enabled: boolean) => {
  if (Platform.OS !== "ios") return Promise.resolve();
  return enqueue(async () => {
    await SecureStore.setItemAsync(ENABLED_KEY, String(enabled));
    await synchronize(enabled ? "always" : "never");
  });
};

export const cancelDailyReminder = () => {
  if (Platform.OS !== "ios") return Promise.resolve();
  return enqueue(cancel);
};
