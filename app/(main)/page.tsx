"use client";

import { ExpenseDetailSheet } from "@/components/expense/expense-detail-sheet";
import { useCategories } from "@/hooks/use-categories";
import { useCreditCards } from "@/hooks/use-credit-cards";
import { useExpenses } from "@/hooks/use-expenses";
import { calculateTotalCashback } from "@/lib/cashback";
import { useApp } from "@/lib/context";
import { FALLBACK_RATE, formatJPY, formatTWD, getExchangeRate } from "@/lib/exchange-rate";
import { deleteGuestExpense } from "@/lib/guest-storage";
import { differenceInDays, format, parseISO } from "date-fns";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

export default function HomePage() {
  const { user, profile, currentTrip, isGuest, enterGuestMode, loading: appLoading } = useApp();
  const { expenses, loading, todayTotal, totalJpy, totalTwd, refresh } = useExpenses();
  const { cards } = useCreditCards();
  const { categories } = useCategories();
  const [rate, setRate] = useState<number>(FALLBACK_RATE);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  const handleDelete = async (id: string) => {
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

  useEffect(() => {
    getExchangeRate().then(setRate).catch(() => {});
  }, []);

  const cashbackTotal = useMemo(() => calculateTotalCashback(expenses, cards), [expenses, cards]);
  const recent = useMemo(() => expenses.slice(0, 3), [expenses]);

  // Loading
  if (appLoading || loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mb-2 inline-flex animate-pulse">
            <Image src="/icon-transparent.png" alt="旅帳" width={48} height={48} priority />
          </div>
          <p className="ed-mono text-xs" style={{ color: "var(--ed-muted)", letterSpacing: 2 }}>
            LOADING…
          </p>
        </div>
      </div>
    );
  }

  // Not signed in & not guest
  if (!user && !isGuest) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-8 text-center">
        <Image src="/icon-transparent.png" alt="旅帳" width={72} height={72} priority />
        <h1
          className="ed-mega mt-4"
          style={{ fontSize: 56, color: "var(--ed-ink)" }}
        >
          旅<span style={{ color: "var(--ed-vermillion)" }}>帳</span>
        </h1>
        <p
          className="ed-serif mt-3"
          style={{ fontSize: 13, color: "var(--ed-ink-soft)", lineHeight: 1.7 }}
        >
          旅遊智慧記帳．
          <br />
          AI 收據辨識．即時統計．多人記帳。
        </p>
        <Link
          href="/auth/login"
          className="ed-btn-primary mt-8"
          style={{ display: "inline-block", padding: "14px 60px", letterSpacing: 5 }}
        >
          開始記帳
        </Link>
        <button
          onClick={enterGuestMode}
          className="ed-mono mt-4"
          style={{
            fontSize: 11,
            letterSpacing: 2,
            color: "var(--ed-muted)",
            background: "transparent",
            border: 0,
            cursor: "pointer",
          }}
        >
          不登入，先試用 →
        </button>
      </div>
    );
  }

  // No trip
  if (!currentTrip) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-8 text-center">
        <div className="ed-vert" style={{ fontSize: 14, color: "var(--ed-vermillion)" }}>
          旅 程 未 始
        </div>
        <h2
          className="ed-mega mt-6"
          style={{ fontSize: 44, color: "var(--ed-ink)" }}
        >
          建立你的
          <br />
          第一趟旅程
        </h2>
        <p
          className="ed-serif mt-4"
          style={{ fontSize: 13, color: "var(--ed-ink-soft)", lineHeight: 1.7 }}
        >
          設定旅程日期與預算，
          <br />
          開始記下每一筆消費。
        </p>
        <Link
          href="/trip/new"
          className="ed-btn-primary mt-8"
          style={{ display: "inline-block", padding: "14px 60px", letterSpacing: 5 }}
        >
          建　立　旅　程
        </Link>
      </div>
    );
  }

  // Main dashboard
  const tripStart = parseISO(currentTrip.start_date);
  const tripEnd = parseISO(currentTrip.end_date);
  const today = new Date();
  const totalDays = differenceInDays(tripEnd, tripStart) + 1;
  const elapsedDays = Math.max(0, Math.min(totalDays, differenceInDays(today, tripStart) + 1));
  const remainingDays = Math.max(0, differenceInDays(tripEnd, today) + 1);
  const budget = currentTrip.budget_jpy ?? 0;
  const budgetPct = budget > 0 ? Math.min(100, Math.round((totalJpy / budget) * 100)) : 0;
  const remainingBudget = Math.max(0, budget - totalJpy);
  const issueNo = String(Math.max(1, elapsedDays)).padStart(2, "0");

  // Bar chart: split mega number, put vermillion comma
  const formattedJpy = totalJpy.toLocaleString();

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto" style={{ paddingBottom: 96 }}>
        {/* Guest banner */}
        {isGuest && (
          <div
            className="ed-mono"
            style={{
              margin: "12px 24px 0",
              padding: "10px 14px",
              background: "var(--ed-paper-deep)",
              border: "1px solid var(--ed-line)",
              fontSize: 10,
              letterSpacing: 1.5,
              color: "var(--ed-ink-soft)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>試用模式 · 資料僅存在此裝置</span>
            <Link
              href="/auth/login"
              style={{
                color: "var(--ed-vermillion)",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              登入保存 →
            </Link>
          </div>
        )}

        {/* Editorial header */}
        <div className="ed-runhdr">
          <span>TRAVELIO — N°{issueNo}</span>
          <span>{format(today, "yyyy.MM.dd")}</span>
        </div>
        <div className="ed-rule" />
        <div className="ed-rule2" />

        {/* Trip name + avatar */}
        <div
          style={{
            padding: "16px 24px 0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="ed-kicker">TRIP</div>
            <div
              className="ed-serif truncate"
              style={{ fontSize: 18, fontWeight: 700, marginTop: 2, color: "var(--ed-ink)" }}
            >
              {currentTrip.name} · {totalDays}日
            </div>
          </div>
          <Link
            href="/settings"
            aria-label="設定"
            style={{
              flexShrink: 0,
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "var(--ed-cream)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              textDecoration: "none",
            }}
          >
            {profile?.avatar_emoji ?? "👤"}
          </Link>
        </div>

        {/* Mega total */}
        <div style={{ padding: "20px 24px 0", display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div
              className="ed-serif"
              style={{ fontSize: 13, color: "var(--ed-ink-soft)", letterSpacing: 6 }}
            >
              旅 程 總 支 出
            </div>
            <div className="ed-mega" style={{ fontSize: 60, marginTop: 8 }}>
              ¥{formattedJpy.split(",").map((part, i, arr) => (
                <span key={i}>
                  {part}
                  {i < arr.length - 1 ? <span style={{ color: "var(--ed-vermillion)" }}>,</span> : null}
                </span>
              ))}
            </div>
            <div
              className="ed-mono"
              style={{
                display: "flex",
                gap: 12,
                marginTop: 14,
                fontSize: 11,
                color: "var(--ed-muted)",
                letterSpacing: 1,
              }}
            >
              <span>≈ {formatTWD(totalTwd)}</span>
              <span style={{ color: "var(--ed-line)" }}>|</span>
              <span>100 JPY = {(rate * 100).toFixed(2)}</span>
            </div>
          </div>
          <div
            className="ed-vert"
            style={{ fontSize: 11, color: "var(--ed-vermillion)", marginTop: 6 }}
          >
            {currentTrip.name.slice(0, 8)}
          </div>
        </div>

        {/* Budget */}
        {budget > 0 ? (
          <div style={{ padding: "24px 24px 0" }}>
            <div
              className="ed-mono"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
              }}
            >
              <span style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--ed-ink-soft)" }}>
                預算 — {formatJPY(budget)}
              </span>
              <span style={{ color: "var(--ed-vermillion)", fontWeight: 700, fontSize: 11 }}>
                {budgetPct}%
              </span>
            </div>
            <div className="ed-bars" style={{ marginTop: 8 }}>
              {Array.from({ length: 20 }).map((_, i) => {
                const heightPct = 50 + ((i * 7) % 55);
                const cls =
                  i < Math.floor((budgetPct / 100) * 20)
                    ? i === Math.floor((budgetPct / 100) * 20) - 1
                      ? "accent"
                      : ""
                    : "off";
                return <i key={i} className={cls} style={{ height: `${heightPct}%` }} />;
              })}
            </div>
            <div
              className="ed-serif"
              style={{
                fontSize: 11,
                color: "var(--ed-muted)",
                marginTop: 6,
                fontStyle: "italic",
              }}
            >
              剩餘 {formatJPY(remainingBudget)} · 還有 {remainingDays} 天
            </div>
          </div>
        ) : null}

        {/* Today + Cashback */}
        <div
          style={{
            padding: "26px 24px 0",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
          }}
        >
          <div style={{ borderTop: "2px solid var(--ed-ink)", paddingTop: 10 }}>
            <div className="ed-kicker">今日</div>
            <div
              className="ed-serif"
              style={{ fontSize: 26, fontWeight: 700, marginTop: 4 }}
            >
              {formatJPY(todayTotal)}
            </div>
            <div className="ed-serif" style={{ fontSize: 11, color: "var(--ed-muted)" }}>
              {expenses.filter((e) => e.expense_date === format(today, "yyyy-MM-dd")).length} 筆 · 本日記錄
            </div>
          </div>
          <Link
            href="/stats"
            style={{ borderTop: "2px solid var(--ed-vermillion)", paddingTop: 10, textDecoration: "none" }}
          >
            <div className="ed-mono" style={{ fontSize: 9, letterSpacing: 2, color: "var(--ed-vermillion)" }}>
              信用卡回饋
            </div>
            <div
              className="ed-serif"
              style={{ fontSize: 26, fontWeight: 700, marginTop: 4, color: "var(--ed-vermillion)" }}
            >
              {cards.length > 0 ? formatTWD(cashbackTotal) : "—"}
            </div>
            <div className="ed-serif" style={{ fontSize: 11, color: "var(--ed-muted)" }}>
              {cards.length} 張卡 · 已核算
            </div>
          </Link>
        </div>

        {/* Recent expenses */}
        <div style={{ padding: "24px 24px 0" }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              borderBottom: "1px solid var(--ed-ink)",
              paddingBottom: 6,
            }}
          >
            <span className="ed-serif" style={{ fontSize: 17, fontWeight: 700 }}>
              最近消費
            </span>
            {expenses.length > 3 ? (
              <Link
                href="/records"
                className="ed-mono"
                style={{
                  fontSize: 9,
                  letterSpacing: 2,
                  color: "var(--ed-muted)",
                  textDecoration: "none",
                }}
              >
                查看全部 →
              </Link>
            ) : null}
          </div>
          {recent.length === 0 ? (
            <div
              className="ed-serif"
              style={{
                padding: "32px 0",
                textAlign: "center",
                color: "var(--ed-muted)",
                fontSize: 13,
                fontStyle: "italic",
              }}
            >
              還沒有記錄，點下方 + 新增第一筆
            </div>
          ) : (
            recent.map((e, i) => (
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
