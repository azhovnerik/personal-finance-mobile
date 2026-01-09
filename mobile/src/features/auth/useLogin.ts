import { useCallback, useState } from "react";

import client from "../../shared/lib/api/client";
import { setToken } from "../../storage/auth";

export const useLogin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: apiError } = await client.POST(
        "/api/v2/user/auth/login",
        {
          body: { email, password },
        }
      );

      if (apiError || !data) {
        const apiMessage =
          typeof apiError?.data?.message === "string"
            ? apiError.data.message
            : null;
        setError(apiMessage ?? "Не удалось войти. Проверьте данные.");
        return false;
      }

      await setToken(data.token);
      return true;
    } catch {
      setError("Не удалось войти. Попробуйте еще раз.");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    login,
    isLoading,
    error,
  };
};
