import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Card, Input, ScreenContainer, Text, colors, spacing } from "../src/shared/ui";
import { CategoryReactDto, CategoryType } from "../src/shared/api/dto";
import { CategoryMutationPayload, useCategories, useCategoryActions, useCategoryIcons } from "../src/features/categories/useCategories";
import { findCategoryInTree, isCategoryGroup } from "../src/features/categories/categoryTree";
import { normalizeCategoryIcon } from "../src/features/categories/categoryIcons";
import { CategoryIcon } from "../src/features/categories/components/CategoryIcon";

type CategoryFormState = {
  name: string;
  icon: string;
  description: string;
  disabled: boolean;
};

const EMPTY_FORM: CategoryFormState = {
  name: "",
  icon: "",
  description: "",
  disabled: false,
};

const toParamValue = (value?: string | string[]) => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

const toCategoryType = (value?: string): CategoryType => {
  if (value === "INCOME" || value === "EXPENSES" || value === "TRANSFER") {
    return value;
  }
  return "EXPENSES";
};

const parsePath = (value: string) => value.split(",").filter(Boolean);

const toFormState = (category: CategoryReactDto): CategoryFormState => ({
  name: category.name ?? "",
  icon: normalizeCategoryIcon(category.icon) ?? "",
  description: category.description ?? "",
  disabled: Boolean(category.disabled),
});

