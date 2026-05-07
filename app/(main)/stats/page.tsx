"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/lib/context";
import { useExpenses } from "@/hooks/use-expenses";
import { CategoryChart } from "@/components/stats/category-chart";
import { PaymentChart } from "@/components/stats/payment-chart";
import { TopExpenses } from "@/components/stats/top-expenses";
import { CashbackChart } from "@/components/stats/cashback-chart";
import { DayTabs, PRE_TRIP_KEY } from "@/components/stats/day-tabs";
import { AuthRequiredState } from "@/components/layout/auth-required-state";
import { EmptyState } from "@/components/layout/empty-state";
import { LoadingState } from "@/components/layout/loading-state";
import { formatJPY, formatTWD } from "@/lib/exchange-rate";
import { formatDateLabel, isPreTripDate } from "@/lib/utils";
import Link from "next/link";
import { BarChart3, ClipboardList, Plane, ReceiptText } from "lucide-react";

export default function StatsPage() {
  const { user, currentTrip, isGuest, loading: ctxLoading } = useApp();
  const { expenses, loading } = useExpenses();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const dates = useMemo(() => {
    const set = new Set(expenses.map((e) => e.expense_date));
    return [...set].sort();
  }, [expenses]);

  const filtered = useMemo(() => {
    if (!selectedDate) return expenses;
    if (selectedDate === PRE_TRIP_KEY && currentTrip) {
      return expenses.filter((e) => isPreTripDate(e.expense_date, currentTrip.start_date));
    }
    return expenses.filter((e) => e.expense_date === selectedDate);
  }, [expenses, selectedDate, currentTrip]);

  const totalJpy = filtered.reduce((s, e) => s + e.amount_jpy, 0);
  const totalTwd = filtered.reduce((s, e) => s + e.amount_twd, 0);

  if (loading || ctxLoading) {
    return <LoadingState />;
  }

  if (!currentTrip) {
    if (!user && !isGuest) {
      return (
        <AuthRequiredState
          icon={BarChart3}
          description="登入或使用訪客模式後，就能查看分類支出、付款方式與信用卡回饋統計。"
        />
      );
    }

    return (
      <EmptyState
        icon={Plane}
        title="先建立一趟旅程"
        description="旅程建立後，統計頁會整理分類支出、付款方式與信用卡回饋。"
        action={{ label: "建立旅程", href: "/trip/new" }}
        className="min-h-full"
      />
    );
  }

  if (expenses.length === 0) {
    return (
      <EmptyState
        icon={ReceiptText}
        title="還沒有統計資料"
        description="新增第一筆消費後，分類、付款方式與回饋分析會出現在這裡。"
        action={{ label: "新增消費", href: "/records/new" }}
        className="min-h-full"
      />
    );
  }

  const dateLabel = selectedDate
    ? selectedDate === PRE_TRIP_KEY
      ? "行前"
      : formatDateLabel(selectedDate, currentTrip?.start_date)
    : null;

  return (
    <div className="pb-4">
      <div className="space-y-4 px-4">
        <DayTabs dates={dates} selected={selectedDate} onChange={setSelectedDate} tripStartDate={currentTrip?.start_date} />

        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 text-center">
          <p className="text-xs text-muted-foreground mb-1">
            {dateLabel ? `${dateLabel} 花費` : "全部花費"}
          </p>
          <p className="text-2xl font-semibold tabular-nums">{formatJPY(totalJpy)}</p>
          <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
            ≈ {formatTWD(totalTwd)} · {filtered.length} 筆
          </p>
        </div>

        <CategoryChart
          expenses={filtered}
          title={dateLabel ? `${dateLabel} 分類支出` : "分類支出"}
        />

        <PaymentChart
          expenses={filtered}
          title={dateLabel ? `${dateLabel} 支付方式` : "支付方式"}
        />

        <TopExpenses
          expenses={filtered}
          title={dateLabel ? `${dateLabel} 花費排名` : "花費排名"}
        />

        <CashbackChart expenses={expenses} />

        <Link
          href="/summary"
          className="flex items-center justify-center gap-2 rounded-xl bg-card py-3.5 text-sm font-medium text-muted-foreground ring-1 ring-foreground/10 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px"
        >
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          查看旅行總結
        </Link>
      </div>
    </div>
  );
}
