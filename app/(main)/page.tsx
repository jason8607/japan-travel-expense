"use client";

import { BigSummaryCard } from "@/components/dashboard/big-summary-card";
import { ExpenseCard } from "@/components/expense/expense-card";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useCategories } from "@/hooks/use-categories";
import { useCreditCards } from "@/hooks/use-credit-cards";
import { useExpenses } from "@/hooks/use-expenses";
import { calculateTotalCashback } from "@/lib/cashback";
import { useApp } from "@/lib/context";
import { FALLBACK_RATE, formatJPY, formatTWD, getExchangeRate } from "@/lib/exchange-rate";
import { deleteGuestExpense } from "@/lib/guest-storage";
import { differenceInDays, parseISO } from "date-fns";
import { Plus } from "lucide-react";
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
      await refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "刪除失敗";
      toast.error(message);
    }
  };

  if (appLoading || loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="mb-2 animate-pulse inline-flex">
            <Image src="/icon-transparent.png" alt="旅帳" width={48} height={48} priority />
          </div>
          <p className="text-sm text-muted-foreground">載入中...</p>
        </div>
      </div>
    );
  }

  if (!user && !isGuest) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4">
        <Image
          src="/icon-transparent.png"
          alt="旅帳"
          width={72}
          height={72}
          className="mb-4"
          priority
        />
        <h1 className="text-2xl font-bold mb-2">旅帳</h1>
        <p className="text-muted-foreground text-sm mb-6 text-center">
          旅遊智慧記帳 App
          <br />
          AI 收據辨識 · 即時統計 · 多人記帳
        </p>
        <Link
          href="/auth/login"
          className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-xl font-medium"
        >
          開始使用
        </Link>
        <button
          onClick={enterGuestMode}
          className="mt-3 text-sm text-primary hover:text-primary font-medium transition-colors"
        >
          不登入，先試用 →
        </button>
      </div>
    );
  }

  if (!currentTrip) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4">
        <div className="text-5xl mb-4">✈️</div>
        <h2 className="text-xl font-bold mb-2">建立你的第一趟旅程</h2>
        <p className="text-muted-foreground text-sm mb-6 text-center">
          設定旅程日期和預算，開始記帳吧！
        </p>
        <Link
          href="/trip/new"
          className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-xl font-medium"
        >
          建立旅程
        </Link>
      </div>
    );
  }

  const tripStart = parseISO(currentTrip.start_date);
  const tripEnd = parseISO(currentTrip.end_date);
  const totalDays = differenceInDays(tripEnd, tripStart) + 1;

  const cashbackTotal = calculateTotalCashback(expenses, cards);
  const recent = expenses.slice(0, 3);

  return (
    <div className="pb-4">
      {/* Guest Banner */}
      {isGuest && (
        <div className="mx-4 mt-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-center justify-between">
          <p className="text-xs text-amber-800">
            試用模式 — 資料僅存在此裝置
          </p>
          <Link
            href="/auth/login"
            className="text-xs font-semibold text-amber-700 hover:text-amber-900 whitespace-nowrap ml-3"
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
      <div className="flex justify-center px-4 pb-4">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-card border border-border/60 px-3 py-1 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-[10px] text-muted-foreground">JPY 100</span>
          <span className="text-[10px] text-muted-foreground/60">≈</span>
          <span className="text-[10px] font-semibold text-foreground">
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
        <div className="rounded-2xl bg-card border border-border/60 px-4 py-3.5 shadow-sm">
          <p className="text-[11px] text-muted-foreground font-medium">今日</p>
          <p className="text-xl font-bold text-foreground tracking-tight mt-1.5">
            {formatJPY(todayTotal)}
          </p>
        </div>
        <Link href="/stats" className="block">
          <div className="rounded-2xl bg-card border border-border/60 px-4 py-3.5 shadow-sm h-full">
            <p className="text-[11px] text-muted-foreground font-medium">回饋</p>
            <p className="text-xl font-bold text-emerald-600 tracking-tight mt-1.5">
              {cards.length > 0 ? formatTWD(cashbackTotal) : "—"}
            </p>
          </div>
        </Link>
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
          <div className="rounded-2xl border border-dashed border-border py-10 text-center text-xs text-muted-foreground">
            還沒有記錄，點下方 + 新增第一筆
          </div>
        ) : (
          <div className="space-y-2">
            {recent.map((e) => (
              <ExpenseCard key={e.id} expense={e} categories={categories} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </section>

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
