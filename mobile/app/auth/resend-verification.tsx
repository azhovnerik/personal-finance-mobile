import { useState } from "react";
import { StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { resendVerification } from "../../src/features/auth/api";
import type { ApiError } from "../../src/features/auth/api";
import { Button, Card, Input, ScreenContainer, Text, colors, spacing } from "../../src/shared/ui";

export default function ResendVerificationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(typeof params.email === "string" ? params.email : "");
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
      const response = await resendVerification(email.trim());
      setMessage(
        response.cooldownSeconds
          ? `Письмо отправлено. Повторить можно примерно через ${response.cooldownSeconds} сек.`
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
        <Text variant="heading">Повторная отправка письма</Text>
        <Input placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        {message ? <Text>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title={isSubmitting ? "Отправляем..." : "Отправить письмо"} onPress={() => void onSubmit()} disabled={isSubmitting} />
        <Button title="Подтвердить по token" variant="outline" tone="primary" onPress={() => router.push("/auth/verify")} />
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
