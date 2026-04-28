"use client";

import { ExpenseDetailSheet } from "@/components/expense/expense-detail-sheet";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useCategories } from "@/hooks/use-categories";
import { useExpenses } from "@/hooks/use-expenses";
import { useApp } from "@/lib/context";
import { formatJPY, formatTWD } from "@/lib/exchange-rate";
import { exportExpensesToCSV } from "@/lib/export";
import { deleteGuestExpense } from "@/lib/guest-storage";
import { calculateSettlements, type MemberBalance, type Settlement } from "@/lib/settlement";
import type { CategoryItem, Expense, TripMember } from "@/types";
import { differenceInDays, format, parseISO } from "date-fns";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type ViewTab = "byDate" | "byCat" | "byMember" | "settle";
const PAYMENT_OPTS = ["現金", "信用卡", "PayPay", "Suica"] as const;

// ---------- Helpers ----------

function categoryLabel(cat: string, categories: CategoryItem[]) {
  return categories.find((c) => c.value === cat || c.label === cat)?.label ?? cat;
}

function dayLabel(date: string, tripStart: Date | null, tripEnd: Date | null) {
  const d = parseISO(date);
  if (!tripStart) return format(d, "MM/dd");
  if (d < tripStart) return "行 前";
  if (tripEnd && d > tripEnd) return "行 後";
  return `Day ${differenceInDays(d, tripStart) + 1}`;
}

function memberInitial(m: TripMember): string {
  const name = m.profile?.display_name ?? "";
  return (m.profile?.avatar_emoji || name.charAt(0) || "?").toUpperCase();
}

function memberName(m: TripMember): string {
  return m.profile?.display_name ?? "成員";
}

// ---------- Atomic UI ----------

const ACCENT_AVATAR_CLASS =
  "bg-[var(--ed-vermillion)] text-[var(--ed-paper)] border-0";
const DEFAULT_AVATAR_CLASS =
  "bg-[var(--ed-cream)] text-[var(--ed-ink)] border border-[var(--ed-line)]";

function RecRow({
  expense,
  members,
  categories,
  currentUserId,
  onOpen,
}: {
  expense: Expense;
  members: TripMember[];
  categories: CategoryItem[];
  currentUserId: string | null;
  onOpen: (e: Expense) => void;
}) {
  const showAvatar = members.length > 1;
  const paidByMember = members.find((m) => m.user_id === expense.paid_by);
  const ownerMember = expense.owner_id
    ? members.find((m) => m.user_id === expense.owner_id)
    : null;
  const category = categories.find(
    (c) => c.value === expense.category || c.label === expense.category,
  );
  const isCurrent = expense.paid_by === currentUserId;
  const isSplit = expense.split_type === "split";
  const ownerId = expense.owner_id ?? expense.paid_by;
  const isCrossPaidPersonal = !isSplit && ownerId !== expense.paid_by;
  const detailItems = [
    expense.store_name ? expense.store_name : null,
    expense.note,
    expense.receipt_image_url ? "收據" : null,
  ].filter(Boolean);

  return (
    <button
      onClick={() => onOpen(expense)}
      className="ed-row"
      style={{
        width: "100%",
        textAlign: "left",
        background: "transparent",
        cursor: "pointer",
        border: 0,
        padding: "14px 0",
        alignItems: "center",
        gap: 12,
      }}
      type="button"
    >
      {showAvatar ? (
        <UserAvatar
          avatarUrl={paidByMember?.profile?.avatar_url ?? null}
          avatarEmoji={paidByMember ? memberInitial(paidByMember) : "?"}
          name={paidByMember ? memberName(paidByMember) : undefined}
          size="sm"
          className={isCurrent ? ACCENT_AVATAR_CLASS : DEFAULT_AVATAR_CLASS}
        />
      ) : null}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="ed-row-tt truncate">{expense.title}</div>
        <div className="ed-row-meta" style={{ flexWrap: "wrap", rowGap: 3 }}>
          <span>
            {category?.icon ? `${category.icon} ` : ""}
            {category ? category.label : categoryLabel(expense.category, categories)}
          </span>
          <span className="sep">·</span>
          <span>{expense.payment_method}</span>
          <span className="sep">·</span>
          <span className={isSplit || isCrossPaidPersonal ? "accent" : undefined}>
            {isSplit
              ? "均分"
              : isCrossPaidPersonal && paidByMember && ownerMember
                ? `${memberName(paidByMember)} 幫 ${memberName(ownerMember)} 付`
                : "個人"}
          </span>
          {showAvatar && !isCrossPaidPersonal && paidByMember ? (
            <>
              <span className="sep">·</span>
              <span>{memberName(paidByMember)} 付</span>
            </>
          ) : null}
        </div>
        {detailItems.length > 0 ? (
          <div className="ed-row-sub truncate">{detailItems.join(" · ")}</div>
        ) : null}
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div className="ed-row-amt" style={{ fontSize: 18 }}>
          {formatJPY(expense.amount_jpy)}
        </div>
        <div
          className="ed-mono"
          style={{ fontSize: 9, color: "var(--ed-muted)", marginTop: 2, letterSpacing: 1 }}
        >
          {formatTWD(expense.amount_twd)}
        </div>
      </div>
    </button>
  );
}

