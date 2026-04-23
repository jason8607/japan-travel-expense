"use client";

import { useState, useMemo } from "react";
import { ExpenseCard } from "./expense-card";
import { UserAvatar } from "@/components/ui/user-avatar";
import { formatJPY, formatTWD } from "@/lib/exchange-rate";
import { ChevronDown, ChevronUp, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Expense, TripMember } from "@/types";

interface MemberSummaryProps {
  expenses: Expense[];
  tripMembers: TripMember[];
  onDelete?: (id: string) => Promise<void>;
}

interface MemberBreakdown {
  userId: string;
  name: string;
  avatar: string;
  avatarUrl: string | null;
  personalJpy: number;
  personalTwd: number;
  splitShareJpy: number;
  splitShareTwd: number;
  totalJpy: number;
  totalTwd: number;
  ownedExpenses: Expense[];
}

function getExpenseOwner(expense: Expense): string | "split" {
  if (expense.split_type === "split") return "split";
  return expense.owner_id || expense.paid_by;
}

export function MemberSummary({ expenses, tripMembers, onDelete }: MemberSummaryProps) {
  const [expandedMember, setExpandedMember] = useState<string | null>(null);

  const { breakdowns, totalSplitJpy, perPersonSplitJpy, perPersonSplitTwd } = useMemo(() => {
    const memberCount = tripMembers.length || 1;
    const splitExps = expenses.filter((e) => e.split_type === "split");
    const splitJpy = splitExps.reduce((s, e) => s + e.amount_jpy, 0);
    const splitTwd = splitExps.reduce((s, e) => s + e.amount_twd, 0);
    const perJpy = Math.round(splitJpy / memberCount);
    const perTwd = Math.round(splitTwd / memberCount);

    const result: MemberBreakdown[] = tripMembers.map((member) => {
      const ownedExpenses = expenses.filter(
        (e) => getExpenseOwner(e) === member.user_id
      );
      const personalJpy = ownedExpenses.reduce((s, e) => s + e.amount_jpy, 0);
      const personalTwd = ownedExpenses.reduce((s, e) => s + e.amount_twd, 0);

      return {
        userId: member.user_id,
        name: member.profile?.display_name || "成員",
        avatar: member.profile?.avatar_emoji || "🧑",
        avatarUrl: member.profile?.avatar_url || null,
        personalJpy,
        personalTwd,
        splitShareJpy: perJpy,
        splitShareTwd: perTwd,
        totalJpy: personalJpy + perJpy,
        totalTwd: personalTwd + perTwd,
        ownedExpenses,
      };
    });

    result.sort((a, b) => b.totalJpy - a.totalJpy);
    return { breakdowns: result, totalSplitJpy: splitJpy, perPersonSplitJpy: perJpy, perPersonSplitTwd: perTwd };
  }, [expenses, tripMembers]);

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
        <div className="rounded-xl bg-accent border border-accent-foreground/10 p-3">
          <div className="flex items-center gap-2 text-accent-foreground text-sm font-medium mb-1">
            <Users className="h-4 w-4" />
            均分費用總計
          </div>
          <p className="text-lg font-bold text-accent-foreground">{formatJPY(totalSplitJpy)}</p>
          <p className="text-xs text-accent-foreground/75">
            每人 {formatJPY(perPersonSplitJpy)} ≈ {formatTWD(perPersonSplitTwd)}
          </p>
        </div>
      )}

      {/* Member cards */}
      {breakdowns.map((m) => {
        const isExpanded = expandedMember === m.userId;

        return (
          <div key={m.userId} className="rounded-2xl border bg-card shadow-sm overflow-hidden">
            <button
              onClick={() => setExpandedMember(isExpanded ? null : m.userId)}
              aria-expanded={isExpanded}
              className="w-full flex items-center gap-3 p-4 text-left"
            >
              <UserAvatar avatarUrl={m.avatarUrl} avatarEmoji={m.avatar} size="md" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground">{m.name}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  {m.personalJpy > 0 && (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <User className="h-3 w-3" />個人 {formatJPY(m.personalJpy)}
                    </span>
                  )}
                  {m.splitShareJpy > 0 && (
                    <span className="flex items-center gap-1 text-[11px] text-primary">
                      <Users className="h-3 w-3" />均分 {formatJPY(m.splitShareJpy)}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-sm text-foreground">
                  {formatJPY(m.totalJpy)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  ≈ {formatTWD(m.totalTwd)}
                </p>
              </div>
              <div className="shrink-0 text-muted-foreground">
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </button>

            {isExpanded && (
              <div className={cn(
                "border-t border-border/60 px-4 pb-4 space-y-2",
                m.ownedExpenses.length > 0 ? "pt-3" : "pt-4"
              )}>
                {m.ownedExpenses.length > 0 ? (
                  <>
                    <p className="text-xs text-muted-foreground font-medium mb-2">
                      個人消費（{m.ownedExpenses.length} 筆）
                    </p>
                    {m.ownedExpenses.map((expense) => (
                      <ExpenseCard key={expense.id} expense={expense} onDelete={onDelete} />
                    ))}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    尚無個人消費
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
