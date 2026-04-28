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
  const [query, setQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  const tripStart = currentTrip ? parseISO(currentTrip.start_date) : null;
  const tripEnd = currentTrip ? parseISO(currentTrip.end_date) : null;
  const totalDays = tripStart && tripEnd ? differenceInDays(tripEnd, tripStart) + 1 : 0;

  const filtered = useMemo(() => {
    let list = expenses;
    if (activeDay !== "all" && tripStart) {
      const targetDate = format(
        new Date(tripStart.getTime() + (activeDay - 1) * 24 * 60 * 60 * 1000),
        "yyyy-MM-dd",
      );
      list = list.filter((e) => e.expense_date === targetDate);
    }
    if (filterCategory) {
      list = list.filter((e) => e.category === filterCategory);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.store_name?.toLowerCase().includes(q) ?? false) ||
          (e.note?.toLowerCase().includes(q) ?? false),
      );
    }
    return list;
  }, [expenses, activeDay, tripStart, filterCategory, query]);

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

        {/* Search + category filter */}
        {expenses.length > 0 ? (
          <div style={{ padding: "20px 24px 0" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                borderBottom: "1px solid var(--ed-line)",
                paddingBottom: 6,
              }}
            >
              <span
                className="ed-mono"
                style={{ fontSize: 11, letterSpacing: 2, color: "var(--ed-muted)" }}
              >
                Q
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜尋品項、店家、備註"
                className="ed-serif"
                style={{
                  flex: 1,
                  fontSize: 14,
                  background: "transparent",
                  border: 0,
                  outline: 0,
                  color: "var(--ed-ink)",
                  padding: "4px 0",
                }}
              />
              {query ? (
                <button
                  onClick={() => setQuery("")}
                  className="ed-mono"
                  style={{
                    fontSize: 10,
                    letterSpacing: 2,
                    color: "var(--ed-muted)",
                    background: "transparent",
                    border: 0,
                    cursor: "pointer",
                  }}
                  type="button"
                >
                  清除
                </button>
              ) : null}
            </div>
            <div
              style={{
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
                marginTop: 10,
              }}
            >
              <button
                onClick={() => setFilterCategory(null)}
                className={"ed-chip" + (filterCategory === null ? " on" : "")}
                style={{ fontSize: 11, padding: "4px 10px" }}
                type="button"
              >
                全部
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() =>
                    setFilterCategory(filterCategory === c.value ? null : c.value)
                  }
                  className={"ed-chip" + (filterCategory === c.value ? " on" : "")}
                  style={{ fontSize: 11, padding: "4px 10px" }}
                  type="button"
                >
                  {c.icon} {c.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

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
            (() => {
              const isFiltered =
                expenses.length > 0 &&
                (query.trim() !== "" || filterCategory !== null || activeDay !== "all");
              return (
                <div style={{ padding: "60px 24px 0", textAlign: "center" }}>
                  <div
                    className="ed-serif"
                    style={{
                      fontSize: 96,
                      opacity: 0.18,
                      color: "var(--ed-ink)",
                      lineHeight: 1,
                      fontWeight: 700,
                    }}
                  >
                    空
                  </div>
                  <div
                    className="ed-serif"
                    style={{
                      fontSize: 17,
                      marginTop: 18,
                      color: "var(--ed-ink)",
                      fontWeight: 600,
                    }}
                  >
                    {isFiltered ? "找不到符合的紀錄" : "還沒有任何記錄"}
                  </div>
                  <div
                    className="ed-serif"
                    style={{
                      fontSize: 13,
                      color: "var(--ed-muted)",
                      marginTop: 8,
                      lineHeight: 1.7,
                      fontStyle: "italic",
                    }}
                  >
                    {isFiltered ? (
                      <>試著清除搜尋或切換到其他分類。</>
                    ) : (
                      <>
                        記錄旅途裡每一筆花費，
                        <br />
                        旅程結束後就有完整的回顧。
                      </>
                    )}
                  </div>
                  {isFiltered ? (
                    <button
                      onClick={() => {
                        setQuery("");
                        setFilterCategory(null);
                        setActiveDay("all");
                      }}
                      className="ed-btn-ghost"
                      style={{
                        marginTop: 22,
                        padding: "10px 22px",
                        fontSize: 13,
                        letterSpacing: 4,
                        cursor: "pointer",
                      }}
                      type="button"
                    >
                      清 除 篩 選
                    </button>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        justifyContent: "center",
                        marginTop: 26,
                        flexWrap: "wrap",
                      }}
                    >
                      <Link
                        href="/records/new"
                        className="ed-btn-primary"
                        style={{
                          width: "auto",
                          padding: "12px 22px",
                          fontSize: 13,
                          letterSpacing: 5,
                          textDecoration: "none",
                          display: "inline-block",
                        }}
                      >
                        新 增 一 筆
                      </Link>
                      <Link
                        href="/scan"
                        className="ed-btn-ghost"
                        style={{
                          padding: "12px 22px",
                          fontSize: 13,
                          letterSpacing: 5,
                          textDecoration: "none",
                          display: "inline-block",
                          fontWeight: 600,
                        }}
                      >
                        掃 描 收 據
                      </Link>
                    </div>
                  )}
                </div>
              );
            })()
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
