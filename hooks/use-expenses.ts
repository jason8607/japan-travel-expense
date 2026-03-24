"use client";

import { useEffect, useState, useCallback } from "react";
import { useApp } from "@/lib/context";
import { createClient } from "@/lib/supabase/client";
import type { Expense } from "@/types";

function getLocalDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function useExpenses() {
  const { currentTrip } = useApp();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExpenses = useCallback(async () => {
    if (!currentTrip) {
      setExpenses([]);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/expenses?trip_id=${currentTrip.id}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "載入失敗");
      }
      const data = await res.json();
      setExpenses(data.expenses || []);
    } catch (err) {
      console.error("Failed to load expenses:", err);
    } finally {
      setLoading(false);
    }
  }, [currentTrip?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  useEffect(() => {
    if (!currentTrip) return;

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
  }, [currentTrip?.id, fetchExpenses]);

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
    todayTotal,
    totalJpy,
    totalTwd,
    cashTotal,
    count: expenses.length,
    refresh: fetchExpenses,
  };
}
