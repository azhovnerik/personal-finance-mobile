import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";

import client from "../../shared/lib/api/client";
import type { components } from "../../shared/lib/api/sdk";

import { getToken, removeToken } from "../../storage/auth";
import {TransactionDto} from "../../shared/api/dto";

type Transaction = components["schemas"]["Transaction"];

type UseTransactionsResult = {
  transactions: TransactionDto[];
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
  const useMocks =
    __DEV__ && process.env.EXPO_PUBLIC_USE_MOCKS === "true";
  const router = useRouter();
  const [transactions, setTransactions] = useState<TransactionDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTransactions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        setTransactions([]);
        setError("Сессия истекла. Войдите снова.");
        router.replace("/login");
        return;
      }

      if (useMocks) {
        setTransactions(MOCK_TRANSACTIONS);
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const { data, error: apiError } = await client.GET("/api/v2/transactions", {
        headers,
      });
      if (apiError || !data) {
        if (apiError?.status === 401) {
          await removeToken();
          setError("Сессия истекла. Войдите снова.");
          router.replace("/login");
          return;
        }
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
  }, [router, useMocks]);

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
