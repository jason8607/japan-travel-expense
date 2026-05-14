"use client";

import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreditCards } from "@/hooks/use-credit-cards";
import type { CreditCard } from "@/types";
import { ChevronDown, CreditCard as CreditCardIcon, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface PlanDraft {
  id?: string;
  name: string;
  rate: string;
}

// Shared inline form used for both new card (at top) and edit card (below each row)
function CardForm({
  editingCard,
  name, setName,
  rate, setRate,
  limit, setLimit,
  plans, setPlans,
  saving,
  onSave,
  onCancel,
}: {
  editingCard: CreditCard | null;
  name: string; setName: (v: string) => void;
  rate: string; setRate: (v: string) => void;
  limit: string; setLimit: (v: string) => void;
  plans: PlanDraft[]; setPlans: (v: PlanDraft[]) => void;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  const addPlan = () => setPlans([...plans, { name: "", rate: "" }]);
  const removePlan = (i: number) => setPlans(plans.filter((_, idx) => idx !== i));
  const updatePlan = (i: number, field: keyof PlanDraft, value: string) =>
    setPlans(plans.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)));

  return (
    <div className="p-4 space-y-3 bg-muted/50">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">卡片名稱</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例：台新 Richart、國泰 Cube"
          className="h-10 rounded-lg text-sm"
        />
      </div>

      {plans.length === 0 && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">回饋 %</Label>
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
            <Label className="text-xs text-muted-foreground">刷卡上限 (NT$)</Label>
            <Input
              type="number"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              placeholder="例：30000"
              min="0"
              className="h-10 rounded-lg text-sm"
            />
          </div>
        </div>
      )}

      {plans.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">刷卡上限 (NT$，所有方案共用)</Label>
          <Input
            type="number"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            placeholder="例：30000"
            min="0"
            className="h-10 rounded-lg text-sm"
          />
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">
            可切方案 {plans.length > 0 && `(${plans.length})`}
          </Label>
          <button
            type="button"
            onClick={addPlan}
            className="text-[11px] text-primary flex items-center gap-0.5"
          >
            <Plus className="h-3 w-3" />
            新增方案
          </button>
        </div>
        {plans.length === 0 && (
          <p className="text-[11px] text-muted-foreground">
            如果這張卡有多個回饋方案可切換，點新增方案來設定
          </p>
        )}
        {plans.map((plan, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={plan.name}
              onChange={(e) => updatePlan(i, "name", e.target.value)}
              placeholder="方案名稱"
              className="h-9 rounded-lg text-sm flex-1"
            />
            <div className="relative w-24 shrink-0">
              <Input
                type="number"
                value={plan.rate}
                onChange={(e) => updatePlan(i, "rate", e.target.value)}
                placeholder="回饋%"
                step="0.1"
                min="0"
                className="h-9 rounded-lg text-sm pr-6"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
            </div>
            <button
              type="button"
              onClick={() => removePlan(i)}
              className="p-1 text-muted-foreground hover:text-destructive transition-colors shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={saving}
          className="flex-1 rounded-lg text-sm"
        >
          取消
        </Button>
        <Button
          onClick={onSave}
          className="flex-1 h-9 bg-primary hover:bg-primary/90 rounded-lg text-sm"
          disabled={saving}
        >
          {saving ? "儲存中..." : editingCard ? "儲存變更" : "新增信用卡"}
        </Button>
      </div>
    </div>
  );
}

export function CreditCardManager() {
  const { cards, addCard, updateCard, deleteCard } = useCreditCards();
  const [isOpen, setIsOpen] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CreditCard | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [rate, setRate] = useState("");
  const [limit, setLimit] = useState("");
  const [plans, setPlans] = useState<PlanDraft[]>([]);

  const resetForm = () => {
    setName("");
    setRate("");
    setLimit("");
    setPlans([]);
    setEditingCard(null);
    setShowNewForm(false);
  };

  const openNew = () => {
    resetForm();
    setShowNewForm(true);
  };

  const openEdit = (card: CreditCard) => {
    setShowNewForm(false);
    setName(card.name);
    setRate(String(card.cashback_rate));
    setLimit(String(card.cashback_limit));
    setPlans(
      card.plans?.map((p) => ({ id: p.id, name: p.name, rate: String(p.cashback_rate) })) || []
    );
    setEditingCard(card);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("請輸入卡片名稱"); return; }
    const limitNum = parseFloat(limit);
    if (isNaN(limitNum) || limitNum <= 0) { toast.error("請輸入有效的刷卡上限"); return; }

    const hasPlans = plans.length > 0;
    if (!hasPlans) {
      const rateNum = parseFloat(rate);
      if (isNaN(rateNum) || rateNum <= 0) { toast.error("請輸入有效的回饋 %"); return; }
    }
    if (hasPlans) {
      for (let i = 0; i < plans.length; i++) {
        if (!plans[i].name.trim()) { toast.error(`方案 ${i + 1} 名稱不得為空`); return; }
        const pr = parseFloat(plans[i].rate);
        if (isNaN(pr) || pr <= 0) { toast.error(`方案「${plans[i].name}」的回饋 % 必須大於 0`); return; }
      }
    }

    setSaving(true);
    try {
      const cardRate = hasPlans ? 0 : parseFloat(rate);
      const planData = hasPlans
        ? plans.map((p) => ({ id: p.id, name: p.name.trim(), cashback_rate: parseFloat(p.rate) }))
        : undefined;

      if (editingCard) {
        const updated = await updateCard(editingCard.id, {
          name: name.trim(),
          cashback_rate: cardRate,
          cashback_limit: limitNum,
          plans: planData as CreditCard["plans"],
        });
        if (updated) { toast.success("已更新信用卡"); } else { toast.error("更新失敗"); return; }
      } else {
        const card = await addCard({
          name: name.trim(),
          cashback_rate: cardRate,
          cashback_limit: limitNum,
          plans: planData as CreditCard["plans"],
        });
        if (card) { toast.success("已新增信用卡"); } else { toast.error("新增失敗"); return; }
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
    if (ok) { toast.success("已刪除信用卡"); } else { toast.error("刪除失敗"); }
  };

  const getCardRateDisplay = (card: CreditCard) => {
    if (card.plans && card.plans.length > 0) {
      const rates = card.plans.map((p) => p.cashback_rate);
      const min = Math.min(...rates);
      const max = Math.max(...rates);
      return min === max ? `${min}%` : `${min}~${max}%`;
    }
    return `${card.cashback_rate}%`;
  };

  const formProps = { name, setName, rate, setRate, limit, setLimit, plans, setPlans, saving, onSave: handleSave, onCancel: resetForm };

  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
      <div className={`px-4 py-3 flex items-center gap-2 ${isOpen ? "border-b border-border/60" : ""}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex-1 flex items-center gap-2 min-w-0 text-left"
        >
          <CreditCardIcon className="h-4 w-4 shrink-0" />
          <span className="text-sm font-bold">信用卡管理</span>
        </button>
        <div className="flex items-center gap-2 shrink-0">
          {isOpen && (!showNewForm && !editingCard ? (
            <button
              onClick={openNew}
              className="text-xs text-primary flex items-center gap-1"
            >
              <Plus className="h-3 w-3" />
              新增
            </button>
          ) : (
            <button
              onClick={resetForm}
              disabled={saving}
              className="text-xs text-muted-foreground flex items-center gap-1 rounded transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px disabled:pointer-events-none disabled:opacity-50"
            >
              <X className="h-3 w-3" />
              取消
            </button>
          ))}
          <button onClick={() => { setIsOpen(!isOpen); if (isOpen) resetForm(); }}>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {isOpen && (
        <>
          {/* New card form — directly below header */}
          {showNewForm && (
            <div className="border-b border-border/60">
              <CardForm editingCard={null} {...formProps} />
            </div>
          )}

          {/* Card list */}
          {cards.length === 0 && !showNewForm ? (
            <EmptyState
              icon={CreditCardIcon}
              title="尚未設定信用卡"
              description="新增信用卡後，就能追蹤各卡回饋比例與上限。"
              variant="section"
            />
          ) : (
            <div className="divide-y divide-border/60">
              {cards.map((card) => (
                <div key={card.id}>
                  {/* Card row */}
                  <div className="px-4 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-base">💳</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{card.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        回饋 {getCardRateDisplay(card)} · 刷滿 NT${card.cashback_limit.toLocaleString()}
                      </p>
                      {card.plans && card.plans.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {card.plans.map((plan) => (
                            <span
                              key={plan.id}
                              className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary"
                            >
                              {plan.name} {plan.cashback_rate}%
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => editingCard?.id === card.id ? resetForm() : openEdit(card)}
                        className={`p-1.5 transition-colors ${editingCard?.id === card.id ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(card)}
                        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {/* Inline edit form — directly below this card */}
                  {editingCard?.id === card.id && (
                    <div className="border-t border-border/60">
                      <CardForm editingCard={card} {...formProps} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
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
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
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
