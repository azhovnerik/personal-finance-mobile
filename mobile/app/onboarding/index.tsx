import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";

import type { AccountType, CategoryReactDto, CurrencyCode } from "../../src/shared/api/dto";
import { API_BASE_URL } from "../../src/shared/lib/api/config";
import { getOnboardingBaseCurrencySelected, getToken, setOnboardingBaseCurrencySelected } from "../../src/storage/auth";
import { CategoryPickerField } from "../../src/features/categories/components/CategoryPickerField";
import { AmountKeypad } from "../../src/features/transactions/components/AmountKeypad";
import { getCategoryChildren, isCategorySelectable } from "../../src/features/categories/categoryTree";
import {
  ApiError,
  clearAuthSession,
  completeOnboarding,
  getOnboardingState,
  saveOnboardingStep,
} from "../../src/features/auth/api";
import type {
  OnboardingAccount,
  OnboardingCategoryTemplate,
  OnboardingExpense,
  SaveOnboardingStepPayload,
  OnboardingStateResponse,
  OnboardingStep,
} from "../../src/features/auth/types";
import { Button, Card, Input, ScreenContainer, Select, Text, colors, spacing } from "../../src/shared/ui";
import {
  completeOnboardingWithRetry,
  delay,
  hasFirstExpensesActuallyCompleted,
  hasStepActuallyAdvanced,
  saveStepWithObservedProgress,
  waitForStepAdvance
} from "./orchestration";

type AccountDraft = {
  clientId: string;
  name: string;
  type: AccountType;
  currency: CurrencyCode;
  initialBalance: string;
};

type ExpenseDraft = {
  clientId: string;
  date: string;
  categoryId: string;
  accountId: string;
  amount: string;
  currency: CurrencyCode;
  comment: string;
};

type ExpenseFieldErrors = {
  date?: string;
  categoryId?: string;
  accountId?: string;
  amount?: string;
};

type ExpenseProgressStage = 1 | 2 | null;

const MINIMUM_ONBOARDING_EXPENSES = 3;

const todayDate = () => new Date().toISOString().slice(0, 10);

const nextClientId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createEmptyExpenseDraft = (fallbackCurrency: CurrencyCode, accountId?: string): ExpenseDraft => ({
  clientId: nextClientId("expense"),
  date: todayDate(),
  categoryId: "",
  accountId: accountId ?? "",
  amount: "",
  currency: fallbackCurrency,
  comment: "",
});

const flattenSelectableCategories = (categories: CategoryReactDto[]): CategoryReactDto[] => {
  const result: CategoryReactDto[] = [];

  const visit = (nodes: CategoryReactDto[]) => {
    nodes.forEach((node) => {
      if (isCategorySelectable(node)) {
        result.push(node);
      }
      visit(getCategoryChildren(node));
    });
  };

  visit(categories);
  return result;
};

const toAccountDraft = (account: OnboardingAccount, fallbackCurrency: CurrencyCode): AccountDraft => ({
  clientId: account.clientId ?? account.id ?? nextClientId("account"),
  name: account.name,
  type: account.type,
  currency: account.currency ?? fallbackCurrency,
  initialBalance: String(account.initialBalance ?? 0),
});

const toExpenseDraft = (expense: OnboardingExpense, fallbackCurrency: CurrencyCode): ExpenseDraft => ({
  clientId: expense.clientId ?? expense.id ?? nextClientId("expense"),
  date: expense.date,
  categoryId: expense.categoryId,
  accountId: expense.accountId,
  amount: String(expense.amount),
  currency: expense.currency ?? fallbackCurrency,
  comment: expense.comment ?? "",
});

const toExpensePayload = (expense: ExpenseDraft): OnboardingExpense => ({
  clientId: expense.clientId,
  date: expense.date.trim(),
  categoryId: expense.categoryId,
  accountId: expense.accountId,
  amount: Number.parseFloat(expense.amount.replace(",", ".")),
  currency: expense.currency,
  comment: expense.comment.trim() || null,
});



const getTemplateSelectionKey = (template: OnboardingCategoryTemplate) => template.id ?? template.templateId;

