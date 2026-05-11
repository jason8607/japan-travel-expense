"use client";

import type { ExpenseFilterState } from "@/components/expense/expense-filter";
import { EMPTY_FILTER, ExpenseFilter } from "@/components/expense/expense-filter";
import { ExpenseList } from "@/components/expense/expense-list";
import { MemberSummary } from "@/components/expense/member-summary";
import { AuthRequiredState } from "@/components/layout/auth-required-state";
import { EmptyState } from "@/components/layout/empty-state";
import { LoadingState } from "@/components/layout/loading-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useExpenses } from "@/hooks/use-expenses";
import { useApp } from "@/lib/context";
import { deleteGuestExpense } from "@/lib/guest-storage";
import { ClipboardList, Plane, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export default function RecordsPage() {
  const { user, currentTrip, tripMembers, isGuest, loading: ctxLoading } = useApp();
  const { expenses, loading, error, refresh } = useExpenses();
  const [groupBy, setGroupBy] = useState<"date" | "category" | "member">("date");
  const [filter, setFilter] = useState<ExpenseFilterState>(EMPTY_FILTER);

  useEffect(() => {
    if (isGuest && groupBy === "member") setGroupBy("date");
  }, [groupBy, isGuest]);

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
    return <LoadingState />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <p className="text-sm text-destructive">載入消費紀錄失敗</p>
        <button onClick={refresh} className="text-sm text-primary underline">重新載入</button>
      </div>
    );
  }

  if (!user && !isGuest) {
    return (
      <AuthRequiredState
        icon={ClipboardList}
        description="登入或使用訪客模式後，就能查看、篩選與管理旅程中的所有消費紀錄。"
      />
    );
  }

  if (!currentTrip) {
    return (
      <EmptyState
        icon={Plane}
        title="先建立一趟旅程"
        description="建立旅程後，就能開始新增、篩選與管理所有消費紀錄。"
        action={{ label: "建立旅程", href: "/trip/new" }}
      />
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto pb-24">
        <div className="px-4 pb-3">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">
                {currentTrip.name}
              </h1>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-semibold tabular-nums text-foreground">
                {filtered.length} 筆
              </p>
              {filtered.length !== expenses.length && (
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  共 {expenses.length} 筆
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 mb-3">
          <ExpenseFilter
            onChange={setFilter}
          />
        </div>

        <div className="px-4 mb-5 space-y-2">
          <Tabs
            value={groupBy}
            onValueChange={(v) => setGroupBy(v as "date" | "category" | "member")}
            className="min-w-0"
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
                  成員花費
                </TabsTrigger>
              )}
            </TabsList>
          </Tabs>
        </div>

        {groupBy === "member" ? (
          <MemberSummary expenses={filtered} tripMembers={tripMembers} onDelete={handleDelete} />
        ) : (
          <ExpenseList
            expenses={filtered}
            groupBy={groupBy}
            onDelete={handleDelete}
            emptyTitle={expenses.length === 0 ? "還沒有消費紀錄" : "找不到符合條件的紀錄"}
            emptyDescription={
              expenses.length === 0
                ? "新增第一筆消費後，這裡會依日期或類別整理你的花費。"
                : "調整篩選條件或清除搜尋，就能看到更多消費紀錄。"
            }
          />
        )}
      </div>

      {/* FAB stays in the thumb zone without adding decorative elevation. */}
      <Link
        href="/records/new"
        aria-label="新增消費"
        className="absolute right-4 bottom-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground ring-1 ring-primary/20 transition-colors hover:bg-primary/90 active:translate-y-px"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  );
}
