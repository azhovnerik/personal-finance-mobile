import type { AccountType, CategoryType, CurrencyCode } from "../../shared/api/dto";

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

export type OnboardingCategoryTemplate = {
  id?: string;
  templateId: string;
  name: string;
  type: CategoryType;
  icon?: string | null;
  selectedByDefault?: boolean;
};

export type OnboardingAccount = {
  id?: string;
  clientId?: string;
  name: string;
  type: AccountType;
  currency: CurrencyCode;
  initialBalance?: number | null;
};

export type OnboardingExpense = {
  id?: string;
  clientId?: string;
  date: string;
  categoryId: string;
  accountId: string;
  amount: number;
  currency: CurrencyCode;
  comment?: string | null;
};

export type OnboardingStateResponse = {
  completed: boolean;
  currentStep: OnboardingStep | null;
  requiredSteps: OnboardingStep[];
  optionalSteps: string[];
  completedSteps: OnboardingStep[];
  user: {
    baseCurrency?: CurrencyCode | null;
    language?: string | null;
    telegramUsername?: string | null;
  };
  supportedCurrencies: CurrencyCode[];
  supportedLanguages: SupportedLanguage[];
  categoryTemplates: {
    income: OnboardingCategoryTemplate[];
    expenses: OnboardingCategoryTemplate[];
  };
  accounts: OnboardingAccount[];
  firstExpenses: OnboardingExpense[];
};

export type SaveOnboardingStepPayload =
  | { step: "BASE_CURRENCY"; baseCurrency: CurrencyCode }
  | { step: "LANGUAGE"; language: string }
  | { step: "CATEGORIES"; selectedCategoryTemplateIds: string[] }
  | { step: "ACCOUNTS"; accounts: OnboardingAccount[] }
  | { step: "FIRST_EXPENSES"; expenses: OnboardingExpense[] };

export type ApiErrorResponse = {
  code?: AuthErrorCode | string;
  message?: string;
  details?: Record<string, unknown>;
};

