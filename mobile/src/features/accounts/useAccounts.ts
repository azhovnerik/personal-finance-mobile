import { useCallback, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import type { AccountDto, AccountType, CurrencyCode } from "../../shared/api/dto";
import { getToken, removeToken } from "../../storage/auth";

const ACCOUNTS_QUERY_KEY = ["accounts"];
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:4010";
const REQUEST_TIMEOUT_MS = 15000;

export type AccountMutationPayload = {
  name: string;
  type: AccountType;
  currency: CurrencyCode;
  description?: string | null;
  balance?: number | null;
};

type UseAccountsResult = {
  accounts: AccountDto[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  actionError: string | null;
  refresh: () => Promise<void>;
  isCrudAvailable: boolean;
  createAccount: (payload: AccountMutationPayload) => Promise<boolean>;
  updateAccount: (id: string, payload: AccountMutationPayload) => Promise<boolean>;
  deleteAccount: (id: string) => Promise<boolean>;
  updateBalance: (id: string, newBalance: number) => Promise<boolean>;
};

const fetchAccounts = async (onUnauthorized: () => Promise<void>): Promise<AccountDto[]> => {
  const token = await getToken();
  if (!token) {
    await onUnauthorized();
    throw new Error("Сессия истекла. Войдите снова.");
  }

  const response = await fetch(`${API_BASE_URL}/api/v2/accounts`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 401 || response.status === 403) {
    await onUnauthorized();
    throw new Error("Сессия истекла. Войдите снова.");
  }

  if (!response.ok) {
    let message = `Не удалось загрузить счета (HTTP ${response.status}).`;
    try {
      const body = (await response.json()) as { message?: string };
      if (body?.message) {
        message = body.message;
      }
    } catch {
      // ignore parse errors and keep generic message
    }
    throw new Error(message);
  }

  const payload = (await response.json()) as unknown;
  if (Array.isArray(payload)) {
    return payload as AccountDto[];
  }

  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { accounts?: unknown }).accounts)
  ) {
    return (payload as { accounts: AccountDto[] }).accounts;
  }

  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { data?: unknown }).data)
  ) {
    return (payload as { data: AccountDto[] }).data;
  }

  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { items?: unknown }).items)
  ) {
    return (payload as { items: AccountDto[] }).items;
  }

  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { content?: unknown }).content)
  ) {
    return (payload as { content: AccountDto[] }).content;
  }

  if (
    payload &&
    typeof payload === "object" &&
    (payload as { result?: unknown }).result &&
    Array.isArray((payload as { result: { accounts?: unknown } }).result.accounts)
  ) {
    return (payload as { result: { accounts: AccountDto[] } }).result.accounts;
  }

  throw new Error("Некорректный формат ответа списка счетов.");
};

