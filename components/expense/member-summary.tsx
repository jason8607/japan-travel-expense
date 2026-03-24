"use client";

import { useState } from "react";
import { ExpenseCard } from "./expense-card";
import { formatJPY, formatTWD } from "@/lib/exchange-rate";
import { ChevronDown, ChevronUp, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Expense, TripMember } from "@/types";

interface MemberSummaryProps {
  expenses: Expense[];
  tripMembers: TripMember[];
}

interface MemberBreakdown {
  userId: string;
  name: string;
  avatar: string;
  personalJpy: number;
  personalTwd: number;
  splitShareJpy: number;
  splitShareTwd: number;
  totalJpy: number;
  totalTwd: number;
  paidExpenses: Expense[];
}

export function MemberSummary({ expenses, tripMembers }: MemberSummaryProps) {
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const memberCount = tripMembers.length || 1;

  const totalSplitJpy = expenses
    .filter((e) => e.split_type === "split")
    .reduce((s, e) => s + e.amount_jpy, 0);
  const totalSplitTwd = expenses
    .filter((e) => e.split_type === "split")
    .reduce((s, e) => s + e.amount_twd, 0);
  const perPersonSplitJpy = Math.round(totalSplitJpy / memberCount);
  const perPersonSplitTwd = Math.round(totalSplitTwd / memberCount);

  const breakdowns: MemberBreakdown[] = tripMembers.map((member) => {
    const paidExpenses = expenses.filter((e) => e.paid_by === member.user_id);
    const personalExpenses = paidExpenses.filter((e) => e.split_type !== "split");
    const personalJpy = personalExpenses.reduce((s, e) => s + e.amount_jpy, 0);
    const personalTwd = personalExpenses.reduce((s, e) => s + e.amount_twd, 0);

    return {
      userId: member.user_id,
      name: member.profile?.display_name || "成員",
      avatar: member.profile?.avatar_emoji || "🧑",
      personalJpy,
      personalTwd,
      splitShareJpy: perPersonSplitJpy,
      splitShareTwd: perPersonSplitTwd,
      totalJpy: personalJpy + perPersonSplitJpy,
      totalTwd: personalTwd + perPersonSplitTwd,
      paidExpenses,
    };
  });

  breakdowns.sort((a, b) => b.totalJpy - a.totalJpy);

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p className="text-4xl mb-2">📝</p>
        <p className="text-sm">還沒有消費紀錄</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 px-4">
      {/* Split info banner */}
      {totalSplitJpy > 0 && (
        <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
          <div className="flex items-center gap-2 text-blue-700 text-sm font-medium mb-1">
            <Users className="h-4 w-4" />
            均分費用總計
          </div>
          <p className="text-lg font-bold text-blue-800">{formatJPY(totalSplitJpy)}</p>
          <p className="text-xs text-blue-500">
            每人 {formatJPY(perPersonSplitJpy)} ≈ {formatTWD(perPersonSplitTwd)}
          </p>
        </div>
      )}

      {/* Member cards */}
      {breakdowns.map((m) => {
        const isExpanded = expandedMember === m.userId;

        return (
          <div key={m.userId} className="rounded-2xl border bg-white shadow-sm overflow-hidden">
            <button
              onClick={() => setExpandedMember(isExpanded ? null : m.userId)}
              className="w-full flex items-center gap-3 p-4 text-left"
            >
              <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center text-xl shrink-0">
                {m.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-slate-800">{m.name}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  {m.personalJpy > 0 && (
                    <span className="flex items-center gap-1 text-[11px] text-slate-500">
                      <User className="h-3 w-3" />個人 {formatJPY(m.personalJpy)}
                    </span>
                  )}
                  {m.splitShareJpy > 0 && (
                    <span className="flex items-center gap-1 text-[11px] text-blue-500">
                      <Users className="h-3 w-3" />均分 {formatJPY(m.splitShareJpy)}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-sm text-slate-800">
                  {formatJPY(m.totalJpy)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  ≈ {formatTWD(m.totalTwd)}
                </p>
              </div>
              <div className="shrink-0 text-slate-400">
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </button>

            {isExpanded && (
              <div className={cn(
                "border-t border-slate-100 px-4 pb-4 space-y-2",
                m.paidExpenses.length > 0 ? "pt-3" : "pt-4"
              )}>
                {m.paidExpenses.length > 0 ? (
                  <>
                    <p className="text-xs text-muted-foreground font-medium mb-2">
                      付款紀錄（{m.paidExpenses.length} 筆）
                    </p>
                    {m.paidExpenses.map((expense) => (
                      <ExpenseCard key={expense.id} expense={expense} />
                    ))}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    尚無付款紀錄
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
