import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useUnauthorizedRedirect } from "../auth/useUnauthorizedRedirect";
import { updateSettingsProfile } from "./api";
import { SETTINGS_PROFILE_QUERY_KEY } from "./useSettingsProfile";
import { SettingsApiError, type UpdateProfileRequest } from "./types";

export const useUpdateSettingsProfile = () => {
  const queryClient = useQueryClient();
  const handleUnauthorized = useUnauthorizedRedirect();

  return useMutation({
    mutationFn: async (payload: UpdateProfileRequest) => {
      try {
        return await updateSettingsProfile(payload);
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
    onSuccess: async (data) => {
      queryClient.setQueryData(SETTINGS_PROFILE_QUERY_KEY, (current: unknown) => {
        if (!current || typeof current !== "object") {
          return current;
        }

        const prev = current as {
          profile?: unknown;
          options?: unknown;
          capabilities?: unknown;
        };

        return {
          ...prev,
          profile: data.profile,
        };
      });
      await queryClient.invalidateQueries({ queryKey: SETTINGS_PROFILE_QUERY_KEY });
    },
  });
};
