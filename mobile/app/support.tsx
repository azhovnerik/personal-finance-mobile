import { ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { Button, Card, Input, ScreenContainer, Text, spacing } from "../src/shared/ui";

export default function SupportScreen() {
  const router = useRouter();

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text variant="title">Поддержка</Text>
            <Text variant="caption">Напишите нам, и мы ответим в течение дня</Text>
          </View>
          <Button title="Назад" variant="secondary" onPress={() => router.back()} />
        </View>

        <Card style={styles.card}>
          <Text variant="subtitle">Сообщение в поддержку</Text>
          <Input placeholder="Тема" />
          <Input placeholder="Email для ответа" keyboardType="email-address" />
          <Input placeholder="Сообщение" isMultiline />
          <Button title="Отправить" />
        </Card>

        <Card style={styles.card}>
          <Text variant="subtitle">Контактные данные</Text>
          <Text>support@personal-finance.app</Text>
          <Text variant="caption">Рабочее время: 09:00 - 20:00 (GMT+2)</Text>
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
});
