import { useCallback, useState } from "react";

import { setToken } from "../../storage/auth";

const MOCK_TOKEN =
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJtb2NrLXVzZXIiLCJleHAiOjQxMDI0NDQ4MDB9.";

export const useLogin = () => {
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async () => {
    setIsLoading(true);
    try {
      await setToken(MOCK_TOKEN);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    login,
    isLoading,
  };
};
