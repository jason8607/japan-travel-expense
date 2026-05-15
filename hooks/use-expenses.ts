"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useApp } from "@/lib/context";
import { createClient } from "@/lib/supabase/client";
import { EXPENSES_MUTATED_EVENT } from "@/lib/expenses-mutated";
import { getGuestExpenses } from "@/lib/guest-storage";
import { localCache, CACHE_KEYS } from "@/lib/local-cache";
import type { Expense } from "@/types";

function getLocalDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Module-level cache: persist across page navigations
const expenseCache = new Map<string, Expense[]>();

export function useExpenses() {
  const { currentTrip, isGuest } = useApp();
  const tripId = currentTrip?.id || "";

  // Hydrate module cache from localStorage on page refresh (module cache is empty after reload)
  if (tripId && !isGuest && !expenseCache.has(tripId)) {
    const lsCached = localCache.get<Expense[]>(CACHE_KEYS.expenses(tripId));
    if (lsCached) expenseCache.set(tripId, lsCached);
  }

  const cached = tripId ? expenseCache.get(tripId) : undefined;

  const [expenses, setExpenses] = useState<Expense[]>(cached || []);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchExpenses = useCallback(async () => {
    if (isGuest) {
      const data = getGuestExpenses();
      if (currentTrip) expenseCache.set(currentTrip.id, data);
      setExpenses(data);
      setLoading(false);
      setError(null);
      return;
    }

    if (!currentTrip) {
      setExpenses([]);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setError(null);
      const res = await fetch(`/api/expenses?trip_id=${currentTrip.id}&limit=5000`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "載入失敗");
      }
      const data = await res.json();
      const fetched = data.expenses || [];
      expenseCache.set(currentTrip.id, fetched);
      localCache.set(CACHE_KEYS.expenses(currentTrip.id), fetched);
      if (mountedRef.current) {
        setExpenses(fetched);
      }
    } catch (err) {
      console.error("Failed to load expenses:", err);
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "載入失敗");
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [currentTrip?.id, isGuest]); // eslint-disable-line react-hooks/exhaustive-deps

  // On trip change: use cache if available, then refresh in background
  useEffect(() => {
    if (isGuest) {
      fetchExpenses();
      return;
    }
    if (tripId && expenseCache.has(tripId)) {
      setExpenses(expenseCache.get(tripId)!);
      setLoading(false);
      // Only background-refresh when local cache is stale (> 30s old)
      if (localCache.isStale(CACHE_KEYS.expenses(tripId), 30_000)) {
        fetchExpenses();
      }
    } else {
      setLoading(true);
      fetchExpenses();
    }
  }, [tripId, fetchExpenses, isGuest]);

  // Cleanup
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Realtime subscription. We also listen to expense_participants because
  // subset-split changes don't touch the parent expenses row but still affect
  // settlement totals. RLS scopes notifications to the current user's trips,
  // so a global filter is safe; the refetch itself is trip-scoped.
  useEffect(() => {
    if (!currentTrip || isGuest) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`expenses-${currentTrip.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses", filter: `trip_id=eq.${currentTrip.id}` },
        () => { fetchExpenses(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expense_participants" },
        () => { fetchExpenses(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentTrip?.id, fetchExpenses, isGuest]);

  // Root layout (widget sync) and pages each have their own `useExpenses` state; mutations
  // elsewhere must nudge every instance via a window event.
  useEffect(() => {
    const onMutated = () => {
      void fetchExpenses();
    };
    window.addEventListener(EXPENSES_MUTATED_EVENT, onMutated);
    return () => window.removeEventListener(EXPENSES_MUTATED_EVENT, onMutated);
  }, [fetchExpenses]);

  const todayTotal = expenses
    .filter((e) => e.expense_date === getLocalDateString())
    .reduce((s, e) => s + e.amount_jpy, 0);

  const totalJpy = expenses.reduce((s, e) => s + e.amount_jpy, 0);
  const totalTwd = expenses.reduce((s, e) => s + e.amount_twd, 0);

  const cashTotal = expenses
    .filter((e) => e.payment_method === "現金")
    .reduce((s, e) => s + e.amount_jpy, 0);

  return {
    expenses,
    loading,
    error,
    todayTotal,
    totalJpy,
    totalTwd,
    cashTotal,
    count: expenses.length,
    refresh: fetchExpenses,
  };
}
