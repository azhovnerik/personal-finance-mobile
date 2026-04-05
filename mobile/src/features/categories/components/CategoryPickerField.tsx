import { useEffect, useMemo, useState } from "react";
import { Keyboard, Pressable, StyleSheet, View } from "react-native";

import { Text, colors, spacing } from "../../../shared/ui";
import { CategoryReactDto, CategoryType } from "../../../shared/api/dto";
import { useCategories } from "../useCategories";
import { CategoryPickerModal } from "../../transactions/create/CategoryPickerModal";

export type CategoryPickerDisplayCategory = {
  name?: string | null;
  icon?: string | null;
  color?: string | null;
};

type CategoryPickerFieldProps = {
  value?: string | null;
  defaultType?: CategoryType;
  placeholder?: string;
  displayCategory?: CategoryPickerDisplayCategory | null;
  categoriesOverride?: CategoryReactDto[];
  allowedCategoryIds?: string[];
  excludedCategoryIds?: string[];
  excludedCategoryTemplateIds?: string[];
  excludedCategoryNames?: string[];
  lockType?: boolean;
  preferFlatList?: boolean;
  onChange: (categoryId: string) => void;
  onOpen?: () => void;
  onResolvedCategoryChange?: (category: CategoryReactDto | null) => void;
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

const flattenCategories = (categories: CategoryReactDto[]): CategoryReactDto[] =>
  categories.flatMap((category) => [category, ...flattenCategories(category.subcategories ?? [])]);

const isLeafCategory = (category: CategoryReactDto) => !category.subcategories || category.subcategories.length === 0;
const normalizeCategoryName = (value?: string | null) => (value ?? "").trim().toLowerCase();
const compareByName = (left: CategoryReactDto, right: CategoryReactDto) =>
  left.name.localeCompare(right.name, "uk");
const sortCategoriesRecursively = (categories: CategoryReactDto[]): CategoryReactDto[] =>
  [...categories]
    .sort(compareByName)
    .map((category) => ({
      ...category,
      subcategories: category.subcategories ? sortCategoriesRecursively(category.subcategories) : category.subcategories,
    }));

export function CategoryPickerField({
  value,
  defaultType = "EXPENSES",
  placeholder = "Выберите категорию",
  displayCategory,
  categoriesOverride,
  allowedCategoryIds,
  excludedCategoryIds,
  excludedCategoryTemplateIds,
  excludedCategoryNames,
  lockType = false,
  preferFlatList = false,
  onChange,
  onOpen,
  onResolvedCategoryChange,
}: CategoryPickerFieldProps) {
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const shouldUseRemoteCategories = !categoriesOverride || categoriesOverride.length === 0;

  const { categories: expenseCategories, refresh: refreshExpenseCategories } = useCategories(
    { type: "EXPENSES" },
    { enabled: isCategoryPickerOpen && shouldUseRemoteCategories },
  );
  const { categories: incomeCategories, refresh: refreshIncomeCategories } = useCategories(
    { type: "INCOME" },
    { enabled: isCategoryPickerOpen && shouldUseRemoteCategories },
  );

  const categories = useMemo(() => {
    if (categoriesOverride && categoriesOverride.length > 0) {
      return categoriesOverride;
    }
    return [...expenseCategories, ...incomeCategories];
  }, [categoriesOverride, expenseCategories, incomeCategories]);

  const allowedIdsSet = useMemo(
    () => new Set((allowedCategoryIds ?? []).filter(Boolean)),
    [allowedCategoryIds],
  );
  const excludedIdsSet = useMemo(
    () => new Set((excludedCategoryIds ?? []).filter(Boolean)),
    [excludedCategoryIds],
  );
  const excludedTemplateIdsSet = useMemo(
    () => new Set((excludedCategoryTemplateIds ?? []).filter(Boolean)),
    [excludedCategoryTemplateIds],
  );
  const excludedNamesSet = useMemo(
    () => new Set((excludedCategoryNames ?? []).map((item) => normalizeCategoryName(item)).filter(Boolean)),
    [excludedCategoryNames],
  );

  const filteredTreeCategories = useMemo(() => {
    const filterTree = (items: CategoryReactDto[]): CategoryReactDto[] =>
      items.flatMap((item) => {
        const hadSubcategories = Boolean(item.subcategories && item.subcategories.length > 0);
        const filteredSubcategories = item.subcategories ? filterTree(item.subcategories) : undefined;
        const hasVisibleSubcategories = Boolean(filteredSubcategories && filteredSubcategories.length > 0);
        const isAllowed = allowedIdsSet.size === 0 || allowedIdsSet.has(item.id);
        const isExcluded =
          excludedIdsSet.has(item.id) ||
          (item.categoryTemplateId ? excludedTemplateIdsSet.has(item.categoryTemplateId) : false) ||
          excludedNamesSet.has(normalizeCategoryName(item.name));

        // Parent categories are containers only and must not be selectable.
        // If a parent has no visible children after filtering, hide it completely.
        if (hadSubcategories && !hasVisibleSubcategories) {
          return [];
        }

        // Excluded categories should not appear in picker at all.
        // If they still have visible children, lift children one level up.
        if (isExcluded) {
          return filteredSubcategories ?? [];
        }

        if (!isAllowed && !hasVisibleSubcategories) {
          return [];
        }

        return [
          {
            ...item,
            subcategories: filteredSubcategories,
          },
        ];
      });

    return filterTree(categories);
  }, [allowedIdsSet, excludedIdsSet, excludedNamesSet, excludedTemplateIdsSet, categories]);

  const sortedTreeCategories = useMemo(
    () => sortCategoriesRecursively(filteredTreeCategories),
    [filteredTreeCategories],
  );

  const flatCategories = useMemo(() => flattenCategories(sortedTreeCategories), [sortedTreeCategories]);

  const leafCategories = useMemo(
    () => flatCategories.filter((category) => isLeafCategory(category)).sort(compareByName),
    [flatCategories],
  );

  const topCategories = useMemo(() => leafCategories.slice(0, 5), [leafCategories]);

  const modalCategories = useMemo(
    () => (preferFlatList ? leafCategories : sortedTreeCategories),
    [sortedTreeCategories, leafCategories, preferFlatList],
  );

  const selectedCategory = useMemo(
    () => flatCategories.find((category) => category.id === value) ?? null,
    [flatCategories, value],
  );

  useEffect(() => {
    onResolvedCategoryChange?.(selectedCategory);
    // Only react to actual selection change, not to parent callback identity changes.
    // This prevents update loops when parents pass inline setState wrappers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory?.id]);

  const displayedCategory = selectedCategory ?? displayCategory ?? null;

  const handleOpenCategoryPicker = () => {
    Keyboard.dismiss();
    onOpen?.();
    setIsCategoryPickerOpen(true);
    if (shouldUseRemoteCategories) {
      void refreshExpenseCategories();
      void refreshIncomeCategories();
    }
  };

  const handleCloseCategoryPicker = () => {
    setIsCategoryPickerOpen(false);
  };

  const handleCategorySelect = (categoryId: string) => {
    onChange(categoryId);
    setIsCategoryPickerOpen(false);
  };

  return (
    <>
      <Pressable style={styles.categoryField} onPress={handleOpenCategoryPicker}>
        <View style={[styles.categoryIcon, { backgroundColor: displayedCategory?.color ?? colors.border }]}>
          <Text style={styles.categoryIconText}>{iconForCategory(displayedCategory?.icon ?? "default")}</Text>
        </View>
        <View style={styles.categoryLabelWrapper}>
          <Text style={displayedCategory ? styles.categoryLabel : styles.categoryPlaceholder}>
            {displayedCategory?.name ?? placeholder}
          </Text>
        </View>
        <Text style={styles.categoryChevron}>›</Text>
      </Pressable>

      <CategoryPickerModal
        visible={isCategoryPickerOpen}
        categories={modalCategories}
        flatCategories={leafCategories}
        topCategories={topCategories}
        defaultType={defaultType}
        showTypeSwitch={!lockType}
        preferFlatList={preferFlatList}
        iconForCategory={iconForCategory}
        onClose={handleCloseCategoryPicker}
        onSelect={handleCategorySelect}
      />
    </>
  );
}

const styles = StyleSheet.create({
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
    minWidth: 0,
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
});
