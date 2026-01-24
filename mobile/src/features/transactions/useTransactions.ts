import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";

import { mockTransactions } from "../../shared/mocks";
import { getToken, removeToken } from "../../storage/auth";
import {
  Account,
  Category,
  CurrencyCode,
  TransactionDirection,
  TransactionDto,
  TransactionType,
  UUID,
} from "../../shared/api/dto";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:4010";

export type TransactionAddPayload = {
  date: string;
  timezone?: string | null;
  categoryId: UUID;
  accountId: UUID;
  direction: TransactionDirection;
  type: TransactionType;
  changeBalanceId?: UUID | null;
  amount: number;
  amountInBase?: number | null;
  currency?: CurrencyCode | null;
  comment?: string | null;
  transfer?: unknown | null;
};

type CreateTransactionOptions = {
  category?: Category;
  account?: Account;
};

type UseTransactionsResult = {
  transactions: TransactionDto[];
  isLoading: boolean;
  error: string | null;
  createTransaction: (
    payload: TransactionAddPayload,
    options?: CreateTransactionOptions,
  ) => Promise<{ success: boolean; error: string | null }>;
  refresh: (filters?: TransactionFilters) => Promise<void>;
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

const extractDatePart = (value: string) => value.slice(0, 10);

const applyFilters = (
  list: TransactionDto[],
  filters?: TransactionFilters,
): TransactionDto[] => {
  if (!filters) {
    return list;
  }

  return list.filter((transaction) => {
    const transactionDate = extractDatePart(transaction.date);
    if (filters.startDate && transactionDate < filters.startDate) {
      return false;
    }
    if (filters.endDate && transactionDate > filters.endDate) {
      return false;
    }
    if (filters.accountId && transaction.account?.id !== filters.accountId) {
      return false;
    }
    if (filters.type && filters.type !== "ALL" && transaction.type !== filters.type) {
      return false;
    }
    return true;
  });
};

const generateMockId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `mock-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const useTransactions = (
  filters?: TransactionFilters,
): UseTransactionsResult => {
  const useMocks =
    __DEV__ && process.env.EXPO_PUBLIC_USE_MOCKS === "true";
  const router = useRouter();
  const mockTransactionsRef = useRef<TransactionDto[]>(mockTransactions);
  const [transactions, setTransactions] = useState<TransactionDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleUnauthorized = useCallback(async () => {
    await removeToken();
    router.replace("/login");
  }, [router]);

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
        setTransactions(applyFilters(mockTransactionsRef.current, nextFilters ?? filters));
        return;
      }

      const query = toQueryFilters(nextFilters ?? filters);
      const searchParams = new URLSearchParams(query);
      const url = searchParams.size
        ? `${API_BASE_URL}/api/v2/transactions?${searchParams.toString()}`
        : `${API_BASE_URL}/api/v2/transactions`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        await handleUnauthorized();
        setTransactions([]);
        setError("Сессия истекла. Войдите снова.");
        return;
      }

      if (!response.ok) {
        setTransactions([]);
        setError("Не удалось загрузить транзакции.");
        return;
      }

      const data = (await response.json()) as TransactionDto[];
      setTransactions(data);
    } catch {
      setTransactions([]);
      setError("Не удалось загрузить транзакции.");
    } finally {
      setIsLoading(false);
    }
  }, [filters, handleUnauthorized, useMocks]);

  const createTransaction = useCallback(
    async (
      payload: TransactionAddPayload,
      options?: CreateTransactionOptions,
    ): Promise<{ success: boolean; error: string | null }> => {
      try {
        const token = await getToken();
        if (!token) {
          await handleUnauthorized();
          return { success: false, error: "Сессия истекла. Войдите снова." };
        }

        if (useMocks) {
          const category =
            options?.category ??
            mockTransactionsRef.current.find((item) => item.category.id === payload.categoryId)?.category;
          const account =
            options?.account ??
            mockTransactionsRef.current.find((item) => item.account.id === payload.accountId)?.account;

          if (!category || !account) {
            await loadTransactions(filters);
            return { success: false, error: "Не удалось определить категорию или счет." };
          }

          const newTransaction: TransactionDto = {
            id: generateMockId(),
            date: payload.date,
            category,
            account,
            direction: payload.direction,
            type: payload.type,
            amount: payload.amount,
            amountInBase: payload.amountInBase ?? payload.amount,
            currency: payload.currency ?? account.currency ?? null,
            comment: payload.comment ?? null,
          };

          mockTransactionsRef.current = [newTransaction, ...mockTransactionsRef.current];
          setTransactions(applyFilters(mockTransactionsRef.current, filters));
          return { success: true, error: null };
        }

        const response = await fetch(`${API_BASE_URL}/api/v2/transactions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (response.status === 401) {
          await handleUnauthorized();
          return { success: false, error: "Сессия истекла. Войдите снова." };
        }

        if (!response.ok) {
          const errorResponse = (await response.json().catch(() => null)) as
            | { message?: string }
            | null;
          return {
            success: false,
            error: errorResponse?.message ?? "Не удалось создать транзакцию.",
          };
        }

        await loadTransactions(filters);
        return { success: true, error: null };
      } catch {
        return { success: false, error: "Не удалось создать транзакцию." };
      }
    },
    [filters, handleUnauthorized, loadTransactions, useMocks],
  );

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions, filters]);

  const refresh = useMemo(() => loadTransactions, [loadTransactions]);

  return {
    transactions,
    isLoading,
    error,
    createTransaction,
    refresh,
  };
};
