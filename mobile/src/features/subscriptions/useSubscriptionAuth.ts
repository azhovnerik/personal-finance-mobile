import { useCallback } from "react";

import { useUnauthorizedRedirect } from "../auth/useUnauthorizedRedirect";
import { SubscriptionsApiError } from "./types";

export const useSubscriptionAuth = () => {
  const handleUnauthorized = useUnauthorizedRedirect();

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
