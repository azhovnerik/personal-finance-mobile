import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { Button, Card, Chip, ScreenContainer, Text, colors, spacing } from "../../src/shared/ui";
import { formatCurrency } from "../../src/shared/utils/format";
import { useAccounts } from "../../src/features/accounts/useAccounts";

export default function AccountsScreen() {
  const router = useRouter();
  const baseCurrency = "UAH";
  const { accounts, isLoading, error, actionError } = useAccounts();
  const accountItems = Array.isArray(accounts) ? accounts : [];

  const openEdit = (account?: unknown) => {
    const payload = account ? encodeURIComponent(JSON.stringify(account)) : undefined;
    router.push({ pathname: "/accounts/edit", params: payload ? { account: payload } : {} });
  };

  const openDetails = (account: unknown) => {
    const payload = encodeURIComponent(JSON.stringify(account));
    const dto = account as { id?: string | null };
    router.push({
      pathname: "/accounts/details",
      params: {
        account: payload,
        accountId: dto.id ?? "",
      },
    });
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text variant="title">Accounts</Text>
            <Text variant="caption">Keep an eye on all of your balances.</Text>
          </View>
          <View style={styles.headerActions}>
            <Chip label={baseCurrency} isActive />
            <Button title="Add" size="sm" onPress={() => openEdit()} />
          </View>
        </View>

        {isLoading ? <Text variant="caption">Загрузка счетов...</Text> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {actionError ? <Text style={styles.errorText}>{actionError}</Text> : null}

        <View style={styles.list}>
          {accountItems.map((account) => {
            if (!account.id) {
              return null;
            }
            return (
              <Pressable key={account.id} onPress={() => openDetails(account)}>
                <Card style={styles.rowCard}>
                  <View style={styles.rowLine}>
                    <Text numberOfLines={1} style={styles.nameText}>
                      {account.name}
                    </Text>
                    <Text numberOfLines={1} style={styles.typeText}>
                      {account.type}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.amountText,
                        (account.balance ?? 0) < 0 ? styles.negativeValue : styles.positiveValue,
                      ]}
                    >
                      {formatCurrency(account.balance ?? 0, account.currency ?? baseCurrency)}
                    </Text>
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  header: {
    gap: spacing.sm,
  },
  headerActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    alignItems: "center",
  },
  list: {
    gap: spacing.xs,
  },
  rowCard: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  rowLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  nameText: {
    flex: 1,
    minWidth: 0,
  },
  typeText: {
    width: 76,
    color: colors.textSecondary,
    textAlign: "center",
  },
  amountText: {
    width: 104,
    textAlign: "right",
  },
  positiveValue: {
    color: colors.success,
    fontWeight: "600",
  },
  negativeValue: {
    color: colors.danger,
    fontWeight: "600",
  },
  errorText: {
    color: colors.danger,
  },
});