export const useAccounts = (): UseAccountsResult => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleUnauthorized = useCallback(async () => {
    await removeToken();
    router.replace("/login");
  }, [router]);

  const query = useQuery({
    queryKey: ACCOUNTS_QUERY_KEY,
    queryFn: () => fetchAccounts(handleUnauthorized),
  });

  const errorMessage = useMemo(() => {
    if (!query.error) {
      return null;
    }
    return query.error instanceof Error ? query.error.message : "Не удалось загрузить счета.";
  }, [query.error]);

  const refresh = useMemo(() => {
    return async () => {
      await query.refetch();
    };
  }, [query]);

  const applyBalanceToCache = useCallback((id: string, newBalance: number) => {
    queryClient.setQueryData<AccountDto[]>(ACCOUNTS_QUERY_KEY, (prev) => {
      if (!prev) {
        return prev;
      }
      return prev.map((account) =>
        account.id === id
          ? {
              ...account,
              balance: newBalance,
              balanceInBase: newBalance,
            }
          : account,
      );
    });
  }, [queryClient]);

  const withAuth = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      await handleUnauthorized();
      throw new Error("Сессия истекла. Войдите снова.");
    }
    return token;
  }, [handleUnauthorized]);

  const parseApiErrorMessage = async (response: Response, fallback: string) => {
    try {
      const body = (await response.json()) as { message?: string };
      if (body?.message) {
        return body.message;
      }
    } catch {
      // ignore parse errors
    }
    return fallback;
  };

  const fetchWithTimeout = useCallback(
    async (url: string, init: RequestInit) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        return await fetch(url, { ...init, signal: controller.signal });
      } finally {
        clearTimeout(timeoutId);
      }
    },
    [],
  );

  const createAccount = useCallback(async (payload: AccountMutationPayload) => {
    setIsSaving(true);
    setActionError(null);
    try {
      const token = await withAuth();
      const response = await fetch(`${API_BASE_URL}/api/v2/accounts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...payload,
          initialBalance: payload.balance,
        }),
      });
      if (response.status === 401 || response.status === 403) {
        await handleUnauthorized();
        setActionError("Сессия истекла. Войдите снова.");
        return false;
      }
      if (!response.ok) {
        setActionError(await parseApiErrorMessage(response, "Не удалось создать счет."));
        return false;
      }
      await query.refetch();
      return true;
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Не удалось создать счет.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [handleUnauthorized, query, withAuth]);

  const updateAccount = useCallback(async (id: string, payload: AccountMutationPayload) => {
    setIsSaving(true);
    setActionError(null);
    try {
      const token = await withAuth();
      const response = await fetch(`${API_BASE_URL}/api/v2/accounts/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (response.status === 401 || response.status === 403) {
        await handleUnauthorized();
        setActionError("Сессия истекла. Войдите снова.");
        return false;
      }
      if (!response.ok) {
        setActionError(await parseApiErrorMessage(response, "Не удалось обновить счет."));
        return false;
      }
      await query.refetch();
      return true;
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Не удалось обновить счет.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [handleUnauthorized, query, withAuth]);

  const deleteAccount = useCallback(async (id: string) => {
    setIsSaving(true);
    setActionError(null);
    try {
      const token = await withAuth();
      const response = await fetch(`${API_BASE_URL}/api/v2/accounts/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401 || response.status === 403) {
        await handleUnauthorized();
        setActionError("Сессия истекла. Войдите снова.");
        return false;
      }
      if (!response.ok) {
        setActionError(await parseApiErrorMessage(response, "Не удалось удалить счет."));
        return false;
      }
      await query.refetch();
      return true;
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Не удалось удалить счет.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [handleUnauthorized, query, withAuth]);

  const updateBalance = useCallback(async (id: string, newBalance: number) => {
    setIsSaving(true);
    setActionError(null);
    try {
      const token = await withAuth();
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      let response = await fetchWithTimeout(`${API_BASE_URL}/api/v2/accounts/${id}/balance`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ newBalance }),
      });
      if (response.status === 404 || response.status === 405) {
        response = await fetchWithTimeout(`${API_BASE_URL}/api/v2/accounts/${id}/balance`, {
          method: "POST",
          headers,
          body: JSON.stringify({ newBalance }),
        });
      }
      if (response.status === 401 || response.status === 403) {
        await handleUnauthorized();
        setActionError("Сессия истекла. Войдите снова.");
        return false;
      }
      if (!response.ok) {
        setActionError(await parseApiErrorMessage(response, "Не удалось обновить баланс."));
        return false;
      }
      applyBalanceToCache(id, newBalance);
      await query.refetch();
      return true;
    } catch (error) {
      if ((error as { name?: string } | undefined)?.name === "AbortError") {
        try {
          const token = await withAuth();
          const verifyResponse = await fetchWithTimeout(`${API_BASE_URL}/api/v2/accounts`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (verifyResponse.status === 401 || verifyResponse.status === 403) {
            await handleUnauthorized();
            setActionError("Сессия истекла. Войдите снова.");
            return false;
          }
          if (verifyResponse.ok) {
            const verifyAccounts = (await verifyResponse.json()) as AccountDto[];
            const updated = verifyAccounts.find((account) => account.id === id);
            const updatedBalance = updated?.balance;
            if (typeof updatedBalance === "number" && Math.abs(updatedBalance - newBalance) < 0.000001) {
              setActionError(null);
              applyBalanceToCache(id, updatedBalance);
              await query.refetch();
              return true;
            }
          }
        } catch {
          // ignore verification failure and report timeout below
        }
        setActionError("Таймаут обновления баланса. Проверьте доступность backend API.");
        return false;
      }
      setActionError("Не удалось обновить баланс.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [applyBalanceToCache, fetchWithTimeout, handleUnauthorized, query, withAuth]);

  return {
    accounts: query.data ?? [],
    isLoading: query.isLoading,
    isSaving,
    error: errorMessage,
    actionError,
    refresh,
    isCrudAvailable: true,
    createAccount,
    updateAccount,
    deleteAccount,
    updateBalance,
  };
};

export { ACCOUNTS_QUERY_KEY };
