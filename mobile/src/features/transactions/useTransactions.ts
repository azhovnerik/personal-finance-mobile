import { useCallback, useEffect, useMemo, useState } from "react";

import client from "../../../../src/shared/lib/api/client";
import type { components } from "../../../../src/shared/lib/api/sdk";

import { getToken } from "../../storage/auth";

type Transaction = components["schemas"]["Transaction"];

type UseTransactionsResult = {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: "1",
    userId: "mock-user",
    amount: -1250,
    currency: "RUB",
    category: "Продукты",
    description: "Покупка в супермаркете",
    occurredAt: "2024-06-01T10:15:00.000Z",
  },
  {
    id: "2",
    userId: "mock-user",
    amount: -3200,
    currency: "RUB",
    category: "Транспорт",
    description: "Абонемент на метро",
    occurredAt: "2024-06-03T07:45:00.000Z",
  },
  {
    id: "3",
    userId: "mock-user",
    amount: 55000,
    currency: "RUB",
    category: "Доход",
    description: "Зарплата",
    occurredAt: "2024-06-05T08:00:00.000Z",
  },
];

export const useTransactions = (): UseTransactionsResult => {
  const useMocks = process.env.EXPO_PUBLIC_USE_MOCKS === "true";
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTransactions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    if (useMocks) {
      setTransactions(MOCK_TRANSACTIONS);
      setIsLoading(false);
      return;
    }

    try {
      const token = await getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const { data, error: apiError } = await client.GET("/transactions", {
        headers,
      });

      if (apiError || !data) {
        setTransactions([]);
        setError("Не удалось загрузить транзакции.");
      } else {
        setTransactions(data);
      }
    } catch {
      setTransactions([]);
      setError("Не удалось загрузить транзакции.");
    } finally {
      setIsLoading(false);
    }
  }, [useMocks]);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  const refresh = useMemo(() => loadTransactions, [loadTransactions]);

  return {
    transactions,
    isLoading,
    error,
    refresh,
  };
};
