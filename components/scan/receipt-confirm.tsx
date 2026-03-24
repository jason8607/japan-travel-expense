"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Category, OCRResult, PaymentMethod } from "@/types";
import { CATEGORIES, PAYMENT_METHODS } from "@/types";
import { Plus, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/lib/context";
import { cn } from "@/lib/utils";

export interface ReceiptItemWithOwner {
  name: string;
  name_ja: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_type: string;
  owner_id: string | null;
  split_type: "personal" | "split";
}

interface ReceiptConfirmProps {
  result: OCRResult;
  onConfirm: (data: {
    items: ReceiptItemWithOwner[];
    category: Category;
    paymentMethod: PaymentMethod;
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
  const { user, tripMembers } = useApp();
  const [category, setCategory] = useState<Category>("餐飲");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    initialResult.payment_method === "cash" ? "現金"
    : initialResult.payment_method === "credit_card" ? "信用卡"
    : initialResult.payment_method === "paypay" ? "PayPay"
    : initialResult.payment_method === "suica" ? "Suica"
    : "現金"
  );

  const [items, setItems] = useState<ReceiptItemWithOwner[]>(
    initialResult.items.map((item) => ({
      ...item,
      owner_id: null,
      split_type: "personal" as const,
    }))
  );

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
        name_ja: "",
        name: "新品項",
        quantity: 1,
        unit_price: 0,
        tax_rate: 0.08,
        tax_type: "reduced",
        owner_id: null,
        split_type: "personal" as const,
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
      {hasMultipleMembers && (
        <div className="rounded-2xl border bg-white p-3 shadow-sm">
          <p className="text-xs text-muted-foreground font-medium mb-2">快速指定全部品項</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setAllOwner(null, "personal")}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium bg-blue-50 border-blue-200 text-blue-700"
            >
              {user ? "🧑 全部我的" : "全部我的"}
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
                  {m.profile?.avatar_emoji || "🧑"} 全部{m.profile?.display_name || "成員"}的
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
          {items.map((item, index) => (
            <div key={index} className="rounded-xl bg-gray-50 overflow-hidden">
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
                    🧑 我
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
                        {m.profile?.avatar_emoji || "🧑"} {m.profile?.display_name || "成員"}
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
          ))}
        </div>
      </div>

      {/* Category picker */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <h4 className="font-bold mb-3 text-sm">消費類別</h4>
        <div className="grid grid-cols-4 gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`flex flex-col items-center gap-1 p-2.5 rounded-xl text-xs font-medium border-2 transition-all ${
                category === c.value
                  ? "border-blue-400 bg-blue-50 text-blue-600"
                  : "border-slate-100 bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              <span className="text-xl leading-none">{c.icon}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Payment method picker */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <h4 className="font-bold mb-3 text-sm">支付方式</h4>
        <div className="flex flex-wrap gap-2">
          {PAYMENT_METHODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPaymentMethod(p.value)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium border-2 transition-all ${
                paymentMethod === p.value
                  ? "border-blue-400 bg-blue-50 text-blue-600"
                  : "border-slate-100 bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              <span className="text-base leading-none">{p.icon}</span>
              <span>{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      <Button
        onClick={() =>
          onConfirm({
            items,
            category,
            paymentMethod,
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
