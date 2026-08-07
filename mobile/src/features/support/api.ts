import { API_BASE_URL } from "../../shared/lib/api/config";
import { getToken } from "../../storage/auth";
import {
  parseSupportApiError,
  SupportApiError,
  type SupportRequestPayload,
  type SupportRequestResponse,
} from "./types";

export const submitSupportRequest = async (payload: SupportRequestPayload): Promise<SupportRequestResponse> => {
  const token = await getToken();
  if (!token) {
    throw new SupportApiError("Your session has expired. Please sign in again.", {
      code: "UNAUTHORIZED",
      status: 401,
    });
  }

  const response = await fetch(`${API_BASE_URL}/api/v2/support`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await parseSupportApiError(response);
  }

  return (await response.json()) as SupportRequestResponse;
};
