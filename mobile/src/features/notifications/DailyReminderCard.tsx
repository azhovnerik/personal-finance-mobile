import { useCallback, useEffect, useState } from "react";
import { AppState, Platform, StyleSheet, Switch, View } from "react-native";

import { translate } from "../../localization";
import { Card, Text, colors, spacing } from "../../shared/ui";
import { getDailyReminderState, setDailyReminderEnabled, subscribeDailyReminder } from "./dailyReminder";

export function DailyReminderCard() {
  const [state, setState] = useState({ enabled: false, blocked: false });
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    let mounted = true;
    let version = 0;
    const refresh = () => {
      const current = ++version;
      void getDailyReminderState().then((next) => {
        if (mounted && current === version) {
          setState(next);
          setReady(true);
        }
      }).catch(() => { if (mounted) setError(true); });
    };
    refresh();
    const unsubscribe = subscribeDailyReminder(refresh);
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active") refresh();
    });
    return () => {
      mounted = false;
      unsubscribe();
      subscription.remove();
    };
  }, []);

  const toggle = useCallback(async (enabled: boolean) => {
    setBusy(true);
    setError(false);
    try {
      await setDailyReminderEnabled(enabled);
      setState(await getDailyReminderState());
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }, []);

  if (Platform.OS !== "ios") return null;

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.label} variant="subtitle">{translate("Daily reminder")}</Text>
        <Switch
          accessibilityLabel={translate("Daily reminder")}
          value={state.enabled}
          disabled={busy || !ready}
          onValueChange={(enabled) => void toggle(enabled)}
          trackColor={{ true: colors.primary }}
        />
      </View>
      <Text variant="caption">{translate("Remind me at 21:00 local time.")}</Text>
      <Text variant="caption">
        {translate("Turn this reminder off here, or manage notifications in iOS Settings.")}
      </Text>
      {state.blocked ? <Text variant="caption">{translate("Notifications are disabled in iOS Settings.")}</Text> : null}
      {error ? <Text style={styles.error}>{translate("Unable to update reminder settings. Please try again.")}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  label: { flex: 1 },
  error: { color: colors.danger },
});
