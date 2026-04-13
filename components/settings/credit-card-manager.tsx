"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { CreditCard as CreditCardIcon, Plus, Pencil, Trash2, X } from "lucide-react";
import { useCreditCards } from "@/hooks/use-credit-cards";
import type { CreditCard } from "@/types";

export function CreditCardManager() {
  const { cards, addCard, updateCard, deleteCard } = useCreditCards();
  const [showForm, setShowForm] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CreditCard | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [rate, setRate] = useState("");
  const [limit, setLimit] = useState("");

  const resetForm = () => {
    setName("");
    setRate("");
    setLimit("");
    setEditingCard(null);
    setShowForm(false);
  };

  const openEdit = (card: CreditCard) => {
    setEditingCard(card);
    setName(card.name);
    setRate(String(card.cashback_rate));
    setLimit(String(card.cashback_limit));
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("請輸入卡片名稱");
      return;
    }
    const rateNum = parseFloat(rate);
    const limitNum = parseFloat(limit);
    if (isNaN(rateNum) || rateNum <= 0) {
      toast.error("請輸入有效的回饋 %");
      return;
    }
    if (isNaN(limitNum) || limitNum <= 0) {
      toast.error("請輸入有效的回饋上限");
      return;
    }

    setSaving(true);
    try {
      if (editingCard) {
        const updated = await updateCard(editingCard.id, {
          name: name.trim(),
          cashback_rate: rateNum,
          cashback_limit: limitNum,
        });
        if (updated) {
          toast.success("已更新信用卡");
        } else {
          toast.error("更新失敗");
          return;
        }
      } else {
        const card = await addCard({
          name: name.trim(),
          cashback_rate: rateNum,
          cashback_limit: limitNum,
        });
        if (card) {
          toast.success("已新增信用卡");
        } else {
          toast.error("新增失敗");
          return;
        }
      }
      resetForm();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const ok = await deleteCard(deleteTarget.id);
    setDeleteTarget(null);
    if (ok) {
      toast.success("已刪除信用卡");
    } else {
      toast.error("刪除失敗");
    }
  };

  return (
    <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <CreditCardIcon className="h-4 w-4 text-blue-500" />
          信用卡管理
        </h2>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="text-xs text-blue-500 flex items-center gap-1"
        >
          <Plus className="h-3 w-3" />
          新增
        </button>
      </div>

      {cards.length === 0 && !showForm ? (
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">尚未設定信用卡</p>
          <p className="text-xs text-muted-foreground mt-1">
            新增信用卡以追蹤各卡回饋上限
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-50">
          {cards.map((card) => (
            <div
              key={card.id}
              className="px-4 py-3 flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <span className="text-base">💳</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{card.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  回饋 {card.cashback_rate}% · 上限 NT${card.cashback_limit.toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => openEdit(card)}
                  className="p-1.5 text-slate-400 hover:text-blue-500 transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setDeleteTarget(card)}
                  className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="border-t border-slate-100 p-4 space-y-3 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              {editingCard ? "編輯信用卡" : "新增信用卡"}
            </span>
            <button
              onClick={resetForm}
              className="text-xs text-muted-foreground flex items-center gap-1"
            >
              <X className="h-3 w-3" />
              取消
            </button>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">卡片名稱</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：台新 FlyGo、玉山 UBear"
              className="h-10 rounded-lg text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">回饋 %</Label>
              <Input
                type="number"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="例：2.8"
                step="0.1"
                min="0"
                className="h-10 rounded-lg text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">回饋上限 (NT$)</Label>
              <Input
                type="number"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                placeholder="例：500"
                min="0"
                className="h-10 rounded-lg text-sm"
              />
            </div>
          </div>
          <Button
            onClick={handleSave}
            className="w-full h-10 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm"
            disabled={saving}
          >
            {saving
              ? "儲存中..."
              : editingCard
                ? "儲存變更"
                : "新增信用卡"}
          </Button>
        </div>
      )}

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>確定要刪除？</DialogTitle>
            <DialogDescription>
              將刪除「{deleteTarget?.name}」信用卡設定。已記錄的消費不會受影響。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              取消
            </Button>
            <Button
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={handleDelete}
            >
              確定刪除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
