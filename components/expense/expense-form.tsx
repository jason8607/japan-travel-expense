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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { getExchangeRate, jpyToTwd, twdToJpy } from "@/lib/exchange-rate";
import { addGuestExpense, updateGuestExpense, deleteGuestExpense } from "@/lib/guest-storage";
import type { Category, PaymentMethod, SplitType, Expense } from "@/types";
import { Trash2, MapPin, Store, Users } from "lucide-react";
import { cn, getPreTripDate, isPreTripDate } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/user-avatar";
import { CategoryGrid } from "./category-grid";
import { PaymentChips } from "./payment-chips";
import { CreditCardPicker } from "./credit-card-picker";

interface ExpenseFormProps {
  editExpense?: Expense | null;
}

export function ExpenseForm({ editExpense }: ExpenseFormProps) {
  const { user, currentTrip, tripMembers, isGuest } = useApp();
  const router = useRouter();
  const isEditing = !!editExpense;

  const [title, setTitle] = useState(editExpense?.title || "");
  const [currency, setCurrency] = useState<"JPY" | "TWD">(
    editExpense?.input_currency || "JPY"
  );
  const [amount, setAmount] = useState(() => {
    if (!editExpense) return "";
    if (editExpense.input_currency === "TWD") return editExpense.amount_twd?.toString() || "";
    return editExpense.amount_jpy?.toString() || "";
  });
  const [category, setCategory] = useState<Category>(
    editExpense?.category || "餐飲"
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    editExpense?.payment_method || "現金"
  );
  const [storeName, setStoreName] = useState(editExpense?.store_name || "");
  const [location, setLocation] = useState(editExpense?.location || "");
  const [expenseDate, setExpenseDate] = useState(() => {
    if (editExpense?.expense_date) return editExpense.expense_date;
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
  });
  const [paidBy, setPaidBy] = useState(editExpense?.paid_by || user?.id || "");
  const [splitType, setSplitType] = useState<SplitType>(
    editExpense?.split_type || "personal"
  );
  const [ownerId, setOwnerId] = useState<string | null>(
    editExpense?.owner_id || null
  );
  const [creditCardId, setCreditCardId] = useState<string | null>(
    editExpense?.credit_card_id || null
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTrip) {
      toast.error("請先建立或選擇一個旅程");
      return;
    }
    if (!isGuest && !user) {
      toast.error("請先登入");
      return;
    }
    setSaving(true);

    try {
      const rate = await getExchangeRate();
      const inputAmount = Number(amount);
      const jpy = currency === "JPY" ? inputAmount : twdToJpy(inputAmount, rate);
      const twd = currency === "TWD" ? inputAmount : jpyToTwd(inputAmount, rate);

      const cardId = paymentMethod === "信用卡" ? creditCardId : null;

      if (isGuest) {
        if (isEditing && editExpense) {
          const result = updateGuestExpense(editExpense.id, {
            title,
            amount_jpy: jpy,
            amount_twd: twd,
            exchange_rate: rate,
            category,
            payment_method: paymentMethod,
            store_name: storeName || null,
            location: location || null,
            expense_date: expenseDate,
            credit_card_id: cardId,
            input_currency: currency,
          });
          if (!result) { toast.error("儲存空間不足，請清理部分紀錄"); setSaving(false); return; }
          toast.success("已更新消費紀錄");
        } else {
          const result = addGuestExpense({
            title,
            amount_jpy: jpy,
            amount_twd: twd,
            exchange_rate: rate,
            category,
            payment_method: paymentMethod,
            store_name: storeName || null,
            location: location || null,
            expense_date: expenseDate,
            credit_card_id: cardId,
            input_currency: currency,
          });
          if (!result) { toast.error("儲存空間不足，請清理部分紀錄"); setSaving(false); return; }
          toast.success("已新增消費紀錄");
        }
        router.push("/records");
        return;
      }

      if (isEditing) {
        const res = await fetch("/api/expenses", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editExpense.id,
            paid_by: paidBy || user!.id,
            owner_id: ownerId,
            title,
            amount_jpy: jpy,
            amount_twd: twd,
            exchange_rate: rate,
            category,
            payment_method: paymentMethod,
            store_name: storeName || null,
            location: location || null,
            expense_date: expenseDate,
            split_type: splitType,
            credit_card_id: cardId,
            input_currency: currency,
          }),
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "更新失敗");
        toast.success("已更新消費紀錄");
      } else {
        const res = await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            trip_id: currentTrip.id,
            paid_by: paidBy || user!.id,
            owner_id: ownerId,
            title,
            amount_jpy: jpy,
            amount_twd: twd,
            exchange_rate: rate,
            category,
            payment_method: paymentMethod,
            store_name: storeName || null,
            location: location || null,
            expense_date: expenseDate,
            split_type: splitType,
            credit_card_id: cardId,
            input_currency: currency,
          }),
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "儲存失敗");
        toast.success("已新增消費紀錄");
      }

      router.push("/records");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "儲存失敗";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editExpense) return;
    setShowDeleteDialog(false);
    setDeleting(true);
    try {
      if (isGuest) {
        deleteGuestExpense(editExpense.id);
      } else {
        const res = await fetch(`/api/expenses?id=${editExpense.id}`, {
          method: "DELETE",
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "刪除失敗");
      }

      toast.success("已刪除消費紀錄");
      router.push("/records");
      if (!isGuest) router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "刪除失敗";
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 p-4">
      {/* 品名 */}
      <div className="space-y-1.5">
        <Label htmlFor="title" className="text-sm font-medium text-slate-600">品名</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例：拉麵、新幹線車票"
          required
          className="h-12 rounded-xl border-slate-200 text-base focus-visible:ring-blue-500"
        />
      </div>

      {/* 幣別 */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-slate-600">幣別</Label>
        <div className="flex gap-2">
          {([["JPY", "🇯🇵 ¥ 日幣"], ["TWD", "🇹🇼 NT$ 台幣"]] as const).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setCurrency(val)}
              className={cn(
                "flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all",
                currency === val
                  ? "border-blue-400 bg-blue-50 text-blue-700"
                  : "border-slate-100 bg-white text-slate-500 hover:bg-slate-50"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 金額 + 日期 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="amount" className="text-sm font-medium text-slate-600">
            金額 ({currency === "JPY" ? "¥" : "NT$"})
          </Label>
          <Input
            id="amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            required
            min={0}
            className="h-12 rounded-xl border-slate-200 text-xl font-bold focus-visible:ring-blue-500"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="date" className="text-sm font-medium text-slate-600">日期</Label>
          <Input
            id="date"
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            className="h-12 rounded-xl border-slate-200 focus-visible:ring-blue-500"
          />
          {currentTrip && (
            <button
              type="button"
              onClick={() => {
                const pre = getPreTripDate(currentTrip.start_date);
                setExpenseDate(expenseDate === pre ? new Date().toISOString().slice(0, 10) : pre);
              }}
              className={cn(
                "text-xs px-2.5 py-1 rounded-full transition-colors",
                currentTrip && isPreTripDate(expenseDate, currentTrip.start_date)
                  ? "bg-amber-100 text-amber-700 font-medium"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              )}
            >
              ✈️ 行前
            </button>
          )}
        </div>
      </div>

      {/* 類別選擇 - 圖示網格 */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-slate-600">類別</Label>
        <CategoryGrid value={category} onChange={setCategory} />
      </div>

      {/* 支付方式 - 橫排 chips */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-slate-600">支付方式</Label>
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

      {/* 店家 + 地點 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="store" className="text-sm font-medium text-slate-600">
            <Store className="inline h-3.5 w-3.5 mr-1 text-slate-400" />
            店家名稱
          </Label>
          <Input
            id="store"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="選填"
            className="h-11 rounded-xl border-slate-200 focus-visible:ring-blue-500"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="location" className="text-sm font-medium text-slate-600">
            <MapPin className="inline h-3.5 w-3.5 mr-1 text-slate-400" />
            地點
          </Label>
          <Input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="選填"
            className="h-11 rounded-xl border-slate-200 focus-visible:ring-blue-500"
          />
        </div>
      </div>

      {/* 這筆是誰的 */}
      {!isGuest && tripMembers.length > 1 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-slate-600">這筆是誰的</Label>
          <div className="flex flex-wrap gap-2">
            {tripMembers.map((m) => {
              const isMe = m.user_id === user?.id;
              const isSelected =
                splitType === "personal" &&
                (isMe ? ownerId === null : ownerId === m.user_id);
              return (
                <button
                  key={m.user_id}
                  type="button"
                  onClick={() => {
                    setSplitType("personal");
                    setOwnerId(isMe ? null : m.user_id);
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2.5 rounded-xl border-2 transition-all duration-200 text-sm font-medium",
                    isSelected
                      ? "border-blue-400 bg-blue-50 text-blue-700"
                      : "border-slate-100 bg-white text-slate-500 hover:bg-slate-50"
                  )}
                >
                  <UserAvatar avatarUrl={m.profile?.avatar_url} avatarEmoji={m.profile?.avatar_emoji} size="xs" />
                  {isMe ? "我的" : m.profile?.display_name || "成員"}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                setSplitType("split");
                setOwnerId(null);
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2.5 rounded-xl border-2 transition-all duration-200 text-sm font-medium",
                splitType === "split"
                  ? "border-teal-400 bg-teal-50 text-teal-700"
                  : "border-slate-100 bg-white text-slate-500 hover:bg-slate-50"
              )}
            >
              <Users className="h-4 w-4" />
              均分 ({tripMembers.length} 人)
            </button>
          </div>
          {splitType === "split" && amount && (
            <p className="text-xs text-teal-500 bg-teal-50 rounded-lg px-3 py-2">
              每人 {currency === "JPY" ? "¥" : "NT$"}{Math.round(Number(amount) / tripMembers.length).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* 誰付的 */}
      {!isGuest && tripMembers.length > 1 && (
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-slate-600">誰付的</Label>
          <Select value={paidBy} onValueChange={(v) => { if (v) setPaidBy(v); }}>
            <SelectTrigger className="h-11 rounded-xl border-slate-200 focus:ring-blue-500">
              <SelectValue>
                {(value: string) => {
                  const member = tripMembers.find((m) => m.user_id === value);
                  if (!member) return "選擇成員";
                  return (
                    <span className="flex items-center gap-1.5">
                      <UserAvatar avatarUrl={member.profile?.avatar_url} avatarEmoji={member.profile?.avatar_emoji} size="xs" />
                      {member.profile?.display_name || "成員"}
                    </span>
                  );
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {tripMembers.map((m) => (
                <SelectItem
                  key={m.user_id}
                  value={m.user_id}
                  label={`${m.profile?.avatar_emoji || "🧑"} ${m.profile?.display_name || "成員"}`}
                >
                  <UserAvatar avatarUrl={m.profile?.avatar_url} avatarEmoji={m.profile?.avatar_emoji} size="xs" className="inline-flex" />
                  {m.profile?.display_name || "成員"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* 送出按鈕 */}
      <div className="pt-2 space-y-3">
        <Button
          type="submit"
          className="w-full bg-blue-500 hover:bg-blue-600 h-13 text-base font-semibold rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-[0.98]"
          disabled={saving || deleting}
        >
          {saving
            ? "儲存中..."
            : isEditing
              ? "更新消費"
              : "新增消費"}
        </Button>

        {isEditing && (
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 text-base text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200 rounded-xl"
            onClick={() => setShowDeleteDialog(true)}
            disabled={saving || deleting}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {deleting ? "刪除中..." : "刪除此筆消費"}
          </Button>
        )}
      </div>

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
              onClick={handleDelete}
              disabled={deleting}
            >
              確定刪除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
