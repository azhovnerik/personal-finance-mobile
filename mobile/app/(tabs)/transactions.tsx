import { ScrollView, StyleSheet, View } from "react-native";

import { Button, Card, Chip, Input, ScreenContainer, Text, colors, spacing } from "../../src/shared/ui";
import { formatCurrency } from "../../src/shared/utils/format";
import { mockTransactions, mockUser } from "../../src/shared/mocks";

const FILTERS = [
  { label: "All types", active: true },
  { label: "Income", active: false },
  { label: "Expenses", active: false },
  { label: "All accounts", active: false },
];

export default function TransactionsScreen() {
  const baseCurrency = mockUser.baseCurrency ?? "UAH";

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text variant="title">Transactions</Text>
            <Text variant="caption">Period: 2026-01-01 – 2026-01-31</Text>
          </View>
          <Chip label={baseCurrency} isActive />
        </View>

        <Card style={styles.infoCard}>
          <Text variant="subtitle">Track transactions with the Telegram bot</Text>
          <Text variant="caption">
            Especially convenient on mobile—you do not need to open the app.
          </Text>
          <Text style={styles.infoLink}>@addtransactionbot</Text>
        </Card>

        <Card style={styles.filterCard}>
          <Text variant="subtitle">Filters</Text>
          <View style={styles.filterRow}>
            <Input placeholder="Start date" />
            <Input placeholder="End date" />
          </View>
          <View style={styles.filterRow}>
            <Input placeholder="Type" />
            <Input placeholder="Account" />
          </View>
          <Button title="Apply" size="sm" />
        </Card>

        <View style={styles.filterChips}>
          {FILTERS.map((filter) => (
            <Chip key={filter.label} label={filter.label} isActive={filter.active} />
          ))}
        </View>

        <View style={styles.actionRow}>
          <Button title="Add new transaction" size="sm" />
          <Button title="Export to xls" variant="outline" tone="primary" size="sm" />
        </View>

        <View style={styles.list}>
          {mockTransactions.map((transaction) => (
            <Card key={transaction.id} style={styles.transactionCard}>
              <View style={styles.transactionHeader}>
                <View>
                  <Text>{transaction.date}</Text>
                  <Text variant="caption">{transaction.account.name}</Text>
                </View>
                <Text
                  style={
                    transaction.direction === "DECREASE" ? styles.negativeValue : styles.positiveValue
                  }
                >
                  {transaction.direction === "DECREASE" ? "-" : "+"}
                  {formatCurrency(transaction.amount, transaction.currency ?? baseCurrency)}
                </Text>
              </View>
              <View style={styles.transactionMeta}>
                <Chip label={transaction.type} isActive />
                <Chip label={transaction.direction} />
              </View>
              <Text variant="caption">{transaction.category.name}</Text>
              <Text variant="caption">{transaction.comment}</Text>
              <View style={styles.actionRowInline}>
                <Button title="Edit" variant="outline" tone="primary" size="sm" />
                <Button title="Delete" variant="ghost" size="sm" />
              </View>
            </Card>
          ))}
        </View>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  infoCard: {
    gap: spacing.sm,
    backgroundColor: "#d9f5ff",
  },
  infoLink: {
    color: colors.info,
    fontWeight: "600",
  },
  filterCard: {
    gap: spacing.sm,
  },
  filterRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  filterChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  list: {
    gap: spacing.sm,
  },
  transactionCard: {
    gap: spacing.sm,
  },
  transactionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  transactionMeta: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  actionRowInline: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  negativeValue: {
    color: colors.danger,
    fontWeight: "600",
  },
  positiveValue: {
    color: colors.success,
    fontWeight: "600",
  },
});
