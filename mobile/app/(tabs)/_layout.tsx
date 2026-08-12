import { translate } from "../../src/localization";
import { useLocalization } from "../../src/localization/LocalizationProvider";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Tabs, useGlobalSearchParams, useRouter } from "expo-router";

import { Text, colors, spacing } from "../../src/shared/ui";
import { CategoryIcon } from "../../src/features/categories/components/CategoryIcon";
import { CreateTransactionModal } from "../../src/features/transactions/create/CreateTransactionModal";

export default function TabsLayout() {
  useLocalization();
  const router = useRouter();
  const { openCreate } = useGlobalSearchParams<{ openCreate?: string }>();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => {
    if (openCreate === "1") {
      setIsCreateOpen(true);
    }
  }, [openCreate]);

  const closeCreate = () => {
    setIsCreateOpen(false);
    if (openCreate === "1") {
      router.setParams({ openCreate: undefined });
    }
  };

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
              title: translate("Home"),
              tabBarIcon: ({ size }) => <CategoryIcon name="expense.home" size={size} />,
            }}
          />
          <Tabs.Screen
            name="transactions"
            options={{
              title: translate("Transactions"),
              tabBarIcon: ({ size }) => <CategoryIcon name="transfer.between_accounts" size={size} />,
            }}
          />
          <Tabs.Screen
            name="budgets"
            options={{
              title: translate("Budgets"),
              tabBarIcon: ({ size }) => <CategoryIcon name="income.interest" size={size} />,
            }}
          />
          <Tabs.Screen
            name="categories"
            options={{
              title: translate("Categories"),
              tabBarIcon: ({ size }) => <CategoryIcon name="expense.shopping" size={size} />,
            }}
          />
          <Tabs.Screen
            name="accounts"
            options={{
              title: translate("Accounts"),
              tabBarIcon: ({ size }) => <CategoryIcon name="transfer.to_savings" size={size} />,
            }}
          />
          <Tabs.Screen
            name="more"
            options={{
              title: translate("More"),
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
      <CreateTransactionModal visible={isCreateOpen} onClose={closeCreate} />
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
