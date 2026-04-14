"use client";

import { useState } from "react";
import { Pencil, Trash2, Users, ArrowRight, Image as ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/user-avatar";
import { formatJPY, formatTWD } from "@/lib/exchange-rate";
import { PAYMENT_METHODS, DEFAULT_CATEGORIES } from "@/types";
import type { Expense, CategoryItem } from "@/types";
import { useApp } from "@/lib/context";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ExpenseCardProps {
  expense: Expense;
  onDelete?: (id: string) => Promise<void>;
  categories?: CategoryItem[];
}

export function ExpenseCard({ expense, onDelete, categories = DEFAULT_CATEGORIES }: ExpenseCardProps) {
  const { tripMembers } = useApp();
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const categoryInfo = categories.find((c) => c.value === expense.category);
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
          {expense.receipt_image_url && (
            <button
              onClick={() => setShowReceipt(true)}
              className="inline-flex items-center gap-0.5 text-[10px] text-blue-500 bg-blue-50 px-1.5 py-0 rounded-full font-medium hover:bg-blue-100 transition-colors"
            >
              <ImageIcon className="h-2.5 w-2.5" />收據
            </button>
          )}
          {expense.store_name && (
            <>
              <span className="text-[10px] text-muted-foreground">·</span>
              <span className="text-[10px] text-muted-foreground truncate">
                🏪 {expense.store_name}
              </span>
            </>
          )}
          {expense.note && (
            <>
              <span className="text-[10px] text-muted-foreground">·</span>
              <span className="text-[10px] text-slate-400 truncate italic">
                {expense.note}
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
          aria-label="編輯消費"
          className="p-1.5 text-slate-300 hover:text-blue-500 transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Link>
        {onDelete && (
          <button
            aria-label="刪除消費"
            onClick={() => setShowDeleteDialog(true)}
            disabled={deleting}
            className="p-1.5 text-slate-300 hover:text-red-500 transition-colors disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {expense.receipt_image_url && (
        <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
          <DialogContent className="max-w-sm p-2">
            <DialogHeader>
              <DialogTitle className="text-sm">收據照片</DialogTitle>
              <DialogDescription className="sr-only">收據照片預覽</DialogDescription>
            </DialogHeader>
            <div className="relative w-full aspect-3/4 rounded-lg overflow-hidden bg-gray-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={expense.receipt_image_url}
                alt="收據照片"
                className="w-full h-full object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>確定要刪除？</DialogTitle>
            <DialogDescription>刪除後無法復原</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              取消
            </Button>
            <Button
              className="bg-red-500 hover:bg-red-600 text-white"
              disabled={deleting}
              onClick={async () => {
                setShowDeleteDialog(false);
                setDeleting(true);
                await onDelete!(expense.id);
                setDeleting(false);
              }}
            >
              確定刪除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
