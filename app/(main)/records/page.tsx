"use client";

import type { ExpenseFilterState } from "@/components/expense/expense-filter";
import { EMPTY_FILTER, ExpenseFilter } from "@/components/expense/expense-filter";
import { ExpenseList } from "@/components/expense/expense-list";
import { MemberSummary } from "@/components/expense/member-summary";
import { SettlementView } from "@/components/expense/settlement-view";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useExpenses } from "@/hooks/use-expenses";
import { useApp } from "@/lib/context";
import { exportExpensesToCSV } from "@/lib/export";
import { deleteGuestExpense } from "@/lib/guest-storage";
import { Download, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export default function RecordsPage() {
  const { currentTrip, tripMembers, isGuest, loading: ctxLoading } = useApp();
  const { expenses, loading, error, refresh } = useExpenses();
  const [groupBy, setGroupBy] = useState<"date" | "category" | "member" | "settlement">("date");
  const [filter, setFilter] = useState<ExpenseFilterState>(EMPTY_FILTER);

  useEffect(() => {
    if (isGuest && (groupBy === "member" || groupBy === "settlement")) setGroupBy("date");
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
        <button onClick={refresh} className="text-sm text-primary underline">重新載入</button>
      </div>
    );
  }

  return (
    <div className="pb-4">
      <div className="px-4 pt-4 mb-4">
        <div className="flex items-center justify-between mb-1">
          <Link
            href="/"
            className="text-sm text-primary"
          >
            ← 返回首頁
          </Link>
          {expenses.length > 0 && (
            <button
              onClick={() => {
                exportExpensesToCSV(filtered, currentTrip?.name || "旅程", tripMembers);
                toast.success("CSV 已下載");
              }}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              匯出
            </button>
          )}
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
          onValueChange={(v) => setGroupBy(v as "date" | "category" | "member" | "settlement")}
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
            {!isGuest && (
              <TabsTrigger value="settlement" className="flex-1">
                結算
              </TabsTrigger>
            )}
          </TabsList>
        </Tabs>
      </div>

      {groupBy === "settlement" ? (
        <SettlementView expenses={filtered} tripMembers={tripMembers} />
      ) : groupBy === "member" ? (
        <MemberSummary expenses={filtered} tripMembers={tripMembers} onDelete={handleDelete} />
      ) : (
        <ExpenseList expenses={filtered} groupBy={groupBy} onDelete={handleDelete} />
      )}

      {/* FAB */}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40 flex justify-center">
        <div className="relative w-full max-w-lg">
          <Link
            href="/records/new"
            aria-label="新增消費"
            className="pointer-events-auto absolute right-4 bottom-0 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:bg-primary/90 transition-all active:scale-95"
          >
            <Plus className="h-6 w-6" />
          </Link>
        </div>
      </div>
    </div>
  );
}
