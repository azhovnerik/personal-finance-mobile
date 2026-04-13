import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";

import type { CurrencyCode } from "../../src/shared/api/dto";
import {
  ApiError,
  clearAuthSession,
  getOnboardingSession,
  submitOnboardingBaseCurrency,
  submitOnboardingFirstExpense,
} from "../../src/features/auth/api";
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
    errors.date = "Укажите дату.";
  }

  if (!expense.categoryId) {
    errors.categoryId = "Выберите категорию.";
  }

  if (!expense.accountId) {
    errors.accountId = "Выберите счет.";
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    errors.amount = "Укажите сумму больше нуля.";
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
    amount,
  };
};

export default function OnboardingScreen() {
  const router = useRouter();
  const [session, setSession] = useState<OnboardingSessionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [screenError, setScreenError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode | null>(null);
  const [expenseDraft, setExpenseDraft] = useState<ExpenseDraft | null>(null);
  const [expenseFieldErrors, setExpenseFieldErrors] = useState<ExpenseFieldErrors>({});
  const [isExpenseAmountKeypadOpen, setIsExpenseAmountKeypadOpen] = useState(false);

  const handleUnauthorized = useCallback(async () => {
    await clearAuthSession();
    router.replace("/login");
  }, [router]);

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
      setScreenError(apiError.message ?? "Не удалось загрузить onboarding.");
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
      setScreenError("Выберите язык интерфейса.");
      return;
    }
    if (!selectedCurrency) {
      setScreenError("Выберите базовую валюту.");
      return;
    }

    try {
      setIsSaving(true);
      setScreenError(null);
      const nextSession = await submitOnboardingBaseCurrency({
        language: selectedLanguage,
        baseCurrency: selectedCurrency,
      });
      setSession(nextSession);
    } catch (rawError) {
      const apiError = rawError as ApiError;
      if (apiError.status === 401) {
        await handleUnauthorized();
        return;
      }
      setScreenError(apiError.message ?? "Не удалось сохранить язык и валюту.");
    } finally {
      setIsSaving(false);
    }
  };

  const submitFirstExpense = async () => {
    if (!expenseDraft) {
      setScreenError("Не удалось подготовить форму расхода.");
      return;
    }

    const validation = validateExpenseDraft(expenseDraft);
    if (!validation.isValid) {
      setExpenseFieldErrors(validation.errors);
      setScreenError("Расход не отправлен: заполните обязательные поля.");
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
      setScreenError(apiError.message ?? "Не удалось сохранить первый расход.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text>Загружаем onboarding...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (!session) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <Text>{screenError ?? "Не удалось открыть onboarding."}</Text>
          <Button title="Повторить" onPress={() => void loadSession()} />
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
          <Text variant="title">Первичная настройка</Text>
          <Text variant="caption">
            {session.screen
              ? `Шаг ${stepIndex + 1} из 2: ${session.screen}`
              : "Все шаги заполнены"}
          </Text>
        </View>

        {screenError ? (
          <Card>
            <Text style={styles.errorText}>{screenError}</Text>
          </Card>
        ) : null}

        {session.screen === "BASE_CURRENCY" ? (
          <Card style={styles.card}>
            <Text variant="subtitle">Язык и базовая валюта</Text>
            <Text variant="caption">Выберите язык интерфейса и валюту для аналитики.</Text>
            <Select
              value={selectedLanguage}
              options={languageOptions}
              onChange={(value) => setSelectedLanguage(value)}
              placeholder="Язык интерфейса"
            />
            <Select
              value={selectedCurrency}
              options={currencyOptions}
              onChange={(value) => setSelectedCurrency(value as CurrencyCode)}
              placeholder="Выберите валюту"
            />
            <Button
              title={isSaving ? "Сохраняем..." : "Продолжить"}
              onPress={() => void submitBaseCurrency()}
              disabled={isSaving || !selectedLanguage || !selectedCurrency}
            />
          </Card>
        ) : null}

        {session.screen === "FIRST_EXPENSE" ? (
          <Card style={styles.card}>
            <Text variant="subtitle">Добавьте первый расход</Text>
            <Text variant="caption">Это займет меньше минуты.</Text>
            {expenseDraft ? (
              <View style={styles.block}>
                <Input
                  placeholder="Дата YYYY-MM-DD"
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
                  placeholder="Категория"
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
                  placeholder="Счет"
                />
                {expenseFieldErrors.accountId ? <Text style={styles.fieldErrorText}>{expenseFieldErrors.accountId}</Text> : null}
                <Pressable onPress={() => setIsExpenseAmountKeypadOpen(true)}>
                  <Input
                    placeholder="Сумма"
                    keyboardType="numeric"
                    value={expenseDraft.amount}
                    editable={false}
                    showSoftInputOnFocus={false}
                    onPressIn={() => setIsExpenseAmountKeypadOpen(true)}
                  />
                </Pressable>
                {expenseFieldErrors.amount ? <Text style={styles.fieldErrorText}>{expenseFieldErrors.amount}</Text> : null}
                <Input
                  placeholder="Комментарий"
                  value={expenseDraft.comment}
                  onChangeText={(value) => setExpenseDraft((prev) => (prev ? { ...prev, comment: value } : prev))}
                />
              </View>
            ) : null}
            <Button
              title={isSaving ? "Сохраняем..." : "Сохранить и продолжить"}
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
