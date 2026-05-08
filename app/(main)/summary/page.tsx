"use client";

import { SettlementView } from "@/components/expense/settlement-view";
import { EmptyState } from "@/components/layout/empty-state";
import { LoadingState } from "@/components/layout/loading-state";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useCategories } from "@/hooks/use-categories";
import { useCreditCards } from "@/hooks/use-credit-cards";
import { useExpenses } from "@/hooks/use-expenses";
import { useApp } from "@/lib/context";
import { formatJPY, formatTWD } from "@/lib/exchange-rate";
import { buildExpensesCsv } from "@/lib/export";
import { shareOrDownloadFile } from "@/lib/share-image";
import { differenceInDays, format, parseISO } from "date-fns";
import {
  CalendarDays,
  Camera,
  CreditCard as CreditCardIcon,
  Crown,
  Download,
  Loader2,
  Plane,
  Receipt,
  TrendingUp,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const LazyPieChart = dynamic(
  () => import("@/components/stats/lazy-pie-chart").then((m) => ({ default: m.LazyPieChart })),
  { ssr: false, loading: () => <div className="w-28 h-28 rounded-full bg-muted animate-pulse" /> }
);

export default function SummaryPage() {
  const { user, currentTrip, tripMembers, isGuest, loading: ctxLoading } = useApp();
  const { expenses, loading } = useExpenses();
  const { categories } = useCategories();
  const { cards } = useCreditCards();
  const captureRef = useRef<HTMLDivElement>(null);
  const [capturing, setCapturing] = useState(false);
  const [viewMode, setViewMode] = useState<"trip" | "mine">("trip");

  const canToggle = !isGuest && tripMembers.length > 1;
  const effectiveMode: "trip" | "mine" = canToggle ? viewMode : "mine";

  const stats = useMemo(() => {
    if (!currentTrip || expenses.length === 0) return null;

    // Build "my share" expense list — each expense reduced to current user's portion
    const allMemberIds = tripMembers.map((m) => m.user_id);
    const myShareExpenses = (() => {
      if (isGuest || !user) return expenses;
      const result: typeof expenses = [];
      for (const e of expenses) {
        if (e.split_type === "split") {
          const sharers = e.participants?.length ? e.participants : allMemberIds;
          if (!sharers.includes(user.id)) continue;
          const ratio = 1 / sharers.length;
          result.push({
            ...e,
            amount_jpy: Math.floor(e.amount_jpy * ratio),
            amount_twd: Math.floor(e.amount_twd * ratio),
          });
        } else if ((e.owner_id || e.paid_by) === user.id) {
          result.push(e);
        }
      }
      return result;
    })();

    const sourceExpenses = effectiveMode === "mine" ? myShareExpenses : expenses;
    if (sourceExpenses.length === 0) return null;

    const totalJpy = sourceExpenses.reduce((s, e) => s + e.amount_jpy, 0);
    const totalTwd = sourceExpenses.reduce((s, e) => s + e.amount_twd, 0);

    const tripStart = parseISO(currentTrip.start_date);
    const tripEnd = parseISO(currentTrip.end_date);
    const totalDays = differenceInDays(tripEnd, tripStart) + 1;
    const dailyAvgJpy = Math.round(totalJpy / totalDays);
    const dailyAvgTwd = Math.round(totalTwd / totalDays);

    // Dates with expenses
    const dateSet = new Set(sourceExpenses.map((e) => e.expense_date));
    const activeDays = dateSet.size;

    // Top expense
    const topExpense = sourceExpenses.reduce((max, e) =>
      e.amount_jpy > max.amount_jpy ? e : max
    );

    // Category breakdown
    const catMap = new Map<string, number>();
    for (const e of sourceExpenses) {
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
    for (const e of sourceExpenses) {
      payMap.set(e.payment_method, (payMap.get(e.payment_method) || 0) + e.amount_jpy);
    }

    // Daily spending per date
    const dailyMap = new Map<string, number>();
    for (const e of sourceExpenses) {
      dailyMap.set(e.expense_date, (dailyMap.get(e.expense_date) || 0) + e.amount_jpy);
    }
    const dailyEntries = [...dailyMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    const maxDaySpend = dailyEntries.reduce(
      (max, [date, amount]) => (amount > max.amount ? { date, amount } : max),
      { date: "", amount: 0 }
    );

    // Per-member spending (personal + split share) — always uses full expenses,
    // independent of view mode. Only displayed in trip mode.
    const memberSpend = tripMembers.map((m) => {
      let amount = 0;
      for (const e of expenses) {
        if (e.split_type === "split") {
          const sharers = e.participants?.length ? e.participants : allMemberIds;
          if (!sharers.includes(m.user_id)) continue;
          amount += Math.floor(e.amount_jpy / sharers.length);
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

    // Credit card cashback — only count expenses paid by current user
    const creditExpenses = expenses.filter((e) => e.payment_method === "信用卡");
    const myCreditExpenses = isGuest
      ? creditExpenses
      : creditExpenses.filter((e) => e.paid_by === user?.id);
    const cardStats = cards
      .map((card) => {
        const cardExps = myCreditExpenses.filter((e) => e.credit_card_id === card.id);
        if (cardExps.length === 0) return null;

        let cashback = 0;
        const totalTwdCard = cardExps.reduce((s, e) => s + e.amount_twd, 0);

        if (card.plans && card.plans.length > 0) {
          for (const plan of card.plans) {
            const planTwd = cardExps
              .filter((e) => e.credit_card_plan_id === plan.id)
              .reduce((s, e) => s + e.amount_twd, 0);
            cashback += Math.round((planTwd * plan.cashback_rate) / 100);
          }
        } else {
          cashback = Math.round((totalTwdCard * card.cashback_rate) / 100);
        }

        const capped = card.cashback_limit > 0 ? Math.min(cashback, card.cashback_limit) : cashback;
        return { name: card.name, totalTwd: totalTwdCard, cashback: capped, limit: card.cashback_limit };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);

    const totalCashback = cardStats.reduce((s, c) => s + c.cashback, 0);

    // Budget usage — only meaningful in trip view (budget is per-trip, not per-member)
    const tripTotalJpy = expenses.reduce((s, e) => s + e.amount_jpy, 0);
    const budgetUsed = effectiveMode === "trip" && currentTrip.budget_jpy
      ? Math.round((tripTotalJpy / currentTrip.budget_jpy) * 100)
      : null;

    return {
      totalJpy,
      totalTwd,
      totalDays,
      activeDays,
      dailyAvgJpy,
      dailyAvgTwd,
      count: sourceExpenses.length,
      topExpense,
      topCategory: topCatInfo
        ? { ...topCatInfo, amount: topCategory[1] }
        : null,
      catData,
      payMap,
      maxDaySpend,
      dailyEntries,
      memberSpend,
      budgetUsed,
      budgetJpy: currentTrip.budget_jpy,
      cardStats,
      totalCashback,
    };
  }, [currentTrip, expenses, categories, tripMembers, cards, isGuest, user, effectiveMode]);

  async function handleCaptureImage() {
    const el = captureRef.current;
    if (!el || !currentTrip) return;
    setCapturing(true);
    try {
      // Convert avatar images to base64 data URLs to avoid CORS issues
      const images = el.querySelectorAll("img");
      const restoreFns: (() => void)[] = [];

      await Promise.all(
        Array.from(images).map(async (img) => {
          // Extract original URL from next/image proxy
          let originalUrl = img.src;
          const match = originalUrl.match(/\/_next\/image\?url=([^&]+)/);
          if (match) originalUrl = decodeURIComponent(match[1]);

          try {
            const dataUrl = await new Promise<string>((resolve, reject) => {
              const tmp = new window.Image();
              tmp.crossOrigin = "anonymous";
              tmp.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = tmp.naturalWidth || 64;
                canvas.height = tmp.naturalHeight || 64;
                const ctx = canvas.getContext("2d")!;
                ctx.drawImage(tmp, 0, 0);
                resolve(canvas.toDataURL("image/png"));
              };
              tmp.onerror = () => reject(new Error("load failed"));
              tmp.src = originalUrl;
            });

            const prevSrc = img.src;
            const prevSrcset = img.srcset;
            img.src = dataUrl;
            img.srcset = "";
            restoreFns.push(() => {
              img.src = prevSrc;
              img.srcset = prevSrcset;
            });
          } catch {
            // If image fails to load, hide it so capture doesn't break
            const prevDisplay = img.style.display;
            img.style.display = "none";
            restoreFns.push(() => { img.style.display = prevDisplay; });
          }
        })
      );

      const { toPng } = await import("html-to-image");
      // Pin the capture dimensions to the element's own box so mobile
      // viewport scaling / fractional DPR doesn't produce extra gray gutters.
      const rect = el.getBoundingClientRect();
      const width = Math.ceil(rect.width);
      const height = Math.ceil(rect.height);
      const dataUrl = await toPng(el, {
        pixelRatio: 2,
        quality: 1,
        backgroundColor: "#f8fafc",
        width,
        height,
        canvasWidth: width * 2,
        canvasHeight: height * 2,
        style: {
          transform: "none",
          transformOrigin: "top left",
          margin: "0",
        },
      });

      // Restore original image srcs
      restoreFns.forEach((fn) => fn());

      const res = await fetch(dataUrl);
      const blob = await res.blob();

      const viewLabel = effectiveMode === "mine" ? "我的" : "旅程";
      const result = await shareOrDownloadFile(
        blob,
        `${currentTrip.name}-${viewLabel}總結.png`,
        `${currentTrip.name} ${viewLabel}總結`
      );
      if (result === "downloaded") toast.success("圖片已儲存");
    } catch (err) {
      console.error("Summary capture error:", err);
      const msg = err instanceof Error ? err.message : typeof err === "string" ? err : JSON.stringify(err);
      toast.error(`圖片產生失敗：${msg}`);
    } finally {
      setCapturing(false);
    }
  }

  if (loading || ctxLoading) {
    return <LoadingState />;
  }

  if (!currentTrip) {
    return (
      <EmptyState
        icon={Plane}
        title="先建立一趟旅程"
        description="旅程建立後，這裡會整理花費摘要、分類比例與結算資訊。"
        action={{ label: "建立旅程", href: "/trip/new" }}
      />
    );
  }

  if (!stats) {
    return (
      <EmptyState
        icon={Receipt}
        title="還沒有可總結的資料"
        description="新增消費後，旅程總結會自動產生花費亮點與分帳結果。"
        action={{ label: "新增消費", href: "/records/new" }}
      />
    );
  }

  const DAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

  return (
    <div className="pb-8">
      <div className="space-y-4 px-4">
      {/* View mode toggle (multi-member trips only) */}
      {canToggle && (
        <div className="flex items-center gap-1 p-1 rounded-xl bg-muted ring-1 ring-foreground/10">
          <button
            type="button"
            onClick={() => setViewMode("trip")}
            className={`flex-1 h-9 text-sm rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px ${
              viewMode === "trip"
                ? "bg-card text-foreground font-medium shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            旅程
          </button>
          <button
            type="button"
            onClick={() => setViewMode("mine")}
            className={`flex-1 h-9 text-sm rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px ${
              viewMode === "mine"
                ? "bg-card text-foreground font-medium shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            自己
          </button>
        </div>
      )}

      {/* Capturable content area */}
      <div ref={captureRef} className="space-y-4 bg-muted rounded-2xl p-4">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2">
          <Plane className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">{currentTrip.name}</h1>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {currentTrip.start_date} ~ {currentTrip.end_date} · {stats.totalDays} 天
        </p>
      </div>

      {/* Total spending hero card */}
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
        <p className="text-xs text-muted-foreground mb-1">
          {effectiveMode === "mine" ? "我的總花費" : "旅程總花費"}
        </p>
        <p className="text-2xl font-semibold tabular-nums text-foreground">{formatJPY(stats.totalJpy)}</p>
        <p className="text-sm text-muted-foreground mt-1 tabular-nums">
          ≈ {formatTWD(stats.totalTwd)}
        </p>
        {stats.budgetUsed !== null && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>預算使用</span>
              <span className="tabular-nums">{stats.budgetUsed}% · {formatJPY(stats.budgetJpy!)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted">
              <div
                className={`h-1.5 rounded-full transition-all ${stats.budgetUsed > 100 ? "bg-destructive" : "bg-primary"}`}
                style={{ width: `${Math.min(stats.budgetUsed, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Quick stats grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-3 text-center">
          <Receipt className="h-4 w-4 text-primary mx-auto mb-1" />
          <p className="text-lg font-semibold">{stats.count}</p>
          <p className="text-[10px] text-muted-foreground">筆消費</p>
        </div>
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-3 text-center">
          <CalendarDays className="h-4 w-4 text-primary mx-auto mb-1" />
          <p className="text-lg font-semibold">{stats.activeDays}</p>
          <p className="text-[10px] text-muted-foreground">天有消費</p>
        </div>
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-3 text-center">
          <TrendingUp className="h-4 w-4 text-success mx-auto mb-1" />
          <p className="text-lg font-semibold tabular-nums">{formatJPY(stats.dailyAvgJpy)}</p>
          <p className="text-[10px] text-muted-foreground">日均花費</p>
        </div>
      </div>

      {/* Top expense */}
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Crown className="h-4 w-4 text-warning" />
          <h3 className="font-semibold text-sm">最大筆消費</h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="font-medium text-sm">{stats.topExpense.title}</p>
            <p className="text-xs text-muted-foreground">
              {stats.topExpense.expense_date}
              {stats.topExpense.store_name && ` · ${stats.topExpense.store_name}`}
            </p>
          </div>
          <p className="font-semibold text-lg text-foreground tabular-nums">{formatJPY(stats.topExpense.amount_jpy)}</p>
        </div>
      </div>

      {/* Highest spending day */}
      {stats.maxDaySpend.date && (
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CalendarDays className="h-4 w-4 text-destructive" />
            <h3 className="font-semibold text-sm">花最多的一天</h3>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {(() => {
                const d = parseISO(stats.maxDaySpend.date);
                return `${format(d, "M/d")}(${DAY_LABELS[d.getDay()]})`;
              })()}
            </p>
            <p className="font-semibold text-lg text-foreground tabular-nums">{formatJPY(stats.maxDaySpend.amount)}</p>
          </div>
        </div>
      )}

      {/* Category breakdown */}
      {stats.catData.length > 0 && (
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
          <h3 className="font-semibold text-sm mb-3">分類支出</h3>
          <div className="flex items-center gap-4">
            <div className="shrink-0 w-28 h-28">
              <LazyPieChart data={stats.catData} />
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
                  <span className="font-medium text-xs tabular-nums">{formatJPY(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Payment method breakdown */}
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
        <h3 className="font-semibold text-sm mb-3">支付方式</h3>
        <div className="space-y-2">
          {[...stats.payMap.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([method, amount]) => {
              const pct = Math.round((amount / stats.totalJpy) * 100);
              return (
                <div key={method} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{method}</span>
                    <span className="font-medium tabular-nums">{formatJPY(amount)} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted">
                    <div
                      className="h-1.5 rounded-full bg-primary/70"
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
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
          <h3 className="font-semibold text-sm mb-3">每日花費</h3>
          <div className="space-y-1.5">
            {stats.dailyEntries.map(([date, amount]) => {
              const pct = Math.round((amount / stats.maxDaySpend.amount) * 100);
              const d = parseISO(date);
              return (
                <div key={date} className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground w-12 shrink-0">
                    {format(d, "M/d")}
                  </span>
                  <div className="flex-1 h-4 rounded bg-muted">
                    <div
                      className="h-4 rounded bg-primary/15 flex items-center justify-end px-1"
                      style={{ width: `${Math.max(pct, 8)}%` }}
                    >
                      <span className="text-[9px] font-medium text-foreground whitespace-nowrap tabular-nums">
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

      {/* Per-member spending (only for multi-member trips, trip mode) */}
      {effectiveMode === "trip" && !isGuest && tripMembers.length > 1 && (
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
          <h3 className="font-semibold text-sm mb-3">成員花費</h3>
          <div className="space-y-2">
            {stats.memberSpend.map((m) => (
              <div key={m.userId} className="flex items-center gap-3">
                <UserAvatar avatarUrl={m.avatarUrl} avatarEmoji={m.emoji} size="sm" />
                <span className="text-sm flex-1">{m.name}</span>
                <span className="font-medium text-sm tabular-nums">{formatJPY(m.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settlement (trip mode only) */}
      {effectiveMode === "trip" && !isGuest && tripMembers.length > 1 && (
        <SettlementView expenses={expenses} tripMembers={tripMembers} />
      )}

      {/* Credit card cashback (mine view) */}
      {effectiveMode === "mine" && stats.cardStats.length > 0 && (
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
          <div className="flex items-center gap-2 mb-3">
            <CreditCardIcon className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">我的信用卡回饋</h3>
            <span className="ml-auto font-semibold text-sm text-primary tabular-nums">
              {formatTWD(stats.totalCashback)}
            </span>
          </div>
          <div className="space-y-2">
            {stats.cardStats.map((card) => (
              <div key={card.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{card.name}</span>
                  <span className="font-medium text-success tabular-nums">
                    +{formatTWD(card.cashback)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
                  <span>刷卡 {formatTWD(card.totalTwd)}</span>
                  {card.limit > 0 && (
                    <span>
                      上限 {formatTWD(card.limit)}
                      {card.cashback >= card.limit && " · 已達上限"}
                    </span>
                  )}
                </div>
                {card.limit > 0 && (
                  <div className="h-1.5 rounded-full bg-muted">
                    <div
                      className={`h-1.5 rounded-full transition-all ${card.cashback >= card.limit ? "bg-warning" : "bg-success"}`}
                      style={{ width: `${Math.min(Math.round((card.cashback / card.limit) * 100), 100)}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      </div>{/* End capturable content */}

      {/* Save as image */}
      <button
        onClick={handleCaptureImage}
        disabled={capturing}
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-medium text-muted-foreground hover:bg-muted shadow-sm transition-colors disabled:opacity-60"
      >
        {capturing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Camera className="h-4 w-4" />
        )}
        {capturing ? "產生中..." : "儲存圖片"}
      </button>

      {/* Export button */}
      <button
        onClick={async () => {
          try {
            const { blob, filename } = buildExpensesCsv(
              expenses,
              currentTrip.name,
              tripMembers
            );
            const result = await shareOrDownloadFile(
              blob,
              filename,
              `${currentTrip.name} · 消費紀錄`
            );
            if (result === "downloaded") toast.success("CSV 已下載");
          } catch (err) {
            console.error("CSV export error:", err);
            toast.error(
              `匯出失敗：${err instanceof Error ? err.message : "未知錯誤"}`
            );
          }
        }}
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-medium text-muted-foreground hover:bg-muted shadow-sm transition-colors"
      >
        <Download className="h-4 w-4" />
        匯出 CSV
      </button>

      {/* Recap link */}
      <Link
        href="/recap"
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
      >
        ✨ 查看旅後回顧
      </Link>

      <p className="text-center text-[11px] text-muted-foreground">
        {currentTrip.name} · 旅行總結
      </p>
      </div>
    </div>
  );
}
