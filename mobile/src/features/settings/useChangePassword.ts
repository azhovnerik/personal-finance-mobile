import { useMutation } from "@tanstack/react-query";

import { useUnauthorizedRedirect } from "../auth/useUnauthorizedRedirect";
import { changeSettingsPassword } from "./api";
import { SettingsApiError, type PasswordChangeRequest } from "./types";

export const useChangePassword = () => {
  const handleUnauthorized = useUnauthorizedRedirect();

  return useMutation({
    mutationFn: async (payload: PasswordChangeRequest) => {
      try {
        return await changeSettingsPassword(payload);
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
  });
};
