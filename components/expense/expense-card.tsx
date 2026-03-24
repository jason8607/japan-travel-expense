"use client";

import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatJPY, formatTWD } from "@/lib/exchange-rate";
import { CATEGORIES, PAYMENT_METHODS } from "@/types";
import type { Expense } from "@/types";
import Link from "next/link";

interface ExpenseCardProps {
  expense: Expense;
}

export function ExpenseCard({ expense }: ExpenseCardProps) {
  const categoryInfo = CATEGORIES.find((c) => c.value === expense.category);
  const paymentInfo = PAYMENT_METHODS.find((p) => p.value === expense.payment_method);

  return (
    <div className="flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      {/* Avatar */}
      <div className="shrink-0 w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center text-xl">
        {expense.profile?.avatar_emoji || "🧑"}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-slate-800 truncate">{expense.title}</p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <Badge
            variant="secondary"
            className="text-[10px] px-1.5 py-0 h-[18px] gap-0.5 font-medium"
            style={{
              backgroundColor: categoryInfo?.color + "18",
              color: categoryInfo?.color,
            }}
          >
            {categoryInfo?.icon} {expense.category}
          </Badge>
          <span className="text-[10px] text-muted-foreground">
            {paymentInfo?.icon} {expense.payment_method}
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

      {/* Amount */}
      <div className="shrink-0 text-right">
        <p className="font-bold text-sm text-slate-800">{formatJPY(expense.amount_jpy)}</p>
        <p className="text-[10px] text-muted-foreground">
          {formatTWD(expense.amount_twd)}
        </p>
      </div>

      {/* Edit */}
      <Link
        href={`/records/new?edit=${expense.id}`}
        className="shrink-0 p-1.5 text-slate-300 hover:text-orange-500 transition-colors"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
