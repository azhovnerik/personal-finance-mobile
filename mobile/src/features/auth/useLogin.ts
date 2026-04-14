import { useCallback, useState } from "react";

import { login as loginRequest, persistAuthTokenFromResponse } from "./api";
import type { ApiError } from "./api";
import type { AuthResponse } from "./types";

export const useLogin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string): Promise<AuthResponse | null> => {
    setIsLoading(true);
    setError(null);
    setErrorCode(null);
    try {
      const response = await loginRequest(email, password);
      await persistAuthTokenFromResponse(response);
      return response;
    } catch (rawError) {
      const apiError = rawError as ApiError;
      setError(apiError.message ?? "Не удалось войти. Попробуйте еще раз.");
      setErrorCode(apiError.code ?? null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    login,
    isLoading,
    error,
    errorCode,
  };
};
