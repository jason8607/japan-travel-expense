"use client";

import { UserAvatar } from "@/components/ui/user-avatar";
import { useCategories } from "@/hooks/use-categories";
import { calculateSettlements } from "@/lib/settlement";
import type { Expense, TripMember } from "@/types";
import { ArrowRight, Check } from "lucide-react";
import { useMemo } from "react";

interface SettlementViewProps {
  expenses: Expense[];
  tripMembers: TripMember[];
}

export function SettlementView({
  expenses,
  tripMembers,
}: SettlementViewProps) {
  const { categories } = useCategories();

  const { balances, settlements } = useMemo(
    () => calculateSettlements(expenses, tripMembers),
    [expenses, tripMembers]
  );

  const totalJpy = useMemo(
    () => expenses.reduce((s, e) => s + e.amount_jpy, 0),
    [expenses]
  );

  const splitTotal = useMemo(
    () =>
      expenses
        .filter((e) => e.split_type === "split")
        .reduce((s, e) => s + e.amount_jpy, 0),
    [expenses]
  );

  const memberCount = tripMembers.length;
  const perPerson =
    memberCount > 0 && splitTotal > 0
      ? Math.round(splitTotal / memberCount)
      : 0;

  const memberName = (userId: string | null) =>
    tripMembers.find((m) => m.user_id === userId)?.profile?.display_name ??
    "成員";

  const categoryIcon = (value: string) =>
    categories.find((c) => c.value === value)?.icon ?? "📦";

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

  return (
    <div className="px-4 pb-4 space-y-5">
      <div>
        <div className="text-[11px] tracking-[0.2em] text-muted-foreground">
          SETTLEMENT
        </div>
        <h2 className="text-xl font-bold mt-1">結算摘要</h2>
      </div>

      <div className="rounded-2xl bg-card border border-border p-5 shadow-sm">
        <div className="text-xs text-muted-foreground">總花費</div>
        <div className="text-3xl font-bold mt-1 tracking-tight">
          ¥{totalJpy.toLocaleString()}
        </div>
        {perPerson > 0 && (
          <div className="text-xs text-muted-foreground mt-1">
            {memberCount}人均分 · 每人 ¥{perPerson.toLocaleString()}
          </div>
        )}

        <div className="h-px bg-border my-4" />

        <div className="space-y-3">
          {balances.map((b) => (
            <div key={b.userId} className="flex items-center gap-3">
              <UserAvatar
                avatarUrl={b.avatarUrl}
                avatarEmoji={b.emoji}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">
                  {b.name}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  已付 ¥{b.paid.toLocaleString()}
                </div>
              </div>
              <div className="text-right shrink-0">
                {b.balance < 0 ? (
                  <span className="text-sm font-bold text-red-500">
                    -¥{Math.abs(b.balance).toLocaleString()}
                  </span>
                ) : (
                  <Check className="h-4 w-4 text-muted-foreground ml-auto" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs text-muted-foreground mb-2">最小轉帳方案</div>
        {settlements.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            帳目已平衡，不需要額外轉帳
          </div>
        ) : (
          <div className="space-y-2">
            {settlements.map((s, i) => (
              <div
                key={i}
                className="rounded-xl border border-dashed border-primary/40 bg-primary/[0.03] p-3 flex items-center gap-3"
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
                <div className="ml-auto text-sm font-bold shrink-0">
                  ¥{s.amount.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="text-xs text-muted-foreground mb-2">品項歸屬</div>
        <div className="space-y-2">
          {expenses
            .filter((exp) => {
              if (exp.split_type === "split") return true;
              const ownerId = exp.owner_id || exp.paid_by;
              return ownerId !== exp.paid_by;
            })
            .map((exp) => {
            const isSplit = exp.split_type === "split";
            const ownerId = exp.owner_id || exp.paid_by;
            const pillLabel = isSplit
              ? "均分"
              : `幫 ${memberName(ownerId)} 付`;
            return (
              <div
                key={exp.id}
                className="rounded-xl bg-card border border-border p-3 flex items-center gap-3 shadow-sm"
              >
                <span className="text-2xl shrink-0">
                  {categoryIcon(exp.category)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">
                    {exp.title}
                  </div>
                  <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {pillLabel}
                  </span>
                </div>
                <div className="text-sm font-bold shrink-0">
                  ¥{exp.amount_jpy.toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
