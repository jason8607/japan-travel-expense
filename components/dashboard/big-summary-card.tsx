"use client";

import Link from "next/link";
import { formatJPY, formatTWD } from "@/lib/exchange-rate";
import { cn } from "@/lib/utils";

interface BigSummaryCardProps {
  totalJpy: number;
  totalTwd: number;
  count: number;
  budgetJpy?: number | null;
}

export function BigSummaryCard({
  totalJpy,
  totalTwd,
  count,
  budgetJpy,
}: BigSummaryCardProps) {
  const hasBudget = !!budgetJpy && budgetJpy > 0;
  const percentage = hasBudget
    ? Math.min(Math.round((totalJpy / budgetJpy!) * 100), 100)
    : 0;
  const isOver = hasBudget && totalJpy > budgetJpy!;

  return (
    <Link href="/records" className="block mx-4">
      <div className="rounded-3xl bg-card p-5 shadow-sm border border-border/60">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground font-medium">旅程總支出</p>
            <p className="text-[2rem] leading-tight font-bold tracking-tight mt-1 text-foreground">
              {formatJPY(totalJpy)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              ≈ {formatTWD(totalTwd)}
            </p>
          </div>
          <div className="shrink-0 flex flex-col items-center justify-center rounded-2xl bg-muted px-3 py-2.5 min-w-[52px]">
            <p className="text-xl font-bold text-foreground leading-none">{count}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">筆</p>
          </div>
        </div>

        {hasBudget && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-muted-foreground">
                預算 {formatJPY(budgetJpy!)}
              </span>
              <span
                className={cn(
                  "text-[11px] font-semibold",
                  isOver ? "text-red-500" : "text-muted-foreground"
                )}
              >
                {percentage}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full w-full rounded-full transition-[transform] duration-500 origin-left",
                  isOver
                    ? "bg-linear-to-r from-red-400 to-red-500"
                    : percentage > 80
                      ? "bg-linear-to-r from-amber-400 to-orange-500"
                      : "bg-linear-to-r from-rose-300 to-primary"
                )}
                style={{ transform: `scaleX(${percentage / 100})` }}
              />
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
