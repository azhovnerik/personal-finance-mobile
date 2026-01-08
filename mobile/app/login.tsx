import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { useLogin } from "../src/features/auth/useLogin";
import { Button, ScreenContainer, Text } from "../src/shared/ui";

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading, error } = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    const isSuccess = await login(email.trim(), password);
    if (isSuccess) {
      router.replace("/home");
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <Text variant="title">Войти</Text>
        <TextInput
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
          value={email}
          onChangeText={setEmail}
          editable={!isLoading}
          style={styles.input}
        />
        <TextInput
          placeholder="Пароль"
          secureTextEntry
          textContentType="password"
          value={password}
          onChangeText={setPassword}
          editable={!isLoading}
          style={styles.input}
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
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#111827",
  },
  error: {
    color: "#dc2626",
  },
});
