import { ScrollView, StyleSheet, View } from "react-native";

import { Button, Card, Chip, Input, ScreenContainer, Text, colors, spacing } from "../../src/shared/ui";
import { formatCurrency } from "../../src/shared/utils/format";
import { mockAccountDtos, mockUser } from "../../src/shared/mocks";
import {useAccounts} from "../../src/features/accounts/useAccounts";

export default function AccountsScreen() {
  const baseCurrency = mockUser.baseCurrency ?? "UAH";
  const accounts = useAccounts()

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
            <Button title="Add new account" size="sm" />
            <Button title="Add transfer" variant="outline" tone="primary" size="sm" />
          </View>
        </View>

        <Card style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <Text variant="caption">Name</Text>
            <Text variant="caption">Type</Text>
            <Text variant="caption">Balance</Text>
          </View>
          <View style={styles.list}>
            {accounts.accounts.map((account) => (
              <View key={account.id} style={styles.rowCard}>
                <View>
                  <Text>{account.name}</Text>
                  <Text variant="caption">{account.type}</Text>
                </View>
                <View style={styles.accountBalance}>
                  <Text
                    style={
                      (account.balance ?? 0) < 0 ? styles.negativeValue : styles.positiveValue
                    }
                  >
                    {formatCurrency(account.balance ?? 0, account.currency ?? baseCurrency)}
                  </Text>
                  <Text variant="caption">
                    {formatCurrency(account.balanceInBase ?? 0, baseCurrency)}
                  </Text>
                </View>
                <View style={styles.actionRow}>
                  <Button title="Edit" variant="outline" tone="primary" size="sm" />
                  <Button title="Delete" variant="ghost" size="sm" />
                </View>
              </View>
            ))}
          </View>
        </Card>

        <Card style={styles.formCard}>
          <Text variant="subtitle">Add account</Text>
          <Input placeholder="Account name" />
          <Input placeholder="Account type" />
          <Input placeholder="Currency" />
          <Input placeholder="Opening balance" keyboardType="numeric" />
          <Button title="Create account" />
        </Card>

        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text variant="subtitle">Transfers</Text>
              <Text variant="caption">Latest account transfers.</Text>
            </View>
            <Button title="Add transfer" variant="outline" tone="primary" size="sm" />
          </View>
          <View style={styles.emptyRow}>
            <Text variant="caption">No transfers yet.</Text>
          </View>
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xl,
    gap: spacing.lg,
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
  tableCard: {
    gap: spacing.sm,
  },
  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  list: {
    gap: spacing.sm,
  },
  rowCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  accountBalance: {
    gap: 4,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  formCard: {
    gap: spacing.sm,
  },
  sectionCard: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  emptyRow: {
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  positiveValue: {
    color: colors.success,
    fontWeight: "600",
  },
  negativeValue: {
    color: colors.danger,
    fontWeight: "600",
  },
});
