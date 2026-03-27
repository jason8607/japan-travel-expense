"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ExpenseForm } from "@/components/expense/expense-form";
import { useApp } from "@/lib/context";
import { getGuestExpenses } from "@/lib/guest-storage";
import { toast } from "sonner";
import type { Expense } from "@/types";

function ExpensePageContent() {
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const { isGuest } = useApp();
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(!!editId);

  useEffect(() => {
    if (!editId) return;

    if (isGuest) {
      const found = getGuestExpenses().find((e) => e.id === editId) ?? null;
      setEditExpense(found);
      if (!found) toast.error("無法載入消費資料");
      setLoading(false);
      return;
    }

    const fetchExpense = async () => {
      try {
        const res = await fetch(`/api/expenses?id=${editId}`);
        if (!res.ok) throw new Error("載入失敗");
        const data = await res.json();
        setEditExpense(data.expense);
      } catch {
        toast.error("無法載入消費資料");
      } finally {
        setLoading(false);
      }
    };

    fetchExpense();
  }, [editId, isGuest]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        載入中...
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={editExpense ? "編輯消費" : "新增消費"} showBack />
      <ExpenseForm editExpense={editExpense} />
    </div>
  );
}

export default function NewExpensePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
          載入中...
        </div>
      }
    >
      <ExpensePageContent />
    </Suspense>
  );
}
