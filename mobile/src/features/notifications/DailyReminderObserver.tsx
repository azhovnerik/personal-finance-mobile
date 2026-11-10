import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import { useRouter, useSegments } from "expo-router";
import * as Notifications from "expo-notifications";

import { useLocalization } from "../../localization/LocalizationProvider";
import { DAILY_REMINDER_ID, synchronizeDailyReminder } from "./dailyReminder";

export function DailyReminderObserver() {
  const { locale } = useLocalization();
  const segments = useSegments();
  const router = useRouter();
  const firstSegment = segments[0];
  const authenticatedScreen = Boolean(firstSegment) &&
    firstSegment !== "login" && firstSegment !== "auth" && firstSegment !== "onboarding";

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    const handleResponse = (response: Notifications.NotificationResponse | null) => {
      if (response?.notification.request.identifier !== DAILY_REMINDER_ID) return;
      Notifications.clearLastNotificationResponse();
      // The entry screen restores the session and applies existing access checks.
      router.replace("/");
    };
    const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
    handleResponse(Notifications.getLastNotificationResponse());
    return () => subscription.remove();
  }, [router]);

  useEffect(() => {
    if (Platform.OS !== "ios" || !authenticatedScreen) return;
    const synchronize = () => {
      void synchronizeDailyReminder("once").catch((error: unknown) => {
        console.warn("Unable to synchronize daily reminder", error);
      });
    };
    synchronize();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") synchronize();
    });
    return () => subscription.remove();
  }, [authenticatedScreen, locale]);

  return null;
}
