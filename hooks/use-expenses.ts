"use client";

import { useEffect, useState, useCallback } from "react";
import { useApp } from "@/lib/context";
import type { Expense } from "@/types";

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
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.expenses || []);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, [currentTrip?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  useEffect(() => {
    if (!currentTrip) return;

    const interval = setInterval(fetchExpenses, 30000);
    return () => clearInterval(interval);
  }, [currentTrip?.id, fetchExpenses]);

  const todayTotal = expenses
    .filter((e) => e.expense_date === new Date().toISOString().split("T")[0])
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
