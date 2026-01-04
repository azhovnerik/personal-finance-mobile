import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { useLogin } from "../src/features/auth/useLogin";
import { Button, ScreenContainer, Text } from "../src/shared/ui";

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading } = useLogin();

  const handleLogin = async () => {
    await login();
    router.replace("/home");
  };

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <Text variant="title">Войти</Text>
        <Text style={styles.subtitle}>
          Мок-логин сохраняет токен и переходит на главный экран.
        </Text>
        <Button
          title={isLoading ? "Входим..." : "Войти"}
          onPress={handleLogin}
          disabled={isLoading}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
  },
  subtitle: {
    color: "#4b5563",
  },
});
