import { useCallback } from "react";
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";

import { clearAuthSession } from "../auth/api";
import { changeSettingsPassword } from "./api";
import { SettingsApiError, type PasswordChangeRequest } from "./types";

export const useChangePassword = () => {
  const router = useRouter();

  const handleUnauthorized = useCallback(async () => {
    await clearAuthSession();
    router.replace("/login");
  }, [router]);

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
