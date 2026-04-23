"use client";

import { formatJPY, formatTWD } from "@/lib/exchange-rate";
import type { Expense } from "@/types";

interface TopExpensesProps {
  expenses: Expense[];
  title?: string;
}

export function TopExpenses({ expenses, title = "花費排名" }: TopExpensesProps) {
  const sorted = [...expenses]
    .sort((a, b) => b.amount_jpy - a.amount_jpy)
    .slice(0, 10);

  if (sorted.length === 0) return null;

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <h3 className="font-bold mb-3">{title}</h3>
      <div className="space-y-2">
        {sorted.map((expense, index) => (
          <div
            key={expense.id}
            className="flex items-center gap-3 text-sm"
          >
            <span className="w-5 text-center text-xs font-bold text-muted-foreground">
              {index + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="truncate font-medium">{expense.title}</p>
              <p className="text-[10px] text-muted-foreground">
                {expense.expense_date} · {expense.store_name || expense.category}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-bold">{formatJPY(expense.amount_jpy)}</p>
              <p className="text-[10px] text-muted-foreground">
                {formatTWD(expense.amount_twd)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
