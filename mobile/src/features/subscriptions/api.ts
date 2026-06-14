import { API_BASE_URL } from "../../shared/lib/api/config";
import { getToken } from "../../storage/auth";
import type {
  AndroidValidateRequest,
  ApiErrorResponse,
  IosValidateRequest,
  RestoreRequest,
  RestoreResponse,
  SubscriptionPlatform,
  SubscriptionProductsResponse,
  SubscriptionStatusResponse,
  ValidateResponse,
} from "./types";
import { SubscriptionsApiError } from "./types";

const domainErrorCode = (details: Record<string, unknown> | null | undefined) => {
  const code = details?.code;
  return typeof code === "string" && code.trim() ? code : null;
};

const parseError = async (response: Response, fallbackMessage: string) => {
  try {
    const payload = (await response.json()) as ApiErrorResponse;
    const details = payload.details ?? null;
    return new SubscriptionsApiError(payload.message ?? fallbackMessage, {
      code: domainErrorCode(details) ?? payload.code ?? "UNKNOWN",
      details,
      status: response.status,
    });
  } catch {
    return new SubscriptionsApiError(fallbackMessage, {
      code: "UNKNOWN",
      status: response.status,
    });
  }
};

const requestSubscription = async <T>(
  path: string,
  options?: {
    method?: "GET" | "POST";
    body?: unknown;
  },
): Promise<T> => {
  const token = await getToken();
  if (!token) {
    throw new SubscriptionsApiError("Сессия истекла. Войдите снова.", {
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
      throw new SubscriptionsApiError("Сессия истекла. Войдите снова.", {
        code: "UNAUTHORIZED",
        status: 401,
      });
    }

    if (response.status === 403) {
      throw new SubscriptionsApiError("Доступ запрещен.", {
        code: "FORBIDDEN",
        status: 403,
      });
    }

    throw await parseError(response, `Ошибка запроса (HTTP ${response.status}).`);
  }

  return (await response.json()) as T;
};

export const getSubscriptionProducts = async (platform: SubscriptionPlatform) =>
  requestSubscription<SubscriptionProductsResponse>(
    `/api/v2/subscription/products?platform=${encodeURIComponent(platform)}`,
  );

export const getSubscriptionStatus = async () =>
  requestSubscription<SubscriptionStatusResponse>("/api/v2/subscription/status");

export const validateIosSubscription = async (payload: IosValidateRequest) =>
  requestSubscription<ValidateResponse>("/api/v2/subscription/ios/validate", {
    method: "POST",
    body: payload,
  });

export const validateAndroidSubscription = async (payload: AndroidValidateRequest) =>
  requestSubscription<ValidateResponse>("/api/v2/subscription/android/validate", {
    method: "POST",
    body: payload,
  });

export const restoreSubscriptions = async (payload: RestoreRequest) =>
  requestSubscription<RestoreResponse>("/api/v2/subscription/restore", {
    method: "POST",
    body: payload,
  });
