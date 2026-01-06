import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { getToken, removeToken } from "../src/storage/auth";
import { ScreenContainer, Text } from "../src/shared/ui";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

const decodeBase64Url = (input: string): string => {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");

  if (typeof globalThis.atob !== "function") {
    return "";
  }

  return globalThis.atob(padded);
};

const getTokenExp = (token: string): number | null => {
  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(parts[1])) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
};

const fetchMe = async (token: string) => {
  return fetch(`${API_BASE_URL}/api/v1/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

export default function IndexScreen() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      let token: string | null = null;

      try {
        token = await getToken();
      } catch {
        if (isMounted) {
          router.replace("/login");
        }
        return;
      }

      if (!token) {
        if (isMounted) {
          router.replace("/login");
          setIsChecking(false);
        }
        return;
      }

      const exp = getTokenExp(token);
      if (exp && exp * 1000 <= Date.now()) {
        try {
          await removeToken();
        } catch {
          // ignore remove failures; routing to login below
        }
        if (isMounted) {
          router.replace("/login");
          setIsChecking(false);
        }
        return;
      }

      try {
        const response = await fetchMe(token);
        if (response.status === 200) {
          if (isMounted) {
            router.replace("/home");
          }
          return;
        }
        if (response.status === 401 || response.status === 403) {
          try {
            await removeToken();
          } catch {
            // ignore remove failures; routing to login below
          }
        }
      } catch {
        // ignore network errors, handled below
      }

      if (isMounted) {
        router.replace("/login");
      }
    };

    checkAuth().finally(() => {
      if (isMounted) {
        setIsChecking(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (!isChecking) {
    return null;
  }

  return (
    <ScreenContainer>
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#1f2937" />
        <Text>Проверяем авторизацию...</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loader: {
    gap: 16,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
});
