"use client";

import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatJPY, formatTWD } from "@/lib/exchange-rate";
import { CATEGORIES } from "@/types";
import type { Expense } from "@/types";
import Link from "next/link";

interface ExpenseCardProps {
  expense: Expense;
}

export function ExpenseCard({ expense }: ExpenseCardProps) {
  const categoryInfo = CATEGORIES.find((c) => c.value === expense.category);

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-2xl border shadow-sm">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg">
        {expense.profile?.avatar_emoji || "🧑"}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{expense.title}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <Badge
            variant="secondary"
            className="text-[10px] px-1.5 py-0 h-4"
            style={{
              backgroundColor: categoryInfo?.color + "20",
              color: categoryInfo?.color,
            }}
          >
            {expense.category}
          </Badge>
          <span className="text-[10px] text-muted-foreground">
            {expense.payment_method}
          </span>
          {expense.store_name && (
            <>
              <span className="text-[10px] text-muted-foreground">·</span>
              <span className="text-[10px] text-muted-foreground truncate">
                🏪 {expense.store_name}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 text-right">
        <p className="font-bold text-sm">{formatJPY(expense.amount_jpy)}</p>
        <p className="text-[10px] text-muted-foreground">
          {formatTWD(expense.amount_twd)}
        </p>
      </div>

      <Link
        href={`/records/new?edit=${expense.id}`}
        className="flex-shrink-0 p-1.5 text-muted-foreground hover:text-foreground"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
