import { ScrollView, StyleSheet, View } from "react-native";

import { Button, Card, Input, ScreenContainer, Text, colors, spacing } from "../../src/shared/ui";
import { formatCurrency } from "../../src/shared/utils/format";
import { mockAccountDtos, mockUser } from "../../src/shared/mocks";

export default function AccountsScreen() {
  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text variant="title">Счета</Text>
            <Text variant="caption">Управление балансами и переводами</Text>
          </View>
          <Button title="Новый" variant="outline" tone="primary" size="sm" />
        </View>

        <Card style={styles.formCard}>
          <Text variant="subtitle">Добавить счет</Text>
          <Input placeholder="Название счета" />
          <Input placeholder="Тип счета" />
          <Input placeholder="Начальный баланс, ₴" keyboardType="numeric" />
          <Button title="Создать счет" />
        </Card>

        <View style={styles.sectionHeader}>
          <Text variant="subtitle">Мои счета</Text>
          <Text variant="caption">Редактирование, баланс и трансферы</Text>
        </View>

        <View style={styles.list}>
          {mockAccountDtos.map((account) => (
            <Card key={account.id} style={styles.accountCard}>
              <View style={styles.accountHeader}>
                <View style={styles.accountInfo}>
                  <Text>{account.name}</Text>
                  <Text variant="caption">{account.type}</Text>
                </View>
                <View style={styles.accountBalance}>
                  <Text style={styles.balanceValue}>
                    {formatCurrency(account.balance ?? 0, account.currency ?? mockUser.baseCurrency ?? "UAH")}
                  </Text>
                  {account.currency && account.currency !== mockUser.baseCurrency ? (
                    <Text variant="caption">
                      ≈ {formatCurrency(account.balanceInBase ?? 0, mockUser.baseCurrency ?? "UAH")}
                    </Text>
                  ) : null}
                </View>
              </View>
              <View style={styles.actionRow}>
                <Button title="Изменить" variant="secondary" size="sm" />
                <Button title="Баланс" variant="secondary" size="sm" />
              </View>
              <View style={styles.actionRow}>
                <Button title="Трансфер" variant="secondary" size="sm" />
                <Button title="Удалить" variant="ghost" size="sm" />
              </View>
            </Card>
          ))}
        </View>

        <Card style={styles.transferCard}>
          <Text variant="subtitle">Трансфер между счетами</Text>
          <Input placeholder="Счет отправителя" />
          <Input placeholder="Счет получателя" />
          <Input placeholder="Сумма, ₴" keyboardType="numeric" />
          <Button title="Перевести" />
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  formCard: {
    gap: spacing.sm,
  },
  sectionHeader: {
    gap: 4,
  },
  list: {
    gap: spacing.sm,
  },
  accountCard: {
    gap: spacing.sm,
  },
  accountHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  accountInfo: {
    gap: 2,
  },
  accountBalance: {
    alignItems: "flex-end",
  },
  balanceValue: {
    fontWeight: "600",
    color: colors.primaryDark,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  transferCard: {
    gap: spacing.sm,
  },
});
