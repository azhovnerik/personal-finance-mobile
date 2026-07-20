import { useCallback, useEffect } from "react";
import { AppState } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { getSubscriptionStatus } from "./api";
import { useSubscriptionAuth } from "./useSubscriptionAuth";

export const SUBSCRIPTION_STATUS_QUERY_KEY = ["subscription", "status"] as const;

export const useSubscriptionStatus = () => {
  const { withSubscriptionAuth } = useSubscriptionAuth();

  const query = useQuery({
    queryKey: SUBSCRIPTION_STATUS_QUERY_KEY,
    queryFn: () => withSubscriptionAuth(getSubscriptionStatus),
    staleTime: 0,
    refetchOnMount: "always",
  });

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        query.refetch();
      }
    });

    return () => subscription.remove();
  }, [query]);

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
          ? "Не удалось загрузить статус подписки."
          : null,
    refresh,
  };
};
