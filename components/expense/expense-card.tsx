"use client";

import { useState } from "react";
import { Image as ImageIcon, MoreHorizontal, Pencil, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/user-avatar";
import { formatJPY, formatTWD } from "@/lib/exchange-rate";
import { DEFAULT_CATEGORIES } from "@/types";
import type { Expense, CategoryItem } from "@/types";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
            <Users className="h-3 w-3 text-muted-foreground" aria-label="均分" />
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
          <DialogContent className="max-w-sm p-2">
            <DialogHeader>
              <DialogTitle className="text-sm">收據照片</DialogTitle>
              <DialogDescription className="sr-only">收據照片預覽</DialogDescription>
            </DialogHeader>
            <div className="relative w-full aspect-3/4 rounded-lg overflow-hidden bg-muted">
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
