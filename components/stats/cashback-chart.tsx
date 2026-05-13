"use client";

import { useMemo } from "react";
import { useApp } from "@/lib/context";
import { useCreditCards } from "@/hooks/use-credit-cards";
import type { CreditCard, Expense } from "@/types";
import { cn } from "@/lib/utils";
import { CreditCard as CreditCardIcon, Settings } from "lucide-react";
import Link from "next/link";

interface CashbackChartProps {
  expenses: Expense[];
}

interface PlanStat {
  planId: string;
  planName: string;
  rate: number;
  totalTwd: number;
  cashback: number;
}

interface CardStat {
  card: CreditCard;
  totalTwd: number;
  cashbackEarned: number;
  spendingThreshold: number;
  hasThreshold: boolean;
  progress: number;
  isMaxed: boolean;
  txCount: number;
  hasPlans: boolean;
  planBreakdown: PlanStat[];
}

const maxedColor = "text-warning";

function calcCardStat(card: CreditCard, cardExpenses: Expense[]): CardStat {
  const hasPlans = !!card.plans && card.plans.length > 0;
  let planBreakdown: PlanStat[] = [];
  let totalCashback = 0;
  const totalTwd = cardExpenses.reduce((s, e) => s + e.amount_twd, 0);

  if (hasPlans) {
    planBreakdown = card.plans!.map((plan) => {
      const planExpenses = cardExpenses.filter(
        (e) => e.credit_card_plan_id === plan.id
      );
      const planTwd = planExpenses.reduce((s, e) => s + e.amount_twd, 0);
      const cashback = Math.round((planTwd * plan.cashback_rate) / 100);
      return {
        planId: plan.id,
        planName: plan.name,
        rate: plan.cashback_rate,
        totalTwd: planTwd,
        cashback,
      };
    });

    const unplannedExpenses = cardExpenses.filter(
      (e) => !e.credit_card_plan_id
    );
    if (unplannedExpenses.length > 0) {
      const unplannedTwd = unplannedExpenses.reduce(
        (s, e) => s + e.amount_twd,
        0
      );
      planBreakdown.push({
        planId: "__unassigned__",
        planName: "未指定方案",
        rate: 0,
        totalTwd: unplannedTwd,
        cashback: 0,
      });
    }

    totalCashback = planBreakdown.reduce((s, p) => s + p.cashback, 0);
  } else {
    totalCashback = Math.round((totalTwd * card.cashback_rate) / 100);
  }

  // cashback_limit is the spending threshold (NTD spent to max out cashback).
  const spendingThreshold = card.cashback_limit > 0 ? card.cashback_limit : 0;
  const hasThreshold = spendingThreshold > 0;
  const progress = hasThreshold
    ? Math.min((totalTwd / spendingThreshold) * 100, 100)
    : 0;
  const isMaxed = hasThreshold && totalTwd >= spendingThreshold;

  return {
    card,
    totalTwd,
    cashbackEarned: totalCashback,
    spendingThreshold,
    hasThreshold,
    progress,
    isMaxed,
    txCount: cardExpenses.length,
    hasPlans,
    planBreakdown,
  };
}

export function CashbackChart({ expenses }: CashbackChartProps) {
  const { user, isGuest } = useApp();
  const { cards: ownCards, loading: ownLoading } = useCreditCards();

  const stats = useMemo(() => {
    if (ownCards.length === 0) return null;

    const creditExpenses = expenses.filter(
      (e) => e.payment_method === "信用卡"
    );

    // Only count expenses paid by current user; in guest mode all expenses are theirs
    const myExpenses = isGuest
      ? creditExpenses
      : creditExpenses.filter((e) => e.paid_by === user?.id);

    const cards = ownCards.map((card) => {
      const cardExpenses = myExpenses.filter(
        (e) => e.credit_card_id === card.id
      );
      return calcCardStat(card, cardExpenses);
    });

    const unassignedCount = myExpenses.filter(
      (e) => !e.credit_card_id
    ).length;

    return { cards, unassignedCount };
  }, [ownCards, expenses, isGuest, user?.id]);

  if (ownLoading) return null;
  if (!stats) return null;

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
        {stats.cards.map(
          ({
            card,
            totalTwd,
            cashbackEarned,
            spendingThreshold,
            hasThreshold,
            progress,
            isMaxed,
            txCount,
            hasPlans,
            planBreakdown,
          }) => (
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
                      isMaxed ? maxedColor : "text-primary"
                    )}
                  >
                    NT${totalTwd.toLocaleString()}
                  </span>
                  {hasThreshold && (
                    <span className="text-[11px] text-muted-foreground">
                      {" "}
                      / NT${spendingThreshold.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full w-full rounded-full transition-[transform] duration-500 origin-left",
                    isMaxed
                      ? "bg-warning"
                      : "bg-linear-to-r from-primary/70 to-primary"
                  )}
                  style={{ transform: `scaleX(${progress / 100})` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{txCount} 筆</span>
                {hasThreshold ? (
                  isMaxed ? (
                    <span className={cn(maxedColor, "font-medium")}>
                      已達上限
                    </span>
                  ) : (
                    <span>
                      還能刷 NT$
                      {Math.max(spendingThreshold - totalTwd, 0).toLocaleString()}
                    </span>
                  )
                ) : (
                  <span>無上限</span>
                )}
              </div>

              <div className="text-[11px] text-muted-foreground">
                已回饋{" "}
                <span className="text-primary font-medium">
                  NT${cashbackEarned.toLocaleString()}
                </span>
              </div>

              {hasPlans && planBreakdown.length > 0 && (
                <div className="pl-3 space-y-1 ml-1">
                  {planBreakdown
                    .filter((p) => p.totalTwd > 0)
                    .map((p) => (
                      <div
                        key={p.planId}
                        className="flex items-center justify-between text-[11px]"
                      >
                        <span className="text-muted-foreground">
                          {p.planName}
                          {p.rate > 0 && (
                            <span className="text-muted-foreground ml-1">
                              {p.rate}%
                            </span>
                          )}
                        </span>
                        <span className="text-muted-foreground">
                          NT${p.totalTwd.toLocaleString()}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )
        )}

        {stats.unassignedCount > 0 && (
          <p className="rounded-lg bg-warning-subtle px-3 py-2 text-[11px] text-warning-foreground">
            有 {stats.unassignedCount} 筆信用卡消費未指定卡片，不列入回饋計算
          </p>
        )}
      </div>
    </div>
  );
}
