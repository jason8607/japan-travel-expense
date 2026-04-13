"use client";

import { formatJPY } from "@/lib/exchange-rate";
import { cn } from "@/lib/utils";
import { differenceInDays, parseISO, format } from "date-fns";
import type { Trip, Expense } from "@/types";

interface BudgetBarProps {
  trip: Trip;
  expenses: Expense[];
  compact?: boolean;
}

export function BudgetBar({ trip, expenses, compact = false }: BudgetBarProps) {
  const budget = trip.budget_jpy;
  if (!budget || budget <= 0) return null;

  const totalSpent = expenses.reduce((s, e) => s + e.amount_jpy, 0);
  const percentage = Math.min(Math.round((totalSpent / budget) * 100), 100);
  const isOver = totalSpent > budget;
  const overAmount = totalSpent - budget;

  const tripStart = parseISO(trip.start_date);
  const tripEnd = parseISO(trip.end_date);
  const totalDays = differenceInDays(tripEnd, tripStart) + 1;

  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  const currentDay = Math.min(
    Math.max(differenceInDays(now, tripStart) + 1, 1),
    totalDays
  );
  const remainingBudget = Math.max(budget - totalSpent, 0);

  const todaySpent = expenses
    .filter((e) => e.expense_date === today)
    .reduce((s, e) => s + e.amount_jpy, 0);

  if (compact) {
    return (
      <div className="rounded-xl border bg-white px-4 py-2.5 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">今日已花</span>
          <span className="font-bold text-slate-800">
            {formatJPY(todaySpent)}
          </span>
        </div>
        <div className={cn(
          "text-[10px] px-2 py-0.5 rounded-full font-medium",
          isOver
            ? "bg-red-50 text-red-500"
            : "bg-blue-50 text-blue-500"
        )}>
          {isOver ? `超支 +${formatJPY(overAmount)}` : `剩 ${formatJPY(remainingBudget)}`}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white border border-slate-100 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground font-medium">旅程預算</span>
        <span className="text-xs text-muted-foreground">
          Day {currentDay} / {totalDays}
        </span>
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className={cn("text-xl font-bold", isOver ? "text-red-500" : "text-slate-800")}>
          {formatJPY(totalSpent)}
        </span>
        <span className="text-xs text-slate-400">/ {formatJPY(budget)}</span>
      </div>

      <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden mt-2.5">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isOver
              ? "bg-linear-to-r from-red-400 to-red-500"
              : percentage > 80
                ? "bg-linear-to-r from-amber-400 to-amber-500"
                : "bg-linear-to-r from-blue-400 to-blue-500"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="mt-2 text-[11px]">
        {isOver ? (
          <span className="text-red-500 font-medium">
            已超支 +{formatJPY(overAmount)}
          </span>
        ) : (
          <span className="text-slate-400">
            剩餘 {formatJPY(remainingBudget)}
          </span>
        )}
      </div>
    </div>
  );
}
