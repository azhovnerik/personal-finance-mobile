import { useMutation } from "@tanstack/react-query";

import { useUnauthorizedRedirect } from "../auth/useUnauthorizedRedirect";
import { submitSupportRequest } from "./api";
import { SupportApiError, type SupportRequestPayload } from "./types";

export const useSubmitSupportRequest = () => {
  const handleUnauthorized = useUnauthorizedRedirect();

  return useMutation({
    mutationFn: async (payload: SupportRequestPayload) => {
      try {
        return await submitSupportRequest(payload);
      } catch (error) {
        if (error instanceof SupportApiError && error.status === 401) {
          await handleUnauthorized();
        }
        throw error;
      }
    },
  });
};
