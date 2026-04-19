import type { CurrencyCode } from "../../shared/api/dto";

export type SettingsErrorCode =
  | "VALIDATION_ERROR"
  | "DOMAIN_RULE_VIOLATION"
  | "EMAIL_ALREADY_EXISTS"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "UNKNOWN";

export type SupportedLanguageDto = {
  code: string;
  label: string;
};

export type SettingsProfileDto = {
  email: string;
  name: string;
  telegramUsername: string | null;
  baseCurrency: CurrencyCode | null;
  language: string;
  emailVerified: boolean;
  pendingEmail: string | null;
  pendingEmailRequestedAt: string | null;
  hasPassword: boolean;
};

export type SettingsOptionsDto = {
  supportedLanguages: SupportedLanguageDto[];
  supportedCurrencies: CurrencyCode[];
};

export type SettingsCapabilitiesDto = {
  canChangeBaseCurrency: boolean;
  canRequestPasswordSetup: boolean;
};

export type SettingsProfileResponse = {
  profile: SettingsProfileDto;
  options: SettingsOptionsDto;
  capabilities: SettingsCapabilitiesDto;
};

export type UpdateProfileRequest = {
  name: string;
  email: string;
  telegramUsername?: string | null;
  baseCurrency?: CurrencyCode | null;
  language: string;
};

export type UpdateProfileResponse = {
  profile: SettingsProfileDto;
  emailChangeStarted: boolean;
  message?: string | null;
};

export type EmailResendResponse = {
  sent: boolean;
  pendingEmail: string;
  cooldownSeconds: number;
};

export type PasswordChangeRequest = {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
};

export type PasswordChangeResponse = {
  passwordChanged: boolean;
  reauthRequired: boolean;
};

export type LanguageUpdateResponse = {
  language: string;
};

export type ApiErrorResponse = {
  code?: string;
  message?: string;
  details?: Record<string, unknown>;
};

export class SettingsApiError extends Error {
  code: SettingsErrorCode | string;
  details: Record<string, unknown> | null;
  status: number;

  constructor(message: string, options?: { code?: string | null; details?: Record<string, unknown> | null; status?: number }) {
    super(message);
    this.name = "SettingsApiError";
    this.code = options?.code ?? "UNKNOWN";
    this.details = options?.details ?? null;
    this.status = options?.status ?? 0;
  }
}
