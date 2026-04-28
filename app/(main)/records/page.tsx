"use client";

import { ExpenseDetailSheet } from "@/components/expense/expense-detail-sheet";
import { useCategories } from "@/hooks/use-categories";
import { useExpenses } from "@/hooks/use-expenses";
import { useApp } from "@/lib/context";
import { exportExpensesToCSV } from "@/lib/export";
import { formatJPY } from "@/lib/exchange-rate";
import { deleteGuestExpense } from "@/lib/guest-storage";
import { differenceInDays, format, parseISO } from "date-fns";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { CategoryItem, Expense } from "@/types";

function categoryLabel(cat: string, categories: CategoryItem[]) {
  return categories.find((c) => c.value === cat || c.label === cat)?.label ?? cat;
}

function EditorialRow({
  expense,
  index,
  categories,
  onOpen,
}: {
  expense: Expense;
  index: number;
  categories: CategoryItem[];
  onOpen: (e: Expense) => void;
}) {
  const sub = [categoryLabel(expense.category, categories), expense.store_name]
    .filter(Boolean)
    .join(" · ");
  const date = format(parseISO(expense.expense_date), "MM/dd");
  return (
    <button
      onClick={() => onOpen(expense)}
      className="ed-row"
      style={{ width: "100%", textAlign: "left", background: "transparent", cursor: "pointer" }}
      type="button"
    >
      <div className="ed-row-num">{String(index + 1).padStart(2, "0")}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="ed-row-tt truncate">{expense.title}</div>
        <div className="ed-row-sub">{sub || "—"}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div className="ed-row-amt">{formatJPY(expense.amount_jpy)}</div>
        <div className="ed-row-dt">{date}</div>
      </div>
    </button>
  );
}

export default function RecordsPage() {
  const { currentTrip, tripMembers, isGuest, loading: ctxLoading } = useApp();
  const { expenses, loading, error, refresh } = useExpenses();
  const { categories } = useCategories();
  const [activeDay, setActiveDay] = useState<number | "all">("all");
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  const tripStart = currentTrip ? parseISO(currentTrip.start_date) : null;
  const tripEnd = currentTrip ? parseISO(currentTrip.end_date) : null;
  const totalDays = tripStart && tripEnd ? differenceInDays(tripEnd, tripStart) + 1 : 0;

  const filtered = useMemo(() => {
    if (activeDay === "all" || !tripStart) return expenses;
    const targetDate = format(
      new Date(tripStart.getTime() + (activeDay - 1) * 24 * 60 * 60 * 1000),
      "yyyy-MM-dd",
    );
    return expenses.filter((e) => e.expense_date === targetDate);
  }, [expenses, activeDay, tripStart]);

  const handleDelete = async (id: string) => {
    if (!confirm("確定要刪除這筆記錄？")) return;
    try {
      if (isGuest) {
        deleteGuestExpense(id);
      } else {
        const res = await fetch(`/api/expenses?id=${id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "刪除失敗");
      }
      toast.success("已刪除");
      await refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "刪除失敗";
      toast.error(message);
    }
  };

  if (loading || ctxLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="ed-mono" style={{ fontSize: 11, letterSpacing: 2, color: "var(--ed-muted)" }}>
          LOADING…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="ed-serif" style={{ fontSize: 14, color: "var(--ed-vermillion)" }}>
          載入消費紀錄失敗
        </p>
        <button
          onClick={refresh}
          className="ed-mono"
          style={{
            fontSize: 11,
            letterSpacing: 2,
            color: "var(--ed-ink)",
            textDecoration: "underline",
            background: "transparent",
            border: 0,
            cursor: "pointer",
          }}
        >
          重新載入
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto" style={{ paddingBottom: 96 }}>
        {/* NavBack */}
        <div
          style={{
            padding: "12px 24px 0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Link
            href="/"
            className="ed-mono"
            style={{ fontSize: 10, letterSpacing: 2, color: "var(--ed-muted)", textDecoration: "none" }}
          >
            ← 返回首頁
          </Link>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <span className="ed-mono" style={{ fontSize: 10, letterSpacing: 2, color: "var(--ed-muted)" }}>
              {filtered.length} 筆
            </span>
            {expenses.length > 0 && (
              <button
                onClick={() => {
                  exportExpensesToCSV(filtered, currentTrip?.name || "旅程", tripMembers);
                  toast.success("CSV 已下載");
                }}
                className="ed-mono"
                style={{
                  fontSize: 10,
                  letterSpacing: 2,
                  color: "var(--ed-muted)",
                  background: "transparent",
                  border: 0,
                  cursor: "pointer",
                }}
              >
                匯出 ↓
              </button>
            )}
          </div>
        </div>

        {/* PageTitle */}
        <div style={{ padding: "14px 24px 0" }}>
          <div className="ed-page-title-kicker">全 部 記 錄</div>
          <div className="ed-page-title-h">
            記帳本<span className="ed-page-title-dot">。</span>
          </div>
        </div>

        {/* Day tabs */}
        {totalDays > 0 ? (
          <div className="ed-day-tabs" style={{ marginTop: 20 }}>
            <button
              className={"ed-day-tab" + (activeDay === "all" ? " on" : "")}
              onClick={() => setActiveDay("all")}
            >
              全部
            </button>
            {Array.from({ length: totalDays }).map((_, i) => (
              <button
                key={i}
                className={"ed-day-tab" + (activeDay === i + 1 ? " on" : "")}
                onClick={() => setActiveDay(i + 1)}
              >
                Day {i + 1}
              </button>
            ))}
          </div>
        ) : null}

        {/* Rows */}
        <div style={{ padding: "18px 24px 0" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "60px 24px 0", textAlign: "center" }}>
              <div
                className="ed-serif"
                style={{ fontSize: 80, opacity: 0.15, color: "var(--ed-ink)" }}
              >
                空
              </div>
              <div
                className="ed-serif"
                style={{ fontSize: 16, marginTop: 14, color: "var(--ed-ink)" }}
              >
                {activeDay === "all" ? "還沒有任何記錄" : "這天還沒有記錄"}
              </div>
              <div
                className="ed-serif"
                style={{
                  fontSize: 12,
                  color: "var(--ed-muted)",
                  marginTop: 6,
                  lineHeight: 1.6,
                  fontStyle: "italic",
                }}
              >
                點右下角 ＋ 新增一筆消費，
                <br />
                或掃描收據讓 AI 幫你填。
              </div>
            </div>
          ) : (
            filtered.map((e, i) => (
              <EditorialRow
                key={e.id}
                expense={e}
                index={i}
                categories={categories}
                onOpen={setSelectedExpense}
              />
            ))
          )}
        </div>
      </div>

      {/* FAB */}
      <Link href="/records/new" aria-label="新增消費" className="ed-fab">
        ＋
      </Link>

      {/* Detail bottom sheet */}
      <ExpenseDetailSheet
        expense={selectedExpense}
        categories={categories}
        onClose={() => setSelectedExpense(null)}
        onDelete={handleDelete}
      />
    </div>
  );
}
