import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { getToken } from "../src/storage/auth";
import { clearAuthSession } from "../src/features/auth/api";
import { Button, ScreenContainer, Text, colors } from "../src/shared/ui";
import { getCurrentUser } from "../src/features/auth/api";
import { resolveRouteFromUser } from "../src/features/auth/routing";

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

export default function IndexScreen() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [hasNetworkError, setHasNetworkError] = useState(false);
  const isMountedRef = useRef(true);

  const checkAuth = useCallback(async () => {
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
        await clearAuthSession();
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
      const me = await getCurrentUser(token);
      updateIfMounted(() => {
        router.replace(resolveRouteFromUser(me));
      });
      return;
    } catch (error) {
      const status = typeof error === "object" && error !== null && "status" in error
        ? Number((error as { status?: number }).status ?? 0)
        : 0;
      if (status === 401 || status === 403) {
        try {
          await clearAuthSession();
        } catch {
          // ignore remove failures; routing to login below
        }
        updateIfMounted(() => {
          router.replace("/login");
        });
        return;
      }
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
        <ActivityIndicator size="large" color={colors.primary} />
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
