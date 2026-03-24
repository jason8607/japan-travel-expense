"use client";

import { useApp } from "@/lib/context";
import { useExpenses } from "@/hooks/use-expenses";
import { ExpenseCard } from "@/components/expense/expense-card";
import { formatJPY, formatTWD } from "@/lib/exchange-rate";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  Receipt,
  TrendingUp,
  Target,
  CalendarDays,
} from "lucide-react";
import Link from "next/link";
import { differenceInDays, parseISO } from "date-fns";

export default function HomePage() {
  const { user, profile, currentTrip, loading: appLoading } = useApp();
  const { expenses, loading, todayTotal, totalJpy, totalTwd, cashTotal, count } =
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

  if (!user) {
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
          className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-xl font-medium"
        >
          開始使用
        </Link>
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
          className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-xl font-medium"
        >
          建立旅程
        </Link>
      </div>
    );
  }

  const today = new Date().toISOString().split("T")[0];
  const todayExpenses = expenses.filter((e) => e.expense_date === today);
  const todayTwd = todayExpenses.reduce((s, e) => s + e.amount_twd, 0);

  const tripStart = parseISO(currentTrip.start_date);
  const tripEnd = parseISO(currentTrip.end_date);
  const totalDays = differenceInDays(tripEnd, tripStart) + 1;
  const currentDay = Math.min(
    Math.max(differenceInDays(new Date(), tripStart) + 1, 1),
    totalDays
  );

  const cashBudget = currentTrip.cash_budget || 0;
  const suicaTotal = expenses
    .filter((e) => e.payment_method === "Suica")
    .reduce((s, e) => s + e.amount_jpy, 0);
  const budgetSpent = cashTotal + suicaTotal;
  const budgetPercentage = cashBudget
    ? Math.min(Math.round((budgetSpent / cashBudget) * 100), 100)
    : 0;

  return (
    <div className="pb-4">
      {/* Trip Name Header */}
      <div className="text-center pt-6 pb-4 px-4">
        <h1 className="text-xl font-bold text-slate-800">
          {currentTrip.name}
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          {profile?.avatar_emoji} {profile?.display_name}
        </p>
      </div>

      {/* 2x2 Stats Grid */}
      <div className="grid grid-cols-2 gap-3 px-4">
        {/* 今日支出 */}
        <div className="rounded-2xl bg-white border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center">
              <Receipt className="h-3.5 w-3.5 text-orange-500" />
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

        {/* 預算進度 */}
        {cashBudget > 0 && (
          <div className="rounded-2xl bg-white border border-slate-100 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Target className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                預算進度（現金 + Suica）
              </span>
            </div>
            <p className="text-xl font-bold text-slate-800 tracking-tight">
              {budgetPercentage}%
            </p>
            <Progress value={budgetPercentage} className="h-1.5 mt-2" />
          </div>
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

      {/* 今日花費 */}
      {todayExpenses.length > 0 && (
        <div className="mt-6 px-4 space-y-2">
          <h3 className="text-sm font-semibold text-slate-700">今日花費</h3>
          {todayExpenses.slice(0, 5).map((expense) => (
            <ExpenseCard key={expense.id} expense={expense} />
          ))}
        </div>
      )}

      {/* FAB */}
      <div className="fixed bottom-20 right-4 z-40">
        <Link
          href="/records/new"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg hover:bg-orange-600 transition-all active:scale-95"
        >
          <Plus className="h-6 w-6" />
        </Link>
      </div>
    </div>
  );
}
