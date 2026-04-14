import type { AccountType, CurrencyCode } from "../../shared/api/dto";

export type AuthErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_CREDENTIALS"
  | "EMAIL_NOT_VERIFIED"
  | "ACCOUNT_LOCKED"
  | "TOKEN_EXPIRED"
  | "TOKEN_INVALID"
  | "EMAIL_ALREADY_EXISTS"
  | "PASSWORD_WEAK"
  | "ONBOARDING_STEP_INVALID"
  | "ONBOARDING_REQUIRED"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "DOMAIN_RULE_VIOLATION";

export type AuthNextAction = "MAIN_APP" | "VERIFY_EMAIL" | "SET_BASE_CURRENCY" | "ONBOARDING";

export type OnboardingStep =
  | "BASE_CURRENCY"
  | "FIRST_EXPENSE"
  // legacy values kept for compatibility with old auth payloads
  | "LANGUAGE"
  | "CATEGORIES"
  | "ACCOUNTS"
  | "FIRST_EXPENSES";

export type UserResponse = {
  id: string;
  email: string;
  name: string;
  emailVerified?: boolean;
  baseCurrency?: CurrencyCode | null;
  language?: string | null;
  onboardingCompleted?: boolean;
  onboardingStep?: OnboardingStep | null;
  telegramUsername?: string | null;
};

export type AuthResponse = {
  token: string;
  user: UserResponse;
  nextAction?: AuthNextAction | null;
};

export type RegisterResponse = {
  email: string;
  verificationRequired: boolean;
  message?: string;
};

export type VerifyEmailResponse = {
  verified: boolean;
  token?: string | null;
  user?: UserResponse | null;
  nextAction?: AuthNextAction | null;
};

export type EmailActionResponse = {
  sent: boolean;
  cooldownSeconds?: number | null;
};

export type PasswordResetResponse = {
  passwordReset: boolean;
};

export type SupportedLanguage = {
  code: string;
  label: string;
};

export type OnboardingScreen = "BASE_CURRENCY" | "FIRST_EXPENSE" | null;

export type OnboardingFirstExpenseAccountOption = {
  id: string;
  name: string;
  type: AccountType;
  currency: CurrencyCode;
};

export type OnboardingFirstExpenseCategoryOption = {
  id: string;
  name: string;
};

export type OnboardingBaseCurrencyPayload = {
  supportedCurrencies: CurrencyCode[];
  supportedLanguages: SupportedLanguage[];
  language: string;
  baseCurrency: CurrencyCode;
};

export type OnboardingFirstExpensePayload = {
  defaultDate: string;
  accountOptions: OnboardingFirstExpenseAccountOption[];
  categoryOptions: OnboardingFirstExpenseCategoryOption[];
};

export type OnboardingPayload = OnboardingBaseCurrencyPayload | OnboardingFirstExpensePayload;

export type OnboardingSessionResponse = {
  completed: boolean;
  screen: OnboardingScreen;
  nextAction?: "MAIN_APP" | null;
  user: {
    baseCurrency: CurrencyCode | null;
    language: string | null;
  };
  payload: OnboardingPayload | null;
};

export type SubmitOnboardingBaseCurrencyPayload = {
  language: string;
  baseCurrency: CurrencyCode;
};

export type SubmitOnboardingFirstExpensePayload = {
  date: string;
  categoryId: string;
  accountId: string;
  amount: number;
  comment?: string | null;
};

export type ApiErrorResponse = {
  code?: AuthErrorCode | string;
  message?: string;
  details?: Record<string, unknown>;
};
