import { Keyboard, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, DateInput, Input, ScreenContainer, Select, Text, colors, spacing } from "../../src/shared/ui";
import { useAccounts } from "../../src/features/accounts/useAccounts";
import { useCategories } from "../../src/features/categories/useCategories";
import {
  Category,
  CategoryReactDto,
  CategoryType,
  TransactionDirection,
  TransactionDto,
  TransactionType,
} from "../../src/shared/api/dto";
import { mockUser } from "../../src/shared/mocks";
import { useTransactions } from "../../src/features/transactions/useTransactions";
import { CategoryPickerModal } from "../../src/features/transactions/create/CategoryPickerModal";
import { AmountKeypad } from "../../src/features/transactions/components/AmountKeypad";

type TransactionFormState = {
  date: string | null;
  categoryId: string | null;
  accountId: string | null;
  amount: string;
  comment: string;
};

const flattenCategories = (categories: CategoryReactDto[]) =>
  categories.flatMap((category) =>
    category.subcategories ? [category, ...category.subcategories] : [category],
  );

const directionForCategoryType = (type: CategoryType): TransactionDirection =>
  type === "INCOME" ? "INCREASE" : "DECREASE";

const transactionTypeForCategoryType = (type: CategoryType): TransactionType =>
  type === "INCOME" ? "INCOME" : "EXPENSE";

const toCategory = (category: CategoryReactDto): Category => ({
  id: category.id,
  name: category.name,
  type: category.type,
  disabled: category.disabled,
});

