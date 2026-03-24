"use client";

import { Progress } from "@/components/ui/progress";
import { formatJPY } from "@/lib/exchange-rate";

interface BudgetProgressProps {
  cashSpent: number;
  cashBudget: number;
}

export function BudgetProgress({ cashSpent, cashBudget }: BudgetProgressProps) {
  if (!cashBudget) return null;

  const percentage = Math.min((cashSpent / cashBudget) * 100, 100);
  const remaining = Math.max(cashBudget - cashSpent, 0);
  const isOver = cashSpent > cashBudget;

  return (
    <div className="mx-4 rounded-2xl bg-white p-4 shadow-sm border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">現金預算</span>
        <span className="text-sm text-muted-foreground">
          {formatJPY(cashSpent)} / {formatJPY(cashBudget)}
        </span>
      </div>
      <Progress
        value={percentage}
        className="h-2.5"
      />
      <p
        className={`text-xs mt-1.5 ${isOver ? "text-red-500" : "text-muted-foreground"}`}
      >
        {isOver
          ? `已超出 ${formatJPY(cashSpent - cashBudget)}`
          : `剩餘 ${formatJPY(remaining)}`}
      </p>
    </div>
  );
}
