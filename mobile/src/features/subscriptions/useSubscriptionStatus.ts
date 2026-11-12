import { getAuthSessionVersion } from "../../storage/auth";
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
    queryKey: [...SUBSCRIPTION_STATUS_QUERY_KEY, getAuthSessionVersion()],
    queryFn: () => withSubscriptionAuth(getSubscriptionStatus),
    enabled,
    staleTime: 0,
    refetchInterval: 60_000,
    refetchOnMount: "always",
  });

  const { refetch } = query;

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (enabled && state === "active") {
        void refetch();
      }
    });

    return () => subscription.remove();
  }, [enabled, refetch]);

  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

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
