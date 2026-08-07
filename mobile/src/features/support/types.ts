export type SupportRequestPayload = {
  email: string;
  subject: string;
  message: string;
};

export type SupportRequestResponse = {
  submitted: boolean;
  requestId: string;
};

type SupportApiErrorPayload = {
  code?: string;
  message?: string;
  details?: Record<string, unknown>;
};

export class SupportApiError extends Error {
  code: string;
  details: Record<string, unknown> | null;
  status: number;

  constructor(message: string, options?: { code?: string; details?: Record<string, unknown> | null; status?: number }) {
    super(message);
    this.name = "SupportApiError";
    this.code = options?.code ?? "UNKNOWN";
    this.details = options?.details ?? null;
    this.status = options?.status ?? 0;
  }
}

export const parseSupportApiError = async (response: Response) => {
  try {
    const payload = (await response.json()) as SupportApiErrorPayload;
    return new SupportApiError(payload.message ?? "Unable to send request.", {
      code: payload.code,
      details: payload.details ?? null,
      status: response.status,
    });
  } catch {
    return new SupportApiError("Unable to send request.", { status: response.status });
  }
};