const validateExpenseDraft = (expense: ExpenseDraft) => {
  const errors: ExpenseFieldErrors = {};
  const parsedExpense = toExpensePayload(expense);

  if (!parsedExpense.date) {
    errors.date = "Укажите дату.";
  }

  if (!parsedExpense.categoryId) {
    errors.categoryId = "Выберите категорию.";
  }

  if (!parsedExpense.accountId) {
    errors.accountId = "Выберите счет.";
  }

  if (!Number.isFinite(parsedExpense.amount) || parsedExpense.amount <= 0) {
    errors.amount = "Укажите сумму больше нуля.";
  }

  return {
    parsedExpense,
    errors,
    isValid: Object.keys(errors).length === 0,
  };
};

const sortCategoryTemplates = (
  templates: OnboardingCategoryTemplate[],
  stage: "income" | "expenses",
): OnboardingCategoryTemplate[] =>
  [...templates].sort((left, right) => {
    if (stage === "income") {
      const leftPriority = left.templateId === "SALARY" ? 0 : 1;
      const rightPriority = right.templateId === "SALARY" ? 0 : 1;
      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }
    }

    return left.name.localeCompare(right.name, "uk");
  });

export default function OnboardingScreen() {
  const router = useRouter();
  const previousStepRef = useRef<OnboardingStep | null>(null);
  const hiddenStepTransitionRef = useRef(false);
  const [state, setState] = useState<OnboardingStateResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [screenError, setScreenError] = useState<string | null>(null);
  const [isBaseCurrencyGateLoading, setIsBaseCurrencyGateLoading] = useState(true);
  const [shouldForceBaseCurrencyStep, setShouldForceBaseCurrencyStep] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [selectedIncomeTemplateIds, setSelectedIncomeTemplateIds] = useState<string[]>([]);
  const [selectedExpenseTemplateIds, setSelectedExpenseTemplateIds] = useState<string[]>([]);
  const selectedIncomeTemplateIdsRef = useRef<string[]>([]);
  const selectedExpenseTemplateIdsRef = useRef<string[]>([]);
  const [categoryStage, setCategoryStage] = useState<"income" | "expenses">("income");
  const [accountDrafts, setAccountDrafts] = useState<AccountDraft[]>([]);
  const [completedExpenseDrafts, setCompletedExpenseDrafts] = useState<ExpenseDraft[]>([]);
  const [currentExpenseDraft, setCurrentExpenseDraft] = useState<ExpenseDraft | null>(null);
  const [expenseFieldErrors, setExpenseFieldErrors] = useState<ExpenseFieldErrors>({});
  const [expenseCategories, setExpenseCategories] = useState<CategoryReactDto[]>([]);
  const [isInitialBalanceKeypadOpen, setIsInitialBalanceKeypadOpen] = useState(false);
  const [isExpenseAmountKeypadOpen, setIsExpenseAmountKeypadOpen] = useState(false);

  const updateIncomeSelection = useCallback((nextSelection: string[]) => {
    selectedIncomeTemplateIdsRef.current = nextSelection;
    setSelectedIncomeTemplateIds(nextSelection);
  }, []);

  const updateExpenseSelection = useCallback((nextSelection: string[]) => {
    selectedExpenseTemplateIdsRef.current = nextSelection;
    setSelectedExpenseTemplateIds(nextSelection);
  }, []);

  const handleUnauthorized = useCallback(async () => {
    await clearAuthSession();
    router.replace("/login");
  }, [router]);

  const loadState = useCallback(async () => {
    setIsLoading(true);
    setScreenError(null);
    try {
      const nextState = await getOnboardingState();
      setState(nextState);
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

  const reconcileStateAfterFailedSave = useCallback(
    async (step: OnboardingStep) => {
      const refreshedState = await getOnboardingState();
      if (hasStepActuallyAdvanced(step, refreshedState)) {
        setState(refreshedState);
        return true;
      }

      return false;
    },
    [],
  );


  const autoAdvanceHiddenStep = useCallback(
    async (onboardingState: OnboardingStateResponse) => {
      const fallbackCurrency = (onboardingState.user.baseCurrency ?? onboardingState.supportedCurrencies[0] ?? "USD") as CurrencyCode;

      if (onboardingState.currentStep === "LANGUAGE") {
        const language = onboardingState.user.language ?? onboardingState.supportedLanguages[0]?.code ?? "en";
        return saveStepWithObservedProgress("LANGUAGE", { step: "LANGUAGE", language });
      }

      if (onboardingState.currentStep === "CATEGORIES") {
        const allTemplateIds = [
          ...(onboardingState.categoryTemplates.income ?? []),
          ...(onboardingState.categoryTemplates.expenses ?? []),
        ].map(getTemplateSelectionKey);

        return saveStepWithObservedProgress("CATEGORIES", {
          step: "CATEGORIES",
          selectedCategoryTemplateIds: allTemplateIds,
        });
      }

      if (onboardingState.currentStep === "ACCOUNTS") {
        const language = onboardingState.user.language ?? "ua";
        const defaultAccountName = language.startsWith("en") ? "Cash" : "Наличные";
        return saveStepWithObservedProgress("ACCOUNTS", {
          step: "ACCOUNTS",
          accounts: [
            {
              clientId: nextClientId("account"),
              name: defaultAccountName,
              type: "CASH",
              currency: fallbackCurrency,
              initialBalance: 0,
            },
          ],
        });
      }

      return onboardingState;
    },
    [saveStepWithObservedProgress],
  );

  useEffect(() => {
    void loadState();
  }, [loadState]);

  useEffect(() => {
    if (!state) {
      return;
    }

    const user = state.user ?? {};
    const supportedCurrencies = state.supportedCurrencies ?? [];
    const supportedLanguages = state.supportedLanguages ?? [];
    const fallbackCurrency = (user.baseCurrency ?? supportedCurrencies[0] ?? "USD") as CurrencyCode;

    setSelectedCurrency(state.currentStep === "BASE_CURRENCY" ? null : (user.baseCurrency ?? fallbackCurrency));
    setSelectedLanguage(user.language ?? supportedLanguages[0]?.code ?? "en");
    const previousStep = previousStepRef.current;
    previousStepRef.current = state.currentStep;

    if (state.currentStep === "CATEGORIES" && previousStep !== "CATEGORIES") {
      updateIncomeSelection([]);
      updateExpenseSelection([]);
      setCategoryStage("income");
    }

    const accounts = state.accounts ?? [];
    const firstExpenses = state.firstExpenses ?? [];

    setAccountDrafts(
      accounts.length > 0
        ? [toAccountDraft(accounts[0], fallbackCurrency)]
        : [
            {
              clientId: nextClientId("account"),
              name: "",
              type: "CARD",
              currency: fallbackCurrency,
              initialBalance: "0",
            },
          ],
    );

    setCompletedExpenseDrafts(firstExpenses.map((item) => toExpenseDraft(item, fallbackCurrency)));
    setCurrentExpenseDraft(createEmptyExpenseDraft(fallbackCurrency, accounts[0]?.id));
    setExpenseFieldErrors({});
    setIsInitialBalanceKeypadOpen(false);
    setIsExpenseAmountKeypadOpen(false);
  }, [state, updateExpenseSelection, updateIncomeSelection]);

  useEffect(() => {
    if (!state) {
      return;
    }

    void (async () => {
      const hasSelectedBaseCurrency = await getOnboardingBaseCurrencySelected();
      setShouldForceBaseCurrencyStep(!state.completed && !hasSelectedBaseCurrency);
      setIsBaseCurrencyGateLoading(false);
    })();
  }, [state]);

  useEffect(() => {
    if (!state || shouldForceBaseCurrencyStep || state.completed) {
      return;
    }

    if (
      state.currentStep !== "LANGUAGE" &&
      state.currentStep !== "CATEGORIES" &&
      state.currentStep !== "ACCOUNTS"
    ) {
      return;
    }

    if (hiddenStepTransitionRef.current) {
      return;
    }

    hiddenStepTransitionRef.current = true;

    void (async () => {
      try {
        setIsSaving(true);
        setScreenError(null);
        const nextState = await autoAdvanceHiddenStep(state);
        setState(nextState);
      } catch (rawError) {
        const apiError = rawError as ApiError;
        if (apiError.status === 401) {
          await handleUnauthorized();
          return;
        }
        if ((apiError.status === 408 || apiError.status === 0) && state.currentStep) {
          try {
            const reconciled = await reconcileStateAfterFailedSave(state.currentStep);
            if (reconciled) {
              setScreenError(null);
              return;
            }
          } catch (refreshError) {
            const refreshApiError = refreshError as ApiError;
            if (refreshApiError.status === 401) {
              await handleUnauthorized();
              return;
            }
          }
        }
        setScreenError(apiError.message ?? "Не удалось подготовить onboarding.");
      } finally {
        hiddenStepTransitionRef.current = false;
        setIsSaving(false);
      }
    })();
  }, [autoAdvanceHiddenStep, handleUnauthorized, reconcileStateAfterFailedSave, shouldForceBaseCurrencyStep, state]);

  useEffect(() => {
    if (!state || state.currentStep !== "FIRST_EXPENSES") {
      return;
    }

    void (async () => {
      try {
        const token = await getToken();
        if (!token) {
          await handleUnauthorized();
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/v2/categories/tree?type=EXPENSES`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 401) {
          await handleUnauthorized();
          return;
        }

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as CategoryReactDto[];
        setExpenseCategories(flattenSelectableCategories(payload));
      } catch {
        // keep onboarding usable even if category preload fails
      }
    })();
  }, [handleUnauthorized, state]);

  useEffect(() => {
    if (state?.completed) {
      router.replace("/(tabs)");
    }
  }, [router, state?.completed]);

  const isPreparingFirstExpense =
    !shouldForceBaseCurrencyStep &&
    !state?.completed &&
    state?.currentStep !== null &&
    state?.currentStep !== "BASE_CURRENCY" &&
    state?.currentStep !== "FIRST_EXPENSES";

  const currentStep = shouldForceBaseCurrencyStep
    ? "BASE_CURRENCY"
    : state?.completed
      ? null
      : "FIRST_EXPENSES";
  const stepIndex = currentStep === "BASE_CURRENCY" ? 0 : currentStep === "FIRST_EXPENSES" ? 1 : -1;
  const stateAccounts = state?.accounts ?? [];
  const stateIncomeTemplates = state?.categoryTemplates?.income ?? [];
  const stateExpenseTemplates = state?.categoryTemplates?.expenses ?? [];

  const currencyOptions = useMemo(
    () => (state?.supportedCurrencies ?? []).map((item) => ({ value: item, label: item })),
    [state?.supportedCurrencies],
  );

  const accountOptions = useMemo(
    () =>
      (stateAccounts.length
        ? stateAccounts.map((item) => ({
            value: item.id ?? item.clientId ?? "",
            label: item.name || "Без названия",
          }))
        : accountDrafts.map((item) => ({
            value: item.clientId,
            label: item.name || "Без названия",
          })))
        .filter((item) => Boolean(item.value)),
    [accountDrafts, stateAccounts],
  );

  const isAnyAmountKeypadOpen = isInitialBalanceKeypadOpen || isExpenseAmountKeypadOpen;

  const submitStep = async (step: OnboardingStep) => {
    if (!state) {
      return;
    }

    try {
      setIsSaving(true);
      setScreenError(null);

      if (step === "BASE_CURRENCY") {
        if (!selectedCurrency) {
          setScreenError("Выберите базовую валюту.");
          return;
        }
        const nextState = await saveStepWithObservedProgress(step, { step, baseCurrency: selectedCurrency });
        await setOnboardingBaseCurrencySelected();
        setShouldForceBaseCurrencyStep(false);
        setState(nextState);
        return;
      }

      if (!currentExpenseDraft) {
        setScreenError("Не удалось подготовить форму расхода.");
        return;
      }

      const validation = validateExpenseDraft(currentExpenseDraft);
      if (!validation.isValid) {
        setExpenseFieldErrors(validation.errors);
        setScreenError("Расход не отправлен: заполните обязательные поля.");
        if (__DEV__) {
          console.log("[onboarding] first_expenses:validation_failed", {
            draft: currentExpenseDraft,
            errors: validation.errors,
          });
        }
        return;
      }
      setExpenseFieldErrors({});

      const nextState = await saveStepWithObservedProgress("FIRST_EXPENSES", {
        step: "FIRST_EXPENSES",
        expenses: [validation.parsedExpense],
      });
      setState(nextState);
      const completion = await completeOnboardingWithRetry();
      if (completion.completed) {
        router.replace("/(tabs)");
        return;
      }

      if (Array.isArray(completion.accounts) || Array.isArray(completion.firstExpenses)) {
        setState((previous) => ({
          ...(previous ?? nextState),
          ...completion,
          accounts: Array.isArray(completion.accounts) ? completion.accounts : previous?.accounts ?? nextState.accounts,
          firstExpenses: Array.isArray(completion.firstExpenses)
            ? completion.firstExpenses
            : previous?.firstExpenses ?? nextState.firstExpenses,
          categoryTemplates: completion.categoryTemplates ?? previous?.categoryTemplates ?? nextState.categoryTemplates,
          requiredSteps: completion.requiredSteps ?? previous?.requiredSteps ?? nextState.requiredSteps,
          optionalSteps: completion.optionalSteps ?? previous?.optionalSteps ?? nextState.optionalSteps,
          completedSteps: completion.completedSteps ?? previous?.completedSteps ?? nextState.completedSteps,
          supportedCurrencies: completion.supportedCurrencies ?? previous?.supportedCurrencies ?? nextState.supportedCurrencies,
          supportedLanguages: completion.supportedLanguages ?? previous?.supportedLanguages ?? nextState.supportedLanguages,
          user: completion.user ?? previous?.user ?? nextState.user,
        }));
      }

      setScreenError("Backend пока не завершает onboarding после первого расхода. Сейчас он все еще возвращает незавершенный onboarding.");
      return;
    } catch (rawError) {
      const apiError = rawError as ApiError;
      if (apiError.status === 401) {
        await handleUnauthorized();
        return;
      }
      if (apiError.status === 408 || apiError.status === 0) {
        try {
          const reconciled = await reconcileStateAfterFailedSave(step);
          if (reconciled) {
            setScreenError(null);
            return;
          }
        } catch (refreshError) {
          const refreshApiError = refreshError as ApiError;
          if (refreshApiError.status === 401) {
            await handleUnauthorized();
            return;
          }
        }
      }
      setScreenError(apiError.message ?? "Не удалось сохранить шаг onboarding.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || isBaseCurrencyGateLoading) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text>Загружаем onboarding...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (!state) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <Text>{screenError ?? "Не удалось открыть onboarding."}</Text>
          <Button title="Повторить" onPress={() => void loadState()} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={[styles.container, isAnyAmountKeypadOpen ? styles.containerWithKeypad : undefined]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text variant="title">Первичная настройка</Text>
          <Text variant="caption">
            {currentStep
              ? `Шаг ${stepIndex + 1} из 2: ${currentStep}`
              : "Все шаги заполнены"}
          </Text>
        </View>

        {screenError ? (
          <Card>
            <Text style={styles.errorText}>{screenError}</Text>
          </Card>
        ) : null}

        {currentStep === "BASE_CURRENCY" ? (
          <Card style={styles.card}>
            <Text variant="subtitle">Базовая валюта</Text>
            <Text variant="caption">Эта валюта будет использоваться как основная для аналитики и бюджетов.</Text>
            <Button title={isSaving ? "Сохраняем..." : "Продолжить"} onPress={() => void submitStep("BASE_CURRENCY")} disabled={isSaving || !selectedCurrency} />
            <Select
              value={selectedCurrency}
              options={currencyOptions}
              onChange={(value) => setSelectedCurrency(value as CurrencyCode)}
              placeholder="Выберите валюту"
            />
          </Card>
        ) : null}

        {isPreparingFirstExpense ? (
          <Card style={styles.card}>
            <Text variant="subtitle">Подготавливаем стартовые данные</Text>
            <Text variant="caption">Создаем стартовые категории и дефолтный счет, чтобы можно было сразу добавить первый расход.</Text>
            <ActivityIndicator size="large" color={colors.primary} />
          </Card>
        ) : null}

        {currentStep === "FIRST_EXPENSES" ? (
          <Card style={styles.card}>
            <>
              <Text variant="subtitle">Добавьте первый расход</Text>
              <Text variant="caption">Это займет меньше минуты.</Text>
            {currentExpenseDraft ? (
              <View key={currentExpenseDraft.clientId} style={styles.block}>
                <Input
                  placeholder="Дата YYYY-MM-DD"
                  value={currentExpenseDraft.date}
                  onChangeText={(value) => {
                    setCurrentExpenseDraft((prev) => (prev ? { ...prev, date: value } : prev));
                    setExpenseFieldErrors((prev) => ({ ...prev, date: undefined }));
                  }}
                />
                {expenseFieldErrors.date ? <Text style={styles.fieldErrorText}>{expenseFieldErrors.date}</Text> : null}
                <CategoryPickerField
                  value={currentExpenseDraft.categoryId}
                  defaultType="EXPENSES"
                  placeholder="Категория"
                  categoriesOverride={expenseCategories.length > 0 ? expenseCategories : undefined}
                  lockType
                  preferFlatList
                  onChange={(value) => {
                    setCurrentExpenseDraft((prev) => (prev ? { ...prev, categoryId: value } : prev));
                    setExpenseFieldErrors((prev) => ({ ...prev, categoryId: undefined }));
                  }}
                />
                {expenseFieldErrors.categoryId ? <Text style={styles.fieldErrorText}>{expenseFieldErrors.categoryId}</Text> : null}
                <Select
                  value={currentExpenseDraft.accountId}
                  options={accountOptions}
                  onChange={(value) => {
                    setCurrentExpenseDraft((prev) => (prev ? { ...prev, accountId: value } : prev));
                    setExpenseFieldErrors((prev) => ({ ...prev, accountId: undefined }));
                  }}
                  placeholder="Счет"
                />
                {expenseFieldErrors.accountId ? <Text style={styles.fieldErrorText}>{expenseFieldErrors.accountId}</Text> : null}
                <Pressable onPress={() => setIsExpenseAmountKeypadOpen(true)}>
                  <Input
                    placeholder="Сумма"
                    keyboardType="numeric"
                    value={currentExpenseDraft.amount}
                    editable={false}
                    showSoftInputOnFocus={false}
                    onPressIn={() => setIsExpenseAmountKeypadOpen(true)}
                  />
                </Pressable>
                {expenseFieldErrors.amount ? <Text style={styles.fieldErrorText}>{expenseFieldErrors.amount}</Text> : null}
                <Input
                  placeholder="Комментарий"
                  value={currentExpenseDraft.comment}
                  onChangeText={(value) => setCurrentExpenseDraft((prev) => (prev ? { ...prev, comment: value } : prev))}
                />
              </View>
            ) : null}
              <Button title={isSaving ? "Сохраняем..." : "Сохранить и продолжить"} onPress={() => void submitStep("FIRST_EXPENSES")} disabled={isSaving} />
            </>
          </Card>
        ) : null}
      </ScrollView>
      {isExpenseAmountKeypadOpen && currentExpenseDraft ? (
        <AmountKeypad
          value={currentExpenseDraft.amount}
          onChange={(value) => setCurrentExpenseDraft((prev) => (prev ? { ...prev, amount: value } : prev))}
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
  selectionSummary: {
    gap: spacing.xs,
  },
  bulkActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  templateList: {
    gap: spacing.sm,
  },
  templateCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  templateCardSelected: {
    borderColor: colors.primary,
    backgroundColor: "#edf8f6",
  },
  templateIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  templateText: {
    flex: 1,
    minWidth: 0,
  },
  templateSelectedLabel: {
    color: colors.primary,
  },
  templateUnselectedLabel: {
    color: colors.textSecondary,
  },
});
