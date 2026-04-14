"use client";

import { useMemo } from "react";
import { calculateSettlements } from "@/lib/settlement";
import { UserAvatar } from "@/components/ui/user-avatar";
import { formatJPY, formatTWD, FALLBACK_RATE } from "@/lib/exchange-rate";
import { ArrowRight, CheckCircle, TrendingUp, TrendingDown } from "lucide-react";
import type { Expense, TripMember } from "@/types";

interface SettlementViewProps {
  expenses: Expense[];
  tripMembers: TripMember[];
  exchangeRate?: number;
}

export function SettlementView({ expenses, tripMembers, exchangeRate = FALLBACK_RATE }: SettlementViewProps) {
  const { balances, settlements } = useMemo(
    () => calculateSettlements(expenses, tripMembers),
    [expenses, tripMembers]
  );

  if (tripMembers.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p className="text-4xl mb-2">👥</p>
        <p className="text-sm">需要至少 2 位成員才能結算</p>
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p className="text-4xl mb-2">💰</p>
        <p className="text-sm">還沒有消費紀錄</p>
      </div>
    );
  }

  const allSettled = settlements.length === 0;

  return (
    <div className="space-y-4 px-4">
      {/* Balance summary */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-700">各成員餘額</h3>
        {balances.map((b) => (
          <div key={b.userId} className="flex items-center gap-3 rounded-xl bg-white border border-slate-100 p-3 shadow-sm">
            <UserAvatar avatarUrl={b.avatarUrl} avatarEmoji={b.emoji} size="md" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-slate-800">{b.name}</p>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-[11px] text-slate-400">
                  已付 {formatJPY(b.paid)}
                </span>
                <span className="text-[11px] text-slate-400">
                  應付 {formatJPY(b.owed)}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="flex items-center gap-1">
                {b.balance > 0 ? (
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                ) : b.balance < 0 ? (
                  <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                ) : null}
                <p className={`font-bold text-sm ${
                  b.balance > 0 ? "text-emerald-600" : b.balance < 0 ? "text-red-500" : "text-slate-400"
                }`}>
                  {b.balance > 0 ? "+" : ""}{formatJPY(b.balance)}
                </p>
              </div>
              <p className="text-[10px] text-muted-foreground">
                ≈ {b.balance > 0 ? "+" : ""}{formatTWD(Math.round(b.balance * exchangeRate))}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Settlement transfers */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-700">結算方式</h3>
        {allSettled ? (
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-center">
            <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-emerald-700">帳目已平衡</p>
            <p className="text-xs text-emerald-500 mt-1">不需要額外轉帳</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              最少 {settlements.length} 筆轉帳即可結清
            </p>
            {settlements.map((s, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-xl bg-white border border-slate-100 p-3 shadow-sm"
              >
                <UserAvatar avatarUrl={s.fromAvatarUrl} avatarEmoji={s.fromEmoji} size="sm" />
                <span className="text-sm font-medium text-slate-700 truncate">{s.fromName}</span>
                <div className="flex-1 flex items-center justify-center gap-1 px-1">
                  <div className="flex-1 h-px bg-slate-200" />
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 border border-amber-100">
                    <span className="text-xs font-bold text-amber-700">{formatJPY(s.amount)}</span>
                    <ArrowRight className="h-3 w-3 text-amber-500" />
                  </div>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
                <span className="text-sm font-medium text-slate-700 truncate">{s.toName}</span>
                <UserAvatar avatarUrl={s.toAvatarUrl} avatarEmoji={s.toEmoji} size="sm" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
