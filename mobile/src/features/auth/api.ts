import { API_BASE_URL } from "../../shared/lib/api/config";
import { getToken, removeOnboardingBaseCurrencySelected, removeToken, setToken } from "../../storage/auth";
import type {
  ApiErrorResponse,
  AuthResponse,
  EmailActionResponse,
  OnboardingStateResponse,
  PasswordResetResponse,
  RegisterResponse,
  SaveOnboardingStepPayload,
  UserResponse,
  VerifyEmailResponse,
} from "./types";

export class ApiError extends Error {
  code: string | null;
  details: Record<string, unknown> | null;
  status: number;

  constructor(message: string, options?: { code?: string | null; details?: Record<string, unknown> | null; status?: number }) {
    super(message);
    this.name = "ApiError";
    this.code = options?.code ?? null;
    this.details = options?.details ?? null;
    this.status = options?.status ?? 0;
  }
}

const isDevLoggingEnabled = __DEV__;

const parseErrorResponse = async (response: Response, fallback: string) => {
  try {
    const body = (await response.json()) as ApiErrorResponse;
    return new ApiError(body.message ?? fallback, {
      code: typeof body.code === "string" ? body.code : null,
      details: body.details ?? null,
      status: response.status,
    });
  } catch {
    return new ApiError(fallback, { status: response.status });
  }
};

const requestJson = async <T>(
  path: string,
  options?: {
    method?: "GET" | "POST" | "PUT" | "PATCH";
    body?: unknown;
    token?: string | null;
    timeoutMs?: number;
  },
): Promise<T> => {
  const url = `${API_BASE_URL}${path}`;
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options?.timeoutMs ?? 15000);

  if (isDevLoggingEnabled && path.startsWith("/api/v2/onboarding")) {
    console.log("[auth-api] request:start", {
      method: options?.method ?? "GET",
      url,
      timeoutMs: options?.timeoutMs ?? 15000,
      body: options?.body ?? null,
    });
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: options?.method ?? "GET",
      headers: {
        ...(options?.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(options?.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeoutId);
    if (isDevLoggingEnabled && path.startsWith("/api/v2/onboarding")) {
      console.log("[auth-api] request:error", {
        method: options?.method ?? "GET",
        url,
        durationMs: Date.now() - startedAt,
        errorName: error instanceof Error ? error.name : "UnknownError",
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError("Сервер не ответил вовремя. Попробуйте еще раз.", { status: 408 });
    }
    throw error;
  }
  clearTimeout(timeoutId);

  if (!response.ok) {
    if (isDevLoggingEnabled && path.startsWith("/api/v2/onboarding")) {
      let errorBody: unknown = null;
      try {
        errorBody = await response.clone().json();
      } catch {
        errorBody = null;
      }
      console.log("[auth-api] request:response_error", {
        method: options?.method ?? "GET",
        url,
        durationMs: Date.now() - startedAt,
        status: response.status,
        body: errorBody,
      });
    }
    throw await parseErrorResponse(response, `Request failed (HTTP ${response.status}).`);
  }

  if (response.status === 204) {
    if (isDevLoggingEnabled && path.startsWith("/api/v2/onboarding")) {
      console.log("[auth-api] request:success", {
        method: options?.method ?? "GET",
        url,
        durationMs: Date.now() - startedAt,
        status: response.status,
        body: null,
      });
    }
    return undefined as T;
  }

  const parsed = (await response.json()) as T;

  if (isDevLoggingEnabled && path.startsWith("/api/v2/onboarding")) {
    console.log("[auth-api] request:success", {
      method: options?.method ?? "GET",
      url,
      durationMs: Date.now() - startedAt,
      status: response.status,
      body: parsed,
    });
  }

  return parsed;
};

export const login = async (email: string, password: string) =>
  requestJson<AuthResponse>("/api/v2/user/auth/login", {
    method: "POST",
    body: { email, password },
  });

export const register = async (payload: { email: string; name: string; password: string; language?: string }) =>
  requestJson<RegisterResponse>("/api/v2/user/auth/register", {
    method: "POST",
    body: payload,
  });

export const verifyEmail = async (token: string) =>
  requestJson<VerifyEmailResponse>("/api/v2/user/auth/verify-email", {
    method: "POST",
    body: { token },
  });

export const resendVerification = async (email: string) =>
  requestJson<EmailActionResponse>("/api/v2/user/auth/resend-verification", {
    method: "POST",
    body: { email },
  });

export const forgotPassword = async (email: string) =>
  requestJson<EmailActionResponse>("/api/v2/user/auth/password/forgot", {
    method: "POST",
    body: { email },
  });

export const resetPassword = async (token: string, newPassword: string) =>
  requestJson<PasswordResetResponse>("/api/v2/user/auth/password/reset", {
    method: "POST",
    body: { token, newPassword },
  });

export const getCurrentUser = async (token?: string | null) => {
  const authToken = token ?? (await getToken());
  if (!authToken) {
    throw new ApiError("Сессия истекла. Войдите снова.", { code: "UNAUTHORIZED", status: 401 });
  }
  return requestJson<UserResponse>("/api/v2/user/me", {
    method: "GET",
    token: authToken,
  });
};

export const getOnboardingState = async () => {
  const token = await getToken();
  if (!token) {
    throw new ApiError("Сессия истекла. Войдите снова.", { code: "UNAUTHORIZED", status: 401 });
  }
  return requestJson<OnboardingStateResponse>("/api/v2/onboarding/state", {
    method: "GET",
    token,
  });
};

export const saveOnboardingStep = async (payload: SaveOnboardingStepPayload) => {
  const token = await getToken();
  if (!token) {
    throw new ApiError("Сессия истекла. Войдите снова.", { code: "UNAUTHORIZED", status: 401 });
  }
  return requestJson<OnboardingStateResponse>("/api/v2/onboarding/state", {
    method: "PATCH",
    token,
    body: payload,
    timeoutMs: 60000,
  });
};

export const completeOnboarding = async () => {
  const token = await getToken();
  if (!token) {
    throw new ApiError("Сессия истекла. Войдите снова.", { code: "UNAUTHORIZED", status: 401 });
  }
  return requestJson<
    { completed: boolean; user?: UserResponse | null; nextAction?: string | null } & Partial<OnboardingStateResponse>
  >(
    "/api/v2/onboarding/complete",
    {
      method: "POST",
      token,
      body: {},
      timeoutMs: 60000,
    },
  );
};

export const updateLanguagePreference = async (language: string) => {
  const token = await getToken();
  if (!token) {
    throw new ApiError("Сессия истекла. Войдите снова.", { code: "UNAUTHORIZED", status: 401 });
  }
  return requestJson<{ language: string }>("/api/v2/settings/language", {
    method: "PUT",
    token,
    body: { language },
  });
};

export const persistAuthTokenFromResponse = async (response: { token?: string | null }) => {
  if (response.token) {
    await setToken(response.token);
  }
};

export const clearAuthSession = async () => {
  await removeToken();
  await removeOnboardingBaseCurrencySelected();
};
