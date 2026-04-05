import {Keyboard, Pressable, RefreshControl, ScrollView, StyleSheet, View} from "react-native";
import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Button, Card, Input, ScreenContainer, Select, Text, colors, spacing } from "../../../src/shared/ui";
import {BudgetCategoryDetailedDto, CategoryReactDto, CategoryType, CurrencyCode} from "../../../src/shared/api/dto";
import { formatCurrency } from "../../../src/shared/utils/format";
import { useBudgetCategoryActions, useBudgetDetails } from "../../../src/features/budgets/useBudgets";
import { AmountKeypad } from "../../../src/features/transactions/components/AmountKeypad";
import {CategoryPickerModal} from "../../../src/features/transactions/create/CategoryPickerModal";
import {useCategories} from "../../../src/features/categories/useCategories";

const resolveAmount = (value?: number | null, fallback?: number | null) => value ?? fallback ?? 0;

const renderCategoryName = (item: BudgetCategoryDetailedDto) => {
  const name = item.category?.name ?? "Без названия";
  return name;
};

export default function AddBudgetCategoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ budgetId?: string; categoryId?: string; type?: string }>();
  const budgetId = typeof params.budgetId === "string" ? params.budgetId : undefined;
  const categoryId = typeof params.categoryId === "string" ? params.categoryId : undefined;
  const type = params.type === "INCOME" || params.type === "EXPENSES" ? (params.type as CategoryType) : undefined;

  const { budget, isLoading, isRefreshing, error, refresh } = useBudgetDetails(budgetId);
  const { addCategory, isAdding, error: mutationError } = useBudgetCategoryActions();

  const availableCategories = useMemo(() => {
    if (!budget || !type) {
      return [];
    }
    const list = type === "INCOME" ? budget.incomeCategories ?? [] : budget.expenseCategories ?? [];
    return list.filter((item) => Boolean(item.id));
  }, [budget, type]);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(categoryId);
  const [planAmountInput, setPlanAmountInput] = useState("0");
  const [commentInput, setCommentInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isAmountKeypadOpen, setIsAmountKeypadOpen] = useState(false);
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
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

  useEffect(() => {
    if (categoryId) {
      setSelectedCategoryId(categoryId);
      return;
    }
    setSelectedCategoryId((prev) => prev ?? availableCategories[0]?.id);
  }, [categoryId, availableCategories]);

  const factOnlyCategory = useMemo(() => {
    if (!budget || !selectedCategoryId || !type) {
      return null;
    }
    const list = type === "INCOME" ? budget.incomeBudgetCategories ?? [] : budget.expenseBudgetCategories ?? [];
    return list.find((item) => item.category?.id === selectedCategoryId && !item.id) ?? null;
  }, [budget, selectedCategoryId, type]);

  const selectedCategory = useMemo(() => {
    if (!selectedCategoryId) {
      return null;
    }
    return availableCategories.find((item) => item.id === selectedCategoryId) ?? null;
  }, [availableCategories, selectedCategoryId]);

  const categoryOptions = useMemo(() => {
    return availableCategories.map((item) => ({
      label: item.name,
      value: item.id!,
    }));
  }, [availableCategories]);

  useEffect(() => {
    if (!factOnlyCategory) {
      return;
    }
    const fact = resolveAmount(factOnlyCategory.factAmountInBase, factOnlyCategory.factAmount);
    setPlanAmountInput(fact > 0 ? String(fact) : "0");
    setCommentInput(factOnlyCategory.comment ?? "");
  }, [factOnlyCategory]);

  const baseCurrency = (budget?.baseCurrency ?? "UAH") as CurrencyCode;
  const categoryCurrency = (factOnlyCategory?.currency ?? baseCurrency) as CurrencyCode;
  const factAmount = resolveAmount(factOnlyCategory?.factAmountInBase, factOnlyCategory?.factAmount);

  const onSave = async () => {
    if (!budgetId || !type || !selectedCategoryId) {
      return;
    }

    const normalized = planAmountInput.replace(",", ".").trim();
    const parsedAmount = Number(normalized);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError("Введите корректную плановую сумму больше 0.");
      return;
    }

    const categoryPayload =
      factOnlyCategory ??
      ({
        id: undefined,
        budgetId,
        category: {
          id: selectedCategoryId,
          name: selectedCategory?.name ?? "Без названия",
          type,
          disabled: Boolean(selectedCategory?.disabled),
          description: selectedCategory?.description ?? null,
          icon: selectedCategory?.icon ?? null,
          parentId: selectedCategory?.parentId ?? null,
          userId: selectedCategory?.userId ?? null,
          categoryTemplateId: selectedCategory?.categoryTemplateId ?? null,
        },
        type,
        planAmount: 0,
        currency: baseCurrency,
      } as BudgetCategoryDetailedDto);

    setFormError(null);
    await addCategory({
      budgetId,
      category: categoryPayload,
      amount: parsedAmount,
      comment: commentInput.trim() || null,
    });

    router.back();
  };

  const updateAmount = (value: string) => {
    setPlanAmountInput(value);
  };
  const flattenCategories = (categories: CategoryReactDto[]) =>
      categories.flatMap((category) =>
          category.subcategories ? [category, ...category.subcategories] : [category],
      );

  const flatCategories = useMemo(() => flattenCategories(categories), [categories]);
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
    setSelectedCategoryId(categoryId);
    setIsCategoryPickerOpen(false);
  };

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void refresh()} />}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.backLink}>Назад</Text>
          </Pressable>
          <Text variant="heading">Добавить в бюджет</Text>
          <View style={styles.headerSpacer} />
        </View>

        {isLoading ? <Text variant="caption">Загрузка...</Text> : null}

        {error ? (
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Button title="Повторить" size="sm" onPress={() => void refresh()} />
          </Card>
        ) : null}

        {!isLoading && !error && (!budgetId || !type) ? (
          <Card>
            <Text variant="caption">Недостаточно данных для добавления категории.</Text>
          </Card>
        ) : null}

        {!isLoading && !error && budgetId && type && availableCategories.length === 0 ? (
          <Card>
            <Text variant="caption">Нет доступных категорий для добавления.</Text>
          </Card>
        ) : null}

        {budgetId && type && availableCategories.length > 0 ? (
          <>
            <Card style={styles.infoCard}>
              <Text variant="subtitle">
                {factOnlyCategory
                  ? renderCategoryName(factOnlyCategory)
                  : selectedCategory?.name ?? "Выберите категорию"}
              </Text>
              <View style={styles.row}>
                <Text>Тип</Text>
                <Text>{type === "INCOME" ? "Доход" : "Расход"}</Text>
              </View>
              {factOnlyCategory ? (
                <View style={styles.row}>
                  <Text>Факт</Text>
                  <Text>{formatCurrency(factAmount, categoryCurrency)}</Text>
                </View>
              ) : null}
            </Card>

            <Card style={styles.formCard}>
              <Text variant="subtitle">Новая плановая сумма</Text>

              <View style={styles.field}>
                <Text variant="caption">Категория</Text>
                {/*<Select*/}
                {/*  value={selectedCategoryId}*/}
                {/*  onChange={(value) => setSelectedCategoryId(value)}*/}
                {/*  options={categoryOptions}*/}
                {/*  placeholder="Выберите категорию"*/}
                {/*/>*/}
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
              </View>

              <View style={styles.field}>
                <Text variant="caption">План ({categoryCurrency})</Text>
                <Pressable onPress={() => setIsAmountKeypadOpen(true)}>
                  <Input
                    value={planAmountInput}
                    keyboardType="numeric"
                    placeholder="0"
                    onPressIn={() => setIsAmountKeypadOpen(true)}
                    showSoftInputOnFocus={false}
                    editable={false}
                  />
                </Pressable>
              </View>

              <View style={styles.field}>
                <Text variant="caption">Комментарий</Text>
                <Input
                  value={commentInput}
                  onChangeText={setCommentInput}
                  onFocus={() => setIsAmountKeypadOpen(false)}
                  placeholder="Комментарий"
                  multiline
                />
              </View>

              {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
              {mutationError ? <Text style={styles.errorText}>{mutationError}</Text> : null}

              <Button
                title={isAdding ? "Добавление..." : "Добавить в бюджет"}
                onPress={() => void onSave()}
                disabled={isAdding}
              />
            </Card>
          </>
        ) : null}
      </ScrollView>
      {isAmountKeypadOpen ? (
        <AmountKeypad value={planAmountInput} onChange={updateAmount} onDone={() => setIsAmountKeypadOpen(false)} />
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backLink: {
    color: colors.primary,
    fontWeight: "600",
  },
  headerSpacer: {
    width: 40,
  },
  errorCard: {
    gap: spacing.sm,
  },
  errorText: {
    color: colors.danger,
  },
  infoCard: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  formCard: {
    gap: spacing.sm,
  },
  field: {
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
});
