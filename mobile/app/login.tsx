import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { useLogin } from "../src/features/auth/useLogin";
import { Button, Card, Input, ScreenContainer, Text, colors, spacing } from "../src/shared/ui";

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading, error } = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    const isSuccess = await login(email.trim(), password);
    if (isSuccess) {
      router.replace("/(tabs)");
    }
  };

  return (
    <ScreenContainer style={styles.screen}>
      <View style={styles.logoWrapper}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoBadgeText}>S</Text>
        </View>
        <Text variant="subtitle" style={styles.logoText}>MoneyDrive.me</Text>
      </View>

      <Card style={styles.card}>
        <Text variant="heading" style={styles.title}>Log in</Text>
        <Input
          placeholder="Username"
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="username"
          value={email}
          onChangeText={setEmail}
          editable={!isLoading}
        />
        <Input
          placeholder="Password"
          secureTextEntry
          textContentType="password"
          value={password}
          onChangeText={setPassword}
          editable={!isLoading}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          title={isLoading ? "Logging in..." : "Log in"}
          onPress={handleLogin}
          disabled={isLoading || !email.trim() || !password}
          size="lg"
        />
        <Button
          title="Create an account"
          variant="outline"
          tone="primary"
          size="lg"
        />
        <Button
          title="Login with Google"
          variant="outline"
          tone="secondary"
          size="lg"
        />
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.lg,
  },
  logoWrapper: {
    alignItems: "center",
    gap: spacing.sm,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#12d2c3",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  logoBadgeText: {
    fontSize: 36,
    fontWeight: "700",
    color: colors.surface,
  },
  logoText: {
    color: colors.secondary,
    fontWeight: "600",
  },
  card: {
    width: "100%",
    maxWidth: 360,
    gap: spacing.sm,
    alignItems: "stretch",
  },
  title: {
    textAlign: "center",
  },
  error: {
    color: colors.danger,
  },
});
