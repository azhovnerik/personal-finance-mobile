import { localizeSystemMessage, translate } from "../../../localization";
import { API_BASE_URL } from "../../../shared/lib/api/config";
import { getToken } from "../../../storage/auth";
import { SettingsApiError, type ApiErrorResponse } from "../types";
import type { AccountDeletionRequest } from "./types";

export const deleteAccount = async (payload: AccountDeletionRequest): Promise<void> => {
  const token = await getToken();
  if (!token) {
    throw new SettingsApiError(translate("Your session has expired. Sign in again."), {
      code: "UNAUTHORIZED",
      status: 401,
    });
  }

  const response = await fetch(`${API_BASE_URL}/api/v2/settings/account/delete`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (response.status === 204) {
    return;
  }

  let errorPayload: ApiErrorResponse | null = null;
  try {
    errorPayload = (await response.json()) as ApiErrorResponse;
  } catch {
    errorPayload = null;
  }
  throw new SettingsApiError(
    localizeSystemMessage(errorPayload?.message, "Unable to delete the account."),
    {
      code: errorPayload?.code ?? "UNKNOWN",
      details: errorPayload?.details ?? null,
      status: response.status,
    },
  );
};
