import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { persistAuthTokenFromResponse, verifyEmail } from "../../src/features/auth/api";
import type { ApiError } from "../../src/features/auth/api";
import { resolveRouteFromAuthResult } from "../../src/features/auth/routing";
import { Button, Card, Input, ScreenContainer, Text, colors, spacing } from "../../src/shared/ui";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === "string" ? params.token : "";
  const hasStartedRef = useRef(false);
  const [tokenInput, setTokenInput] = useState(token);
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const submitVerify = async (nextToken: string) => {
    if (!nextToken.trim()) {
      setError("Вставьте токен подтверждения.");
      setErrorCode(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setErrorCode(null);
    setMessage(null);
    try {
      const response = await verifyEmail(nextToken.trim());
      await persistAuthTokenFromResponse(response);
      if (response.token || response.user) {
        router.replace(resolveRouteFromAuthResult(response));
        return;
      }
      setMessage("Email подтвержден. Теперь можно войти.");
    } catch (rawError) {
      const apiError = rawError as ApiError;
      setError(apiError.message ?? "Не удалось подтвердить email.");
      setErrorCode(apiError.code ?? null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (hasStartedRef.current || !token) {
      return;
    }
    hasStartedRef.current = true;
    void submitVerify(token);
  }, [token]);

  return (
    <ScreenContainer style={styles.screen}>
      <Card style={styles.card}>
        {isLoading ? (
          <>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text>Подтверждаем email...</Text>
          </>
        ) : null}
        {!isLoading && !message ? (
          <>
            <Text variant="heading">Подтверждение email</Text>
            <Text variant="caption">
              Если письмо пришло с production-ссылкой, вставьте token вручную для локальной проверки.
            </Text>
            <Input
              placeholder="Verification token"
              autoCapitalize="none"
              value={tokenInput}
              onChangeText={setTokenInput}
            />
            <Button title="Подтвердить email" onPress={() => void submitVerify(tokenInput)} />
          </>
        ) : null}
        {!isLoading && message ? <Text>{message}</Text> : null}
        {!isLoading && error ? <Text style={styles.error}>{error}</Text> : null}
        {!isLoading && errorCode === "TOKEN_EXPIRED" ? (
          <Button title="Отправить письмо повторно" onPress={() => router.replace("/auth/resend-verification")} />
        ) : null}
        {!isLoading ? (
          <Button title="Перейти ко входу" variant="outline" tone="secondary" onPress={() => router.replace("/login")} />
        ) : null}
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
