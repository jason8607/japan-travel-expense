"use client";

import { useMemo } from "react";
import { useCreditCards } from "@/hooks/use-credit-cards";
import type { Expense } from "@/types";
import { cn } from "@/lib/utils";
import { CreditCard as CreditCardIcon, Settings } from "lucide-react";
import Link from "next/link";

interface CashbackChartProps {
  expenses: Expense[];
}

export function CashbackChart({ expenses }: CashbackChartProps) {
  const { cards, loading } = useCreditCards();

  const cardStats = useMemo(() => {
    if (cards.length === 0) return [];

    const creditExpenses = expenses.filter(
      (e) => e.payment_method === "信用卡"
    );

    return cards.map((card) => {
      const cardExpenses = creditExpenses.filter(
        (e) => e.credit_card_id === card.id
      );

      const hasPlans = card.plans && card.plans.length > 0;

      // Calculate per-plan breakdown if plans exist
      let planBreakdown: {
        planId: string;
        planName: string;
        rate: number;
        totalTwd: number;
        cashback: number;
      }[] = [];

      let totalCashback = 0;
      let totalTwd = 0;

      if (hasPlans) {
        planBreakdown = card.plans!.map((plan) => {
          const planExpenses = cardExpenses.filter(
            (e) => e.credit_card_plan_id === plan.id
          );
          const planTwd = planExpenses.reduce((s, e) => s + e.amount_twd, 0);
          const cashback = Math.round(planTwd * plan.cashback_rate / 100);
          return {
            planId: plan.id,
            planName: plan.name,
            rate: plan.cashback_rate,
            totalTwd: planTwd,
            cashback,
          };
        });

        // Also account for card expenses without a plan assigned
        const unplannedExpenses = cardExpenses.filter(
          (e) => !e.credit_card_plan_id
        );
        if (unplannedExpenses.length > 0) {
          const unplannedTwd = unplannedExpenses.reduce((s, e) => s + e.amount_twd, 0);
          planBreakdown.push({
            planId: "__unassigned__",
            planName: "未指定方案",
            rate: 0,
            totalTwd: unplannedTwd,
            cashback: 0,
          });
        }

        totalCashback = planBreakdown.reduce((s, p) => s + p.cashback, 0);
        totalTwd = cardExpenses.reduce((s, e) => s + e.amount_twd, 0);
      } else {
        totalTwd = cardExpenses.reduce((s, e) => s + e.amount_twd, 0);
        totalCashback = Math.round(totalTwd * card.cashback_rate / 100);
      }

      const progress = Math.min(
        (totalCashback / card.cashback_limit) * 100,
        100
      );
      const isMaxed = totalCashback >= card.cashback_limit;

      return {
        card,
        totalTwd,
        cashbackEarned: totalCashback,
        progress,
        isMaxed,
        txCount: cardExpenses.length,
        hasPlans,
        planBreakdown,
      };
    });
  }, [cards, expenses]);

  if (loading || cards.length === 0) return null;

  const unassigned = expenses.filter(
    (e) => e.payment_method === "信用卡" && !e.credit_card_id
  );

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <CreditCardIcon className="h-4 w-4 text-primary" />
          信用卡回饋進度
        </h3>
        <Link
          href="/settings"
          className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
        >
          <Settings className="h-3 w-3" />
          管理
        </Link>
      </div>

      <div className="space-y-4">
        {cardStats.map(({ card, totalTwd, cashbackEarned, progress, isMaxed, txCount, hasPlans, planBreakdown }) => (
          <div key={card.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">💳</span>
                <span className="text-sm font-medium">{card.name}</span>
                {!hasPlans && (
                  <span className="text-[10px] text-muted-foreground">
                    {card.cashback_rate}%
                  </span>
                )}
              </div>
              <div className="text-right">
                <span
                  className={cn(
                    "text-sm font-bold",
                    isMaxed ? "text-amber-500" : "text-primary"
                  )}
                >
                  NT${cashbackEarned.toLocaleString()}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {" "}/ NT${card.cashback_limit.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  isMaxed
                    ? "bg-linear-to-r from-amber-400 to-amber-500"
                    : "bg-linear-to-r from-primary/70 to-primary"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>消費 NT${totalTwd.toLocaleString()} · {txCount} 筆</span>
              {isMaxed ? (
                <span className="text-amber-500 font-medium">已達上限</span>
              ) : (
                <span>
                  還差 NT${(card.cashback_limit - cashbackEarned).toLocaleString()}
                </span>
              )}
            </div>

            {/* Plan breakdown */}
            {hasPlans && planBreakdown.length > 0 && (
              <div className="pl-2 space-y-1 border-l-2 border-border/60 ml-1">
                {planBreakdown
                  .filter((p) => p.totalTwd > 0)
                  .map((p) => (
                    <div key={p.planId} className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">
                        {p.planName}
                        {p.rate > 0 && <span className="text-muted-foreground ml-1">{p.rate}%</span>}
                      </span>
                      <span className="text-muted-foreground">
                        NT${p.totalTwd.toLocaleString()}
                        {p.cashback > 0 && (
                          <span className="text-primary ml-1">
                            +NT${p.cashback.toLocaleString()}
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {unassigned.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border/60">
          <p className="text-[11px] text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
            有 {unassigned.length} 筆信用卡消費未指定卡片，不列入回饋計算
          </p>
        </div>
      )}
    </div>
  );
}
