import { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  View,
} from "react-native";

import { useTransactions } from "../src/features/transactions/useTransactions";
import { ScreenContainer, Text } from "../src/shared/ui";

const formatAmount = (amount: number, currency: string) => {
  const sign = amount < 0 ? "-" : "";
  const absolute = Math.abs(amount).toFixed(2);
  return `${sign}${absolute} ${currency}`;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function HomeScreen() {
  const { transactions, isLoading, error } = useTransactions();
  const data = useMemo(() => transactions, [transactions]);

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text variant="title">Транзакции</Text>
        <Text style={styles.subtitle}>Последние операции</Text>
      </View>

      {isLoading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color="#1f2937" />
          <Text>Загружаем список...</Text>
        </View>
      ) : error ? (
        <View style={styles.stateContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text>{formatDate(item.occurredAt)}</Text>
                <Text style={styles.amount}>
                  {formatAmount(item.amount, item.currency)}
                </Text>
              </View>
              <Text style={styles.category}>{item.category}</Text>
              {item.description ? (
                <Text variant="caption">{item.description}</Text>
              ) : null}
            </View>
          )}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 16,
    gap: 4,
  },
  subtitle: {
    color: "#4b5563",
  },
  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  errorText: {
    color: "#b91c1c",
  },
  list: {
    gap: 12,
    paddingBottom: 24,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    gap: 6,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  amount: {
    fontWeight: "600",
  },
  category: {
    fontWeight: "600",
  },
});
