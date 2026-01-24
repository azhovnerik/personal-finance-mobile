import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Tabs } from "expo-router";

import { Text, colors, spacing } from "../../src/shared/ui";
import { CreateTransactionModal } from "../../src/features/transactions/create/CreateTransactionModal";

export default function TabsLayout() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <>
      <View style={styles.container}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: styles.tabBar,
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.textSecondary,
          }}
        >
          <Tabs.Screen name="index" options={{ title: "Главная" }} />
          <Tabs.Screen name="transactions" options={{ title: "Транзакции" }} />
          <Tabs.Screen
            name="add"
            options={{
              title: "",
              tabBarLabel: "",
              tabBarButton: () => (
                <Pressable style={styles.addButtonWrapper} onPress={() => setIsCreateOpen(true)}>
                  <View style={styles.addButton}>
                    <Text style={styles.addButtonLabel}>+</Text>
                  </View>
                </Pressable>
              ),
            }}
          />
          <Tabs.Screen name="budgets" options={{ title: "Бюджеты" }} />
          <Tabs.Screen name="accounts" options={{ title: "Счета" }} />
          <Tabs.Screen name="more" options={{ title: "Ещё" }} />
        </Tabs>
      </View>

      <CreateTransactionModal visible={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    backgroundColor: colors.card,
    borderTopColor: colors.border,
    height: 74,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
  },
  addButtonWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  addButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#2ecc71",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  addButtonLabel: {
    color: colors.surface,
    fontSize: 36,
    fontWeight: "700",
    lineHeight: 40,
  },
});
