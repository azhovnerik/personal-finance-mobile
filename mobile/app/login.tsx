import { translate } from "../src/localization";
import { useLocalization } from "../src/localization/LocalizationProvider";
import { useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import * as AppleAuthentication from "expo-apple-authentication";

import { useLogin } from "../src/features/auth/useLogin";
import { useAppleLogin } from "../src/features/auth/useAppleLogin";
import { useGoogleLogin } from "../src/features/auth/useGoogleLogin";
import { Button, Card, GoogleIcon, Input, ScreenContainer, Text, colors, spacing } from "../src/shared/ui";
import { resolveRouteFromAuthResult } from "../src/features/auth/routing";

export default function LoginScreen() {
  const router = useRouter();
  const { setLocale } = useLocalization();
  const { login, isLoading, error, errorCode } = useLogin();
  const appleLogin = useAppleLogin();
  const googleLogin = useGoogleLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSocialLoginInProgress, setIsSocialLoginInProgress] = useState(false);

  const handleLogin = async () => {
    const response = await login(email.trim(), password);
    if (response) {
      setLocale(response.user.language);
      router.replace(resolveRouteFromAuthResult(response));
    }
  };

  const handleGoogleLogin = async () => {
    setIsSocialLoginInProgress(true);
    const response = await googleLogin.login();
    if (response) {
      setLocale(response.user.language);
      router.replace(resolveRouteFromAuthResult(response));
      return;
    }
    setIsSocialLoginInProgress(false);
  };

  const handleAppleLogin = async () => {
    setIsSocialLoginInProgress(true);
    const response = await appleLogin.login();
    if (response) {
      setLocale(response.user.language);
      router.replace(resolveRouteFromAuthResult(response));
      return;
    }
    setIsSocialLoginInProgress(false);
  };

  const isAnyLoginLoading = isLoading || googleLogin.isLoading || appleLogin.isLoading;

  if (isSocialLoginInProgress) {
    return (
      <ScreenContainer style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text>{translate("Signing in...")}</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={styles.screen}>
      <View style={styles.logoWrapper}>
        <Image source={require("../assets/logo.png")} style={styles.logoImage} resizeMode="contain" />
        <Text variant="subtitle" style={styles.logoText}>{translate("MoneyDrive.me")}</Text>
      </View>

      <Card style={styles.card}>
        <Text variant="heading" style={styles.title}>{translate("Log in")}</Text>
        <Input
          placeholder={translate("Email")}
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="username"
          value={email}
          onChangeText={setEmail}
          editable={!isAnyLoginLoading}
        />
        <Input
          placeholder={translate("Password")}
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
          <Text style={styles.passwordToggleText}>{isPasswordVisible ? translate("Hide password") : translate("Show password")}</Text>
        </Pressable>
        {error || googleLogin.error || appleLogin.error ? (
          <Text style={styles.error}>{error ?? googleLogin.error ?? appleLogin.error}</Text>
        ) : null}
        <Button
          title={isLoading ? translate("Signing in...") : translate("Sign in")}
          onPress={handleLogin}
          disabled={isAnyLoginLoading || !email.trim() || !password}
          size="lg"
        />
        <Button
          title={googleLogin.isLoading ? translate("Signing in with Google...") : translate("Login with Google")}
          variant="outline"
          tone="secondary"
          size="lg"
          leftIcon={<GoogleIcon />}
          onPress={handleGoogleLogin}
          disabled={!googleLogin.isAvailable || isAnyLoginLoading}
        />
        {appleLogin.isAvailable ? (
          <View pointerEvents={isAnyLoginLoading ? "none" : "auto"} style={isAnyLoginLoading ? styles.disabled : null}>
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={10}
              style={styles.appleButton}
              onPress={handleAppleLogin}
            />
          </View>
        ) : null}
        <Button
          title={translate("Create account")}
          variant="outline"
          tone="primary"
          size="lg"
          onPress={() => router.push("/auth/register")}
        />
        <Button
          title={translate("Forgot password?")}
          variant="ghost"
          tone="primary"
          size="lg"
          onPress={() => router.push("/auth/forgot-password")}
        />
        {errorCode === "EMAIL_NOT_VERIFIED" ? (
          <Button
            title={translate("Resend email")}
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
  loadingScreen: {
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
  },
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
  appleButton: {
    width: "100%",
    height: 50,
  },
  disabled: {
    opacity: 0.5,
  },
});
