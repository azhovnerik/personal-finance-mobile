import { useCallback } from "react";
import { useRouter } from "expo-router";

import { clearAuthSession } from "../auth/api";
import { SubscriptionsApiError } from "./types";

export const useSubscriptionAuth = () => {
  const router = useRouter();

  const handleUnauthorized = useCallback(async () => {
    await clearAuthSession();
    router.replace("/login");
  }, [router]);

  const withSubscriptionAuth = useCallback(
    async <T,>(operation: () => Promise<T>) => {
      try {
        return await operation();
      } catch (error) {
        if (
          error instanceof SubscriptionsApiError &&
          (error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN")
        ) {
          await handleUnauthorized();
        }
        throw error;
      }
    },
    [handleUnauthorized],
  );

  return { withSubscriptionAuth };
};
