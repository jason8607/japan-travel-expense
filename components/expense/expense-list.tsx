"use client";

import { format, parseISO } from "date-fns";
import { zhTW } from "date-fns/locale";
import { ExpenseCard } from "./expense-card";
import { formatJPY, formatTWD } from "@/lib/exchange-rate";
import { useCategories } from "@/hooks/use-categories";
import type { Expense, CategoryItem } from "@/types";

interface ExpenseListProps {
  expenses: Expense[];
  groupBy: "date" | "category";
  onDelete?: (id: string) => Promise<void>;
}

function getDayOfWeek(dateStr: string) {
  try {
    const days = ["日", "一", "二", "三", "四", "五", "六"];
    return days[parseISO(dateStr).getDay()];
  } catch {
    return "?";
  }
}

export function ExpenseList({ expenses, groupBy, onDelete }: ExpenseListProps) {
  const { categories } = useCategories();

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p className="text-4xl mb-2">📝</p>
        <p className="text-sm">還沒有消費紀錄</p>
      </div>
    );
  }

  const grouped = groupExpenses(expenses, groupBy);

  return (
    <div className="space-y-6">
      {grouped.map((group) => {
        const total = group.expenses.reduce((s, e) => s + e.amount_jpy, 0);
        const totalTwd = group.expenses.reduce((s, e) => s + e.amount_twd, 0);

        return (
          <div key={group.key}>
            <div className="flex items-center justify-between px-4 mb-2">
              <span className="text-sm font-medium text-foreground">
                {group.label}
              </span>
              <span className="text-xs text-muted-foreground">
                總計 {formatJPY(total)} ≈ {formatTWD(totalTwd)}
              </span>
            </div>
            <div className="space-y-2 px-4">
              {group.expenses.map((expense) => (
                <ExpenseCard key={expense.id} expense={expense} onDelete={onDelete} categories={categories} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function groupExpenses(expenses: Expense[], groupBy: "date" | "category") {
  const map = new Map<string, Expense[]>();

  for (const e of expenses) {
    const key = groupBy === "date" ? e.expense_date : e.category;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }

  const entries = Array.from(map.entries()).map(([key, exps]) => ({
    key,
    label:
      groupBy === "date"
        ? (() => { try { return `${format(parseISO(key), "yyyy-MM-dd", { locale: zhTW })}（${getDayOfWeek(key)}）`; } catch { return key; } })()
        : key,
    expenses: exps,
  }));

  if (groupBy === "date") {
    entries.sort((a, b) => b.key.localeCompare(a.key));
  }

  return entries;
}
