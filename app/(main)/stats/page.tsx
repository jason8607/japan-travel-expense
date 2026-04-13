"use client";

import { useApp } from "@/lib/context";
import { useExpenses } from "@/hooks/use-expenses";
import { CategoryChart } from "@/components/stats/category-chart";
import { PaymentChart } from "@/components/stats/payment-chart";
import { DailyTrend } from "@/components/stats/daily-trend";
import { TopExpenses } from "@/components/stats/top-expenses";
import { CashbackChart } from "@/components/stats/cashback-chart";

export default function StatsPage() {
  const { currentTrip, loading: ctxLoading } = useApp();
  const { expenses, loading } = useExpenses();

  if (loading || ctxLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-muted-foreground">載入中...</p>
      </div>
    );
  }

  if (!currentTrip) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground">
        <p className="text-4xl mb-2">📊</p>
        <p className="text-sm">請先建立旅程</p>
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground">
        <p className="text-4xl mb-2">📊</p>
        <p className="text-sm">還沒有消費紀錄，統計數據會在這裡顯示</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 pb-4">
      <CategoryChart expenses={expenses} />
      <PaymentChart expenses={expenses} />
      <CashbackChart expenses={expenses} />
      <DailyTrend
        expenses={expenses}
        startDate={currentTrip.start_date}
        endDate={currentTrip.end_date}
      />
      <TopExpenses expenses={expenses} />
    </div>
  );
}
