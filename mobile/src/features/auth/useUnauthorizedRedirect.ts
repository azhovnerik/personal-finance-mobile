import { useCallback } from "react";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

import { claimUnauthorizedTransition } from "../../storage/auth";
import { clearAuthSession } from "./api";

export const useUnauthorizedRedirect = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useCallback(async () => {
    if (!claimUnauthorizedTransition()) {
      return;
    }

    void queryClient.cancelQueries();

    try {
      await clearAuthSession();
    } finally {
      router.replace("/login");
    }
  }, [queryClient, router]);
};
