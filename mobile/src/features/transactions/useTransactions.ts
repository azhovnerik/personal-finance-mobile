import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";

import client from "../../shared/lib/api/client";
import { notifyTransactionsChanged, subscribeTransactionsChanged } from "../../shared/lib/events/transactions";

import { getToken, removeToken } from "../../storage/auth";
import {
  CurrencyCode,
  TransactionDirection,
  TransactionDto,
  TransactionType,
  UUID,
} from "../../shared/api/dto";
import { mockTransactions } from "../../shared/mocks";
import { API_BASE_URL } from "../../shared/lib/api/config";

type UseTransactionsResult = {
  transactions: TransactionDto[];
  isLoading: boolean;
  error: string | null;
  refresh: (filters?: TransactionFilters) => Promise<void>;
  deleteTransaction: (id: string) => Promise<boolean>;
  editTransaction: (
    id: string,
    payload: EditTransactionPayload,
    updatedTransaction: TransactionDto,
  ) => Promise<boolean>;
};

export type TransactionFilters = {
  startDate?: string | null;
  endDate?: string | null;
  accountId?: UUID | null;
  type?: TransactionType | "ALL" | null;
};

export type EditTransactionPayload = {
  id: string;
  date: string;
  timezone: string;
  categoryId: string | null;
  accountId: string | null;
  direction: TransactionDirection;
  type: TransactionType;
  changeBalanceId: null;
  amount: number;
  amountInBase: number;
  currency: CurrencyCode;
  comment?: string;
  transfer: null;
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

  const visibleTransactions = useCallback(
    (items: TransactionDto[]) => items.filter((transaction) => transaction.type !== "CHANGE_BALANCE"),
    [],
  );

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
        setTransactions(visibleTransactions([...mockTransactions]));
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
        setTransactions(visibleTransactions(data as TransactionDto[]));
      }
    } catch {
      setTransactions([]);
      setError("Не удалось загрузить транзакции.");
    } finally {
      setIsLoading(false);
    }
  }, [filters, router, useMocks, visibleTransactions]);

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
          return false;
        }

        if (useMocks) {
          const nextTransactions = mockTransactions.filter((transaction) => transaction.id !== id);
          mockTransactions.splice(0, mockTransactions.length, ...nextTransactions);
          setTransactions([...nextTransactions]);
          notifyTransactionsChanged();
          return true;
        }

        const response = await fetch(`${API_BASE_URL}/api/v2/transactions/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 401) {
          await removeToken();
          setError("Сессия истекла. Войдите снова.");
          router.replace("/login");
          return false;
        }

        if (!response.ok) {
          setError("Не удалось удалить транзакцию.");
          return false;
        }

        setTransactions((prev) => prev.filter((transaction) => transaction.id !== id));
        notifyTransactionsChanged();
        return true;
      } catch {
        setError("Не удалось удалить транзакцию.");
        return false;
      }
    },
    [router, useMocks],
  );

  const editTransaction = useCallback(
    async (id: string, payload: EditTransactionPayload, updatedTransaction: TransactionDto) => {
      setError(null);

      try {
        const token = await getToken();
        if (!token) {
          setError("Сессия истекла. Войдите снова.");
          router.replace("/login");
          return false;
        }

        if (useMocks) {
          const nextTransactions = mockTransactions.map((transaction) =>
            transaction.id === id ? { ...transaction, ...updatedTransaction } : transaction,
          );
          mockTransactions.splice(0, mockTransactions.length, ...nextTransactions);
          setTransactions([...nextTransactions]);
          notifyTransactionsChanged();
          return true;
        }

        const response = await fetch(`${API_BASE_URL}/api/v2/transactions`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (response.status === 401) {
          await removeToken();
          setError("Сессия истекла. Войдите снова.");
          router.replace("/login");
          return false;
        }

        if (!response.ok) {
          setError("Не удалось сохранить транзакцию.");
          return false;
        }

        setTransactions((prev) =>
          prev.map((transaction) =>
            transaction.id === id ? { ...transaction, ...updatedTransaction } : transaction,
          ),
        );
        notifyTransactionsChanged();
        return true;
      } catch {
        setError("Не удалось сохранить транзакцию.");
        return false;
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
    editTransaction
  };
};
