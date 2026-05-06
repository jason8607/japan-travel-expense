"use client";

import { CreditCardPicker } from "@/components/expense/credit-card-picker";
import {
  ParticipantPicker,
  type ParticipantValue,
} from "@/components/expense/participant-picker";
import { PaymentChips } from "@/components/expense/payment-chips";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useCategories } from "@/hooks/use-categories";
import { useApp } from "@/lib/context";
import { OCR_TO_PAYMENT_METHOD } from "@/lib/payment-methods";
import { cn } from "@/lib/utils";
import type { Category, OCRResult, PaymentMethod } from "@/types";
import { getExchangeRate } from "@/lib/exchange-rate";
import { ChevronDown, Plus, Trash2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export interface ReceiptItemWithOwner {
  _id: string;
  name: string;
  name_ja: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_type: string;
  owner_id: string | null;
  split_type: "personal" | "split";
  // Subset participants (only meaningful for split). Empty = all members
  // (legacy / "全部均分").
  participants: string[];
  category: Category;
}

function itemToParticipantValue(item: ReceiptItemWithOwner): ParticipantValue {
  if (item.split_type === "split") {
    return { kind: "split", participants: item.participants };
  }
  return { kind: "personal", ownerId: item.owner_id };
}

function applyParticipantValue(
  item: ReceiptItemWithOwner,
  value: ParticipantValue,
): ReceiptItemWithOwner {
  if (value.kind === "personal") {
    return {
      ...item,
      split_type: "personal",
      owner_id: value.ownerId,
      participants: [],
    };
  }
  return {
    ...item,
    split_type: "split",
    owner_id: null,
    participants: value.participants,
  };
}

interface ReceiptConfirmProps {
  result: OCRResult;
  onConfirm: (data: {
    items: ReceiptItemWithOwner[];
    paymentMethod: PaymentMethod;
    creditCardId: string | null;
    creditCardPlanId: string | null;
    storeName: string;
    storeNameJa: string;
    date: string;
  }) => void;
  onCancel: () => void;
  saving: boolean;
}

export function ReceiptConfirm({
  result: initialResult,
  onConfirm,
  onCancel,
  saving,
}: ReceiptConfirmProps) {
  const { user, profile: myProfile, tripMembers } = useApp();
  const { categories: CATEGORIES } = useCategories();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    OCR_TO_PAYMENT_METHOD[initialResult.payment_method],
  );

  const [creditCardId, setCreditCardId] = useState<string | null>(null);
  const [creditCardPlanId, setCreditCardPlanId] = useState<string | null>(null);

  const [items, setItems] = useState<ReceiptItemWithOwner[]>(
    initialResult.items.map((item) => ({
      ...item,
      _id: crypto.randomUUID(),
      owner_id: null,
      split_type: "personal" as const,
      participants: [],
    }))
  );

  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);

  const [storeName] = useState(initialResult.store_name);
  const [storeNameJa] = useState(initialResult.store_name_ja);
  const [date] = useState(initialResult.date);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);

  useEffect(() => {
    getExchangeRate()
      .then(setExchangeRate)
      .catch(() => {
        // Fail silent — confirm flow uses scan/page.tsx's own fetch on save.
        // This display is informational; missing rate just hides the row.
      });
  }, []);

  const runBulkWithUndo = (label: string, mutate: () => void) => {
    const snapshot = items;
    mutate();
    toast.success(label, {
      action: { label: "復原", onClick: () => setItems(snapshot) },
      duration: 5000,
    });
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        _id: crypto.randomUUID(),
        name_ja: "",
        name: "新品項",
        quantity: 1,
        unit_price: 0,
        tax_rate: 0.08,
        tax_type: "reduced",
        owner_id: null,
        split_type: "personal" as const,
        participants: [],
        category: "餐飲" as Category,
      },
    ]);
  };

  const setItemParticipantValue = (index: number, value: ParticipantValue) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? applyParticipantValue(item, value) : item)),
    );
  };

  const setAllParticipantValue = (value: ParticipantValue) => {
    setItems((prev) => prev.map((item) => applyParticipantValue(item, value)));
  };

  const setItemCategory = (index: number, cat: Category) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, category: cat } : item))
    );
    setExpandedCategoryId(null);
  };

  const setAllCategory = (cat: Category) => {
    setItems((prev) => prev.map((item) => ({ ...item, category: cat })));
  };

  const hasMultipleMembers = tripMembers.length > 1;

  return (
    <div className="space-y-4 px-4">
      {/* Store info */}
      <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-lg">{storeName}</h3>
          <span className="text-sm text-muted-foreground tabular-nums">{date}</span>
        </div>
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <p className="truncate">{storeNameJa}</p>
          {exchangeRate !== null && (
            <span className="tabular-nums shrink-0">
              ¥1 ≈ NT${exchangeRate.toFixed(4)}
            </span>
          )}
        </div>
      </div>

      {/* Quick assign buttons */}
      <div className="rounded-xl bg-card p-3 ring-1 ring-foreground/10 space-y-2.5">
        <p className="text-xs text-muted-foreground font-medium">快速指定全部品項</p>
        {/* Quick assign category */}
        <div>
          <p className="text-[10px] text-muted-foreground mb-1.5">分類</p>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() =>
                  runBulkWithUndo(`已將全部設為「${cat.label}」`, () =>
                    setAllCategory(cat.value),
                  )
                }
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-medium transition-all",
                  items.every((it) => it.category === cat.value)
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                <span className="text-sm">{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>
        {/* Quick assign owner — bulk action buttons that map all items to a
            single ParticipantValue. Subset bulk is rare so we don't expose it
            here; users can refine per-item below. */}
        {hasMultipleMembers && user && (
          <div>
            <p className="text-[10px] text-muted-foreground mb-1.5">全部歸屬</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() =>
                  runBulkWithUndo("已將全部設為「我的」", () =>
                    setAllParticipantValue({ kind: "personal", ownerId: null }),
                  )
                }
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium bg-primary/10 border-primary/25 text-primary"
              >
                <UserAvatar avatarUrl={myProfile?.avatar_url} avatarEmoji={myProfile?.avatar_emoji} size="xs" />
                全部我的
              </button>
              {tripMembers
                .filter((m) => m.user_id !== user.id)
                .map((m) => {
                  const memberLabel = m.profile?.display_name || "成員";
                  return (
                    <button
                      key={m.user_id}
                      type="button"
                      onClick={() =>
                        runBulkWithUndo(`已將全部設為「${memberLabel} 的」`, () =>
                          setAllParticipantValue({
                            kind: "personal",
                            ownerId: m.user_id,
                          }),
                        )
                      }
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium border-border text-muted-foreground hover:bg-muted"
                    >
                      <UserAvatar avatarUrl={m.profile?.avatar_url} avatarEmoji={m.profile?.avatar_emoji} size="xs" />
                      全部{memberLabel}的
                    </button>
                  );
                })}
              <button
                type="button"
                onClick={() =>
                  runBulkWithUndo("已將全部設為「均分」", () =>
                    setAllParticipantValue({ kind: "split", participants: [] }),
                  )
                }
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium border-primary/50 text-primary bg-primary/10"
              >
                <Users className="h-3 w-3" /> 全部均分
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Items with per-item owner */}
      <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-bold">購買明細</h4>
          <button
            onClick={addItem}
            className="flex items-center gap-1 text-sm text-primary"
          >
            <Plus className="h-3.5 w-3.5" />
            新增品項
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => {
            const currentCat = CATEGORIES.find((c) => c.value === item.category) || CATEGORIES[0];
            const isExpanded = expandedCategoryId === item._id;

            return (
              <div key={item._id} className="rounded-xl bg-muted overflow-hidden">
                <div className="flex items-start gap-3 p-3">
                  <div className="shrink-0 w-6 h-6 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <Input
                      value={item.name}
                      onChange={(e) => updateItem(index, "name", e.target.value)}
                      className="h-7 text-sm font-medium border-0 bg-transparent p-0 focus-visible:ring-0"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      {item.name_ja} · {item.quantity} x ¥
                      {item.unit_price.toLocaleString()} (
                      {(item.tax_rate * 100).toFixed(0)}%)
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-sm">
                      ¥{(item.quantity * item.unit_price).toLocaleString()}
                    </span>
                    <button
                      onClick={() => removeItem(index)}
                      className="p-1 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Per-item category selector */}
                <div className="px-3 pb-2">
                  <button
                    type="button"
                    onClick={() => setExpandedCategoryId(isExpanded ? null : item._id)}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all",
                      "border border-border hover:border-border"
                    )}
                  >
                    <span className="text-sm leading-none">{currentCat.icon}</span>
                    {currentCat.label}
                    <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                  </button>
                  {isExpanded && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => setItemCategory(index, cat.value)}
                          className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all",
                            item.category === cat.value
                              ? "bg-primary/15 text-primary"
                              : "bg-card text-muted-foreground hover:bg-muted"
                          )}
                        >
                          <span className="text-sm leading-none">{cat.icon}</span>
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Per-item participant picker (compact — Sheet handles subset).
                    Self-label is just "我" because the receipt context already
                    implies "this item". */}
                {hasMultipleMembers && user && (
                  <div className="px-3 pb-2.5">
                    <ParticipantPicker
                      members={tripMembers}
                      currentUserId={user.id}
                      value={itemToParticipantValue(item)}
                      onChange={(value) => setItemParticipantValue(index, value)}
                      variant="compact"
                      selfLabel="我"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment method picker */}
      <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 space-y-3">
        <h4 className="font-bold text-sm">支付方式</h4>
        <PaymentChips
          value={paymentMethod}
          onChange={(m) => {
            setPaymentMethod(m);
            if (m !== "信用卡") {
              setCreditCardId(null);
              setCreditCardPlanId(null);
            }
          }}
        />
        {paymentMethod === "信用卡" && (
          <CreditCardPicker
            value={creditCardId}
            onChange={setCreditCardId}
            planValue={creditCardPlanId}
            onPlanChange={setCreditCardPlanId}
          />
        )}
      </div>

      <Button
        onClick={() =>
          onConfirm({
            items,
            paymentMethod,
            creditCardId: paymentMethod === "信用卡" ? creditCardId : null,
            creditCardPlanId: paymentMethod === "信用卡" ? creditCardPlanId : null,
            storeName,
            storeNameJa,
            date,
          })
        }
        size="lg"
        className="w-full"
        disabled={saving}
      >
        {saving ? "儲存中..." : `確認儲存 (${items.length} 筆)`}
      </Button>

      <Button
        variant="ghost"
        size="lg"
        onClick={onCancel}
        className="w-full text-muted-foreground"
        disabled={saving}
      >
        重新掃描
      </Button>
    </div>
  );
}
