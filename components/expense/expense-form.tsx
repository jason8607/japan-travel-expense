"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { getExchangeRate, jpyToTwd } from "@/lib/exchange-rate";
import { CATEGORIES, PAYMENT_METHODS } from "@/types";
import type { Category, PaymentMethod, Expense } from "@/types";

interface ExpenseFormProps {
  editExpense?: Expense | null;
}

export function ExpenseForm({ editExpense }: ExpenseFormProps) {
  const { user, currentTrip, tripMembers } = useApp();
  const router = useRouter();

  const [title, setTitle] = useState(editExpense?.title || "");
  const [amountJpy, setAmountJpy] = useState(
    editExpense?.amount_jpy?.toString() || ""
  );
  const [category, setCategory] = useState<Category>(
    editExpense?.category || "餐飲"
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    editExpense?.payment_method || "現金"
  );
  const [storeName, setStoreName] = useState(editExpense?.store_name || "");
  const [location, setLocation] = useState(editExpense?.location || "");
  const [expenseDate, setExpenseDate] = useState(
    editExpense?.expense_date || new Date().toISOString().split("T")[0]
  );
  const [paidBy, setPaidBy] = useState(editExpense?.paid_by || user?.id || "");
  const [saving, setSaving] = useState(false);

  // Auto-detect location is handled by trip schedule if configured

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTrip || !user) {
      toast.error("請先建立或選擇一個旅程");
      return;
    }
    setSaving(true);

    try {
      const rate = await getExchangeRate();
      const jpy = Number(amountJpy);
      const twd = jpyToTwd(jpy, rate);

      const expenseData = {
        trip_id: currentTrip.id,
        paid_by: paidBy || user.id,
        title,
        amount_jpy: jpy,
        amount_twd: twd,
        exchange_rate: rate,
        category,
        payment_method: paymentMethod,
        store_name: storeName || null,
        location: location || null,
        expense_date: expenseDate,
      };

      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expenseData),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "儲存失敗");

      toast.success(editExpense ? "已更新消費紀錄" : "已新增消費紀錄");

      router.push("/records");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "儲存失敗";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <div className="space-y-2">
        <Label htmlFor="title">品名</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例：拉麵、新幹線車票"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="amount">金額 (¥)</Label>
          <Input
            id="amount"
            type="number"
            value={amountJpy}
            onChange={(e) => setAmountJpy(e.target.value)}
            placeholder="0"
            required
            min={0}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="date">日期</Label>
          <Input
            id="date"
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>類別</Label>
          <Select
            value={category}
            onValueChange={(v) => setCategory(v as Category)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>支付方式</Label>
          <Select
            value={paymentMethod}
            onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="store">店家名稱</Label>
        <Input
          id="store"
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
          placeholder="選填"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">地點</Label>
        <Input
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="選填，例：東京、大阪"
        />
      </div>

      {tripMembers.length > 1 && (
        <div className="space-y-2">
          <Label>誰付的</Label>
          <Select value={paidBy} onValueChange={(v) => { if (v) setPaidBy(v); }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tripMembers.map((m) => (
                <SelectItem key={m.user_id} value={m.user_id}>
                  {m.profile?.avatar_emoji || "🧑"}{" "}
                  {m.profile?.display_name || "成員"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Button
        type="submit"
        className="w-full bg-orange-500 hover:bg-orange-600 h-12 text-base"
        disabled={saving}
      >
        {saving
          ? "儲存中..."
          : editExpense
            ? "更新消費"
            : "新增消費"}
      </Button>
    </form>
  );
}
