import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text, colors, spacing } from "../../../shared/ui";
import { CategoryReactDto } from "../../../shared/api/dto";

type CategoryPickerModalProps = {
  visible: boolean;
  categories: CategoryReactDto[];
  flatCategories: CategoryReactDto[];
  topCategories: CategoryReactDto[];
  iconForCategory: (icon: string) => string;
  onClose: () => void;
  onSelect: (categoryId: string) => void;
};

export const CategoryPickerModal = ({
  visible,
  categories,
  flatCategories,
  topCategories,
  iconForCategory,
  onClose,
  onSelect,
}: CategoryPickerModalProps) => {
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [isSubcategoryOpen, setIsSubcategoryOpen] = useState(false);

  useEffect(() => {
    if (!visible) {
      setActiveCategoryId(null);
      setIsSubcategoryOpen(false);
    }
  }, [visible]);

  const activeCategory = useMemo(
    () => categories.find((category) => category.id === activeCategoryId) ?? null,
    [activeCategoryId, categories]
  );

  const handleCategoryPress = (categoryId: string) => {
    const category = categories.find((item) => item.id === categoryId);
    if (category?.subcategories?.length) {
      setActiveCategoryId(categoryId);
      setIsSubcategoryOpen(true);
      return;
    }

    const selectedCategory = flatCategories.find((item) => item.id === categoryId);
    if (selectedCategory) {
      onSelect(selectedCategory.id);
    }
    onClose();
  };

  const handleSubcategoryPress = (subcategoryId: string) => {
    onSelect(subcategoryId);
    onClose();
  };

  const handleSubcategoryBack = () => {
    setIsSubcategoryOpen(false);
  };

  if (!visible) return null;

  return (
    <>
      {!isSubcategoryOpen ? (
        <View style={styles.categoryOverlay}>
          <SafeAreaView style={styles.categoryModal}>
            <View style={styles.categoryHeader}>
              <Pressable onPress={onClose}>
                <Text style={styles.modalAction}>Назад</Text>
              </Pressable>
              <Text variant="subtitle">Категории</Text>
              <Pressable>
                <Text style={styles.modalAction}>Редактировать</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.categoryContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionTitle}>Самые частые</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topCategoryRow}>
                {topCategories.map((category) => (
                  <Pressable
                    key={category.id}
                    style={styles.topCategoryItem}
                    onPress={() => handleCategoryPress(category.id)}
                  >
                    <View style={[styles.topCategoryIcon, { backgroundColor: category.color ?? colors.border }]}>
                      <Text style={styles.categoryIconText}>{iconForCategory(category.icon ?? "default")}</Text>
                    </View>
                    <Text style={styles.topCategoryLabel} numberOfLines={1}>
                      {category.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={styles.sectionTitle}>Все категории</Text>
              <View style={styles.categoryList}>
                {categories.map((category) => (
                  <Pressable
                    key={category.id}
                    style={styles.categoryRow}
                    onPress={() => handleCategoryPress(category.id)}
                  >
                    <View style={[styles.categoryIcon, { backgroundColor: category.color ?? colors.border }]}>
                      <Text style={styles.categoryIconText}>{iconForCategory(category.icon ?? "default")}</Text>
                    </View>
                    <Text style={styles.categoryLabel}>{category.name}</Text>
                    {category.subcategories?.length ? <Text style={styles.categoryChevron}>›</Text> : null}
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      ) : (
        <View style={styles.categoryOverlay}>
          <SafeAreaView style={styles.categoryModal}>
            <View style={styles.categoryHeader}>
              <Pressable onPress={handleSubcategoryBack}>
                <Text style={styles.modalAction}>Назад</Text>
              </Pressable>
              <Text variant="subtitle">{activeCategory?.name ?? "Подкатегории"}</Text>
              <View style={styles.modalActionSpacer} />
            </View>
            <ScrollView contentContainerStyle={styles.categoryContent} showsVerticalScrollIndicator={false}>
              <View style={styles.categoryList}>
                {activeCategory?.subcategories?.map((subcategory) => (
                  <Pressable
                    key={subcategory.id}
                    style={styles.categoryRow}
                    onPress={() => handleSubcategoryPress(subcategory.id)}
                  >
                    <View style={[styles.categoryIcon, { backgroundColor: subcategory.color ?? colors.border }]}>
                      <Text style={styles.categoryIconText}>{iconForCategory(subcategory.icon ?? "default")}</Text>
                    </View>
                    <Text style={styles.categoryLabel}>{subcategory.name}</Text>
                  </Pressable>
                )) ?? null}
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  modalAction: {
    color: colors.textSecondary,
    fontWeight: "600",
  },
  modalActionSpacer: {
    width: 60,
  },
  categoryOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surfaceMuted,
    zIndex: 10,
  },
  categoryModal: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  categoryContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    fontSize: 12,
  },
  topCategoryRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  topCategoryItem: {
    width: 84,
    alignItems: "center",
    gap: spacing.xs,
  },
  topCategoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  topCategoryLabel: {
    textAlign: "center",
    fontSize: 12,
    color: colors.textPrimary,
  },
  categoryList: {
    gap: spacing.sm,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
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
  categoryLabel: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
  },
  categoryChevron: {
    fontSize: 20,
    color: colors.textSecondary,
  },
});
