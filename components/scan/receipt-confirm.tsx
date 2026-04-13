"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Category, OCRResult, PaymentMethod } from "@/types";
import { ChevronDown, Plus, Trash2, Users } from "lucide-react";
import { PaymentChips } from "@/components/expense/payment-chips";
import { CreditCardPicker } from "@/components/expense/credit-card-picker";
import { useCategories } from "@/hooks/use-categories";
import { useState } from "react";
import { useApp } from "@/lib/context";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/user-avatar";

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
  category: Category;
}

interface ReceiptConfirmProps {
  result: OCRResult;
  onConfirm: (data: {
    items: ReceiptItemWithOwner[];
    paymentMethod: PaymentMethod;
    creditCardId: string | null;
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
    initialResult.payment_method === "cash" ? "現金"
    : initialResult.payment_method === "credit_card" ? "信用卡"
    : initialResult.payment_method === "paypay" ? "PayPay"
    : initialResult.payment_method === "suica" ? "Suica"
    : "現金"
  );

  const [creditCardId, setCreditCardId] = useState<string | null>(null);

  const [items, setItems] = useState<ReceiptItemWithOwner[]>(
    initialResult.items.map((item) => ({
      ...item,
      _id: crypto.randomUUID(),
      owner_id: null,
      split_type: "personal" as const,
      category: "餐飲" as Category,
    }))
  );

  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);

  const [storeName] = useState(initialResult.store_name);
  const [storeNameJa] = useState(initialResult.store_name_ja);
  const [date] = useState(initialResult.date);

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
        category: "餐飲" as Category,
      },
    ]);
  };

  const setItemOwner = (index: number, ownerId: string | null, splitType: "personal" | "split") => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, owner_id: ownerId, split_type: splitType } : item
      )
    );
  };

  const setAllOwner = (ownerId: string | null, splitType: "personal" | "split") => {
    setItems((prev) =>
      prev.map((item) => ({ ...item, owner_id: ownerId, split_type: splitType }))
    );
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
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-lg">{storeName}</h3>
          <span className="text-sm text-muted-foreground">{date}</span>
        </div>
        <p className="text-xs text-muted-foreground">{storeNameJa}</p>
      </div>

      {/* Quick assign buttons */}
      <div className="rounded-2xl border bg-white p-3 shadow-sm space-y-2.5">
        <p className="text-xs text-muted-foreground font-medium">快速指定全部品項</p>
        {/* Quick assign category */}
        <div>
          <p className="text-[10px] text-muted-foreground mb-1.5">分類</p>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setAllCategory(cat.value)}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-medium transition-all",
                  items.every((it) => it.category === cat.value)
                    ? "border-blue-300 bg-blue-50 text-blue-700"
                    : "border-slate-200 text-slate-500 hover:bg-slate-50"
                )}
              >
                <span className="text-sm">{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>
        {/* Quick assign owner */}
        {hasMultipleMembers && (
          <div>
            <p className="text-[10px] text-muted-foreground mb-1.5">歸屬</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setAllOwner(null, "personal")}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium bg-blue-50 border-blue-200 text-blue-700"
              >
                <UserAvatar avatarUrl={myProfile?.avatar_url} avatarEmoji={myProfile?.avatar_emoji} size="xs" />
                全部我的
              </button>
              {tripMembers
                .filter((m) => m.user_id !== user?.id)
                .map((m) => (
                  <button
                    key={m.user_id}
                    type="button"
                    onClick={() => setAllOwner(m.user_id, "personal")}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium border-slate-200 text-slate-600 hover:bg-slate-50"
                  >
                    <UserAvatar avatarUrl={m.profile?.avatar_url} avatarEmoji={m.profile?.avatar_emoji} size="xs" />
                    全部{m.profile?.display_name || "成員"}的
                  </button>
                ))}
              <button
                type="button"
                onClick={() => setAllOwner(null, "split")}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium border-teal-200 text-teal-700 bg-teal-50"
              >
                <Users className="h-3 w-3" /> 全部均分
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Items with per-item owner */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-bold">購買明細</h4>
          <button
            onClick={addItem}
            className="flex items-center gap-1 text-sm text-blue-500"
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
              <div key={item._id} className="rounded-xl bg-gray-50 overflow-hidden">
                <div className="flex items-start gap-3 p-3">
                  <div className="shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
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
                      className="p-1 text-muted-foreground hover:text-red-500"
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
                      "border border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <span className="text-sm leading-none">{currentCat.icon}</span>
                    {currentCat.label}
                    <ChevronDown className={cn("h-3 w-3 text-slate-400 transition-transform", isExpanded && "rotate-180")} />
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
                              ? "bg-blue-100 text-blue-700"
                              : "bg-white text-slate-500 hover:bg-slate-100"
                          )}
                        >
                          <span className="text-sm leading-none">{cat.icon}</span>
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Per-item owner chips */}
                {hasMultipleMembers && (
                  <div className="flex flex-wrap gap-1 px-3 pb-2.5">
                    <button
                      type="button"
                      onClick={() => setItemOwner(index, null, "personal")}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all",
                        item.split_type === "personal" && item.owner_id === null
                          ? "bg-blue-100 text-blue-700"
                          : "bg-white text-slate-400 hover:text-slate-600"
                      )}
                    >
                      <UserAvatar avatarUrl={myProfile?.avatar_url} avatarEmoji={myProfile?.avatar_emoji} size="xs" />
                      我
                    </button>
                    {tripMembers
                      .filter((m) => m.user_id !== user?.id)
                      .map((m) => (
                        <button
                          key={m.user_id}
                          type="button"
                          onClick={() => setItemOwner(index, m.user_id, "personal")}
                          className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all",
                            item.split_type === "personal" && item.owner_id === m.user_id
                              ? "bg-blue-100 text-blue-700"
                              : "bg-white text-slate-400 hover:text-slate-600"
                          )}
                        >
                          <UserAvatar avatarUrl={m.profile?.avatar_url} avatarEmoji={m.profile?.avatar_emoji} size="xs" />
                          {m.profile?.display_name || "成員"}
                        </button>
                      ))}
                    <button
                      type="button"
                      onClick={() => setItemOwner(index, null, "split")}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all",
                        item.split_type === "split"
                          ? "bg-teal-100 text-teal-700"
                          : "bg-white text-slate-400 hover:text-slate-600"
                      )}
                    >
                      👥 均分
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment method picker */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
        <h4 className="font-bold text-sm">支付方式</h4>
        <PaymentChips
          value={paymentMethod}
          onChange={(m) => {
            setPaymentMethod(m);
            if (m !== "信用卡") setCreditCardId(null);
          }}
        />
        {paymentMethod === "信用卡" && (
          <CreditCardPicker value={creditCardId} onChange={setCreditCardId} />
        )}
      </div>

      <Button
        onClick={() =>
          onConfirm({
            items,
            paymentMethod,
            creditCardId: paymentMethod === "信用卡" ? creditCardId : null,
            storeName,
            storeNameJa,
            date,
          })
        }
        className="w-full h-12 text-base bg-blue-500 hover:bg-blue-600"
        disabled={saving}
      >
        {saving ? "儲存中..." : `確認儲存 (${items.length} 筆)`}
      </Button>

      <Button
        variant="ghost"
        onClick={onCancel}
        className="w-full text-muted-foreground"
        disabled={saving}
      >
        重新掃描
      </Button>
    </div>
  );
}
