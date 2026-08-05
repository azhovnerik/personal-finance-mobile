import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useUnauthorizedRedirect } from "../auth/useUnauthorizedRedirect";
import { resendPendingEmail } from "./api";
import { SETTINGS_PROFILE_QUERY_KEY } from "./useSettingsProfile";
import { SettingsApiError } from "./types";

export const useResendPendingEmail = () => {
  const queryClient = useQueryClient();
  const handleUnauthorized = useUnauthorizedRedirect();

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
