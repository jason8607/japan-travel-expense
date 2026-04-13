"use client";

import { useState, useEffect, useMemo } from "react";
import { useApp } from "@/lib/context";
import { useExpenses } from "@/hooks/use-expenses";
import { ExpenseList } from "@/components/expense/expense-list";
import { MemberSummary } from "@/components/expense/member-summary";
import { ExpenseFilter, EMPTY_FILTER } from "@/components/expense/expense-filter";
import type { ExpenseFilterState } from "@/components/expense/expense-filter";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { deleteGuestExpense } from "@/lib/guest-storage";
import Link from "next/link";

export default function RecordsPage() {
  const { currentTrip, tripMembers, isGuest, loading: ctxLoading } = useApp();
  const { expenses, loading, error, refresh } = useExpenses();
  const [groupBy, setGroupBy] = useState<"date" | "category" | "member">("date");
  const [filter, setFilter] = useState<ExpenseFilterState>(EMPTY_FILTER);

  useEffect(() => {
    if (isGuest && groupBy === "member") setGroupBy("date");
  }, [isGuest]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    let result = expenses;

    if (filter.query) {
      const q = filter.query.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.title_ja && e.title_ja.toLowerCase().includes(q)) ||
          (e.store_name && e.store_name.toLowerCase().includes(q)) ||
          (e.store_name_ja && e.store_name_ja.toLowerCase().includes(q))
      );
    }

    if (filter.categories.length > 0) {
      result = result.filter((e) => filter.categories.includes(e.category));
    }

    if (filter.paymentMethods.length > 0) {
      result = result.filter((e) => filter.paymentMethods.includes(e.payment_method));
    }

    return result;
  }, [expenses, filter]);

  const handleDelete = async (id: string) => {
    try {
      if (isGuest) {
        deleteGuestExpense(id);
      } else {
        const res = await fetch(`/api/expenses?id=${id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "刪除失敗");
      }
      toast.success("已刪除");
      await refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "刪除失敗";
      toast.error(message);
    }
  };

  if (loading || ctxLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-muted-foreground">載入中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <p className="text-sm text-red-500">載入消費紀錄失敗</p>
        <button onClick={refresh} className="text-sm text-blue-500 underline">重新載入</button>
      </div>
    );
  }

  return (
    <div className="pb-4">
      <div className="px-4 pt-4 mb-4">
        <div className="flex items-center justify-between mb-1">
          <Link
            href="/"
            className="text-sm text-blue-500"
          >
            ← 返回首頁
          </Link>
        </div>
      </div>

      <div className="px-4 mb-3">
        <ExpenseFilter
          onChange={setFilter}
          total={expenses.length}
          filtered={filtered.length}
        />
      </div>

      <div className="px-4 mb-4">
        <Tabs
          value={groupBy}
          onValueChange={(v) => setGroupBy(v as "date" | "category" | "member")}
        >
          <TabsList className="w-full">
            <TabsTrigger value="date" className="flex-1">
              按日期
            </TabsTrigger>
            <TabsTrigger value="category" className="flex-1">
              按類別
            </TabsTrigger>
            {!isGuest && (
              <TabsTrigger value="member" className="flex-1">
                按成員
              </TabsTrigger>
            )}
          </TabsList>
        </Tabs>
      </div>

      {groupBy === "member" ? (
        <MemberSummary expenses={filtered} tripMembers={tripMembers} onDelete={handleDelete} />
      ) : (
        <ExpenseList expenses={filtered} groupBy={groupBy} onDelete={handleDelete} />
      )}

      <div className="fixed bottom-20 right-4 z-40">
        <Link
          href="/records/new"
          aria-label="新增消費"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg hover:bg-blue-600 transition-all active:scale-95"
        >
          <Plus className="h-6 w-6" />
        </Link>
      </div>
    </div>
  );
}
