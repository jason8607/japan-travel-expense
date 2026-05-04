"use client";

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
import { UserAvatar } from "@/components/ui/user-avatar";
import { useApp } from "@/lib/context";
import { FALLBACK_RATE, getExchangeRate, jpyToTwd, twdToJpy } from "@/lib/exchange-rate";
import { addGuestExpense, deleteGuestExpense, updateGuestExpense } from "@/lib/guest-storage";
import { cn } from "@/lib/utils";
import type { Category, Expense, PaymentMethod, SplitType } from "@/types";
import { Image as ImageIcon, Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Textarea } from "../ui/textarea";
import { CategoryGrid } from "./category-grid";
import { CreditCardPicker } from "./credit-card-picker";
import { PaymentChips } from "./payment-chips";

const AMOUNT_MAX = 9_999_999;
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
const DRAFT_DEBOUNCE_MS = 1000;

interface ExpenseDraft {
  savedAt: number;
  title: string;
  currency: "JPY" | "TWD";
  amount: string;
  category: Category;
  paymentMethod: PaymentMethod;
  storeName: string;
  location: string;
  expenseDate: string;
  paidBy: string;
  splitType: SplitType;
  ownerId: string | null;
  creditCardId: string | null;
  creditCardPlanId: string | null;
  note: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isExpenseDraft(value: unknown): value is ExpenseDraft {
  if (!isRecord(value)) return false;
  return (
    typeof value.savedAt === "number" &&
    typeof value.title === "string" &&
    (value.currency === "JPY" || value.currency === "TWD") &&
    typeof value.amount === "string" &&
    typeof value.category === "string" &&
    typeof value.paymentMethod === "string" &&
    typeof value.storeName === "string" &&
    typeof value.location === "string" &&
    typeof value.expenseDate === "string" &&
    typeof value.paidBy === "string" &&
    (value.splitType === "personal" || value.splitType === "split") &&
    (typeof value.ownerId === "string" || value.ownerId === null) &&
    (typeof value.creditCardId === "string" || value.creditCardId === null) &&
    (typeof value.creditCardPlanId === "string" || value.creditCardPlanId === null) &&
    typeof value.note === "string"
  );
}

function isSameDraft(a: ExpenseDraft, b: ExpenseDraft) {
  return (
    a.title === b.title &&
    a.currency === b.currency &&
    a.amount === b.amount &&
    a.category === b.category &&
    a.paymentMethod === b.paymentMethod &&
    a.storeName === b.storeName &&
    a.location === b.location &&
    a.expenseDate === b.expenseDate &&
    a.paidBy === b.paidBy &&
    a.splitType === b.splitType &&
    a.ownerId === b.ownerId &&
    a.creditCardId === b.creditCardId &&
    a.creditCardPlanId === b.creditCardPlanId &&
    a.note === b.note
  );
}

interface ExpenseFormProps {
  editExpense?: Expense | null;
}

export function ExpenseForm({ editExpense }: ExpenseFormProps) {
  const { user, currentTrip, tripMembers, isGuest } = useApp();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const draftTimerRef = useRef<number | null>(null);
  const isEditing = !!editExpense;
  const draftKey = `expense-form-draft:${editExpense?.id ?? "new"}`;

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
  const [creditCardPlanId, setCreditCardPlanId] = useState<string | null>(
    editExpense?.credit_card_plan_id || null
  );
  const [note, setNote] = useState(editExpense?.note || "");
  const [showReceiptImage, setShowReceiptImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [previewRate, setPreviewRate] = useState<number>(
    editExpense?.exchange_rate ?? FALLBACK_RATE
  );
  const initialDraftRef = useRef<ExpenseDraft | null>(null);

  if (initialDraftRef.current === null) {
    initialDraftRef.current = {
      savedAt: 0,
      title,
      currency,
      amount,
      category,
      paymentMethod,
      storeName,
      location,
      expenseDate,
      paidBy,
      splitType,
      ownerId,
      creditCardId,
      creditCardPlanId,
      note,
    };
  }

  const removeDraft = useCallback(() => {
    if (draftTimerRef.current) {
      window.clearTimeout(draftTimerRef.current);
      draftTimerRef.current = null;
    }
    sessionStorage.removeItem(draftKey);
  }, [draftKey]);

  const resetForm = useCallback(() => {
    const init = initialDraftRef.current;
    if (!init) return;
    setTitle(init.title);
    setCurrency(init.currency);
    setAmount(init.amount);
    setCategory(init.category);
    setPaymentMethod(init.paymentMethod);
    setStoreName(init.storeName);
    setLocation(init.location);
    setExpenseDate(init.expenseDate);
    setPaidBy(init.paidBy);
    setSplitType(init.splitType);
    setOwnerId(init.ownerId);
    setCreditCardId(init.creditCardId);
    setCreditCardPlanId(init.creditCardPlanId);
    setNote(init.note);
    removeDraft();
  }, [removeDraft]);

  useEffect(() => {
    let cancelled = false;
    getExchangeRate().then((rate) => {
      if (!cancelled) setPreviewRate(rate);
    });
    return () => { cancelled = true; };
  }, []);

  // Power-user shortcut: Cmd/Ctrl+Enter submits from anywhere in the form,
  // including inside <textarea> where Enter inserts a newline.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        formRef.current?.requestSubmit();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    try {
      const rawDraft = sessionStorage.getItem(draftKey);
      if (!rawDraft) {
        setDraftReady(true);
        return;
      }

      const parsed = JSON.parse(rawDraft) as unknown;
      if (!isExpenseDraft(parsed)) {
        sessionStorage.removeItem(draftKey);
        setDraftReady(true);
        return;
      }

      if (Date.now() - parsed.savedAt > DRAFT_TTL_MS) {
        sessionStorage.removeItem(draftKey);
        setDraftReady(true);
        return;
      }

      setTitle(parsed.title);
      setCurrency(parsed.currency);
      setAmount(parsed.amount);
      setCategory(parsed.category);
      setPaymentMethod(parsed.paymentMethod);
      setStoreName(parsed.storeName);
      setLocation(parsed.location);
      setExpenseDate(parsed.expenseDate);
      setPaidBy(parsed.paidBy);
      setSplitType(parsed.splitType);
      setOwnerId(parsed.ownerId);
      setCreditCardId(parsed.creditCardId);
      setCreditCardPlanId(parsed.creditCardPlanId);
      setNote(parsed.note);
      toast.success("已恢復未送出的草稿", {
        action: {
          label: "重新開始",
          onClick: () => resetForm(),
        },
  
      });
    } catch {
      sessionStorage.removeItem(draftKey);
    } finally {
      setDraftReady(true);
    }
  }, [draftKey, resetForm]);

  useEffect(() => {
    if (!draftReady) return;

    const draft: ExpenseDraft = {
      savedAt: Date.now(),
      title,
      currency,
      amount,
      category,
      paymentMethod,
      storeName,
      location,
      expenseDate,
      paidBy,
      splitType,
      ownerId,
      creditCardId,
      creditCardPlanId,
      note,
    };

    if (initialDraftRef.current && isSameDraft(draft, initialDraftRef.current)) {
      sessionStorage.removeItem(draftKey);
      return;
    }

    if (draftTimerRef.current) window.clearTimeout(draftTimerRef.current);
    draftTimerRef.current = window.setTimeout(() => {
      sessionStorage.setItem(draftKey, JSON.stringify(draft));
      draftTimerRef.current = null;
    }, DRAFT_DEBOUNCE_MS);

    return () => {
      if (draftTimerRef.current) {
        window.clearTimeout(draftTimerRef.current);
        draftTimerRef.current = null;
      }
    };
  }, [
    amount,
    category,
    creditCardId,
    creditCardPlanId,
    currency,
    draftKey,
    draftReady,
    expenseDate,
    location,
    note,
    ownerId,
    paidBy,
    paymentMethod,
    splitType,
    storeName,
    title,
  ]);

  const numericAmount = Number(amount);
  const hasValidAmount = amount !== "" && Number.isFinite(numericAmount) && numericAmount > 0;
  const isOverLimit = hasValidAmount && numericAmount > AMOUNT_MAX;
  const previewConversion = hasValidAmount && !isOverLimit
    ? currency === "JPY"
      ? `≈ NT$ ${jpyToTwd(numericAmount, previewRate).toLocaleString()}`
      : `≈ ¥ ${twdToJpy(numericAmount, previewRate).toLocaleString()}`
    : null;

  const discardAndReturn = () => {
    // Preserve draft in sessionStorage so an accidental cancel can be recovered
    // within DRAFT_TTL_MS (24h). Use the draft toast's "重新開始" action to truly wipe.
    router.push("/records");
  };

  const submitExpense = async () => {
    if (saving) return;
    if (!currentTrip) {
      toast.error("請先建立或選擇一個旅程");
      return;
    }
    if (!isGuest && !user) {
      toast.error("請先登入");
      return;
    }
    if (!hasValidAmount) {
      toast.error("請輸入有效金額");
      return;
    }
    if (isOverLimit) {
      toast.error(`金額不可超過 ${AMOUNT_MAX.toLocaleString()}`);
      return;
    }
    if (!isGuest && typeof navigator !== "undefined" && !navigator.onLine) {
      toast.error("目前離線，連線後再試一次", {
        action: {
          label: "重試",
          onClick: () => formRef.current?.requestSubmit(),
        },
      });
      return;
    }
    setSaving(true);

    try {
      const rate = await getExchangeRate();
      const inputAmount = currency === "JPY" ? Math.round(numericAmount) : numericAmount;
      const jpy = currency === "JPY" ? inputAmount : twdToJpy(inputAmount, rate);
      const twd = currency === "TWD" ? inputAmount : jpyToTwd(inputAmount, rate);

      const cardId = paymentMethod === "信用卡" ? creditCardId : null;
      const planId = paymentMethod === "信用卡" ? creditCardPlanId : null;
      const resolvedOwnerId =
        splitType === "personal" && ownerId === null
          ? (user?.id ?? paidBy)
          : ownerId;

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
            credit_card_plan_id: planId,
            input_currency: currency,
            note: note || null,
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
            credit_card_plan_id: planId,
            input_currency: currency,
            note: note || null,
          });
          if (!result) { toast.error("儲存空間不足，請清理部分紀錄"); setSaving(false); return; }
          toast.success("已新增消費紀錄");
        }
        removeDraft();
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
            owner_id: resolvedOwnerId,
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
            credit_card_plan_id: planId,
            input_currency: currency,
            note: note || null,
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
            owner_id: resolvedOwnerId,
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
            credit_card_plan_id: planId,
            input_currency: currency,
            note: note || null,
          }),
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "儲存失敗");
        toast.success("已新增消費紀錄");
      }

      removeDraft();
      router.push("/records");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "儲存失敗";
      toast.error(message, {
        action: {
          label: "重試",
          onClick: () => formRef.current?.requestSubmit(),
        },
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submitExpense();
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
      removeDraft();
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
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      aria-busy={saving || deleting}
    >
      {/* fieldset disabled cascades to every form control inside, so saving/deleting
          locks the entire surface (inputs, chips, toggles) without per-control props.
          The reset classes neutralise fieldset's default border/padding/min-width. */}
      <fieldset
        disabled={saving || deleting}
        className="m-0 min-w-0 border-0 p-4 disabled:opacity-90"
      >
      {/* Receipt strip (editing only) — sits above input group as visual context, no group treatment */}
      {isEditing && editExpense?.receipt_image_url && (
        <div className="space-y-1.5 pb-6">
          <button
            type="button"
            onClick={() => setShowReceiptImage(!showReceiptImage)}
            className="-mx-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-foreground outline-none transition-colors hover:bg-muted active:translate-y-px focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <ImageIcon className="h-4 w-4" />
            {showReceiptImage ? "收起收據照片" : "查看收據照片"}
          </button>
          {showReceiptImage && (
            <div className="relative aspect-3/4 max-h-80 w-full overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={editExpense.receipt_image_url}
                alt="收據照片"
                className="h-full w-full object-contain"
              />
            </div>
          )}
        </div>
      )}

      {/* === Group 1 — 輸入 (品名 / 幣別 / 金額 / 日期) === */}
      <div className="space-y-4">
      {/* 品名 */}
      <div className="space-y-1.5">
        <Label htmlFor="title" className="text-sm font-medium text-foreground">品名</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例：拉麵、新幹線車票"
          required
          maxLength={100}
          className="h-12 rounded-lg border-border text-base focus-visible:ring-primary"
        />
      </div>

      {/* 幣別 */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">幣別</Label>
        <div className="flex gap-2">
          {([["JPY", "🇯🇵 ¥ 日幣"], ["TWD", "🇹🇼 NT$ 台幣"]] as const).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setCurrency(val)}
              className={cn(
                "flex-1 rounded-lg py-2.5 text-sm font-medium ring-1 outline-none transition-colors active:translate-y-px focus-visible:ring-3 focus-visible:ring-ring/50",
                currency === val
                  ? "bg-accent ring-primary text-accent-foreground"
                  : "bg-card ring-border text-muted-foreground hover:bg-muted"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 金額 (hero) */}
      <div className="space-y-1.5">
        <Label htmlFor="amount" className="text-sm font-medium text-foreground">
          金額 ({currency === "JPY" ? "¥" : "NT$"})
        </Label>
        <div className="relative">
          <Input
            id="amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            required
            min={1}
            max={AMOUNT_MAX}
            step={currency === "JPY" ? 1 : 0.01}
            inputMode={currency === "JPY" ? "numeric" : "decimal"}
            enterKeyHint="go"
            aria-invalid={isOverLimit || undefined}
            className="h-16 rounded-lg border-border pr-28 text-2xl font-semibold tabular-nums"
          />
          {previewConversion && !isOverLimit && (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-right text-xs font-normal text-muted-foreground tabular-nums">
              {previewConversion}
            </span>
          )}
        </div>
        {isOverLimit && (
          <div className="flex min-h-5 items-center text-xs tabular-nums">
            <span className="text-destructive">金額不可超過 {AMOUNT_MAX.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* 日期 */}
      <div className="space-y-1.5">
        <Label htmlFor="date" className="text-sm font-medium text-foreground">日期</Label>
        <Input
          id="date"
          type="date"
          value={expenseDate}
          onChange={(e) => setExpenseDate(e.target.value)}
          className="h-12 rounded-lg border-border"
        />
      </div>
      </div>

      {/* === Group 2 — 分類 (類別 / 支付方式) === */}
      <div className="mt-6 space-y-4 border-t border-border/60 pt-6">
      {/* 類別選擇 - 圖示網格 */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">類別</Label>
        <CategoryGrid value={category} onChange={setCategory} />
      </div>

      {/* 支付方式 - 橫排 chips */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">支付方式</Label>
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
      </div>

      {/* Credit card picker — sibling of the payment-method block (not nested
          inside its tight space-y-2), so it inherits the section-level gap and
          reads as a sub-zone that expanded out of the selected payment chip. */}
      {paymentMethod === "信用卡" && (
        <div className="pt-1">
          <CreditCardPicker
            value={creditCardId}
            onChange={setCreditCardId}
            planValue={creditCardPlanId}
            onPlanChange={setCreditCardPlanId}
          />
        </div>
      )}
      </div>

      {/* === Group 3 — 分帳 (這筆是誰的 / 誰付的) — only when authenticated multi-member trip === */}
      {!isGuest && tripMembers.length > 1 && (
        <div className="mt-6 space-y-4 border-t border-border/60 pt-6">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">這筆是誰的</Label>
          <div className="flex flex-wrap gap-2">
            {tripMembers.map((m) => {
              const isMe = m.user_id === user?.id;
              const isSelected =
                splitType === "personal" &&
                (isMe
                  ? ownerId === null || ownerId === user?.id
                  : ownerId === m.user_id);
              return (
                <button
                  key={m.user_id}
                  type="button"
                  onClick={() => {
                    setSplitType("personal");
                    setOwnerId(isMe ? null : m.user_id);
                  }}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium ring-1 outline-none transition-colors active:translate-y-px focus-visible:ring-3 focus-visible:ring-ring/50",
                    isSelected
                      ? "bg-accent ring-primary text-accent-foreground"
                      : "bg-card ring-border text-muted-foreground hover:bg-muted"
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
                "flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium ring-1 outline-none transition-colors active:translate-y-px focus-visible:ring-3 focus-visible:ring-ring/50",
                splitType === "split"
                  ? "bg-accent ring-primary text-accent-foreground"
                  : "bg-card ring-border text-muted-foreground hover:bg-muted"
              )}
            >
              <Users className="h-4 w-4" />
              均分 ({tripMembers.length} 人)
            </button>
          </div>
          {splitType === "split" && amount && (
            <p className="rounded-lg bg-warning-subtle px-3 py-2 text-xs text-warning-foreground tabular-nums">
              每人 {currency === "JPY" ? "¥" : "NT$"}{Math.round(Number(amount) / tripMembers.length).toLocaleString()}
            </p>
          )}
        </div>

        {/* 誰付的 */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">誰付的</Label>
          <div className="flex flex-wrap gap-2">
            {tripMembers.map((m) => {
              const isSelected = paidBy === m.user_id;
              return (
                <button
                  key={m.user_id}
                  type="button"
                  onClick={() => setPaidBy(m.user_id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium ring-1 outline-none transition-colors active:translate-y-px focus-visible:ring-3 focus-visible:ring-ring/50",
                    isSelected
                      ? "bg-accent ring-primary text-accent-foreground"
                      : "bg-card ring-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  <UserAvatar avatarUrl={m.profile?.avatar_url} avatarEmoji={m.profile?.avatar_emoji} size="xs" />
                  {m.user_id === user?.id ? "我付的" : m.profile?.display_name || "成員"}
                </button>
              );
            })}
          </div>
        </div>
        </div>
      )}

      {/* === Group 4 — 補充 (店家 + 地點 / 備註) === */}
      <div className="mt-6 space-y-4 border-t border-border/60 pt-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="store" className="text-sm font-medium text-muted-foreground">
              店家名稱 <span className="font-normal text-muted-foreground/60">（選填）</span>
            </Label>
            <Input
              id="store"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="例：一蘭拉麵"
              enterKeyHint="next"
              maxLength={100}
              className="h-12 rounded-lg border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="location" className="text-sm font-medium text-muted-foreground">
              地點 <span className="font-normal text-muted-foreground/60">（選填）</span>
            </Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="例：澀谷"
              enterKeyHint="next"
              maxLength={100}
              className="h-12 rounded-lg border-border"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="note" className="text-sm font-medium text-muted-foreground">
            備註 <span className="font-normal text-muted-foreground/60">（選填）</span>
          </Label>
          <Textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            enterKeyHint="done"
            maxLength={500}
            className="h-24 rounded-lg border-border"
          />
        </div>
      </div>

      {/* === Group 5 — 行動 (送出 / 取消 / 刪除) === */}
      <div className="mt-6 space-y-2 border-t border-border/60 pt-6">
        <Button
          type="submit"
          className="h-12 w-full rounded-lg text-base font-semibold hover:bg-primary/90"
          disabled={saving || deleting}
        >
          {saving
            ? "儲存中…"
            : isEditing
              ? "更新消費"
              : "新增消費"}
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="h-12 w-full rounded-lg text-base"
          onClick={discardAndReturn}
          disabled={saving || deleting}
        >
          取消
        </Button>

        {isEditing && (
          <Button
            type="button"
            variant="destructive"
            className="h-12 w-full rounded-lg text-base"
            onClick={() => setShowDeleteDialog(true)}
            disabled={saving || deleting}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {deleting ? "刪除中…" : "刪除此筆消費"}
          </Button>
        )}
      </div>

      </fieldset>

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
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
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
