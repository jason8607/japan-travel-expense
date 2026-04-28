"use client";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { formatJPY, formatTWD } from "@/lib/exchange-rate";
import { format, parseISO } from "date-fns";
import Link from "next/link";
import type { CategoryItem, Expense } from "@/types";

function categoryLabel(cat: string, categories: CategoryItem[]) {
  return categories.find((c) => c.value === cat || c.label === cat)?.label ?? cat;
}

export function ExpenseDetailSheet({
  expense,
  categories,
  onClose,
  onDelete,
}: {
  expense: Expense | null;
  categories: CategoryItem[];
  onClose: () => void;
  onDelete: (id: string) => void | Promise<void>;
}) {
  const open = !!expense;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="ed-detail-sheet"
        style={{
          background: "var(--ed-paper)",
          padding: "24px 24px 32px",
          color: "var(--ed-ink)",
          maxHeight: "75dvh",
          overflowY: "auto",
        }}
      >
        <SheetTitle className="sr-only">消費明細</SheetTitle>
        {expense ? (
          <ExpenseDetailContent
            expense={expense}
            categories={categories}
            onClose={onClose}
            onDelete={onDelete}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function ExpenseDetailContent({
  expense,
  categories,
  onClose,
  onDelete,
}: {
  expense: Expense;
  categories: CategoryItem[];
  onClose: () => void;
  onDelete: (id: string) => void | Promise<void>;
}) {
  const cat = categoryLabel(expense.category, categories);
  const date = format(parseISO(expense.expense_date), "MM/dd");
  const datetime = `${date}${expense.expense_date ? "" : ""}`;
  const splitText = expense.split_type === "split" ? "均分" : "個人";

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="ed-mono" style={{ fontSize: 9, letterSpacing: 2, color: "var(--ed-muted)" }}>
            {[cat, expense.title].filter(Boolean).join(" · ")}
          </div>
          <div
            className="ed-serif truncate"
            style={{ fontSize: 28, fontWeight: 700, marginTop: 4, color: "var(--ed-ink)" }}
          >
            {expense.title}
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="關閉"
          style={{
            background: "none",
            border: "none",
            fontSize: 22,
            cursor: "pointer",
            color: "var(--ed-muted)",
            lineHeight: 1,
            padding: 4,
          }}
        >
          ✕
        </button>
      </div>

      {/* Mega amount */}
      <div
        className="ed-mega"
        style={{ fontSize: 48, marginTop: 12, color: "var(--ed-ink)" }}
      >
        {formatJPY(expense.amount_jpy)}
      </div>
      <div
        className="ed-mono"
        style={{ fontSize: 11, color: "var(--ed-muted)", marginTop: 2 }}
      >
        ≈ {formatTWD(expense.amount_twd)}
        {expense.exchange_rate ? ` · 匯率 ${expense.exchange_rate.toFixed(4)}` : ""}
      </div>

      {/* 2x2 details grid */}
      <div
        style={{
          marginTop: 20,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          rowGap: 16,
          columnGap: 14,
        }}
      >
        <DetailField label="付款方式" value={expense.payment_method} />
        <DetailField label="店家" value={expense.store_name || "—"} />
        <DetailField label="日期" value={datetime} />
        <DetailField label="分帳" value={splitText} />
      </div>

      {/* Note */}
      {expense.note ? (
        <div style={{ marginTop: 20 }}>
          <div className="ed-kicker" style={{ marginBottom: 4 }}>
            備註
          </div>
          <div
            className="ed-serif"
            style={{
              fontSize: 13,
              color: "var(--ed-ink-soft)",
              lineHeight: 1.7,
              fontStyle: "italic",
            }}
          >
            {expense.note}
          </div>
        </div>
      ) : null}

      {/* Actions */}
      <div style={{ marginTop: 24, display: "flex", gap: 10 }}>
        <Link
          href={`/records/new?edit=${expense.id}`}
          onClick={onClose}
          className="ed-serif"
          style={{
            flex: 1,
            padding: "14px 0",
            border: "1.5px solid var(--ed-ink)",
            background: "transparent",
            color: "var(--ed-ink)",
            cursor: "pointer",
            fontSize: 14,
            letterSpacing: 4,
            textAlign: "center",
            textDecoration: "none",
          }}
        >
          編　輯
        </Link>
        <button
          onClick={async () => {
            if (!confirm("確定要刪除這筆記錄？")) return;
            await onDelete(expense.id);
            onClose();
          }}
          className="ed-serif"
          style={{
            flex: 1,
            padding: "14px 0",
            border: "none",
            background: "var(--ed-vermillion)",
            color: "var(--ed-paper)",
            cursor: "pointer",
            fontSize: 14,
            letterSpacing: 4,
          }}
        >
          刪　除
        </button>
      </div>
    </>
  );
}

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="ed-mono" style={{ fontSize: 9, letterSpacing: 2, color: "var(--ed-muted)" }}>
        {label}
      </div>
      <div
        className="ed-serif"
        style={{ fontSize: 15, fontWeight: 600, marginTop: 2, color: "var(--ed-ink)" }}
      >
        {value}
      </div>
    </div>
  );
}
