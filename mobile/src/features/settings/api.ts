import { API_BASE_URL } from "../../shared/lib/api/config";
import { getToken } from "../../storage/auth";
import type {
  EmailResendResponse,
  LanguageUpdateResponse,
  PasswordChangeRequest,
  PasswordChangeResponse,
  SettingsProfileResponse,
  UpdateProfileRequest,
  UpdateProfileResponse,
  ApiErrorResponse,
} from "./types";
import { SettingsApiError } from "./types";

const parseError = async (response: Response, fallbackMessage: string) => {
  try {
    const payload = (await response.json()) as ApiErrorResponse;
    return new SettingsApiError(payload.message ?? fallbackMessage, {
      code: payload.code ?? "UNKNOWN",
      details: payload.details ?? null,
      status: response.status,
    });
  } catch {
    return new SettingsApiError(fallbackMessage, {
      code: "UNKNOWN",
      status: response.status,
    });
  }
};

const requestSettings = async <T>(
  path: string,
  options?: {
    method?: "GET" | "POST" | "PUT";
    body?: unknown;
  },
): Promise<T> => {
  const token = await getToken();
  if (!token) {
    throw new SettingsApiError("Сессия истекла. Войдите снова.", {
      code: "UNAUTHORIZED",
      status: 401,
    });
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options?.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new SettingsApiError("Сессия истекла. Войдите снова.", {
        code: "UNAUTHORIZED",
        status: 401,
      });
    }

    if (response.status === 403) {
      throw new SettingsApiError("Доступ запрещен.", {
        code: "FORBIDDEN",
        status: 403,
      });
    }

    throw await parseError(response, `Ошибка запроса (HTTP ${response.status}).`);
  }

  return (await response.json()) as T;
};

export const getSettingsProfile = async () =>
  requestSettings<SettingsProfileResponse>("/api/v2/settings/profile", {
    method: "GET",
  });

export const updateSettingsProfile = async (payload: UpdateProfileRequest) =>
  requestSettings<UpdateProfileResponse>("/api/v2/settings/profile", {
    method: "PUT",
    body: payload,
  });

export const resendPendingEmail = async () =>
  requestSettings<EmailResendResponse>("/api/v2/settings/email/resend", {
    method: "POST",
    body: {},
  });

export const changeSettingsPassword = async (payload: PasswordChangeRequest) =>
  requestSettings<PasswordChangeResponse>("/api/v2/settings/password/change", {
    method: "POST",
    body: payload,
  });

export const updateSettingsLanguage = async (language: string) =>
  requestSettings<LanguageUpdateResponse>("/api/v2/settings/language", {
    method: "PUT",
    body: { language },
  });
