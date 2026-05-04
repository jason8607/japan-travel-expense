"use client";

import { EmptyState } from "@/components/layout/empty-state";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useCategories } from "@/hooks/use-categories";
import { formatJPY, formatTWD } from "@/lib/exchange-rate";
import { cn } from "@/lib/utils";
import type { Expense, TripMember } from "@/types";
import { ChevronDown, ChevronUp, ReceiptText } from "lucide-react";
import { useMemo, useState } from "react";
import { ExpenseCard } from "./expense-card";

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
  totalJpy: number;
  totalTwd: number;
  items: MemberExpenseItem[];
  hasSplitShare: boolean;
}

interface MemberExpenseItem {
  expense: Expense;
  amountJpy: number;
  amountTwd: number;
  amountNote?: string;
}

function getExpenseOwner(expense: Expense): string | "split" {
  if (expense.split_type === "split") return "split";
  return expense.owner_id || expense.paid_by;
}

export function MemberSummary({ expenses, tripMembers, onDelete }: MemberSummaryProps) {
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const { categories } = useCategories();

  const { breakdowns } = useMemo(() => {
    const memberCount = tripMembers.length || 1;
    const splitExps = expenses.filter((e) => e.split_type === "split");

    const result: MemberBreakdown[] = tripMembers.map((member) => {
      const ownedExpenses = expenses.filter(
        (e) => getExpenseOwner(e) === member.user_id
      );
      const ownedItems: MemberExpenseItem[] = ownedExpenses.map((expense) => ({
        expense,
        amountJpy: expense.amount_jpy,
        amountTwd: expense.amount_twd,
      }));
      const splitItems: MemberExpenseItem[] = splitExps.map((expense) => ({
        expense,
        amountJpy: Math.round(expense.amount_jpy / memberCount),
        amountTwd: Math.round(expense.amount_twd / memberCount),
        amountNote: `均分 · 原 ${formatJPY(expense.amount_jpy)}`,
      }));
      const items = [...ownedItems, ...splitItems].sort((a, b) =>
        b.expense.expense_date.localeCompare(a.expense.expense_date)
      );
      const totalJpy = items.reduce((s, item) => s + item.amountJpy, 0);
      const totalTwd = items.reduce((s, item) => s + item.amountTwd, 0);

      return {
        userId: member.user_id,
        name: member.profile?.display_name || "成員",
        avatar: member.profile?.avatar_emoji || "🧑",
        avatarUrl: member.profile?.avatar_url || null,
        totalJpy,
        totalTwd,
        items,
        hasSplitShare: splitItems.length > 0,
      };
    });

    result.sort((a, b) => b.totalJpy - a.totalJpy);
    return { breakdowns: result };
  }, [expenses, tripMembers]);

  if (expenses.length === 0) {
    return (
      <EmptyState
        icon={ReceiptText}
        title="還沒有成員花費"
        description="新增消費並選擇歸屬成員後，這裡會整理每個人的花費。"
        action={{ label: "新增消費", href: "/records/new" }}
      />
    );
  }

  return (
    <div className="space-y-3 px-4">
      <p className="text-xs text-muted-foreground">
        看每個人實際負擔，不是付款人統計；均分已拆到每位成員。
      </p>

      {/* Member cards */}
      {breakdowns.map((m) => {
        const isExpanded = expandedMember === m.userId;

        return (
          <div key={m.userId} className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
            <button
              onClick={() => setExpandedMember(isExpanded ? null : m.userId)}
              aria-expanded={isExpanded}
              className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px"
            >
              <UserAvatar avatarUrl={m.avatarUrl} avatarEmoji={m.avatar} size="md" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground">{m.name}</p>
                {m.items.length > 0 && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    花費項目 {m.items.length} 筆
                    {m.hasSplitShare && " · 含均分分攤"}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-sm text-foreground tabular-nums">
                  {formatJPY(m.totalJpy)}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
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
                m.items.length > 0 ? "pt-3" : "pt-4"
              )}>
                {m.items.length > 0 ? (
                  <>
                    <p className="text-xs text-muted-foreground font-medium mb-2">
                      花費項目（{m.items.length} 筆）
                    </p>
                    {m.items.map(({ expense, amountJpy, amountTwd, amountNote }) => (
                      <ExpenseCard
                        key={expense.id}
                        expense={expense}
                        onDelete={onDelete}
                        categories={categories}
                        displayAmountJpy={amountJpy}
                        displayAmountTwd={amountTwd}
                        amountNote={amountNote}
                      />
                    ))}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    尚無花費項目
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
