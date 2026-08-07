import { localizeSystemMessage, translate } from "../../src/localization";
import { useLocalization } from "../../src/localization/LocalizationProvider";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";

import type { CurrencyCode } from "../../src/shared/api/dto";
import {
  ApiError,
  getOnboardingSession,
  submitOnboardingBaseCurrency,
  submitOnboardingFirstExpense,
} from "../../src/features/auth/api";
import { useUnauthorizedRedirect } from "../../src/features/auth/useUnauthorizedRedirect";
import type {
  OnboardingBaseCurrencyPayload,
  OnboardingFirstExpensePayload,
  OnboardingSessionResponse,
} from "../../src/features/auth/types";
import { CategoryPickerField } from "../../src/features/categories/components/CategoryPickerField";
import { AmountKeypad } from "../../src/features/transactions/components/AmountKeypad";
import { Button, Card, Input, ScreenContainer, Select, Text, colors, spacing } from "../../src/shared/ui";

type ExpenseDraft = {
  date: string;
  categoryId: string;
  accountId: string;
  amount: string;
  comment: string;
};

type ExpenseFieldErrors = {
  date?: string;
  categoryId?: string;
  accountId?: string;
  amount?: string;
};

const detectDeviceLocale = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale ?? null;
  } catch {
    return null;
  }
};

const isBaseCurrencyPayload = (payload: unknown): payload is OnboardingBaseCurrencyPayload =>
  Boolean(
    payload
    && typeof payload === "object"
    && "supportedCurrencies" in payload
    && "supportedLanguages" in payload,
  );

const isFirstExpensePayload = (payload: unknown): payload is OnboardingFirstExpensePayload =>
  Boolean(
    payload
    && typeof payload === "object"
    && "defaultDate" in payload
    && "accountOptions" in payload
    && "categoryOptions" in payload,
  );

const buildDefaultExpenseDraft = (payload: OnboardingFirstExpensePayload): ExpenseDraft => ({
  date: payload.defaultDate,
  categoryId: "",
  accountId: payload.accountOptions[0]?.id ?? "",
  amount: "",
  comment: "",
});

const validateExpenseDraft = (expense: ExpenseDraft): { errors: ExpenseFieldErrors; isValid: boolean; amount: number } => {
  const errors: ExpenseFieldErrors = {};
  const amount = Number.parseFloat(expense.amount.replace(",", "."));

  if (!expense.date.trim()) {
    errors.date = translate("Enter a date.");
  }

  if (!expense.categoryId) {
    errors.categoryId = translate("Select a category.");
  }

  if (!expense.accountId) {
    errors.accountId = translate("Select an account.");
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    errors.amount = translate("Enter an amount greater than zero.");
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
    amount,
  };
};

