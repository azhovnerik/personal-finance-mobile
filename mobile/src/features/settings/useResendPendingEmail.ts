import { useCallback } from "react";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { clearAuthSession } from "../auth/api";
import { resendPendingEmail } from "./api";
import { SETTINGS_PROFILE_QUERY_KEY } from "./useSettingsProfile";
import { SettingsApiError } from "./types";

export const useResendPendingEmail = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleUnauthorized = useCallback(async () => {
    await clearAuthSession();
    router.replace("/login");
  }, [router]);

  return useMutation({
    mutationFn: async () => {
      try {
        return await resendPendingEmail();
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SETTINGS_PROFILE_QUERY_KEY });
    },
  });
};
