import { translate } from "../../localization";
import { useCallback, useEffect } from "react";
import { AppState } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { getSubscriptionStatus } from "./api";
import { useSubscriptionAuth } from "./useSubscriptionAuth";

export const SUBSCRIPTION_STATUS_QUERY_KEY = ["subscription", "status"] as const;

export const useSubscriptionStatus = (enabled = true) => {
  const { withSubscriptionAuth } = useSubscriptionAuth();

  const query = useQuery({
    queryKey: SUBSCRIPTION_STATUS_QUERY_KEY,
    queryFn: () => withSubscriptionAuth(getSubscriptionStatus),
    enabled,
    staleTime: 0,
    refetchOnMount: "always",
  });

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (enabled && state === "active") {
        void query.refetch();
      }
    });

    return () => subscription.remove();
  }, [enabled, query]);

  const refresh = useCallback(async () => {
    await query.refetch();
  }, [query]);

  return {
    statusResponse: query.data ?? null,
    isLoadingStatus: query.isLoading,
    isRefreshingStatus: query.isFetching,
    error:
      query.error instanceof Error
        ? query.error.message
        : query.error
          ? translate("Unable to load subscription status.")
          : null,
    refresh,
  };
};
