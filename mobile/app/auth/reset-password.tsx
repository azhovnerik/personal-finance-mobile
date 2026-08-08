import { localizeSystemMessage, translate } from "../../src/localization";
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
      setError(translate("Missing reset token."));
      return;
    }
    if (!password) {
      setError(translate("Enter a new password."));
      return;
    }
    if (password !== confirmPassword) {
      setError(translate("Passwords do not match."));
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      await resetPassword(token, password);
      setMessage(translate("Password updated. You can now sign in."));
    } catch (rawError) {
      const apiError = rawError as ApiError;
      setError(localizeSystemMessage(apiError.message, "Unable to reset the password."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer style={styles.screen}>
      <Card style={styles.card}>
        <Text variant="heading">{translate("New password")}</Text>
        <Input placeholder={translate("New password")} secureTextEntry value={password} onChangeText={setPassword} />
        <Input placeholder={translate("Confirm password")} secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />
        {message ? <Text>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title={isSubmitting ? translate("Saving...") : translate("Save password")} onPress={() => void onSubmit()} disabled={isSubmitting} />
        <Button title={translate("Back to sign in")} variant="outline" tone="secondary" onPress={() => router.replace("/login")} />
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
