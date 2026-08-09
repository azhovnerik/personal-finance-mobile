import { localizeSystemMessage, translate } from "../../src/localization";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { confirmEmailChange, persistAuthTokenFromResponse, verifyEmail } from "../../src/features/auth/api";
import type { ApiError } from "../../src/features/auth/api";
import { resolveRouteFromAuthResult } from "../../src/features/auth/routing";
import { Button, Card, Input, ScreenContainer, Text, colors, spacing } from "../../src/shared/ui";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string; mode?: string }>();
  const token = typeof params.token === "string" ? params.token : "";
  const isEmailChange = params.mode === "email-change";
  const hasStartedRef = useRef(false);
  const [tokenInput, setTokenInput] = useState(token);
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const submitVerify = async (nextToken: string) => {
    if (!nextToken.trim()) {
      setError(translate("Paste the verification token."));
      setErrorCode(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setErrorCode(null);
    setMessage(null);
    try {
      if (isEmailChange) {
        await confirmEmailChange(nextToken.trim());
        setMessage(translate("Email verified. You can now sign in."));
        return;
      }

      const response = await verifyEmail(nextToken.trim());
      await persistAuthTokenFromResponse(response);
      if (response.token || response.user) {
        router.replace(resolveRouteFromAuthResult(response));
        return;
      }
      setMessage(translate("Email verified. You can now sign in."));
    } catch (rawError) {
      const apiError = rawError as ApiError;
      setError(localizeSystemMessage(apiError.message, "Unable to verify the email."));
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
            <Text>{translate("Verifying email...")}</Text>
          </>
        ) : null}
        {!isLoading && !message ? (
          <>
            <Text variant="heading">{translate("Email verification")}</Text>
            <Text variant="caption">
              {translate("If the email contains a production link, paste the token manually for local testing.")}</Text>
            <Input
              placeholder={translate("Verification token")}
              autoCapitalize="none"
              value={tokenInput}
              onChangeText={setTokenInput}
            />
            <Button title={translate("Verify email")} onPress={() => void submitVerify(tokenInput)} />
          </>
        ) : null}
        {!isLoading && message ? <Text>{message}</Text> : null}
        {!isLoading && error ? <Text style={styles.error}>{error}</Text> : null}
        {!isLoading && errorCode === "TOKEN_EXPIRED" ? (
          <Button title={translate("Resend email")} onPress={() => router.replace("/auth/resend-verification")} />
        ) : null}
        {!isLoading ? (
          <Button title={translate("Go to sign in")} variant="outline" tone="secondary" onPress={() => router.replace("/login")} />
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
