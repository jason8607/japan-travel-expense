"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/ui/user-avatar";
import { formatJPY, formatTWD } from "@/lib/exchange-rate";
import type { CategoryItem, Expense } from "@/types";
import { DEFAULT_CATEGORIES } from "@/types";
import { Image as ImageIcon, MoreHorizontal, Pencil, Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ExpenseCardProps {
  expense: Expense;
  onDelete?: (id: string) => Promise<void>;
  categories?: CategoryItem[];
  displayAmountJpy?: number;
  displayAmountTwd?: number;
  amountNote?: string;
}

const FALLBACK_CATEGORY = DEFAULT_CATEGORIES.find((c) => c.value === "其他") ?? DEFAULT_CATEGORIES[0];

export function ExpenseCard({
  expense,
  onDelete,
  categories = DEFAULT_CATEGORIES,
  displayAmountJpy,
  displayAmountTwd,
  amountNote,
}: ExpenseCardProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const categoryInfo = categories.find((c) => c.value === expense.category);
  const categoryColor = categoryInfo?.color ?? FALLBACK_CATEGORY.color;
  const categoryIcon = categoryInfo?.icon ?? FALLBACK_CATEGORY.icon;
  const amountJpy = displayAmountJpy ?? expense.amount_jpy;
  const amountTwd = displayAmountTwd ?? expense.amount_twd;

  return (
    <div className="relative flex items-center gap-3 rounded-xl bg-card px-4 py-3.5 ring-1 ring-foreground/10 transition-colors hover:bg-muted/30">
      <UserAvatar
        avatarUrl={expense.profile?.avatar_url}
        avatarEmoji={expense.profile?.avatar_emoji}
        size="md"
      />

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-foreground truncate">{expense.title}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <Badge
            variant="secondary"
            className="h-[18px] gap-0.5 px-1.5 py-0 text-xs font-medium"
            style={{
              backgroundColor: `${categoryColor}18`,
              color: categoryColor,
            }}
          >
            {categoryIcon} {expense.category}
          </Badge>
          {expense.split_type === "split" && (
            // ParticipantPicker collapses "all members" into empty participants,
            // so any non-empty list here is a subset and worth surfacing.
            (expense.participants && expense.participants.length > 0) ? (
              <span
                className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground"
                aria-label={`${expense.participants.length} 人均分`}
              >
                <Users className="h-3 w-3" />
                {expense.participants.length} 人
              </span>
            ) : (
              <Users className="h-3 w-3 text-muted-foreground" aria-label="均分" />
            )
          )}
        </div>
      </div>

      <div className="shrink-0 text-right">
        <p className="font-bold text-sm text-foreground tabular-nums">
          {formatJPY(amountJpy)}
        </p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {formatTWD(amountTwd)}
        </p>
        {amountNote && (
          <p className="text-xs text-muted-foreground/70 tabular-nums">
            {amountNote}
          </p>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`更多操作：${expense.title}`}
          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px"
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem onClick={() => router.push(`/records/new?edit=${expense.id}`)}>
            <Pencil className="h-4 w-4" />
            編輯
          </DropdownMenuItem>
          {expense.receipt_image_url && (
            <DropdownMenuItem onClick={() => setShowReceipt(true)}>
              <ImageIcon className="h-4 w-4" />
              檢視收據
            </DropdownMenuItem>
          )}
          {onDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                disabled={deleting}
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4" />
                刪除
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {expense.receipt_image_url && (
        <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
          <DialogContent className="p-6 pt-10 sm:max-w-md">
            <DialogHeader className="sr-only">
              <DialogTitle>收據照片</DialogTitle>
              <DialogDescription>{expense.title} 的收據預覽</DialogDescription>
            </DialogHeader>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={expense.receipt_image_url}
              alt={`${expense.title} 的收據`}
              className="mx-auto block h-auto max-h-[70vh] w-auto max-w-full rounded-lg"
            />
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
              variant="destructive"
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
