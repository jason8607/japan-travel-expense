"use client";

import { useEffect, useState, useCallback } from "react";
import { useApp } from "@/lib/context";
import { createClient } from "@/lib/supabase/client";
import { getGuestExpenses } from "@/lib/guest-storage";
import type { Expense } from "@/types";

function getLocalDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function useExpenses() {
  const { currentTrip, isGuest } = useApp();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExpenses = useCallback(async () => {
    if (isGuest) {
      setExpenses(getGuestExpenses());
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
      const res = await fetch(`/api/expenses?trip_id=${currentTrip.id}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "載入失敗");
      }
      const data = await res.json();
      setExpenses(data.expenses || []);
    } catch (err) {
      console.error("Failed to load expenses:", err);
      setError(err instanceof Error ? err.message : "載入失敗");
    } finally {
      setLoading(false);
    }
  }, [currentTrip?.id, isGuest]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

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
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentTrip?.id, fetchExpenses, isGuest]);

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
