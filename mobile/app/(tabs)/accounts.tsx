import { ScrollView, StyleSheet, View } from "react-native";

import { Button, Card, Input, ScreenContainer, Text, colors, spacing } from "../../src/shared/ui";

const ACCOUNTS = [
  {
    id: "a1",
    name: "Основной счет",
    balance: "₴ 42 600",
    type: "Банк",
  },
  {
    id: "a2",
    name: "Карта путешествий",
    balance: "₴ 18 900",
    type: "Карта",
  },
  {
    id: "a3",
    name: "Наличные",
    balance: "₴ 2 200",
    type: "Кошелек",
  },
];

export default function AccountsScreen() {
  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text variant="title">Счета</Text>
            <Text variant="caption">Управление балансами и переводами</Text>
          </View>
          <Button title="Новый" />
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
          {ACCOUNTS.map((account) => (
            <Card key={account.id} style={styles.accountCard}>
              <View style={styles.accountHeader}>
                <View>
                  <Text>{account.name}</Text>
                  <Text variant="caption">{account.type}</Text>
                </View>
                <Text style={styles.balanceValue}>{account.balance}</Text>
              </View>
              <View style={styles.actionRow}>
                <Button title="Изменить" variant="secondary" />
                <Button title="Баланс" variant="secondary" />
              </View>
              <View style={styles.actionRow}>
                <Button title="Трансфер" variant="secondary" />
                <Button title="Удалить" variant="ghost" />
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
  balanceValue: {
    fontWeight: "700",
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
