"use client";

import { useApp } from "@/lib/context";
import { useExpenses } from "@/hooks/use-expenses";
import { ExpenseCard } from "@/components/expense/expense-card";
import { BudgetBar } from "@/components/home/budget-bar";
import { UserAvatar } from "@/components/ui/user-avatar";
import { formatJPY, formatTWD } from "@/lib/exchange-rate";
import {
  Plus,
  Receipt,
  TrendingUp,
  CalendarDays,
  Wallet,
  ClipboardList,
} from "lucide-react";
import Link from "next/link";
import { differenceInDays, parseISO } from "date-fns";

export default function HomePage() {
  const { user, profile, currentTrip, isGuest, enterGuestMode, loading: appLoading } = useApp();
  const { expenses, loading, todayTotal, totalJpy, totalTwd } =
    useExpenses();

  if (appLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-2 animate-bounce">🗾</div>
          <p className="text-sm text-muted-foreground">載入中...</p>
        </div>
      </div>
    );
  }

  if (!user && !isGuest) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <div className="text-5xl mb-4">🗾</div>
        <h1 className="text-2xl font-bold mb-2">旅帳</h1>
        <p className="text-muted-foreground text-sm mb-6 text-center">
          日本旅遊智慧記帳 App
          <br />
          AI 收據辨識 · 即時統計 · 多人記帳
        </p>
        <Link
          href="/auth/login"
          className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-xl font-medium"
        >
          開始使用
        </Link>
        <button
          onClick={enterGuestMode}
          className="mt-3 text-sm text-blue-500 hover:text-blue-600 font-medium transition-colors"
        >
          不登入，先試用 →
        </button>
      </div>
    );
  }

  if (!currentTrip) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <div className="text-5xl mb-4">✈️</div>
        <h2 className="text-xl font-bold mb-2">建立你的第一趟旅程</h2>
        <p className="text-muted-foreground text-sm mb-6 text-center">
          設定旅程日期和預算，開始記帳吧！
        </p>
        <Link
          href="/trip/new"
          className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-xl font-medium"
        >
          建立旅程
        </Link>
      </div>
    );
  }

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const todayExpenses = expenses.filter((e) => e.expense_date === today);
  const todayTwd = todayExpenses.reduce((s, e) => s + e.amount_twd, 0);

  const tripStart = parseISO(currentTrip.start_date);
  const tripEnd = parseISO(currentTrip.end_date);
  const totalDays = differenceInDays(tripEnd, tripStart) + 1;
  const currentDay = Math.min(
    Math.max(differenceInDays(new Date(), tripStart) + 1, 1),
    totalDays
  );

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

      {/* Trip Name Header */}
      <div className="text-center pt-6 pb-4 px-4">
        <h1 className="text-xl font-bold text-slate-800">
          {currentTrip.name}
        </h1>
        <div className="flex items-center justify-center gap-1.5 mt-1">
          <UserAvatar avatarUrl={profile?.avatar_url} avatarEmoji={profile?.avatar_emoji} size="xs" />
          <span className="text-xs text-muted-foreground">{profile?.display_name}</span>
        </div>
      </div>

      {/* 2x2 Stats Grid */}
      <div className="grid grid-cols-2 gap-3 px-4">
        {/* 今日支出 */}
        <div className="rounded-2xl bg-white border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
              <Receipt className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">今日支出</span>
          </div>
          <p className="text-xl font-bold text-slate-800 tracking-tight">
            {formatJPY(todayTotal)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            ≈ {formatTWD(todayTwd)}
          </p>
        </div>

        {/* 旅程累計 */}
        <Link href="/records" className="block">
          <div className="rounded-2xl bg-white border border-slate-100 p-4 shadow-sm h-full">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">旅程累計</span>
            </div>
            <p className="text-xl font-bold text-slate-800 tracking-tight">
              {formatJPY(totalJpy)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              ≈ {formatTWD(totalTwd)}
            </p>
          </div>
        </Link>

        {/* 今日預算 */}
        {currentTrip.budget_jpy ? (() => {
          const dailyBudget = Math.round(currentTrip.budget_jpy! / totalDays);
          const isOver = todayTotal > dailyBudget;
          return (
            <div className="rounded-2xl bg-white border border-slate-100 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <Wallet className="h-3.5 w-3.5 text-emerald-500" />
                </div>
                <span className="text-xs text-muted-foreground font-medium">今日預算</span>
              </div>
              <p className="text-xl font-bold text-slate-800 tracking-tight">
                {formatJPY(dailyBudget)}
              </p>
              <p className={`text-[11px] mt-0.5 ${isOver ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                {isOver ? `超支 ${formatJPY(todayTotal - dailyBudget)}` : `還可花 ${formatJPY(dailyBudget - todayTotal)}`}
              </p>
            </div>
          );
        })() : (
          <Link href="/settings" className="block">
            <div className="rounded-2xl bg-white border border-dashed border-slate-200 p-4 shadow-sm h-full flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:border-blue-300 hover:text-blue-500 transition-colors">
              <Wallet className="h-5 w-5" />
              <span className="text-xs font-medium">設定預算</span>
            </div>
          </Link>
        )}

        {/* 旅程天數 */}
        <div className="rounded-2xl bg-white border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
              <CalendarDays className="h-3.5 w-3.5 text-violet-500" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">旅程天數</span>
          </div>
          <p className="text-xl font-bold text-slate-800 tracking-tight">
            Day {currentDay}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            共 {totalDays} 天
          </p>
        </div>
      </div>

      {/* 旅程預算進度 */}
      {currentTrip.budget_jpy && (
        <div className="mt-4 px-4">
          <BudgetBar trip={currentTrip} expenses={expenses} />
        </div>
      )}

      {/* 今日花費 */}
      {todayExpenses.length > 0 && (
        <div className="mt-6 px-4 space-y-2">
          <h3 className="text-sm font-semibold text-slate-700">今日花費</h3>
          {todayExpenses.slice(0, 5).map((expense) => (
            <ExpenseCard key={expense.id} expense={expense} />
          ))}
        </div>
      )}

      {/* Trip summary link */}
      {expenses.length > 0 && (
        <div className="mt-4 px-4">
          <Link
            href="/summary"
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 shadow-sm transition-colors"
          >
            <ClipboardList className="h-4 w-4 text-blue-500" />
            查看旅行總結
          </Link>
        </div>
      )}

      {/* FAB */}
      <div className="fixed bottom-20 z-40 left-1/2 w-full max-w-lg -translate-x-1/2 pointer-events-none flex justify-end pr-4">
        <Link
          href="/records/new"
          aria-label="新增消費"
          className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg hover:bg-blue-600 transition-all active:scale-95"
        >
          <Plus className="h-6 w-6" />
        </Link>
      </div>
    </div>
  );
}
