import { useState } from "react";
import { StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { resetPassword } from "../../src/features/auth/api";
import type { ApiError } from "../../src/features/auth/api";
import { Button, Card, Input, ScreenContainer, Text, colors, spacing } from "../../src/shared/ui";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === "string" ? params.token : "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!token) {
      setError("Отсутствует токен сброса.");
      return;
    }
    if (!password) {
      setError("Введите новый пароль.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Пароли не совпадают.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      await resetPassword(token, password);
      setMessage("Пароль обновлен. Теперь можно войти.");
    } catch (rawError) {
      const apiError = rawError as ApiError;
      setError(apiError.message ?? "Не удалось сбросить пароль.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer style={styles.screen}>
      <Card style={styles.card}>
        <Text variant="heading">Новый пароль</Text>
        <Input placeholder="Новый пароль" secureTextEntry value={password} onChangeText={setPassword} />
        <Input placeholder="Повторите пароль" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />
        {message ? <Text>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title={isSubmitting ? "Сохраняем..." : "Сохранить пароль"} onPress={() => void onSubmit()} disabled={isSubmitting} />
        <Button title="Ко входу" variant="outline" tone="secondary" onPress={() => router.replace("/login")} />
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