export default function OnboardingScreen() {
  const router = useRouter();
  const { setLocale } = useLocalization();
  const [session, setSession] = useState<OnboardingSessionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [screenError, setScreenError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode | null>(null);
  const [expenseDraft, setExpenseDraft] = useState<ExpenseDraft | null>(null);
  const [expenseFieldErrors, setExpenseFieldErrors] = useState<ExpenseFieldErrors>({});
  const [isExpenseAmountKeypadOpen, setIsExpenseAmountKeypadOpen] = useState(false);

  const handleUnauthorized = useUnauthorizedRedirect();

  const loadSession = useCallback(async () => {
    setIsLoading(true);
    setScreenError(null);
    try {
      const nextSession = await getOnboardingSession(detectDeviceLocale());
      setSession(nextSession);
    } catch (rawError) {
      const apiError = rawError as ApiError;
      if (apiError.status === 401) {
        await handleUnauthorized();
        return;
      }
      setScreenError(localizeSystemMessage(apiError.message, "Unable to load onboarding."));
    } finally {
      setIsLoading(false);
    }
  }, [handleUnauthorized]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (!session) {
      return;
    }

    if (session.completed || session.nextAction === "MAIN_APP") {
      router.replace("/(tabs)");
      return;
    }

    if (session.screen === "BASE_CURRENCY" && isBaseCurrencyPayload(session.payload)) {
      const payload = session.payload;
      setSelectedLanguage(payload.language || session.user.language || payload.supportedLanguages[0]?.code || "en");
      setSelectedCurrency(payload.baseCurrency || session.user.baseCurrency || payload.supportedCurrencies[0] || null);
      return;
    }

    if (session.screen === "FIRST_EXPENSE" && isFirstExpensePayload(session.payload)) {
      setExpenseDraft(buildDefaultExpenseDraft(session.payload));
      setExpenseFieldErrors({});
      setIsExpenseAmountKeypadOpen(false);
    }
  }, [router, session]);

  const basePayload = isBaseCurrencyPayload(session?.payload) ? session.payload : null;
  const expensePayload = isFirstExpensePayload(session?.payload) ? session.payload : null;

  const languageOptions = useMemo(
    () => (basePayload?.supportedLanguages ?? []).map((item) => ({ value: item.code, label: item.label })),
    [basePayload?.supportedLanguages],
  );
  const currencyOptions = useMemo(
    () => (basePayload?.supportedCurrencies ?? []).map((item) => ({ value: item, label: item })),
    [basePayload?.supportedCurrencies],
  );
  const accountOptions = useMemo(
    () => (expensePayload?.accountOptions ?? []).map((item) => ({ value: item.id, label: item.name })),
    [expensePayload?.accountOptions],
  );

  const submitBaseCurrency = async () => {
    if (!selectedLanguage) {
      setScreenError(translate("Select an interface language."));
      return;
    }
    if (!selectedCurrency) {
      setScreenError(translate("Select a base currency."));
      return;
    }

    try {
      setIsSaving(true);
      setScreenError(null);
      const nextSession = await submitOnboardingBaseCurrency({
        language: selectedLanguage,
        baseCurrency: selectedCurrency,
      });
      setLocale(nextSession.user.language ?? selectedLanguage);
      setSession(nextSession);
    } catch (rawError) {
      const apiError = rawError as ApiError;
      if (apiError.status === 401) {
        await handleUnauthorized();
        return;
      }
      setScreenError(localizeSystemMessage(apiError.message, "Unable to save the language and currency."));
    } finally {
      setIsSaving(false);
    }
  };

  const submitFirstExpense = async () => {
    if (!expenseDraft) {
      setScreenError(translate("Unable to prepare the expense form."));
      return;
    }

    const validation = validateExpenseDraft(expenseDraft);
    if (!validation.isValid) {
      setExpenseFieldErrors(validation.errors);
      setScreenError(translate("Expense not submitted: complete the required fields."));
      return;
    }

    try {
      setIsSaving(true);
      setScreenError(null);
      const nextSession = await submitOnboardingFirstExpense({
        date: expenseDraft.date.trim(),
        categoryId: expenseDraft.categoryId,
        accountId: expenseDraft.accountId,
        amount: validation.amount,
        comment: expenseDraft.comment.trim() || null,
      });
      setSession(nextSession);
    } catch (rawError) {
      const apiError = rawError as ApiError;
      if (apiError.status === 401) {
        await handleUnauthorized();
        return;
      }
      if (apiError.status === 408) {
        try {
          const reconciledSession = await getOnboardingSession(detectDeviceLocale());
          setSession(reconciledSession);

          if (reconciledSession.completed || reconciledSession.nextAction === "MAIN_APP" || reconciledSession.screen !== "FIRST_EXPENSE") {
            return;
          }
        } catch (reconciliationError) {
          const reconciliationApiError = reconciliationError as ApiError;
          if (reconciliationApiError.status === 401) {
            await handleUnauthorized();
            return;
          }
        }
      }
      setScreenError(localizeSystemMessage(apiError.message, "Unable to save the first expense."));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text>{translate("Loading onboarding...")}</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (!session) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <Text>{screenError ?? translate("Unable to open onboarding.")}</Text>
          <Button title={translate("Retry")} onPress={() => void loadSession()} />
        </View>
      </ScreenContainer>
    );
  }

  const stepIndex = session.screen === "BASE_CURRENCY" ? 0 : session.screen === "FIRST_EXPENSE" ? 1 : -1;
  const isAnyAmountKeypadOpen = isExpenseAmountKeypadOpen;

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={[styles.container, isAnyAmountKeypadOpen ? styles.containerWithKeypad : undefined]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text variant="title">{translate("Initial setup")}</Text>
          <Text variant="caption">
            {session.screen
              ? translate("Step {{current}} of 2: {{screen}}", {
                  current: stepIndex + 1,
                  screen: session.screen,
                })
              : translate("All steps completed")}
          </Text>
        </View>

        {screenError ? (
          <Card>
            <Text style={styles.errorText}>{screenError}</Text>
          </Card>
        ) : null}

        {session.screen === "BASE_CURRENCY" ? (
          <Card style={styles.card}>
            <Text variant="subtitle">{translate("Language and base currency")}</Text>
            <Text variant="caption">{translate("Select the interface language and analytics currency.")}</Text>
            <Select
              value={selectedLanguage}
              options={languageOptions}
              onChange={(value) => setSelectedLanguage(value)}
              placeholder={translate("Interface language")}
            />
            <Select
              value={selectedCurrency}
              options={currencyOptions}
              onChange={(value) => setSelectedCurrency(value as CurrencyCode)}
              placeholder={translate("Select a currency")}
            />
            <Button
              title={isSaving ? translate("Saving...") : translate("Continue")}
              onPress={() => void submitBaseCurrency()}
              disabled={isSaving || !selectedLanguage || !selectedCurrency}
            />
          </Card>
        ) : null}

        {session.screen === "FIRST_EXPENSE" ? (
          <Card style={styles.card}>
            <Text variant="subtitle">{translate("Add your first expense")}</Text>
            <Text variant="caption">{translate("This takes less than a minute.")}</Text>
            {expenseDraft ? (
              <View style={styles.block}>
                <Input
                  placeholder={translate("Date YYYY-MM-DD")}
                  value={expenseDraft.date}
                  onChangeText={(value) => {
                    setExpenseDraft((prev) => (prev ? { ...prev, date: value } : prev));
                    setExpenseFieldErrors((prev) => ({ ...prev, date: undefined }));
                  }}
                />
                {expenseFieldErrors.date ? <Text style={styles.fieldErrorText}>{expenseFieldErrors.date}</Text> : null}
                <CategoryPickerField
                  value={expenseDraft.categoryId}
                  defaultType="EXPENSES"
                  lockType
                  preferFlatList
                  placeholder={translate("Category")}
                  onChange={(value) => {
                    setExpenseDraft((prev) => (prev ? { ...prev, categoryId: value } : prev));
                    setExpenseFieldErrors((prev) => ({ ...prev, categoryId: undefined }));
                  }}
                />
                {expenseFieldErrors.categoryId ? <Text style={styles.fieldErrorText}>{expenseFieldErrors.categoryId}</Text> : null}
                <Select
                  value={expenseDraft.accountId}
                  options={accountOptions}
                  onChange={(value) => {
                    setExpenseDraft((prev) => (prev ? { ...prev, accountId: value } : prev));
                    setExpenseFieldErrors((prev) => ({ ...prev, accountId: undefined }));
                  }}
                  placeholder={translate("Account")}
                />
                {expenseFieldErrors.accountId ? <Text style={styles.fieldErrorText}>{expenseFieldErrors.accountId}</Text> : null}
                <Pressable onPress={() => setIsExpenseAmountKeypadOpen(true)}>
                  <Input
                    placeholder={translate("Amount")}
                    keyboardType="numeric"
                    value={expenseDraft.amount}
                    editable={false}
                    showSoftInputOnFocus={false}
                    onPressIn={() => setIsExpenseAmountKeypadOpen(true)}
                  />
                </Pressable>
                {expenseFieldErrors.amount ? <Text style={styles.fieldErrorText}>{expenseFieldErrors.amount}</Text> : null}
                <Input
                  placeholder={translate("Comment")}
                  value={expenseDraft.comment}
                  onChangeText={(value) => setExpenseDraft((prev) => (prev ? { ...prev, comment: value } : prev))}
                />
              </View>
            ) : null}
            <Button
              title={isSaving ? translate("Saving...") : translate("Save and continue")}
              onPress={() => void submitFirstExpense()}
              disabled={isSaving}
            />
          </Card>
        ) : null}
      </ScrollView>
      {isExpenseAmountKeypadOpen && expenseDraft ? (
        <AmountKeypad
          value={expenseDraft.amount}
          onChange={(value) => setExpenseDraft((prev) => (prev ? { ...prev, amount: value } : prev))}
          onDone={() => setIsExpenseAmountKeypadOpen(false)}
        />
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  containerWithKeypad: {
    paddingBottom: spacing.md,
  },
  header: {
    gap: spacing.xs,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
  },
  card: {
    gap: spacing.md,
  },
  block: {
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
  },
  errorText: {
    color: colors.danger,
  },
  fieldErrorText: {
    color: colors.danger,
    fontSize: 13,
  },
});