const formatDateTime = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const normalizeDateOnly = (value: string) => {
  const directMatch = value.match(/^(\d{4}-\d{2}-\d{2})/);
  if (directMatch) {
    return directMatch[1];
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toBackendDateTime = (date: string) => {
  const [year, month, day] = normalizeDateOnly(date).split("-").map(Number);
  const now = new Date();
  const localDate = new Date(
    year,
    month - 1,
    day,
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
  );

  return formatDateTime(localDate);
};

const iconForCategory = (icon: string) => {
  switch (icon) {
    case "basket":
      return "🛒";
    case "food":
      return "🍽️";
    case "bag":
      return "🛍️";
    case "home":
      return "🏠";
    case "car":
      return "🚕";
    case "fuel":
      return "⛽";
    case "auto":
      return "🚗";
    case "party":
      return "🎉";
    case "tech":
      return "💻";
    case "finance":
      return "💸";
    case "shirt":
      return "👕";
    default:
      return "💰";
  }
};

export default function EditTransactionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ transaction?: string }>();

  const [initialTransaction, setInitialTransaction] = useState<TransactionDto | null>(null);
  const [formState, setFormState] = useState<TransactionFormState>({
    date: null,
    categoryId: null,
    accountId: null,
    amount: "",
    comment: "",
  });
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [isAmountKeypadOpen, setIsAmountKeypadOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const { accounts } = useAccounts();
  const { categories: expenseCategories, refresh: refreshExpenseCategories } = useCategories(
    { type: "EXPENSES" },
    { enabled: isCategoryPickerOpen },
  );
  const { categories: incomeCategories, refresh: refreshIncomeCategories } = useCategories(
    { type: "INCOME" },
    { enabled: isCategoryPickerOpen },
  );
  const categories = useMemo(
    () => [...expenseCategories, ...incomeCategories],
    [expenseCategories, incomeCategories],
  );
  const { editTransaction, error: saveError } = useTransactions();

  const flatCategories = useMemo(() => flattenCategories(categories), [categories]);

  useEffect(() => {
    if (!params.transaction) {
      setLocalError("Нет данных о транзакции.");
      return;
    }

    try {
      const decoded = decodeURIComponent(params.transaction);
      const parsed = JSON.parse(decoded) as TransactionDto;
      setInitialTransaction(parsed);
      setFormState({
        date: parsed.date ? normalizeDateOnly(parsed.date) : null,
        categoryId: parsed.category?.id ?? null,
        accountId: parsed.account?.id ?? null,
        amount: String(parsed.amount ?? ""),
        comment: parsed.comment ?? "",
      });
    } catch {
      setLocalError("Не удалось открыть транзакцию.");
    }
  }, [params.transaction]);

  const accountOptions = useMemo(
    () => accounts.map((account) => ({ value: account.id, label: account.name })),
    [accounts],
  );

  const selectedCategory = useMemo(
    () => flatCategories.find((category) => category.id === formState.categoryId) ?? null,
    [flatCategories, formState.categoryId],
  );

  const displayedCategory = selectedCategory ?? initialTransaction?.category ?? null;

  const categoryFrequency = useMemo(() => {
    const counts = new Map<string, number>();
    flatCategories.forEach((category) => {
      counts.set(category.name, (counts.get(category.name) ?? 0) + 1);
    });
    return counts;
  }, [flatCategories]);

  const topCategories = useMemo(() => {
    const sorted = [...flatCategories].sort((a, b) => {
      const countA = categoryFrequency.get(a.name) ?? 0;
      const countB = categoryFrequency.get(b.name) ?? 0;
      return countB - countA;
    });
    return sorted.slice(0, 5);
  }, [categoryFrequency, flatCategories]);

  const handleOpenCategoryPicker = () => {
    Keyboard.dismiss();
    setIsAmountKeypadOpen(false);
    setIsCategoryPickerOpen(true);
    void refreshExpenseCategories();
    void refreshIncomeCategories();
  };

  const handleCloseCategoryPicker = () => {
    setIsCategoryPickerOpen(false);
  };

  const handleCategorySelect = (categoryId: string) => {
    setFormState((prev) => ({ ...prev, categoryId }));
  };

  const handleAmountPress = () => {
    Keyboard.dismiss();
    setIsAmountKeypadOpen(true);
  };

  const updateAmount = (value: string) => {
    setFormState((prev) => ({ ...prev, amount: value }));
  };

  const handleSave = async () => {
    if (!initialTransaction || !initialTransaction.id) {
      setLocalError("Не удалось сохранить транзакцию.");
      return;
    }

    const parsedAmount = Number.parseFloat(formState.amount.replace(",", "."));
    if (Number.isNaN(parsedAmount)) {
      setLocalError("Введите корректную сумму.");
      return;
    }

    const nextAccount =
      accounts.find((account) => account.id === formState.accountId) ?? initialTransaction.account;
    const nextCategory = selectedCategory ? toCategory(selectedCategory) : initialTransaction.category;

    const nextCategoryType = selectedCategory?.type ?? initialTransaction.category?.type ?? "EXPENSES";
    const selectedDate = formState.date ?? normalizeDateOnly(initialTransaction.date);
    const currency = nextAccount.currency ?? initialTransaction.currency ?? mockUser.baseCurrency ?? "UAH";

    const nextTransaction: TransactionDto = {
      ...initialTransaction,
      date: selectedDate,
      account: nextAccount,
      category: nextCategory,
      amount: parsedAmount,
      comment: formState.comment || null,
      direction: directionForCategoryType(nextCategoryType),
      type: transactionTypeForCategoryType(nextCategoryType),
      currency,
    };

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
    const comment = formState.comment.trim();
    const payload = {
      id: initialTransaction.id,
      date: toBackendDateTime(selectedDate),
      timezone,
      categoryId: formState.categoryId ?? initialTransaction.category?.id ?? null,
      accountId: formState.accountId ?? initialTransaction.account?.id ?? null,
      direction: nextTransaction.direction,
      type: nextTransaction.type,
      changeBalanceId: null,
      amount: parsedAmount,
      amountInBase: parsedAmount,
      currency,
      comment: comment.length > 0 ? comment : undefined,
      transfer: null,
    };

    setIsSaving(true);
    setIsAmountKeypadOpen(false);
    setLocalError(null);
    const success = await editTransaction(initialTransaction.id, payload, nextTransaction);
    setIsSaving(false);

    if (success) {
      router.back();
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.modalAction}>Отмена</Text>
          </Pressable>
          <Text variant="subtitle">Редактировать транзакцию</Text>
          <View style={styles.modalActionSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
        >
          <View style={styles.amountRow}>
            <View style={styles.currencyBadge}>
              <Text style={styles.currencyText}>{initialTransaction?.currency ?? mockUser.baseCurrency ?? "UAH"}</Text>
            </View>
            <View style={styles.amountInput}>
              <Text variant="caption">Сумма</Text>
              <Pressable onPress={handleAmountPress}>
                <Input
                  keyboardType="numeric"
                  value={formState.amount}
                  onPressIn={handleAmountPress}
                  showSoftInputOnFocus={false}
                  editable={false}
                />
              </Pressable>
            </View>
          </View>

          <Pressable style={styles.categoryField} onPress={handleOpenCategoryPicker}>
            <View style={[styles.categoryIcon, { backgroundColor: displayedCategory?.color ?? colors.border }]}>
              <Text style={styles.categoryIconText}>{iconForCategory(displayedCategory?.icon ?? "default")}</Text>
            </View>
            <View style={styles.categoryLabelWrapper}>
              <Text style={displayedCategory ? styles.categoryLabel : styles.categoryPlaceholder}>
                {displayedCategory?.name ?? "Выберите категорию"}
              </Text>
            </View>
            <Text style={styles.categoryChevron}>›</Text>
          </Pressable>

          <Input
            placeholder="Примечание"
            value={formState.comment}
            onFocus={() => setIsAmountKeypadOpen(false)}
            onChangeText={(value) => setFormState((prev) => ({ ...prev, comment: value }))}
          />

          <DateInput
            placeholder="Дата"
            value={formState.date}
            onChange={(value) => {
              setIsAmountKeypadOpen(false);
              setFormState((prev) => ({ ...prev, date: value }));
            }}
          />

          <Select
            placeholder="Счет"
            value={formState.accountId}
            options={accountOptions}
            onChange={(value) => {
              setIsAmountKeypadOpen(false);
              setFormState((prev) => ({ ...prev, accountId: value }));
            }}
          />
        </ScrollView>

        <View style={styles.footer}>
          {localError ? <Text style={styles.errorText}>{localError}</Text> : null}
          {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}
          <Button
            title={isSaving ? "Сохраняем..." : "Сохранить"}
            size="lg"
            disabled={isSaving}
            onPress={handleSave}
            style={isSaving ? styles.buttonDisabled : undefined}
          />
        </View>

        <CategoryPickerModal
          visible={isCategoryPickerOpen}
          categories={categories}
          flatCategories={flatCategories}
          topCategories={topCategories}
          defaultType="EXPENSES"
          iconForCategory={iconForCategory}
          onClose={handleCloseCategoryPicker}
          onSelect={handleCategorySelect}
        />

        {isAmountKeypadOpen ? (
          <AmountKeypad
            value={formState.amount}
            onChange={updateAmount}
            onDone={() => setIsAmountKeypadOpen(false)}
          />
        ) : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  modalAction: {
    color: colors.textSecondary,
    fontWeight: "600",
  },
  modalActionSpacer: {
    width: 60,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  currencyBadge: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
  },
  currencyText: {
    fontWeight: "600",
  },
  amountInput: {
    flex: 1,
    gap: spacing.xs,
  },
  categoryField: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryIconText: {
    fontSize: 16,
  },
  categoryLabelWrapper: {
    flex: 1,
  },
  categoryLabel: {
    fontSize: 15,
    color: colors.textPrimary,
  },
  categoryPlaceholder: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  categoryChevron: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    gap: spacing.sm,
  },
  errorText: {
    color: colors.danger,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
