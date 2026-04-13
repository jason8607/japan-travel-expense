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
      const totalTwd = cardExpenses.reduce((s, e) => s + e.amount_twd, 0);
      const cashbackEarned = Math.round(totalTwd * card.cashback_rate / 100);
      const progress = Math.min(
        (cashbackEarned / card.cashback_limit) * 100,
        100
      );
      const isMaxed = cashbackEarned >= card.cashback_limit;

      return {
        card,
        totalTwd,
        cashbackEarned,
        progress,
        isMaxed,
        txCount: cardExpenses.length,
      };
    });
  }, [cards, expenses]);

  if (loading || cards.length === 0) return null;

  const unassigned = expenses.filter(
    (e) => e.payment_method === "信用卡" && !e.credit_card_id
  );

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <CreditCardIcon className="h-4 w-4 text-blue-500" />
          信用卡回饋進度
        </h3>
        <Link
          href="/settings"
          className="text-[11px] text-slate-400 hover:text-blue-500 flex items-center gap-1 transition-colors"
        >
          <Settings className="h-3 w-3" />
          管理
        </Link>
      </div>

      <div className="space-y-4">
        {cardStats.map(({ card, totalTwd, cashbackEarned, progress, isMaxed, txCount }) => (
          <div key={card.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">💳</span>
                <span className="text-sm font-medium">{card.name}</span>
                <span className="text-[10px] text-slate-400">
                  {card.cashback_rate}%
                </span>
              </div>
              <div className="text-right">
                <span
                  className={cn(
                    "text-sm font-bold",
                    isMaxed ? "text-amber-500" : "text-blue-600"
                  )}
                >
                  NT${cashbackEarned.toLocaleString()}
                </span>
                <span className="text-[11px] text-slate-400">
                  {" "}/ NT${card.cashback_limit.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  isMaxed
                    ? "bg-linear-to-r from-amber-400 to-amber-500"
                    : "bg-linear-to-r from-blue-400 to-blue-500"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>消費 NT${totalTwd.toLocaleString()} · {txCount} 筆</span>
              {isMaxed ? (
                <span className="text-amber-500 font-medium">已達上限</span>
              ) : (
                <span>
                  還差 NT${(card.cashback_limit - cashbackEarned).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {unassigned.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-100">
          <p className="text-[11px] text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
            有 {unassigned.length} 筆信用卡消費未指定卡片，不列入回饋計算
          </p>
        </div>
      )}
    </div>
  );
}
