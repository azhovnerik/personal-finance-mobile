import { Tabs } from "expo-router";

import { colors } from "../../src/shared/ui";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Главная" }} />
      <Tabs.Screen name="transactions" options={{ title: "Транзакции" }} />
      <Tabs.Screen name="budgets" options={{ title: "Бюджеты" }} />
      <Tabs.Screen name="accounts" options={{ title: "Счета" }} />
      <Tabs.Screen name="more" options={{ title: "Ещё" }} />
    </Tabs>
  );
}
