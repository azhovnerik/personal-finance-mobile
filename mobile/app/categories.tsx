import { ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { Button, Card, Input, ScreenContainer, Text, colors, spacing } from "../src/shared/ui";

const INCOME_CATEGORIES = [
  { id: "i1", name: "Зарплата", subcategories: ["Бонус", "Премия"] },
  { id: "i2", name: "Фриланс", subcategories: ["Проекты", "Консалтинг"] },
];

const EXPENSE_CATEGORIES = [
  { id: "e1", name: "Продукты", subcategories: ["Супермаркет", "Кафе"] },
  { id: "e2", name: "Дом", subcategories: ["Коммунальные", "Ремонт"] },
  { id: "e3", name: "Транспорт", subcategories: ["Такси", "Метро"] },
];

export default function CategoriesScreen() {
  const router = useRouter();

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text variant="title">Категории</Text>
            <Text variant="caption">Доходы и расходы с подкатегориями</Text>
          </View>
          <Button title="Назад" variant="secondary" onPress={() => router.back()} />
        </View>

        <Card style={styles.formCard}>
          <Text variant="subtitle">Добавить категорию</Text>
          <Input placeholder="Название категории" />
          <Input placeholder="Тип (доход/расход)" />
          <Input placeholder="Подкатегория (опционально)" />
          <Button title="Сохранить" />
        </Card>

        <View style={styles.sectionHeader}>
          <Text variant="subtitle">Категории дохода</Text>
          <Text variant="caption">Редактирование и удаление</Text>
        </View>
        <View style={styles.list}>
          {INCOME_CATEGORIES.map((category) => (
            <Card key={category.id} style={styles.categoryCard}>
              <View style={styles.categoryHeader}>
                <Text>{category.name}</Text>
                <View style={styles.actionRow}>
                  <Button title="Изменить" variant="secondary" />
                  <Button title="Удалить" variant="ghost" />
                </View>
              </View>
              <View style={styles.subcategoryRow}>
                {category.subcategories.map((subcategory) => (
                  <Text key={subcategory} style={styles.subcategoryChip}>
                    {subcategory}
                  </Text>
                ))}
                <Text style={styles.subcategoryChip}>+ Подкатегория</Text>
              </View>
            </Card>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text variant="subtitle">Категории расхода</Text>
          <Text variant="caption">Группы для планирования бюджета</Text>
        </View>
        <View style={styles.list}>
          {EXPENSE_CATEGORIES.map((category) => (
            <Card key={category.id} style={styles.categoryCard}>
              <View style={styles.categoryHeader}>
                <Text>{category.name}</Text>
                <View style={styles.actionRow}>
                  <Button title="Изменить" variant="secondary" />
                  <Button title="Удалить" variant="ghost" />
                </View>
              </View>
              <View style={styles.subcategoryRow}>
                {category.subcategories.map((subcategory) => (
                  <Text key={subcategory} style={styles.subcategoryChip}>
                    {subcategory}
                  </Text>
                ))}
                <Text style={styles.subcategoryChip}>+ Подкатегория</Text>
              </View>
            </Card>
          ))}
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
  },
  formCard: {
    gap: spacing.sm,
  },
  sectionHeader: {
    gap: 4,
  },
  list: {
    gap: spacing.sm,
  },
  categoryCard: {
    gap: spacing.sm,
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  subcategoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  subcategoryChip: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: 12,
    color: colors.textSecondary,
  },
});
