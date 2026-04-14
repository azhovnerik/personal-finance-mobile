import { StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Button, Card, ScreenContainer, Text, spacing } from "../../src/shared/ui";

export default function RegistrationSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = typeof params.email === "string" ? params.email : "";

  return (
    <ScreenContainer style={styles.screen}>
      <Card style={styles.card}>
        <Text variant="heading">Проверьте email</Text>
        <Text>
          Мы отправили письмо для подтверждения на {email || "указанный адрес"}.
        </Text>
        <Button
          title="Отправить письмо повторно"
          onPress={() =>
            router.replace({
              pathname: "/auth/resend-verification",
              params: email ? { email } : {},
            })
          }
        />
        <Button title="У меня есть token" variant="outline" tone="primary" onPress={() => router.push("/auth/verify")} />
        <Button title="Перейти ко входу" variant="outline" tone="secondary" onPress={() => router.replace("/login")} />
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: "center",
  },
  card: {
    gap: spacing.md,
  },
});
