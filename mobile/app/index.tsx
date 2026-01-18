import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { getToken, removeToken } from "../src/storage/auth";
import { Button, ScreenContainer, Text } from "../src/shared/ui";

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
  return fetch(`${API_BASE_URL}/api/v2/user/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Cache-Control": "no-store",
      Pragma: "no-cache",
    },
  });
};

export default function IndexScreen() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [hasNetworkError, setHasNetworkError] = useState(false);
  const isMountedRef = useRef(true);

  const checkAuth = useCallback(async () => {
    console.log("START checkAuth *********** ")
    setIsChecking(true);
    setHasNetworkError(false);
    const updateIfMounted = (action: () => void) => {
      if (isMountedRef.current) {
        action();
      }
    };

    let token: string | null = null;

    try {
      token = await getToken();
      console.log("token: " + token)
    } catch {
      updateIfMounted(() => {
        router.replace("/login");
      });
      return;
    }

    if (!token) {
      updateIfMounted(() => {
        router.replace("/login");
        setIsChecking(false);
      });
      return;
    }

    const exp = getTokenExp(token);
    if (exp && exp * 1000 <= Date.now()) {
      try {
        await removeToken();
      } catch {
        // ignore remove failures; routing to login below
      }
      updateIfMounted(() => {
        router.replace("/login");
        setIsChecking(false);
      });
      return;
    }

    try {
      console.log("START fetchMe *********** ")
      const response = await fetchMe(token);
      console.log("response: " + response)
      console.log("response.status: " + response.status)
      console.log("response.body: " + response.body)
      if (response.status === 200) {
        updateIfMounted(() => {
          router.replace("/home");
        });
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
      updateIfMounted(() => {
        setHasNetworkError(true);
        setIsChecking(false);
      });
      return;
    }

    updateIfMounted(() => {
      router.replace("/login");
    });
  }, [router]);

  useEffect(() => {
    isMountedRef.current = true;
    checkAuth().finally(() => {
      if (isMountedRef.current) {
        setIsChecking(false);
      }
    });

    return () => {
      isMountedRef.current = false;
    };
  }, [checkAuth]);

  if (!isChecking) {
    if (hasNetworkError) {
      return (
        <ScreenContainer>
          <View style={styles.loader}>
            <Text>Нет соединения с сервером.</Text>
            <Button title="Повторить" onPress={checkAuth} />
          </View>
        </ScreenContainer>
      );
    }

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
