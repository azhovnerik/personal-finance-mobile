import { useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { useLogin } from "../src/features/auth/useLogin";
import { useGoogleLogin } from "../src/features/auth/useGoogleLogin";
import { Button, Card, GoogleIcon, Input, ScreenContainer, Text, colors, spacing } from "../src/shared/ui";
import { resolveRouteFromAuthResult } from "../src/features/auth/routing";

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading, error, errorCode } = useLogin();
  const googleLogin = useGoogleLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleLogin = async () => {
    const response = await login(email.trim(), password);
    if (response) {
      router.replace(resolveRouteFromAuthResult(response));
    }
  };

  const handleGoogleLogin = async () => {
    const response = await googleLogin.login();
    if (response) {
      router.replace(resolveRouteFromAuthResult(response));
    }
  };

  const isAnyLoginLoading = isLoading || googleLogin.isLoading;

  return (
    <ScreenContainer style={styles.screen}>
      <View style={styles.logoWrapper}>
        <Image source={require("../assets/logo.png")} style={styles.logoImage} resizeMode="contain" />
        <Text variant="subtitle" style={styles.logoText}>MoneyDrive.me</Text>
      </View>

      <Card style={styles.card}>
        <Text variant="heading" style={styles.title}>Log in</Text>
        <Input
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="username"
          value={email}
          onChangeText={setEmail}
          editable={!isAnyLoginLoading}
        />
        <Input
          placeholder="Password"
          secureTextEntry={!isPasswordVisible}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          autoComplete="current-password"
          textContentType="password"
          value={password}
          onChangeText={setPassword}
          editable={!isAnyLoginLoading}
        />
        <Pressable
          onPress={() => setIsPasswordVisible((prev) => !prev)}
          disabled={isAnyLoginLoading}
          style={styles.passwordToggle}
        >
          <Text style={styles.passwordToggleText}>{isPasswordVisible ? "Скрыть пароль" : "Показать пароль"}</Text>
        </Pressable>
        {error || googleLogin.error ? <Text style={styles.error}>{error ?? googleLogin.error}</Text> : null}
        <Button
          title={isLoading ? "Входим..." : "Войти"}
          onPress={handleLogin}
          disabled={isAnyLoginLoading || !email.trim() || !password}
          size="lg"
        />
        <Button
          title="Создать аккаунт"
          variant="outline"
          tone="primary"
          size="lg"
          onPress={() => router.push("/auth/register")}
        />
        <Button
          title={googleLogin.isLoading ? "Входим через Google..." : "Login with Google"}
          variant="outline"
          tone="secondary"
          size="lg"
          leftIcon={<GoogleIcon />}
          onPress={handleGoogleLogin}
          disabled={!googleLogin.isAvailable || isAnyLoginLoading}
        />
        <Button
          title="Забыли пароль?"
          variant="ghost"
          tone="primary"
          size="lg"
          onPress={() => router.push("/auth/forgot-password")}
        />
        {errorCode === "EMAIL_NOT_VERIFIED" ? (
          <Button
            title="Отправить письмо повторно"
            variant="outline"
            tone="secondary"
            size="lg"
            onPress={() =>
              router.push({
                pathname: "/auth/resend-verification",
                params: { email: email.trim() },
              })
            }
          />
        ) : null}
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
  logoImage: {
    width: 72,
    height: 72,
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
  passwordToggle: {
    alignSelf: "flex-end",
    paddingVertical: 2,
  },
  passwordToggleText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "600",
  },
});
