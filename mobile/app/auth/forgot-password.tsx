import { useState } from "react";
import { StyleSheet } from "react-native";
import { useRouter } from "expo-router";

import { forgotPassword } from "../../src/features/auth/api";
import type { ApiError } from "../../src/features/auth/api";
import { Button, Card, Input, ScreenContainer, Text, colors, spacing } from "../../src/shared/ui";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!email.trim()) {
      setError("Введите email.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const response = await forgotPassword(email.trim());
      setMessage(
        response.cooldownSeconds
          ? `Если аккаунт существует, письмо отправлено. Интервал: ${response.cooldownSeconds} сек.`
          : "Если аккаунт существует, письмо отправлено.",
      );
    } catch (rawError) {
      const apiError = rawError as ApiError;
      setError(apiError.message ?? "Не удалось отправить письмо.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer style={styles.screen}>
      <Card style={styles.card}>
        <Text variant="heading">Восстановление пароля</Text>
        <Input placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        {message ? <Text>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title={isSubmitting ? "Отправляем..." : "Отправить письмо"} onPress={() => void onSubmit()} disabled={isSubmitting} />
        <Button title="Назад ко входу" variant="outline" tone="secondary" onPress={() => router.replace("/login")} />
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
  error: {
    color: colors.danger,
  },
});

