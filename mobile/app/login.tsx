import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { useLogin } from "../src/features/auth/useLogin";
import { Button, Input, ScreenContainer, Text } from "../src/shared/ui";

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
    <ScreenContainer>
      <View style={styles.content}>
        <Text variant="title">Войти</Text>
        <Input
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
          value={email}
          onChangeText={setEmail}
          editable={!isLoading}
        />
        <Input
          placeholder="Пароль"
          secureTextEntry
          textContentType="password"
          value={password}
          onChangeText={setPassword}
          editable={!isLoading}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          title={isLoading ? "Входим..." : "Войти"}
          onPress={handleLogin}
          disabled={isLoading || !email.trim() || !password}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
  },
  error: {
    color: "#dc2626",
  },
});
