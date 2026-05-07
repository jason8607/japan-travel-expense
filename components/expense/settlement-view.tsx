"use client";

import { EmptyState } from "@/components/layout/empty-state";
import { UserAvatar } from "@/components/ui/user-avatar";
import { calculateSettlements } from "@/lib/settlement";
import type { Expense, TripMember } from "@/types";
import { ArrowRight, ReceiptText, Users } from "lucide-react";
import { useMemo } from "react";

interface SettlementViewProps {
  expenses: Expense[];
  tripMembers: TripMember[];
}

export function SettlementView({
  expenses,
  tripMembers,
}: SettlementViewProps) {
  const { settlements } = useMemo(
    () => calculateSettlements(expenses, tripMembers),
    [expenses, tripMembers]
  );

  if (tripMembers.length < 2) {
    return (
      <EmptyState
        icon={Users}
        title="還不能進行結算"
        description="邀請至少 1 位旅伴加入後，就能產生多人分帳結算。"
        variant="section"
      />
    );
  }

  if (expenses.length === 0) {
    return (
      <EmptyState
        icon={ReceiptText}
        title="還沒有可結算的消費"
        description="新增消費並設定付款人後，這裡會自動計算最小轉帳方案。"
        action={{ label: "新增消費", href: "/records/new" }}
      />
    );
  }

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
      <h3 className="font-semibold text-sm mb-3">最小轉帳</h3>

      {settlements.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">
          帳目已平衡，不需要額外轉帳
        </p>
      ) : (
        <div className="space-y-2">
          {settlements.map((s, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg p-2.5"
            >
              <div className="flex items-center gap-2 min-w-0">
                <UserAvatar
                  avatarUrl={s.fromAvatarUrl}
                  avatarEmoji={s.fromEmoji}
                  size="sm"
                />
                <span className="text-sm font-medium truncate">
                  {s.fromName}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mx-1" />
                <UserAvatar
                  avatarUrl={s.toAvatarUrl}
                  avatarEmoji={s.toEmoji}
                  size="sm"
                />
                <span className="text-sm font-medium truncate">
                  {s.toName}
                </span>
              </div>
              <div className="ml-auto text-sm font-semibold tabular-nums shrink-0">
                ¥{s.amount.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
