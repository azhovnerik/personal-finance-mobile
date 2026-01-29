import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";

import client from "../../shared/lib/api/client";
import { notifyTransactionsChanged, subscribeTransactionsChanged } from "../../shared/lib/events/transactions";

import { getToken, removeToken } from "../../storage/auth";
import { TransactionDto, TransactionType, UUID } from "../../shared/api/dto";
import { mockTransactions } from "../../shared/mocks";

type UseTransactionsResult = {
  transactions: TransactionDto[];
  isLoading: boolean;
  error: string | null;
  refresh: (filters?: TransactionFilters) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
};

export type TransactionFilters = {
  startDate?: string | null;
  endDate?: string | null;
  accountId?: UUID | null;
  type?: TransactionType | "ALL" | null;
};

const toQueryFilters = (filters?: TransactionFilters) => {
  if (!filters) {
    return undefined;
  }

  const query: Record<string, string> = {};

  if (filters.startDate) {
    query.startDate = filters.startDate;
  }
  if (filters.endDate) {
    query.endDate = filters.endDate;
  }
  if (filters.accountId) {
    query.accountId = filters.accountId;
  }
  if (filters.type && filters.type !== "ALL") {
    query.type = filters.type;
  }

  return Object.keys(query).length > 0 ? query : undefined;
};

export const useTransactions = (
  filters?: TransactionFilters,
): UseTransactionsResult => {
  const useMocks =
    __DEV__ && process.env.EXPO_PUBLIC_USE_MOCKS === "true";
  const router = useRouter();
  const [transactions, setTransactions] = useState<TransactionDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTransactions = useCallback(async (nextFilters?: TransactionFilters) => {
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
        setTransactions([...mockTransactions]);
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const query = toQueryFilters(nextFilters ?? filters);
      const { data, error: apiError } = await client.GET("/api/v2/transactions" as any, {
        headers,
        params: query ? { query } : undefined,
      });
      if (apiError || !data) {
        const status = (apiError as { status?: number } | undefined)?.status;
        if (status === 401) {
          await removeToken();
          setError("Сессия истекла. Войдите снова.");
          router.replace("/login");
          return;
        }
        setTransactions([]);
        setError("Не удалось загрузить транзакции.");
      } else {
        setTransactions(data as TransactionDto[]);
      }
    } catch {
      setTransactions([]);
      setError("Не удалось загрузить транзакции.");
    } finally {
      setIsLoading(false);
    }
  }, [filters, router, useMocks]);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions, filters]);

  useEffect(() => {
    const unsubscribe = subscribeTransactionsChanged(() => {
      void loadTransactions();
    });

    return unsubscribe;
  }, [loadTransactions]);

  const refresh = useMemo(() => loadTransactions, [loadTransactions]);

  const deleteTransaction = useCallback(
    async (id: string) => {
      setError(null);

      try {
        const token = await getToken();
        if (!token) {
          setError("Сессия истекла. Войдите снова.");
          router.replace("/login");
          return;
        }

        if (useMocks) {
          const nextTransactions = mockTransactions.filter((transaction) => transaction.id !== id);
          mockTransactions.splice(0, mockTransactions.length, ...nextTransactions);
          setTransactions([...nextTransactions]);
          notifyTransactionsChanged();
          return;
        }

        const { error: apiError } = await client.DELETE(
          "/api/v2/transactions/{id}/delete" as any,
          {
            headers: { Authorization: `Bearer ${token}` },
            params: { path: { id } },
          },
        );

        const status = (apiError as { status?: number } | undefined)?.status;
        if (status === 401) {
          await removeToken();
          setError("Сессия истекла. Войдите снова.");
          router.replace("/login");
          return;
        }

        if (apiError) {
          setError("Не удалось удалить транзакцию.");
          return;
        }

        setTransactions((prev) => prev.filter((transaction) => transaction.id !== id));
        notifyTransactionsChanged();
      } catch {
        setError("Не удалось удалить транзакцию.");
      }
    },
    [router, useMocks],
  );

  return {
    transactions,
    isLoading,
    error,
    refresh,
    deleteTransaction,
  };
};
