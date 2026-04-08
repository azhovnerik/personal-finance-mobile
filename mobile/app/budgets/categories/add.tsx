import { Keyboard, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Button, Card, Input, ScreenContainer, Text, colors, spacing } from "../../../src/shared/ui";
import { BudgetCategoryDetailedDto, CategoryType, CurrencyCode } from "../../../src/shared/api/dto";
import { formatCurrency } from "../../../src/shared/utils/format";
import { useBudgetCategoryActions, useBudgetDetails } from "../../../src/features/budgets/useBudgets";
import { AmountKeypad } from "../../../src/features/transactions/components/AmountKeypad";
import { CategoryPickerField } from "../../../src/features/categories/components/CategoryPickerField";
import { CategoryIcon } from "../../../src/features/categories/components/CategoryIcon";
import { isCategorySelectable } from "../../../src/features/categories/categoryTree";

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
    return list.filter((item) => Boolean(item.id) && isCategorySelectable(item));
  }, [budget, type]);

  const allowedCategoryIds = useMemo(
    () => availableCategories.map((item) => item.id).filter(Boolean) as string[],
    [availableCategories],
  );

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(categoryId);
  const [planAmountInput, setPlanAmountInput] = useState("0");
  const [commentInput, setCommentInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isAmountKeypadOpen, setIsAmountKeypadOpen] = useState(false);

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

    if (!selectedCategory) {
      setFormError("Выберите подкатегорию. Родительскую категорию добавить нельзя.");
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
              <View style={styles.categoryHeaderRow}>
                <View style={styles.categoryIcon}>
                  <CategoryIcon name={factOnlyCategory?.category?.icon ?? selectedCategory?.icon} size={36} />
                </View>
                <Text numberOfLines={1} variant="subtitle" style={styles.categoryTitle}>
                  {factOnlyCategory
                    ? renderCategoryName(factOnlyCategory)
                    : selectedCategory?.name ?? "Выберите категорию"}
                </Text>
              </View>
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

              <CategoryPickerField
                value={selectedCategoryId}
                onChange={setSelectedCategoryId}
                onOpen={() => {
                  Keyboard.dismiss();
                  setIsAmountKeypadOpen(false);
                }}
                defaultType={type}
                lockType
                allowedCategoryIds={allowedCategoryIds}
                displayCategory={
                  selectedCategory
                    ? {
                        name: selectedCategory.name,
                        icon: selectedCategory.icon ?? null,
                        color: null,
                      }
                    : null
                }
                placeholder="Выберите категорию"
              />

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
  categoryHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  categoryTitle: {
    flex: 1,
    minWidth: 0,
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
});
