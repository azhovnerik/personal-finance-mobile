import { translate } from "../../localization";
import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";

import { useUnauthorizedRedirect } from "../auth/useUnauthorizedRedirect";
import { getSettingsProfile } from "./api";
import { SettingsApiError } from "./types";

export const SETTINGS_PROFILE_QUERY_KEY = ["settings", "profile"] as const;

export const useSettingsProfile = () => {
  const handleUnauthorized = useUnauthorizedRedirect();

  const query = useQuery({
    queryKey: SETTINGS_PROFILE_QUERY_KEY,
    queryFn: async () => {
      try {
        return await getSettingsProfile();
      } catch (error) {
        if (
          error instanceof SettingsApiError &&
          (error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN")
        ) {
          await handleUnauthorized();
        }
        throw error;
      }
    },
    staleTime: 0,
    refetchOnMount: "always",
  });

  const refresh = useCallback(async () => {
    await query.refetch();
  }, [query]);

  return {
    profileResponse: query.data ?? null,
    isLoading: query.isLoading,
    isRefreshing: query.isFetching,
    error:
      query.error instanceof Error
        ? query.error.message
        : query.error
          ? translate("Unable to load settings.")
          : null,
    refresh,
  };
};
