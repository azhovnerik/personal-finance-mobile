import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { register as registerRequest } from "../../src/features/auth/api";
import type { ApiError } from "../../src/features/auth/api";
import { Button, Card, Input, ScreenContainer, Text, colors, spacing } from "../../src/shared/ui";

export default function RegisterScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [language, setLanguage] = useState("uk");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!email.trim() || !name.trim() || !password) {
      setError("Заполните email, имя и пароль.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Пароли не совпадают.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const response = await registerRequest({
        email: email.trim(),
        name: name.trim(),
        password,
        language: language.trim() || undefined,
      });
      router.replace({
        pathname: "/auth/registration-success",
        params: { email: response.email },
      });
    } catch (rawError) {
      const apiError = rawError as ApiError;
      setError(apiError.message ?? "Не удалось зарегистрироваться.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer style={styles.screen}>
      <Card style={styles.card}>
        <Text variant="heading" style={styles.title}>Регистрация</Text>
        <Input placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <Input placeholder="Имя" value={name} onChangeText={setName} />
        <View style={styles.passwordField}>
          <Input
            placeholder="Пароль"
            secureTextEntry={!isPasswordVisible}
            value={password}
            onChangeText={setPassword}
            style={styles.passwordInput}
          />
          <Pressable style={styles.passwordToggle} onPress={() => setIsPasswordVisible((prev) => !prev)} hitSlop={8}>
            <Text variant="caption" style={styles.passwordToggleText}>
              {isPasswordVisible ? "Скрыть" : "Показать"}
            </Text>
          </Pressable>
        </View>
        <View style={styles.passwordField}>
          <Input
            placeholder="Повторите пароль"
            secureTextEntry={!isConfirmPasswordVisible}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            style={styles.passwordInput}
          />
          <Pressable
            style={styles.passwordToggle}
            onPress={() => setIsConfirmPasswordVisible((prev) => !prev)}
            hitSlop={8}
          >
            <Text variant="caption" style={styles.passwordToggleText}>
              {isConfirmPasswordVisible ? "Скрыть" : "Показать"}
            </Text>
          </Pressable>
        </View>
        <Input placeholder="Язык интерфейса (uk/en)" autoCapitalize="none" value={language} onChangeText={setLanguage} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title={isSubmitting ? "Создаем..." : "Создать аккаунт"} onPress={() => void onSubmit()} disabled={isSubmitting} />
        <Button title="Назад ко входу" variant="outline" tone="secondary" onPress={() => router.replace("/login")} />
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: "100%",
    maxWidth: 380,
    gap: spacing.sm,
  },
  passwordField: {
    position: "relative",
  },
  passwordInput: {
    paddingRight: 92,
  },
  passwordToggle: {
    position: "absolute",
    right: spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  passwordToggleText: {
    color: colors.primary,
  },
  title: {
    textAlign: "center",
  },
  error: {
    color: colors.danger,
  },
});