export default function CategoryEditScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    mode?: string;
    type?: string;
    parentId?: string;
    parentName?: string;
    parentPath?: string;
    categoryPath?: string;
    category?: string;
  }>();
  const { createCategory, updateCategory, deleteCategory, isSaving } = useCategoryActions();
  const [editingCategory, setEditingCategory] = useState<CategoryReactDto | null>(null);
  const [form, setForm] = useState<CategoryFormState>(EMPTY_FORM);
  const [localError, setLocalError] = useState<string | null>(null);
  const [hasUserEdited, setHasUserEdited] = useState(false);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);

  const mode = toParamValue(params.mode) === "edit" ? "edit" : "create";
  const parentId = toParamValue(params.parentId) || null;
  const parentName = toParamValue(params.parentName) || null;
  const parentPath = toParamValue(params.parentPath) || "";
  const categoryPath = toParamValue(params.categoryPath) || "";
  const parentDepth = parsePath(parentPath).length;
  const categoryDepth = parsePath(categoryPath).length;
  const canAddSubcategory = mode === "edit" && Boolean(editingCategory) && categoryDepth <= 1;

  const categoryType = useMemo(
    () => editingCategory?.type ?? toCategoryType(toParamValue(params.type)),
    [editingCategory?.type, params.type],
  );

  const { categories: liveCategories, refresh: refreshLiveCategories } = useCategories(
    { type: categoryType },
    { enabled: mode === "edit" },
  );
  const { icons, isLoading: isLoadingIcons, error: iconsError } = useCategoryIcons({ enabled: isIconPickerOpen });

  const liveCategory = useMemo(
    () => findCategoryInTree(liveCategories, editingCategory?.id),
    [liveCategories, editingCategory?.id],
  );

  const updateForm = (patch: Partial<CategoryFormState>) => {
    setHasUserEdited(true);
    setForm((prev) => ({ ...prev, ...patch }));
  };

  useEffect(() => {
    if (mode !== "edit" || !params.category) {
      setEditingCategory(null);
      setForm(EMPTY_FORM);
      setHasUserEdited(false);
      return;
    }

    try {
      const parsed = JSON.parse(decodeURIComponent(toParamValue(params.category) ?? "")) as CategoryReactDto;
      setEditingCategory(parsed);
      setLocalError(null);
      setForm(toFormState(parsed));
      setHasUserEdited(false);
    } catch {
      setLocalError("Не удалось открыть категорию.");
    }
  }, [mode, params.category]);

  useEffect(() => {
    if (mode === "edit") {
      void refreshLiveCategories();
    }
  }, [mode, categoryType, refreshLiveCategories]);

  useEffect(() => {
    if (!liveCategory || hasUserEdited) {
      return;
    }

    setEditingCategory(liveCategory);
    setForm(toFormState(liveCategory));
  }, [liveCategory, hasUserEdited]);

  const buildPayload = (): CategoryMutationPayload | null => {
    const name = form.name.trim();
    if (!name) {
      setLocalError("Введите название категории.");
      return null;
    }

    return {
      name,
      type: categoryType,
      parentId,
      icon: normalizeCategoryIcon(form.icon),
      description: form.description.trim() || null,
      disabled: form.disabled,
    };
  };

  const handleSave = async () => {
    setLocalError(null);
    if (mode === "edit" && !editingCategory) {
      setLocalError("Не удалось открыть категорию для редактирования.");
      return;
    }

    const payload = buildPayload();
    if (!payload) {
      return;
    }

    if (mode === "create" && parentId && parentDepth >= 2) {
      setLocalError("Максимальная глубина категорий — 2 уровня.");
      return;
    }

    try {
      if (mode === "edit" && editingCategory) {
        await updateCategory({ id: editingCategory.id, payload });
        router.back();
      } else {
        await createCategory(payload);
        if (parentId && parentPath) {
          router.replace({
            pathname: "/categories",
            params: {
              type: categoryType,
              path: parentPath,
            },
          });
          return;
        }
        router.back();
      }
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Не удалось сохранить категорию.");
    }
  };

  const handleDelete = () => {
    if (!editingCategory) {
      return;
    }

    Alert.alert("Удалить категорию?", `Категория "${editingCategory.name}" будет удалена.`, [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await deleteCategory(editingCategory.id);
              router.back();
            } catch (error) {
              setLocalError(error instanceof Error ? error.message : "Не удалось удалить категорию.");
            }
          })();
        },
      },
    ]);
  };

  const openCreateSubcategory = () => {
    if (!editingCategory) {
      return;
    }

    if (categoryDepth >= 2) {
      setLocalError("У сабкатегории не может быть вложенных сабкатегорий.");
      return;
    }

    const openCreateScreen = () => {
      router.push({
        pathname: "/category-edit",
        params: {
          mode: "create",
          type: editingCategory.type,
          parentId: editingCategory.id,
          parentName: editingCategory.name,
          parentPath: categoryPath || editingCategory.id,
        },
      });
    };

    if (isCategoryGroup(editingCategory)) {
      openCreateScreen();
      return;
    }

    Alert.alert(
      "Категория станет группой",
      `Категория "${editingCategory.name}" станет группой. Ее больше нельзя будет выбирать в новых транзакциях и бюджетах. Уже созданные операции останутся без изменений.`,
      [
        { text: "Отмена", style: "cancel" },
        { text: "Продолжить", onPress: openCreateScreen },
      ],
    );
  };

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable onPress={() => router.back()} disabled={isSaving}>
            <Text style={styles.headerAction}>Назад</Text>
          </Pressable>
          <Text variant="subtitle">{mode === "edit" ? "Категория" : "Новая категория"}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Card style={styles.metaCard}>
            <Text variant="caption">Тип: {categoryType === "EXPENSES" ? "Расход" : categoryType === "INCOME" ? "Доход" : "Перевод"}</Text>
            <Text variant="caption">{parentName ? `Родитель: ${parentName}` : "Корневой уровень"}</Text>
          </Card>

          <Input
            placeholder="Название"
            value={form.name}
            onChangeText={(value) => updateForm({ name: value })}
          />
          <Card style={styles.iconPickerCard}>
            <View style={styles.iconPickerHeader}>
              <View>
                <Text variant="subtitle">Иконка</Text>
                <Text variant="caption">
                  {isIconPickerOpen
                    ? isLoadingIcons
                      ? "Загрузка иконок..."
                      : "Выберите иконку из единого каталога"
                    : "Нажмите на иконку для выбора"}
                </Text>
              </View>
              <Pressable
                style={[styles.selectedIconPreview, isIconPickerOpen ? styles.selectedIconPreviewActive : undefined]}
                onPress={() => setIsIconPickerOpen((prev) => !prev)}
              >
                <CategoryIcon name={form.icon} size={36} color={colors.textPrimary} />
              </Pressable>
            </View>
            {isIconPickerOpen && iconsError ? <Text style={styles.errorText}>{iconsError}</Text> : null}
            {isIconPickerOpen ? (
              <View style={styles.iconGrid}>
                {icons.map((icon) => {
                  const normalizedKey = normalizeCategoryIcon(icon.key);
                  const isSelected = normalizedKey === normalizeCategoryIcon(form.icon);
                  return (
                    <Pressable
                      key={icon.key}
                      style={[styles.iconOption, isSelected ? styles.iconOptionActive : undefined]}
                      onPress={() => {
                        updateForm({ icon: normalizedKey ?? "" });
                        setIsIconPickerOpen(false);
                      }}
                    >
                      <CategoryIcon name={icon.key} size={34} color={colors.textPrimary} />
                      <Text style={styles.iconOptionLabel} numberOfLines={1}>
                        {icon.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </Card>
          <Input
            placeholder="Описание"
            value={form.description}
            onChangeText={(value) => updateForm({ description: value })}
          />
          <Button
            title={form.disabled ? "Категория отключена" : "Категория активна"}
            variant="outline"
            tone={form.disabled ? "danger" : "secondary"}
            onPress={() => updateForm({ disabled: !form.disabled })}
            disabled={isSaving}
          />
          {canAddSubcategory ? (
            <Button
              title="Добавить подкатегорию"
              variant="outline"
              tone="primary"
              onPress={openCreateSubcategory}
              disabled={isSaving}
            />
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          {localError ? <Text style={styles.errorText}>{localError}</Text> : null}
          <Button
            title={isSaving ? "Сохранение..." : mode === "edit" ? "Сохранить" : "Создать"}
            onPress={() => void handleSave()}
            disabled={isSaving}
          />
          {mode === "edit" && editingCategory ? (
            <Button
              title="Удалить категорию"
              variant="outline"
              tone="danger"
              onPress={handleDelete}
              disabled={isSaving}
            />
          ) : null}
        </View>
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
  headerAction: {
    color: colors.primary,
    fontWeight: "600",
  },
  headerSpacer: {
    width: 60,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  metaCard: {
    gap: spacing.xs,
  },
  iconPickerCard: {
    gap: spacing.sm,
  },
  iconPickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  selectedIconPreview: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedIconPreviewActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  iconOption: {
    width: 56,
    minHeight: 54,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
    gap: 1,
  },
  iconOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceMuted,
  },
  iconOptionLabel: {
    fontSize: 9,
    color: colors.textSecondary,
    textAlign: "center",
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
});
