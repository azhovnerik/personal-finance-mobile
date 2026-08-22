import { localizeSystemMessage, translate } from "../../localization";
import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";

import { ApiError, createAppleLoginNonce, loginWithApple, persistAuthTokenFromResponse } from "./api";
import type { AuthResponse } from "./types";

type AppleAuthenticationError = {
  code?: string;
  message?: string;
};

export const useAppleLogin = () => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (Platform.OS !== "ios") {
      return () => {
        isMounted = false;
      };
    }

    AppleAuthentication.isAvailableAsync()
      .then((available) => {
        if (isMounted) {
          setIsAvailable(available);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsAvailable(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (): Promise<AuthResponse | null> => {
    if (Platform.OS !== "ios") {
      return null;
    }

    setIsLoading(true);
    setError(null);
    try {
      const { nonce } = await createAppleLoginNonce();
      const credential = await AppleAuthentication.signInAsync({
        nonce,
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken || !credential.authorizationCode) {
        throw new Error(translate("Apple did not return an identity token."));
      }

      const formattedName = credential.fullName
        ? AppleAuthentication.formatFullName(credential.fullName).trim()
        : "";
      const authResponse = await loginWithApple(
        credential.identityToken,
        nonce,
        formattedName || null,
        credential.authorizationCode,
      );
      await persistAuthTokenFromResponse(authResponse);
      return authResponse;
    } catch (rawError) {
      const appleError = rawError as AppleAuthenticationError;
      if (appleError.code === "ERR_REQUEST_CANCELED") {
        return null;
      }

      const apiError = rawError as ApiError;
      setError(localizeSystemMessage(apiError.message, "Unable to sign in with Apple. Try again."));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    login,
    isLoading,
    error,
    isAvailable,
  };
};
