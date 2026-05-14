"use client";

import { formatJPY, formatTWD } from "@/lib/exchange-rate";
import { cn } from "@/lib/utils";
import { useState } from "react";

type TabType = "personal" | "trip";

interface BigSummaryCardProps {
  totalJpy: number;
  totalTwd: number;
  count: number;
  budgetJpy?: number | null;
  personalJpy: number;
  personalTwd: number;
  personalCount: number;
  personalBudgetJpy?: number | null;
}

export function BigSummaryCard({
  totalJpy,
  totalTwd,
  count,
  budgetJpy,
  personalJpy,
  personalTwd,
  personalCount,
  personalBudgetJpy,
}: BigSummaryCardProps) {
  const [tab, setTab] = useState<TabType>("personal");
  const isPersonal = tab === "personal";

  const activeJpy = isPersonal ? personalJpy : totalJpy;
  const activeTwd = isPersonal ? personalTwd : totalTwd;
  const activeCount = isPersonal ? personalCount : count;
  const activeBudget = isPersonal ? personalBudgetJpy : budgetJpy;
  const activeLabel = isPersonal ? "你的支出" : "旅程總支出";
  const budgetLabel = isPersonal ? "個人預算" : "預算";

  const hasBudget = !!activeBudget && activeBudget > 0;
  const percentage = hasBudget
    ? Math.min(Math.round((activeJpy / activeBudget!) * 100), 100)
    : 0;
  const isOver = hasBudget && activeJpy > activeBudget!;

  return (
    <div className="mx-4 rounded-xl bg-card p-5 ring-1 ring-foreground/10">
      {/* Tab bar + count badge */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
          {(["personal", "trip"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-semibold transition-colors",
                tab === t
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "personal" ? "個人" : "旅程"}
            </button>
          ))}
        </div>
        <div className="shrink-0 flex flex-col items-center justify-center rounded-lg bg-muted px-3 py-2.5 min-w-[52px]">
          <p className="text-xl font-bold text-foreground leading-none">{activeCount}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">筆</p>
        </div>
      </div>

      {/* Main amount */}
      <div>
        <p className="text-xs text-muted-foreground font-medium">{activeLabel}</p>
        <p className="text-[2rem] leading-tight font-bold tracking-tight mt-1 text-foreground">
          {formatJPY(activeJpy)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          ≈ {formatTWD(activeTwd)}
        </p>
      </div>

      {/* Budget bar */}
      {hasBudget && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-muted-foreground">
              {budgetLabel} {formatJPY(activeBudget!)}
            </span>
            <span
              className={cn(
                "text-[11px] font-semibold",
                isOver ? "text-destructive" : "text-muted-foreground"
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
                  ? "bg-destructive"
                  : percentage > 80
                    ? "bg-warning"
                    : "bg-primary"
              )}
              style={{ transform: `scaleX(${percentage / 100})` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
