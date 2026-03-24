"use client";

import { useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { OCRResult, Category, PaymentMethod } from "@/types";
import { CATEGORIES, PAYMENT_METHODS } from "@/types";

interface ReceiptConfirmProps {
  result: OCRResult;
  onConfirm: (result: OCRResult, category: Category, paymentMethod: PaymentMethod) => void;
  onCancel: () => void;
  saving: boolean;
}

export function ReceiptConfirm({
  result: initialResult,
  onConfirm,
  onCancel,
  saving,
}: ReceiptConfirmProps) {
  const [result, setResult] = useState<OCRResult>(initialResult);
  const [category, setCategory] = useState<Category>("餐飲");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    initialResult.payment_method === "cash" ? "現金"
    : initialResult.payment_method === "credit_card" ? "信用卡"
    : initialResult.payment_method === "paypay" ? "PayPay"
    : initialResult.payment_method === "suica" ? "Suica"
    : "現金"
  );

  const updateItem = (index: number, field: string, value: string | number) => {
    setResult((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const removeItem = (index: number) => {
    setResult((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const addItem = () => {
    setResult((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          name_ja: "",
          name: "新品項",
          quantity: 1,
          unit_price: 0,
          tax_rate: 0.08,
          tax_type: "reduced",
        },
      ],
    }));
  };

  return (
    <div className="space-y-4 px-4">
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-lg">{result.store_name}</h3>
          <span className="text-sm text-muted-foreground">{result.date}</span>
        </div>
        <p className="text-xs text-muted-foreground">{result.store_name_ja}</p>
      </div>

      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-bold">購買明細</h4>
          <button
            onClick={addItem}
            className="flex items-center gap-1 text-sm text-orange-500"
          >
            <Plus className="h-3.5 w-3.5" />
            新增品項
          </button>
        </div>

        <div className="space-y-3">
          {result.items.map((item, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-3 rounded-xl bg-gray-50"
            >
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold">
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
                  ? "border-orange-400 bg-orange-50 text-orange-600"
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
                  ? "border-orange-400 bg-orange-50 text-orange-600"
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
        onClick={() => onConfirm(result, category, paymentMethod)}
        className="w-full h-12 text-base bg-orange-500 hover:bg-orange-600"
        disabled={saving}
      >
        {saving ? "儲存中..." : `確認儲存 (${result.items.length} 筆)`}
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
