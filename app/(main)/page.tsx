"use client";

import { useApp } from "@/lib/context";
import { useExpenses } from "@/hooks/use-expenses";
import { TripSummary } from "@/components/dashboard/trip-summary";
import { BudgetProgress } from "@/components/dashboard/budget-progress";
import { ExpenseCard } from "@/components/expense/expense-card";
import { formatJPY, formatTWD } from "@/lib/exchange-rate";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const { user, profile, currentTrip, loading: appLoading } = useApp();
  const { expenses, loading, todayTotal, totalJpy, totalTwd, cashTotal, count } =
    useExpenses();
  const router = useRouter();

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

  const todayExpenses = expenses.filter(
    (e) => e.expense_date === new Date().toISOString().split("T")[0]
  );

  return (
    <div className="space-y-4 pb-4">
      <div className="px-4 pt-4">
        <p className="text-sm text-muted-foreground">
          {profile?.avatar_emoji} {profile?.display_name}，{currentTrip.name}
        </p>
      </div>

      <TripSummary
        totalJpy={totalJpy}
        totalTwd={totalTwd}
        count={count}
        tripName={currentTrip.name}
      />

      <BudgetProgress
        cashSpent={cashTotal}
        cashBudget={currentTrip.cash_budget || 0}
      />

      {todayTotal > 0 && (
        <div className="mx-4 rounded-2xl bg-orange-50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">今日花費</span>
            <div className="text-right">
              <span className="font-bold">{formatJPY(todayTotal)}</span>
              <span className="text-xs text-muted-foreground ml-1">
                ({todayExpenses.length} 筆)
              </span>
            </div>
          </div>
        </div>
      )}

      {todayExpenses.length > 0 && (
        <div className="px-4 space-y-2">
          <h3 className="text-sm font-medium">今日消費</h3>
          {todayExpenses.slice(0, 5).map((expense) => (
            <ExpenseCard key={expense.id} expense={expense} />
          ))}
        </div>
      )}

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
