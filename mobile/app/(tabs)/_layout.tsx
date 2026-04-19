import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Tabs } from "expo-router";

import { Text, colors, spacing } from "../../src/shared/ui";
import { CreateTransactionModal } from "../../src/features/transactions/create/CreateTransactionModal";
import { CategoryIcon } from "../../src/features/categories/components/CategoryIcon";

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
            tabBarLabelStyle: styles.tabBarLabel,
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: "Главная",
              tabBarIcon: ({ size }) => <CategoryIcon name="expense.home" size={size} />,
            }}
          />
          <Tabs.Screen
            name="transactions"
            options={{
              title: "Транзакции",
              tabBarIcon: ({ size }) => <CategoryIcon name="transfer.between_accounts" size={size} />,
            }}
          />
          <Tabs.Screen
            name="budgets"
            options={{
              title: "Бюджеты",
              tabBarIcon: ({ size }) => <CategoryIcon name="income.interest" size={size} />,
            }}
          />
          <Tabs.Screen
            name="categories"
            options={{
              title: "Категории",
              tabBarIcon: ({ size }) => <CategoryIcon name="expense.shopping" size={size} />,
            }}
          />
          <Tabs.Screen
            name="accounts"
            options={{
              title: "Счета",
              tabBarIcon: ({ size }) => <CategoryIcon name="transfer.to_savings" size={size} />,
            }}
          />
          <Tabs.Screen
            name="more"
            options={{
              title: "Ещё",
              tabBarIcon: ({ size }) => <CategoryIcon name="expense.entertainment" size={size} />,
            }}
          />
          <Tabs.Screen name="add" options={{ href: null }} />
        </Tabs>
        <Pressable style={styles.addButtonWrapper} onPress={() => setIsCreateOpen(true)}>
          <View style={styles.addButton}>
            <Text style={styles.addButtonLabel}>+</Text>
          </View>
        </Pressable>
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
  tabBarLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  addButtonWrapper: {
    position: "absolute",
    left: "50%",
    marginLeft: -32,
    bottom: spacing.lg,
    zIndex: 20,
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
