"use client";

import { useMemo } from "react";
import { useApp } from "@/lib/context";
import { useExpenses } from "@/hooks/use-expenses";
import { useCategories } from "@/hooks/use-categories";
import { formatJPY, formatTWD } from "@/lib/exchange-rate";
import { exportExpensesToCSV } from "@/lib/export";
import { calculateSettlements } from "@/lib/settlement";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  Plane,
  CalendarDays,
  TrendingUp,
  Crown,
  MapPin,
  Download,
  ArrowRight,
  Receipt,
} from "lucide-react";
import { differenceInDays, parseISO, format } from "date-fns";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import Link from "next/link";

export default function SummaryPage() {
  const { currentTrip, tripMembers, isGuest, loading: ctxLoading } = useApp();
  const { expenses, loading } = useExpenses();
  const { categories } = useCategories();

  const stats = useMemo(() => {
    if (!currentTrip || expenses.length === 0) return null;

    const totalJpy = expenses.reduce((s, e) => s + e.amount_jpy, 0);
    const totalTwd = expenses.reduce((s, e) => s + e.amount_twd, 0);

    const tripStart = parseISO(currentTrip.start_date);
    const tripEnd = parseISO(currentTrip.end_date);
    const totalDays = differenceInDays(tripEnd, tripStart) + 1;
    const dailyAvgJpy = Math.round(totalJpy / totalDays);
    const dailyAvgTwd = Math.round(totalTwd / totalDays);

    // Dates with expenses
    const dateSet = new Set(expenses.map((e) => e.expense_date));
    const activeDays = dateSet.size;

    // Top expense
    const topExpense = expenses.reduce((max, e) =>
      e.amount_jpy > max.amount_jpy ? e : max
    );

    // Category breakdown
    const catMap = new Map<string, number>();
    for (const e of expenses) {
      catMap.set(e.category, (catMap.get(e.category) || 0) + e.amount_jpy);
    }
    const topCategory = [...catMap.entries()].sort((a, b) => b[1] - a[1])[0];
    const topCatInfo = categories.find((c) => c.value === topCategory?.[0]);

    // Category chart data
    const catData = categories
      .map((cat) => ({
        name: cat.label,
        icon: cat.icon,
        value: catMap.get(cat.value) || 0,
        color: cat.color,
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);

    // Payment breakdown
    const payMap = new Map<string, number>();
    for (const e of expenses) {
      payMap.set(e.payment_method, (payMap.get(e.payment_method) || 0) + e.amount_jpy);
    }

    // Daily spending per date
    const dailyMap = new Map<string, number>();
    for (const e of expenses) {
      dailyMap.set(e.expense_date, (dailyMap.get(e.expense_date) || 0) + e.amount_jpy);
    }
    const dailyEntries = [...dailyMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    const maxDaySpend = dailyEntries.reduce(
      (max, [date, amount]) => (amount > max.amount ? { date, amount } : max),
      { date: "", amount: 0 }
    );

    // Per-member spending (personal + split share)
    const memberSpend = tripMembers.map((m) => {
      let amount = 0;
      for (const e of expenses) {
        if (e.split_type === "split") {
          amount += Math.floor(e.amount_jpy / tripMembers.length);
        } else if ((e.owner_id || e.paid_by) === m.user_id) {
          amount += e.amount_jpy;
        }
      }
      return {
        userId: m.user_id,
        name: m.profile?.display_name || "成員",
        emoji: m.profile?.avatar_emoji || "🧑",
        avatarUrl: m.profile?.avatar_url || null,
        amount,
      };
    }).sort((a, b) => b.amount - a.amount);

    // Settlement
    const { settlements } = calculateSettlements(expenses, tripMembers);

    // Budget usage
    const budgetUsed = currentTrip.budget_jpy
      ? Math.round((totalJpy / currentTrip.budget_jpy) * 100)
      : null;

    return {
      totalJpy,
      totalTwd,
      totalDays,
      activeDays,
      dailyAvgJpy,
      dailyAvgTwd,
      count: expenses.length,
      topExpense,
      topCategory: topCatInfo
        ? { ...topCatInfo, amount: topCategory[1] }
        : null,
      catData,
      payMap,
      maxDaySpend,
      dailyEntries,
      memberSpend,
      settlements,
      budgetUsed,
      budgetJpy: currentTrip.budget_jpy,
    };
  }, [currentTrip, expenses, categories, tripMembers]);

  if (loading || ctxLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-muted-foreground">載入中...</p>
      </div>
    );
  }

  if (!currentTrip) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground">
        <p className="text-4xl mb-2">📋</p>
        <p className="text-sm">請先建立旅程</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground">
        <p className="text-4xl mb-2">📋</p>
        <p className="text-sm">還沒有消費紀錄，無法產生總結</p>
      </div>
    );
  }

  const DAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

  return (
    <div className="space-y-4 p-4 pb-8">
      {/* Header */}
      <div className="text-center relative">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Link href="/" className="text-sm text-blue-500 absolute left-0">
            ← 返回
          </Link>
        </div>
        <div className="flex items-center justify-center gap-2">
          <Plane className="h-5 w-5 text-blue-500" />
          <h1 className="text-xl font-bold">{currentTrip.name}</h1>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {currentTrip.start_date} ~ {currentTrip.end_date} · {stats.totalDays} 天
        </p>
      </div>

      {/* Total spending hero card */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-5 text-white shadow-lg">
        <p className="text-sm opacity-80 mb-1">旅程總花費</p>
        <p className="text-3xl font-bold">{formatJPY(stats.totalJpy)}</p>
        <p className="text-sm opacity-80 mt-1">
          ≈ {formatTWD(stats.totalTwd)}
        </p>
        {stats.budgetUsed !== null && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs opacity-80 mb-1">
              <span>預算使用</span>
              <span>{stats.budgetUsed}% · {formatJPY(stats.budgetJpy!)}</span>
            </div>
            <div className="h-2 rounded-full bg-white/20">
              <div
                className={`h-2 rounded-full transition-all ${stats.budgetUsed > 100 ? "bg-red-300" : "bg-white/80"}`}
                style={{ width: `${Math.min(stats.budgetUsed, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Quick stats grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-white border border-slate-100 p-3 shadow-sm text-center">
          <Receipt className="h-4 w-4 text-blue-500 mx-auto mb-1" />
          <p className="text-lg font-bold">{stats.count}</p>
          <p className="text-[10px] text-muted-foreground">筆消費</p>
        </div>
        <div className="rounded-xl bg-white border border-slate-100 p-3 shadow-sm text-center">
          <CalendarDays className="h-4 w-4 text-violet-500 mx-auto mb-1" />
          <p className="text-lg font-bold">{stats.activeDays}</p>
          <p className="text-[10px] text-muted-foreground">天有消費</p>
        </div>
        <div className="rounded-xl bg-white border border-slate-100 p-3 shadow-sm text-center">
          <TrendingUp className="h-4 w-4 text-emerald-500 mx-auto mb-1" />
          <p className="text-lg font-bold">{formatJPY(stats.dailyAvgJpy)}</p>
          <p className="text-[10px] text-muted-foreground">日均花費</p>
        </div>
      </div>

      {/* Top expense */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Crown className="h-4 w-4 text-amber-500" />
          <h3 className="font-bold text-sm">最大筆消費</h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="font-medium text-sm">{stats.topExpense.title}</p>
            <p className="text-xs text-muted-foreground">
              {stats.topExpense.expense_date}
              {stats.topExpense.store_name && ` · ${stats.topExpense.store_name}`}
            </p>
          </div>
          <p className="font-bold text-lg text-slate-800">{formatJPY(stats.topExpense.amount_jpy)}</p>
        </div>
      </div>

      {/* Highest spending day */}
      {stats.maxDaySpend.date && (
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <CalendarDays className="h-4 w-4 text-red-500" />
            <h3 className="font-bold text-sm">花最多的一天</h3>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">
              {(() => {
                const d = parseISO(stats.maxDaySpend.date);
                return `${format(d, "M/d")}(${DAY_LABELS[d.getDay()]})`;
              })()}
            </p>
            <p className="font-bold text-lg text-slate-800">{formatJPY(stats.maxDaySpend.amount)}</p>
          </div>
        </div>
      )}

      {/* Category breakdown */}
      {stats.catData.length > 0 && (
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <h3 className="font-bold text-sm mb-3">分類支出</h3>
          <div className="flex items-center gap-4">
            <div className="shrink-0 w-28 h-28">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.catData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={50}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                    strokeWidth={2}
                    stroke="#fff"
                  >
                    {stats.catData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-1.5">
              {stats.catData.map((item) => (
                <div key={item.name} className="flex items-center gap-2 text-sm">
                  <div
                    className="shrink-0 w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="flex-1">{item.icon} {item.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {Math.round((item.value / stats.totalJpy) * 100)}%
                  </span>
                  <span className="font-medium text-xs">{formatJPY(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Payment method breakdown */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <h3 className="font-bold text-sm mb-3">支付方式</h3>
        <div className="space-y-2">
          {[...stats.payMap.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([method, amount]) => {
              const pct = Math.round((amount / stats.totalJpy) * 100);
              return (
                <div key={method} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{method}</span>
                    <span className="font-medium">{formatJPY(amount)} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100">
                    <div
                      className="h-1.5 rounded-full bg-blue-400"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Daily spending chart (text-based bars) */}
      {stats.dailyEntries.length > 1 && (
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <h3 className="font-bold text-sm mb-3">每日花費</h3>
          <div className="space-y-1.5">
            {stats.dailyEntries.map(([date, amount]) => {
              const pct = Math.round((amount / stats.maxDaySpend.amount) * 100);
              const d = parseISO(date);
              return (
                <div key={date} className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground w-12 shrink-0">
                    {format(d, "M/d")}
                  </span>
                  <div className="flex-1 h-4 rounded bg-slate-50">
                    <div
                      className="h-4 rounded bg-blue-100 flex items-center justify-end px-1"
                      style={{ width: `${Math.max(pct, 8)}%` }}
                    >
                      <span className="text-[9px] font-medium text-blue-700 whitespace-nowrap">
                        {formatJPY(amount)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Per-member spending (only for multi-member trips) */}
      {!isGuest && tripMembers.length > 1 && (
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <h3 className="font-bold text-sm mb-3">成員應付金額</h3>
          <div className="space-y-2">
            {stats.memberSpend.map((m) => (
              <div key={m.userId} className="flex items-center gap-3">
                <UserAvatar avatarUrl={m.avatarUrl} avatarEmoji={m.emoji} size="sm" />
                <span className="text-sm flex-1">{m.name}</span>
                <span className="font-medium text-sm">{formatJPY(m.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settlement summary */}
      {!isGuest && tripMembers.length > 1 && stats.settlements.length > 0 && (
        <div className="rounded-2xl border bg-amber-50 border-amber-100 p-4 shadow-sm">
          <h3 className="font-bold text-sm mb-3 text-amber-800">結算摘要</h3>
          <div className="space-y-2">
            {stats.settlements.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <UserAvatar avatarUrl={s.fromAvatarUrl} avatarEmoji={s.fromEmoji} size="xs" />
                <span className="text-amber-700">{s.fromName}</span>
                <ArrowRight className="h-3 w-3 text-amber-500" />
                <span className="font-bold text-amber-800">{formatJPY(s.amount)}</span>
                <ArrowRight className="h-3 w-3 text-amber-500" />
                <span className="text-amber-700">{s.toName}</span>
                <UserAvatar avatarUrl={s.toAvatarUrl} avatarEmoji={s.toEmoji} size="xs" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export button */}
      <button
        onClick={() => {
          exportExpensesToCSV(expenses, currentTrip.name, tripMembers);
          toast.success("CSV 已下載");
        }}
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 shadow-sm transition-colors"
      >
        <Download className="h-4 w-4" />
        匯出 CSV
      </button>

      <p className="text-center text-[11px] text-muted-foreground">
        {currentTrip.name} · 旅行總結
      </p>
    </div>
  );
}
