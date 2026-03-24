"use client";

import { useState } from "react";
import { Pencil, Trash2, Users, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/user-avatar";
import { formatJPY, formatTWD } from "@/lib/exchange-rate";
import { CATEGORIES, PAYMENT_METHODS } from "@/types";
import type { Expense } from "@/types";
import { useApp } from "@/lib/context";
import Link from "next/link";

interface ExpenseCardProps {
  expense: Expense;
  onDelete?: (id: string) => Promise<void>;
}

export function ExpenseCard({ expense, onDelete }: ExpenseCardProps) {
  const { tripMembers } = useApp();
  const [deleting, setDeleting] = useState(false);
  const categoryInfo = CATEGORIES.find((c) => c.value === expense.category);
  const paymentInfo = PAYMENT_METHODS.find((p) => p.value === expense.payment_method);

  const ownerMember = expense.owner_id
    ? tripMembers.find((m) => m.user_id === expense.owner_id)
    : null;

  return (
    <div className="flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      {/* Avatar */}
      <UserAvatar
        avatarUrl={expense.profile?.avatar_url}
        avatarEmoji={expense.profile?.avatar_emoji}
        size="md"
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-slate-800 truncate">{expense.title}</p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <Badge
            variant="secondary"
            className="text-[10px] px-1.5 py-0 h-[18px] gap-0.5 font-medium"
            style={{
              backgroundColor: categoryInfo?.color + "18",
              color: categoryInfo?.color,
            }}
          >
            {categoryInfo?.icon} {expense.category}
          </Badge>
          <span className="text-[10px] text-muted-foreground">
            {paymentInfo?.icon} {expense.payment_method}
          </span>
          {expense.split_type === "split" && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-teal-500 bg-teal-50 px-1.5 py-0 rounded-full font-medium">
              <Users className="h-2.5 w-2.5" />均分
            </span>
          )}
          {ownerMember && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-purple-500 bg-purple-50 px-1.5 py-0 rounded-full font-medium">
              <ArrowRight className="h-2.5 w-2.5" />
              {ownerMember.profile?.avatar_emoji || "🧑"} {ownerMember.profile?.display_name || "成員"}
            </span>
          )}
          {expense.store_name && (
            <>
              <span className="text-[10px] text-muted-foreground">·</span>
              <span className="text-[10px] text-muted-foreground truncate">
                🏪 {expense.store_name}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Amount */}
      <div className="shrink-0 text-right">
        <p className="font-bold text-sm text-slate-800">{formatJPY(expense.amount_jpy)}</p>
        <p className="text-[10px] text-muted-foreground">
          {formatTWD(expense.amount_twd)}
        </p>
      </div>

      {/* Actions */}
      <div className="shrink-0 flex items-center gap-0.5">
        <Link
          href={`/records/new?edit=${expense.id}`}
          className="p-1.5 text-slate-300 hover:text-blue-500 transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Link>
        {onDelete && (
          <button
            onClick={async () => {
              if (!confirm("確定要刪除這筆消費嗎？")) return;
              setDeleting(true);
              await onDelete(expense.id);
              setDeleting(false);
            }}
            disabled={deleting}
            className="p-1.5 text-slate-300 hover:text-red-500 transition-colors disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