// ---------- Empty states ----------

function EmptyAll() {
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
        style={{ fontSize: 17, marginTop: 18, color: "var(--ed-ink)", fontWeight: 600 }}
      >
        還沒有任何記錄
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
        記錄旅途裡每一筆花費，
        <br />
        旅程結束後就有完整的回顧。
      </div>
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
    </div>
  );
}

function FilteredEmpty({ onClear }: { onClear: () => void }) {
  return (
    <div style={{ padding: "40px 24px 0", textAlign: "center" }}>
      <div
        className="ed-serif"
        style={{ fontSize: 64, opacity: 0.18, color: "var(--ed-ink)", lineHeight: 1, fontWeight: 700 }}
      >
        無
      </div>
      <div
        className="ed-serif"
        style={{ fontSize: 15, marginTop: 14, color: "var(--ed-ink)", fontWeight: 600 }}
      >
        找不到符合的紀錄
      </div>
      <button
        onClick={onClear}
        className="ed-btn-ghost"
        style={{
          marginTop: 18,
          padding: "10px 22px",
          fontSize: 13,
          letterSpacing: 4,
          cursor: "pointer",
        }}
        type="button"
      >
        清 除 篩 選
      </button>
    </div>
  );
}

// ---------- ByMember ----------

function ByMember({
  members,
  filtered,
  memberCount,
  categories,
  currentUserId,
  expandedMember,
  setExpandedMember,
  onOpen,
}: {
  members: TripMember[];
  filtered: Expense[];
  memberCount: number;
  categories: CategoryItem[];
  currentUserId: string | null;
  expandedMember: string | null;
  setExpandedMember: (id: string | null) => void;
  onOpen: (e: Expense) => void;
}) {
  const split = filtered.filter((e) => e.split_type === "split");
  const splitJpy = split.reduce((s, e) => s + e.amount_jpy, 0);
  const splitTwd = split.reduce((s, e) => s + e.amount_twd, 0);
  const perPerson = memberCount > 0 ? Math.round(splitJpy / memberCount) : 0;
  const perPersonTwd = memberCount > 0 ? Math.round(splitTwd / memberCount) : 0;

  return (
    <div>
      {/* Split total black card */}
      {split.length > 0 ? (
        <div
          style={{
            padding: "14px 16px",
            background: "var(--ed-ink)",
            color: "var(--ed-paper)",
            marginBottom: 16,
          }}
        >
          <div className="ed-mono" style={{ fontSize: 9, letterSpacing: 3, opacity: 0.7 }}>
            均 分 費 用 總 計
          </div>
          <div
            className="ed-serif"
            style={{ fontSize: 32, fontWeight: 700, letterSpacing: -1, marginTop: 4 }}
          >
            {formatJPY(splitJpy)}
          </div>
          <div
            className="ed-mono"
            style={{ fontSize: 10, letterSpacing: 1, opacity: 0.65, marginTop: 2 }}
          >
            每人 {formatJPY(perPerson)} · {formatTWD(perPersonTwd)}
          </div>
        </div>
      ) : null}

      {members.map((m) => {
        const ownedItems = filtered.filter(
          (e) => e.split_type === "personal" && (e.owner_id ?? e.paid_by) === m.user_id,
        );
        const items = [...ownedItems, ...split].sort((a, b) =>
          b.expense_date.localeCompare(a.expense_date),
        );
        const ownedJpy = ownedItems.reduce((s, e) => s + e.amount_jpy, 0);
        const ownedTwd = ownedItems.reduce((s, e) => s + e.amount_twd, 0);
        const totalJpy = ownedJpy + perPerson;
        const totalTwd = ownedTwd + perPersonTwd;
        const expanded = expandedMember === m.user_id;
        const isCurrent = currentUserId === m.user_id;
        const subLabel =
          split.length > 0
            ? `個人 ${ownedItems.length} · 均分 ${split.length}`
            : `個人 ${ownedItems.length} 筆`;

        return (
          <div key={m.user_id} style={{ marginBottom: expanded ? 14 : 8 }}>
            <button
              onClick={() => setExpandedMember(expanded ? null : m.user_id)}
              className={"ed-member-card" + (expanded && items.length > 0 ? " expanded" : "")}
              style={{
                width: "100%",
                background: "transparent",
                cursor: items.length > 0 ? "pointer" : "default",
                textAlign: "left",
              }}
              type="button"
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <UserAvatar
                  avatarUrl={m.profile?.avatar_url ?? null}
                  avatarEmoji={memberInitial(m)}
                  name={memberName(m)}
                  size="md"
                  className={isCurrent ? ACCENT_AVATAR_CLASS : DEFAULT_AVATAR_CLASS}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    className="ed-serif"
                    style={{ fontSize: 15, fontWeight: 700, color: "var(--ed-ink)" }}
                  >
                    {memberName(m)}
                    {isCurrent ? (
                      <span
                        className="ed-mono"
                        style={{
                          marginLeft: 8,
                          fontSize: 9,
                          letterSpacing: 1,
                          color: "var(--ed-vermillion)",
                        }}
                      >
                        YOU
                      </span>
                    ) : null}
                  </div>
                  <div
                    className="ed-mono"
                    style={{ fontSize: 9, letterSpacing: 1, color: "var(--ed-muted)" }}
                  >
                    {subLabel}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="ed-serif" style={{ fontSize: 18, fontWeight: 700 }}>
                    {formatJPY(totalJpy)}
                  </div>
                  <div className="ed-mono" style={{ fontSize: 9, color: "var(--ed-muted)" }}>
                    {formatTWD(totalTwd)}
                  </div>
                </div>
                {items.length > 0 ? (
                  <span
                    className="ed-mono"
                    style={{
                      fontSize: 14,
                      color: "var(--ed-muted)",
                      marginLeft: 4,
                      transform: expanded ? "rotate(90deg)" : "none",
                      transition: "transform 0.15s",
                    }}
                  >
                    ›
                  </span>
                ) : null}
              </div>
            </button>

            {expanded && items.length > 0 ? (
              <div className="ed-member-card-body">
                <div className="ed-kicker" style={{ margin: "6px 0" }}>
                  消費明細（{items.length} 筆）
                </div>
                {items.map((e) => (
                  <RecRow
                    key={e.id}
                    expense={e}
                    members={members}
                    categories={categories}
                    currentUserId={currentUserId}
                    onOpen={onOpen}
                  />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

// ---------- Settle ----------

function SettleView({
  members,
  balances,
  settlements,
  expenses,
  memberCount,
  categories,
}: {
  members: TripMember[];
  balances: MemberBalance[];
  settlements: Settlement[];
  expenses: Expense[];
  memberCount: number;
  categories: CategoryItem[];
}) {
  const totalJpy = expenses.reduce((s, e) => s + e.amount_jpy, 0);
  const splitOnly = expenses.filter((e) => e.split_type === "split");
  const splitJpy = splitOnly.reduce((s, e) => s + e.amount_jpy, 0);
  const perPerson = memberCount > 0 ? Math.round(splitJpy / memberCount) : 0;

  if (members.length < 2) {
    return (
      <div style={{ padding: "40px 24px 0", textAlign: "center" }}>
        <div
          className="ed-serif"
          style={{ fontSize: 17, color: "var(--ed-ink)", fontWeight: 600 }}
        >
          人數不足，無法結算
        </div>
        <div
          className="ed-serif"
          style={{
            fontSize: 13,
            color: "var(--ed-muted)",
            marginTop: 8,
            fontStyle: "italic",
          }}
        >
          邀請其他成員加入旅程後，
          <br />
          才會出現結算建議。
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Total card */}
      <div
        style={{
          border: "1.5px solid var(--ed-ink)",
          background: "var(--ed-paper)",
          padding: "18px 18px",
        }}
      >
        <div className="ed-mono" style={{ fontSize: 9, letterSpacing: 3, color: "var(--ed-muted)" }}>
          總 花 費
        </div>
        <div
          className="ed-serif"
          style={{ fontSize: 36, fontWeight: 700, marginTop: 4, letterSpacing: -1 }}
        >
          {formatJPY(totalJpy)}
        </div>
        <div
          className="ed-mono"
          style={{ fontSize: 10, letterSpacing: 1, color: "var(--ed-muted)", marginTop: 2 }}
        >
          {memberCount} 人均分 · 每人 {formatJPY(perPerson)}
        </div>

        <div
          style={{ borderTop: "1px dotted var(--ed-line)", marginTop: 14, paddingTop: 10 }}
        >
          {balances.map((b) => {
            const m = members.find((x) => x.user_id === b.userId);
            const isCurrent = false; // we don't have currentUserId here, accent first member visually
            const isOwer = b.balance < 0;
            const isCleared = b.balance === 0;
            return (
              <div
                key={b.userId}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}
              >
                <UserAvatar
                  avatarUrl={b.avatarUrl}
                  avatarEmoji={m ? memberInitial(m) : b.emoji || b.name.charAt(0).toUpperCase()}
                  name={b.name}
                  size="sm"
                  className={isCurrent ? ACCENT_AVATAR_CLASS : DEFAULT_AVATAR_CLASS}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="ed-serif" style={{ fontSize: 14, fontWeight: 600 }}>
                    {b.name}
                  </div>
                  <div className="ed-mono" style={{ fontSize: 9, color: "var(--ed-muted)" }}>
                    已付 {formatJPY(b.paid)}
                  </div>
                </div>
                {isCleared ? (
                  <span className="ed-mono" style={{ fontSize: 14, color: "var(--ed-ink)" }}>✓</span>
                ) : (
                  <div
                    className="ed-serif"
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: isOwer ? "var(--ed-vermillion)" : "var(--ed-ink)",
                    }}
                  >
                    {isOwer ? "−" : "+"}
                    {formatJPY(Math.abs(b.balance))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Min transfers */}
      {settlements.length > 0 ? (
        <>
          <div className="ed-group-head" style={{ marginTop: 22 }}>
            <div className="ed-group-label">最 小 轉 帳 方 案</div>
            <div className="ed-group-meta">MIN TRANSFERS</div>
          </div>
          {settlements.map((s, i) => (
            <div
              key={i}
              style={{
                padding: "14px 16px",
                background: "var(--ed-ink)",
                color: "var(--ed-paper)",
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginTop: i === 0 ? 4 : 8,
              }}
            >
              <UserAvatar
                avatarUrl={s.fromAvatarUrl}
                avatarEmoji={s.fromEmoji || s.fromName.charAt(0).toUpperCase()}
                name={s.fromName}
                size="sm"
                className={DEFAULT_AVATAR_CLASS}
              />
              <span className="ed-serif" style={{ fontSize: 14, fontWeight: 600 }}>
                {s.fromName}
              </span>
              <span className="ed-mono" style={{ fontSize: 11, opacity: 0.7 }}>→</span>
              <UserAvatar
                avatarUrl={s.toAvatarUrl}
                avatarEmoji={s.toEmoji || s.toName.charAt(0).toUpperCase()}
                name={s.toName}
                size="sm"
                className={DEFAULT_AVATAR_CLASS}
              />
              <span className="ed-serif" style={{ fontSize: 14, fontWeight: 600 }}>
                {s.toName}
              </span>
              <span style={{ flex: 1 }} />
              <span className="ed-serif" style={{ fontSize: 18, fontWeight: 700 }}>
                {formatJPY(s.amount)}
              </span>
            </div>
          ))}
        </>
      ) : (
        <div className="ed-group-head" style={{ marginTop: 22 }}>
          <div className="ed-group-label">已 結 清</div>
          <div className="ed-group-meta">ALL SETTLED</div>
        </div>
      )}

      {/* Items — split + cross-paid personal (settlement-relevant only) */}
      {(() => {
        const attribution = expenses.filter((e) => {
          if (e.split_type === "split") return true;
          const owner = e.owner_id ?? e.paid_by;
          return e.paid_by !== owner; // 幫別人付的
        });
        if (attribution.length === 0) return null;
        return (
          <>
            <div className="ed-group-head" style={{ marginTop: 22 }}>
              <div className="ed-group-label">品 項 歸 屬</div>
              <div className="ed-group-meta">ITEMS · {attribution.length}</div>
            </div>
            {attribution.map((e) => {
              const payer = members.find((m) => m.user_id === e.paid_by);
              const owner = members.find((m) => m.user_id === (e.owner_id ?? e.paid_by));
              const isSplit = e.split_type === "split";
              const meta = isSplit
                ? `${categoryLabel(e.category, categories)}${payer ? ` · ${memberName(payer)} 付 · 均分` : " · 均分"}`
                : `${categoryLabel(e.category, categories)}${
                    payer && owner ? ` · ${memberName(payer)} 幫 ${memberName(owner)} 付` : ""
                  }`;
              return (
                <div
                  key={e.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 0",
                    borderBottom: "1px dashed var(--ed-line)",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="ed-serif" style={{ fontSize: 14, fontWeight: 600 }}>
                      {e.title}
                    </div>
                    <div
                      className="ed-mono"
                      style={{
                        fontSize: 9,
                        marginTop: 3,
                        letterSpacing: 1,
                        color: isSplit ? "var(--ed-ink-soft)" : "var(--ed-vermillion)",
                      }}
                    >
                      {meta}
                    </div>
                  </div>
                  <div className="ed-serif" style={{ fontSize: 16, fontWeight: 700 }}>
                    {formatJPY(e.amount_jpy)}
                  </div>
                </div>
              );
            })}
          </>
        );
      })()}
    </div>
  );
}

// ---------- Page ----------

export default function RecordsPage() {
  const { currentTrip, tripMembers, isGuest, user, loading: ctxLoading } = useApp();
  const { expenses, loading, error, refresh } = useExpenses();
  const { categories } = useCategories();

  const [view, setView] = useState<ViewTab>("byDate");
  const [query, setQuery] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [filterCats, setFilterCats] = useState<string[]>([]);
  const [filterPays, setFilterPays] = useState<string[]>([]);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);

  const tripStart = currentTrip ? parseISO(currentTrip.start_date) : null;
  const tripEnd = currentTrip ? parseISO(currentTrip.end_date) : null;
  const memberCount = tripMembers?.length ?? 1;

  const filtered = useMemo(() => {
    let list = expenses;
    if (filterCats.length > 0) list = list.filter((e) => filterCats.includes(e.category));
    if (filterPays.length > 0) list = list.filter((e) => filterPays.includes(e.payment_method));
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
  }, [expenses, filterCats, filterPays, query]);

  const dateGroups = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const e of filtered) {
      const arr = map.get(e.expense_date) ?? [];
      arr.push(e);
      map.set(e.expense_date, arr);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, items]) => ({
        date,
        label: dayLabel(date, tripStart, tripEnd),
        items,
        totalJpy: items.reduce((s, e) => s + e.amount_jpy, 0),
        totalTwd: items.reduce((s, e) => s + e.amount_twd, 0),
      }));
  }, [filtered, tripStart, tripEnd]);

  const catGroups = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const e of filtered) {
      const arr = map.get(e.category) ?? [];
      arr.push(e);
      map.set(e.category, arr);
    }
    return Array.from(map.entries())
      .map(([cat, items]) => ({
        cat,
        label: categoryLabel(cat, categories),
        items,
        totalJpy: items.reduce((s, e) => s + e.amount_jpy, 0),
        totalTwd: items.reduce((s, e) => s + e.amount_twd, 0),
      }))
      .sort((a, b) => b.totalJpy - a.totalJpy);
  }, [filtered, categories]);

  const settle = useMemo(() => {
    if (!tripMembers || tripMembers.length < 2)
      return { balances: [], settlements: [] };
    return calculateSettlements(filtered, tripMembers);
  }, [filtered, tripMembers]);

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
          type="button"
        >
          重新載入
        </button>
      </div>
    );
  }

  const hasExpenses = expenses.length > 0;
  const filterActive = filterCats.length > 0 || filterPays.length > 0;

  const handleClearFilters = () => {
    setQuery("");
    setFilterCats([]);
    setFilterPays([]);
  };

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto" style={{ paddingBottom: 96 }}>
        {/* Page head */}
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
            style={{
              fontSize: 10,
              letterSpacing: 2,
              color: "var(--ed-muted)",
              textDecoration: "none",
            }}
          >
            ← 返回首頁
          </Link>
          {hasExpenses ? (
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
              type="button"
            >
              ↗ 匯出
            </button>
          ) : (
            <span style={{ width: 50 }} />
          )}
        </div>

        {/* Search + filter row + 4 view tabs */}
        {hasExpenses ? (
          <div style={{ padding: "14px 24px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div className="ed-search-bar">
                <span className="ed-mono" style={{ fontSize: 13, color: "var(--ed-muted)" }}>
                  ⌕
                </span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="搜尋品名、店名、備註"
                />
                {query ? (
                  <button
                    onClick={() => setQuery("")}
                    className="ed-mono"
                    style={{
                      fontSize: 13,
                      color: "var(--ed-muted)",
                      background: "transparent",
                      border: 0,
                      cursor: "pointer",
                      padding: 0,
                    }}
                    type="button"
                    aria-label="清除"
                  >
                    ×
                  </button>
                ) : null}
              </div>
              <button
                onClick={() => setShowFilter((s) => !s)}
                className={"ed-filter-toggle" + (showFilter || filterActive ? " on" : "")}
                type="button"
                aria-label="進階篩選"
              >
                ≡
              </button>
            </div>

            {showFilter ? (
              <div className="ed-filter-panel">
                <div className="ed-kicker" style={{ marginBottom: 8 }}>
                  分　類
                </div>
                <div
                  style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}
                >
                  {categories.map((c) => {
                    const on = filterCats.includes(c.value);
                    return (
                      <button
                        key={c.id}
                        onClick={() =>
                          setFilterCats((prev) =>
                            on ? prev.filter((v) => v !== c.value) : [...prev, c.value],
                          )
                        }
                        className={"ed-chip" + (on ? " on" : "")}
                        style={{ fontSize: 11, padding: "4px 10px" }}
                        type="button"
                      >
                        {c.icon} {c.label}
                      </button>
                    );
                  })}
                </div>
                <div className="ed-kicker" style={{ marginBottom: 8 }}>
                  支 付 方 式
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {PAYMENT_OPTS.map((p) => {
                    const on = filterPays.includes(p);
                    return (
                      <button
                        key={p}
                        onClick={() =>
                          setFilterPays((prev) =>
                            on ? prev.filter((v) => v !== p) : [...prev, p],
                          )
                        }
                        className={"ed-chip" + (on ? " on" : "")}
                        style={{ fontSize: 11, padding: "4px 10px" }}
                        type="button"
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
                {filterActive ? (
                  <button
                    onClick={handleClearFilters}
                    className="ed-mono"
                    style={{
                      marginTop: 12,
                      fontSize: 10,
                      letterSpacing: 2,
                      color: "var(--ed-muted)",
                      background: "transparent",
                      border: 0,
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                    type="button"
                  >
                    清除全部篩選
                  </button>
                ) : null}
              </div>
            ) : null}

            {/* 4 view tabs */}
            <div className="ed-view-tabs">
              {(
                [
                  ["byDate", "按日期"],
                  ["byCat", "按類別"],
                  ["byMember", "按成員"],
                  ["settle", "結算"],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setView(k)}
                  className={"ed-view-tab" + (view === k ? " on" : "")}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* Content */}
        <div style={{ padding: "14px 24px 0" }}>
          {!hasExpenses ? (
            <EmptyAll />
          ) : filtered.length === 0 && view !== "settle" ? (
            <FilteredEmpty onClear={handleClearFilters} />
          ) : view === "byDate" ? (
            dateGroups.map((g) => (
              <div key={g.date} style={{ marginBottom: 18 }}>
                <div className="ed-group-head">
                  <div className="ed-group-label">
                    {g.label}{" "}
                    <span
                      className="ed-mono"
                      style={{
                        fontSize: 10,
                        color: "var(--ed-muted)",
                        marginLeft: 8,
                        letterSpacing: 1,
                        fontWeight: 400,
                      }}
                    >
                      {format(parseISO(g.date), "MM/dd")}
                    </span>
                  </div>
                  <div className="ed-group-meta">
                    {formatJPY(g.totalJpy)} · {formatTWD(g.totalTwd)}
                  </div>
                </div>
                {g.items.map((e) => (
                  <RecRow
                    key={e.id}
                    expense={e}
                    members={tripMembers ?? []}
                    categories={categories}
                    currentUserId={user?.id ?? null}
                    onOpen={setSelectedExpense}
                  />
                ))}
              </div>
            ))
          ) : view === "byCat" ? (
            catGroups.map((g) => (
              <div key={g.cat} style={{ marginBottom: 18 }}>
                <div className="ed-group-head">
                  <div className="ed-group-label cat">{g.label}</div>
                  <div className="ed-group-meta">
                    {formatJPY(g.totalJpy)} · {formatTWD(g.totalTwd)}
                  </div>
                </div>
                {g.items.map((e) => (
                  <RecRow
                    key={e.id}
                    expense={e}
                    members={tripMembers ?? []}
                    categories={categories}
                    currentUserId={user?.id ?? null}
                    onOpen={setSelectedExpense}
                  />
                ))}
              </div>
            ))
          ) : view === "byMember" ? (
            <ByMember
              members={tripMembers ?? []}
              filtered={filtered}
              memberCount={memberCount}
              categories={categories}
              currentUserId={user?.id ?? null}
              expandedMember={expandedMember}
              setExpandedMember={setExpandedMember}
              onOpen={setSelectedExpense}
            />
          ) : (
            <SettleView
              members={tripMembers ?? []}
              balances={settle.balances}
              settlements={settle.settlements}
              expenses={filtered}
              memberCount={memberCount}
              categories={categories}
            />
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
