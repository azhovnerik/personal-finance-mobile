import { ScrollView, StyleSheet, Switch, View } from "react-native";
import { useRouter } from "expo-router";

import { Button, Card, Input, ScreenContainer, Text, colors, spacing } from "../src/shared/ui";

const CURRENCIES = [
  { code: "USD", rate: "38.1", enabled: true },
  { code: "EUR", rate: "41.3", enabled: true },
  { code: "PLN", rate: "9.4", enabled: false },
];

export default function SettingsScreen() {
  const router = useRouter();

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text variant="title">Настройки</Text>
            <Text variant="caption">Профиль, валюты и безопасность</Text>
          </View>
          <Button title="Назад" variant="secondary" onPress={() => router.back()} />
        </View>

        <Card style={styles.card}>
          <Text variant="subtitle">Профиль</Text>
          <Input placeholder="Имя" defaultValue="Анна" />
          <Input placeholder="Фамилия" defaultValue="Коваль" />
          <Input placeholder="Email" defaultValue="anna@finance.app" />
          <Button title="Сохранить изменения" />
        </Card>

        <Card style={styles.card}>
          <Text variant="subtitle">Курсы валют</Text>
          {CURRENCIES.map((currency) => (
            <View key={currency.code} style={styles.currencyRow}>
              <View>
                <Text>{currency.code}</Text>
                <Text variant="caption">Курс {currency.rate}</Text>
              </View>
              <Switch value={currency.enabled} thumbColor={colors.card} trackColor={{ true: colors.primary, false: colors.border }} />
            </View>
          ))}
        </Card>

        <Card style={styles.card}>
          <Text variant="subtitle">Смена пароля</Text>
          <Input placeholder="Текущий пароль" secureTextEntry />
          <Input placeholder="Новый пароль" secureTextEntry />
          <Input placeholder="Подтверждение пароля" secureTextEntry />
          <Button title="Обновить пароль" />
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
  card: {
    gap: spacing.sm,
  },
  currencyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
