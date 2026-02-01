import { ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";

import { Button, DateInput, Input, ScreenContainer, Select, Text, spacing } from "../../src/shared/ui";
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
import { useTransactions } from "../../src/features/transactions/useTransactions";

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

export default function EditTransactionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ transaction?: string }>();

  const [initialTransaction, setInitialTransaction] = useState<TransactionDto | null>(null);
  const [formState, setFormState] = useState<TransactionFormState>({
    date: null,
    categoryId: null,
    accountId: null,
    amount: "",
    comment: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const { accounts } = useAccounts();
  const { categories } = useCategories();
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
        date: parsed.date ?? null,
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

  const categoryOptions = useMemo(
    () => flatCategories.map((category) => ({ value: category.id, label: category.name })),
    [flatCategories],
  );

  const selectedCategory = useMemo(
    () => flatCategories.find((category) => category.id === formState.categoryId) ?? null,
    [flatCategories, formState.categoryId],
  );

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

    const nextTransaction: TransactionDto = {
      ...initialTransaction,
      date: formState.date ?? initialTransaction.date,
      account: nextAccount,
      category: nextCategory,
      amount: parsedAmount,
      comment: formState.comment || null,
      direction: directionForCategoryType(nextCategoryType),
      type: transactionTypeForCategoryType(nextCategoryType),
    };

    setIsSaving(true);
    setLocalError(null);
    const success = await editTransaction(initialTransaction.id, nextTransaction);
    setIsSaving(false);

    if (success) {
      router.back();
    }
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text variant="title">Edit transaction</Text>
          <Button title="Back" variant="outline" tone="secondary" size="sm" onPress={() => router.back()} />
        </View>

        {localError ? <Text variant="caption">{localError}</Text> : null}
        {saveError ? <Text variant="caption">{saveError}</Text> : null}

        <View style={styles.formCard}>
          <DateInput
            placeholder="Date"
            value={formState.date}
            onChange={(value) => setFormState((prev) => ({ ...prev, date: value }))}
          />
          <Input
            placeholder="Amount"
            keyboardType="numeric"
            value={formState.amount}
            onChangeText={(value) => setFormState((prev) => ({ ...prev, amount: value }))}
          />
          <Select
            placeholder="Category"
            value={formState.categoryId}
            options={categoryOptions}
            onChange={(value) => setFormState((prev) => ({ ...prev, categoryId: value }))}
          />
          <Select
            placeholder="Account"
            value={formState.accountId}
            options={accountOptions}
            onChange={(value) => setFormState((prev) => ({ ...prev, accountId: value }))}
          />
          <Input
            placeholder="Comment"
            value={formState.comment}
            onChangeText={(value) => setFormState((prev) => ({ ...prev, comment: value }))}
          />
          <View style={styles.actions}>
            <Button title="Cancel" variant="ghost" size="sm" onPress={() => router.back()} />
            <Button title={isSaving ? "Saving..." : "Save"} size="sm" onPress={handleSave} />
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  formCard: {
    gap: spacing.sm,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
