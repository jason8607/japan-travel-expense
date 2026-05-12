"use client";

import { BigSummaryCard } from "@/components/dashboard/big-summary-card";
import { ExpenseCard } from "@/components/expense/expense-card";
import { EmptyState } from "@/components/layout/empty-state";
import { LoadingState } from "@/components/layout/loading-state";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useCategories } from "@/hooks/use-categories";
import { useCreditCards } from "@/hooks/use-credit-cards";
import { useExpenses } from "@/hooks/use-expenses";
import { calculateTotalCashback } from "@/lib/cashback";
import { useApp } from "@/lib/context";
import { FALLBACK_RATE, formatJPY, formatTWD, getExchangeRate } from "@/lib/exchange-rate";
import { deleteGuestExpense } from "@/lib/guest-storage";
import { notifyExpensesMutated } from "@/lib/expenses-mutated";
import { differenceInDays, parseISO } from "date-fns";
import { Plane, Plus, ReceiptText } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function HomePage() {
  const {
    user,
    profile,
    currentTrip,
    isGuest,
    enterGuestMode,
    loading: appLoading,
  } = useApp();
  const { expenses, loading, todayTotal, totalJpy, totalTwd, refresh } = useExpenses();
  const { cards } = useCreditCards();
  const { categories } = useCategories();
  const [rate, setRate] = useState<number>(FALLBACK_RATE);

  useEffect(() => {
    getExchangeRate().then(setRate).catch(() => {});
  }, []);

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
      notifyExpensesMutated();
      await refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "刪除失敗";
      toast.error(message);
    }
  };

  if (appLoading || loading) {
    return <LoadingState />;
  }

  if (!user && !isGuest) {
    return (
      <div className="flex min-h-0 flex-1 flex-col px-6">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <Image
            src="/icon-transparent.png"
            alt="旅帳"
            width={72}
            height={72}
            className="mb-4"
            priority
          />
          <h1 className="text-2xl font-bold mb-2">旅帳</h1>
          <p className="text-muted-foreground text-sm">
            旅遊智慧記帳 App
            <br />
            AI 收據辨識 · 即時統計 · 多人記帳
          </p>
        </div>
        <div className="flex flex-col items-center gap-3 pb-8">
          <Link
            href="/auth/login"
            className="inline-flex h-12 w-full max-w-xs items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 active:translate-y-px"
          >
            開始使用
          </Link>
          <button
            onClick={enterGuestMode}
            className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            不登入，先試用 →
          </button>
        </div>
      </div>
    );
  }

  if (!currentTrip) {
    return (
      <EmptyState
        icon={Plane}
        title="建立你的第一趟旅程"
        description="設定旅程日期和預算，開始記錄每一筆日本旅行花費。"
        action={{ label: "建立旅程", href: "/trip/new" }}
        className="flex min-h-0 flex-1 flex-col justify-center"
      />
    );
  }

  const tripStart = parseISO(currentTrip.start_date);
  const tripEnd = parseISO(currentTrip.end_date);
  const totalDays = differenceInDays(tripEnd, tripStart) + 1;

  const cashbackTotal = calculateTotalCashback(expenses, cards);
  const recent = expenses.slice(0, 3);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto pb-6">
      {/* Guest Banner */}
      {isGuest && (
        <div className="mx-4 mt-3 rounded-xl bg-warning-subtle border border-warning/30 px-4 py-3 flex items-center justify-between">
          <p className="text-xs text-warning-foreground">
            試用模式 — 資料僅存在此裝置
          </p>
          <Link
            href="/auth/login"
            className="text-xs font-semibold text-warning-foreground hover:text-warning-foreground/80 whitespace-nowrap ml-3"
          >
            登入保存 →
          </Link>
        </div>
      )}

      {/* Header */}
      <header className="flex items-start justify-between px-5 pt-6 pb-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground/70">
            TRIP
          </p>
          <h1 className="text-xl font-bold text-foreground mt-0.5 truncate">
            {currentTrip.name} {totalDays}日
          </h1>
        </div>
        <Link href="/settings" aria-label="設定" className="shrink-0">
          <UserAvatar
            avatarUrl={profile?.avatar_url}
            avatarEmoji={profile?.avatar_emoji}
            size="md"
          />
        </Link>
      </header>

      {/* 匯率 pill */}
      <div className="flex justify-start px-5 pb-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-card ring-1 ring-foreground/10 px-4 py-1.5">
          <span className="w-2 h-2 rounded-full bg-success" />
          <span className="text-xs text-muted-foreground">JPY 100</span>
          <span className="text-xs text-muted-foreground/60">≈</span>
          <span className="text-sm font-semibold text-foreground">
            TWD {(rate * 100).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Big summary card */}
      <BigSummaryCard
        totalJpy={totalJpy}
        totalTwd={totalTwd}
        count={expenses.length}
        budgetJpy={currentTrip.budget_jpy}
      />

      {/* 2 small cards: 今日 / 回饋 */}
      <div className="grid grid-cols-2 gap-3 px-4 mt-3">
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-3.5">
          <p className="text-[11px] text-muted-foreground font-medium">今日</p>
          <p className="text-xl font-bold text-foreground tracking-tight mt-1.5">
            {formatJPY(todayTotal)}
          </p>
        </div>
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-3.5 h-full">
          <p className="text-[11px] text-muted-foreground font-medium">回饋</p>
          <p className="text-xl font-bold text-success tracking-tight mt-1.5">
              {cards.length > 0 ? formatTWD(cashbackTotal) : "—"}
          </p>
        </div>
      </div>

      {/* 最近消費 */}
      <section className="mt-6 px-4">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-sm font-semibold text-foreground">最近消費</h2>
          {expenses.length > 3 && (
            <Link
              href="/records"
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              查看全部 →
            </Link>
          )}
        </div>
        {recent.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title="還沒有消費紀錄"
            description="點下方 + 新增第一筆，首頁就會開始顯示最近消費。"
            variant="section"
            className="px-0"
          />
        ) : (
          <div className="space-y-2">
            {recent.map((e) => (
              <ExpenseCard key={e.id} expense={e} categories={categories} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </section>

      </div>

      {/* FAB — 固定在中間滑動區塊的右下 */}
      <Link
        href="/records/new"
        aria-label="新增消費"
        className="absolute right-4 bottom-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all active:translate-y-px"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  );
}
