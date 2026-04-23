"use client";

import { useMemo, useRef, useState } from "react";
import { useApp } from "@/lib/context";
import { useExpenses } from "@/hooks/use-expenses";
import { useCategories } from "@/hooks/use-categories";
import { useCreditCards } from "@/hooks/use-credit-cards";
import { formatJPY } from "@/lib/exchange-rate";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/recap/stat-card";
import { ShareableCard } from "@/components/recap/shareable-card";
import { differenceInDays, parseISO, format } from "date-fns";
import { Camera, Loader2 } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { shareOrDownloadImage } from "@/lib/share-image";

export default function RecapPage() {
  const { currentTrip, tripMembers, isGuest, loading: ctxLoading } = useApp();
  const { expenses, loading } = useExpenses();
  const { categories } = useCategories();
  const { cards } = useCreditCards();
  const shareRef = useRef<HTMLDivElement>(null);
  const [capturing, setCapturing] = useState(false);

  const stats = useMemo(() => {
    if (!currentTrip || expenses.length === 0) return null;

    const totalJpy = expenses.reduce((s, e) => s + e.amount_jpy, 0);
    const totalTwd = expenses.reduce((s, e) => s + e.amount_twd, 0);

    const tripStart = parseISO(currentTrip.start_date);
    const tripEnd = parseISO(currentTrip.end_date);
    const totalDays = differenceInDays(tripEnd, tripStart) + 1;
    const dailyAvgJpy = Math.round(totalJpy / totalDays);

    const dateSet = new Set(expenses.map((e) => e.expense_date));
    const activeDays = dateSet.size;

    // Top expense
    const topExpense = expenses.reduce((max, e) =>
      e.amount_jpy > max.amount_jpy ? e : max
    );

    // Category breakdown — top category
    const catMap = new Map<string, number>();
    for (const e of expenses) {
      catMap.set(e.category, (catMap.get(e.category) || 0) + e.amount_jpy);
    }
    const topCatEntry = [...catMap.entries()].sort((a, b) => b[1] - a[1])[0];
    const topCatInfo = categories.find((c) => c.value === topCatEntry?.[0]);

    // Most visited store (by frequency)
    const storeFreq = new Map<string, number>();
    for (const e of expenses) {
      const name = e.store_name?.trim();
      if (name) storeFreq.set(name, (storeFreq.get(name) || 0) + 1);
    }
    const topStoreEntry = [...storeFreq.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;

    // Daily spending — max & min day
    const dailyMap = new Map<string, number>();
    for (const e of expenses) {
      dailyMap.set(e.expense_date, (dailyMap.get(e.expense_date) || 0) + e.amount_jpy);
    }
    const dailyEntries = [...dailyMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));

    const maxDay = dailyEntries.reduce(
      (max, [date, amount]) => (amount > max.amount ? { date, amount } : max),
      { date: "", amount: 0 }
    );
    const minDay = dailyEntries.reduce(
      (min, [date, amount]) => (amount < min.amount ? { date, amount } : min),
      { date: dailyEntries[0]?.[0] ?? "", amount: dailyEntries[0]?.[1] ?? 0 }
    );

    // Credit card cashback (capped at card limits)
    const creditExpenses = expenses.filter((e) => e.payment_method === "信用卡");
    let cappedCashback = 0;
    for (const card of cards) {
      const cardExps = creditExpenses.filter((e) => e.credit_card_id === card.id);
      let cardCb = 0;
      if (card.plans && card.plans.length > 0) {
        for (const plan of card.plans) {
          const planTwd = cardExps
            .filter((e) => e.credit_card_plan_id === plan.id)
            .reduce((s, e) => s + e.amount_twd, 0);
          cardCb += Math.round((planTwd * plan.cashback_rate) / 100);
        }
      } else {
        const twd = cardExps.reduce((s, e) => s + e.amount_twd, 0);
        cardCb = Math.round((twd * card.cashback_rate) / 100);
      }
      cappedCashback += card.cashback_limit > 0 ? Math.min(cardCb, card.cashback_limit) : cardCb;
    }

    // Per-member stats (multi-member only)
    const memberStats = tripMembers.length > 1
      ? tripMembers.map((m) => {
          const personalExps = expenses.filter(
            (e) => e.split_type === "personal" && (e.owner_id || e.paid_by) === m.user_id
          );
          const biggestExp = personalExps.length > 0
            ? personalExps.reduce((max, e) => (e.amount_jpy > max.amount_jpy ? e : max))
            : null;
          return {
            userId: m.user_id,
            name: m.profile?.display_name || "成員",
            emoji: m.profile?.avatar_emoji || "🧑",
            count: personalExps.length,
            biggestExp,
          };
        })
      : [];

    return {
      totalJpy,
      totalTwd,
      count: expenses.length,
      activeDays,
      dailyAvgJpy,
      topExpense,
      topCategory: topCatInfo
        ? { icon: topCatInfo.icon, label: topCatInfo.label, amount: topCatEntry[1] }
        : null,
      topStore: topStoreEntry ? { name: topStoreEntry[0], count: topStoreEntry[1] } : null,
      maxDay,
      minDay,
      totalCashback: cappedCashback,
      memberStats,
    };
  }, [expenses, currentTrip, categories, cards, tripMembers]);

  async function handleCapture() {
    const card = shareRef.current;
    if (!card || !currentTrip) return;
    setCapturing(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(card, {
        pixelRatio: 2,
        quality: 1,
      });

      // Convert data URL to blob
      const res = await fetch(dataUrl);
      const blob = await res.blob();

      const result = await shareOrDownloadImage(
        blob,
        `${currentTrip.name}-回顧.png`,
        `${currentTrip.name} 旅後回顧`
      );
      if (result === "downloaded") toast.success("圖片已儲存");
    } catch (err) {
      console.error("Recap capture error:", err);
      toast.error(`圖片產生失敗：${err instanceof Error ? err.message : "未知錯誤"}`);
    } finally {
      setCapturing(false);
    }
  }

  if (loading || ctxLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm">載入中...</span>
      </div>
    );
  }

  if (!currentTrip) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-2 text-muted-foreground">
        <Image src="/icon-192.png" alt="旅帳" width={56} height={56} />
        <span className="text-sm">請先選擇旅程</span>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-2 text-muted-foreground">
        <span className="text-4xl">📝</span>
        <span className="text-sm">尚無消費紀錄</span>
      </div>
    );
  }

  return (
    <>
      <PageHeader title="旅後回顧" showBack />
      <div className="space-y-4 px-4 pb-8">
        {/* Trip overview — compact header */}
        <StatCard
          gradient="from-rose-500 to-primary"
          emoji={
            <Image
              src="/icon-transparent.png"
              alt=""
              width={32}
              height={32}
              className="drop-shadow-sm"
            />
          }
          title={currentTrip.name}
        >
          <div className="text-sm opacity-80">
            {format(parseISO(currentTrip.start_date), "M/d")} ~ {format(parseISO(currentTrip.end_date), "M/d")}
            {" · "}{stats.count} 筆消費 · {stats.activeDays} 天
          </div>
          <div className="text-3xl font-bold mt-2">¥{stats.totalJpy.toLocaleString()}</div>
          <div className="text-sm opacity-70">≈ NT${stats.totalTwd.toLocaleString()}</div>
        </StatCard>

        {/* Top category */}
        {stats.topCategory && (
          <StatCard gradient="from-amber-500 to-orange-500" emoji="🏆" title="最愛類別">
            <div className="flex items-center gap-2">
              <span className="text-3xl">{stats.topCategory.icon}</span>
              <div>
                <div className="text-xl font-bold">{stats.topCategory.label}</div>
                <div className="text-sm opacity-80">
                  花了 {formatJPY(stats.topCategory.amount)}
                </div>
              </div>
            </div>
          </StatCard>
        )}

        {/* Most visited store */}
        {stats.topStore && (
          <StatCard gradient="from-emerald-500 to-green-500" emoji="🏪" title="最常造訪">
            <div className="text-xl font-bold">{stats.topStore.name}</div>
            <div className="text-sm opacity-80">共去了 {stats.topStore.count} 次</div>
          </StatCard>
        )}

        {/* Biggest single expense */}
        <StatCard gradient="from-rose-500 to-pink-500" emoji="💸" title="最貴的一筆">
          <div className="text-xl font-bold">{stats.topExpense.title}</div>
          <div className="text-2xl font-bold mt-1">
            {formatJPY(stats.topExpense.amount_jpy)}
          </div>
          <div className="text-xs opacity-70 mt-1">
            {stats.topExpense.store_name && `${stats.topExpense.store_name} · `}
            {format(parseISO(stats.topExpense.expense_date), "M/d")}
          </div>
        </StatCard>

        {/* Max vs min day */}
        {stats.maxDay.date && stats.minDay.date && stats.maxDay.date !== stats.minDay.date && (
          <StatCard gradient="from-amber-500 to-primary/90" emoji="📅" title="最花 vs 最省的一天">
            <div className="flex gap-4">
              <div className="flex-1 rounded-xl bg-card/15 p-3">
                <div className="text-xs opacity-80 mb-1">最花</div>
                <div className="text-lg font-bold">
                  {format(parseISO(stats.maxDay.date), "M/d")}
                </div>
                <div className="text-sm opacity-90">
                  {formatJPY(stats.maxDay.amount)}
                </div>
              </div>
              <div className="flex-1 rounded-xl bg-card/15 p-3">
                <div className="text-xs opacity-80 mb-1">最省</div>
                <div className="text-lg font-bold">
                  {format(parseISO(stats.minDay.date), "M/d")}
                </div>
                <div className="text-sm opacity-90">
                  {formatJPY(stats.minDay.amount)}
                </div>
              </div>
            </div>
          </StatCard>
        )}

        {/* Credit card cashback */}
        {stats.totalCashback > 0 && (
          <StatCard gradient="from-primary/90 to-rose-600" emoji="💳" title="信用卡回饋">
            <div className="text-3xl font-bold">
              NT${stats.totalCashback.toLocaleString()}
            </div>
            <div className="text-sm opacity-80">刷卡幫你省下的錢</div>
          </StatCard>
        )}

        {/* Per-member fun stats */}
        {stats.memberStats.length > 0 && (
          <StatCard gradient="from-rose-500 to-red-500" emoji="👥" title="成員趣味統計">
            <div className="space-y-3">
              {stats.memberStats.map((m) => (
                <div key={m.userId} className="rounded-xl bg-card/15 p-3">
                  <div className="font-bold">
                    {m.emoji} {m.name}
                  </div>
                  <div className="text-xs opacity-80 mt-1">
                    個人消費 {m.count} 筆
                    {m.biggestExp && (
                      <>
                        {" "}· 最大筆：{m.biggestExp.title}{" "}
                        {formatJPY(m.biggestExp.amount_jpy)}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </StatCard>
        )}

        {/* Capture button */}
        <button
          onClick={handleCapture}
          disabled={capturing}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-primary py-3 text-sm font-medium text-white shadow-sm transition-colors disabled:opacity-60"
        >
          {capturing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
          {capturing ? "產生中..." : "儲存旅行卡片"}
        </button>

        <p className="text-center text-[11px] text-muted-foreground">
          {currentTrip.name} · 旅後回顧
        </p>
      </div>

      {/* Off-screen shareable card for capture */}
      <div className="fixed -left-[9999px] top-0" aria-hidden="true">
        <ShareableCard
          ref={shareRef}
          tripName={currentTrip.name}
          startDate={format(parseISO(currentTrip.start_date), "yyyy/M/d")}
          endDate={format(parseISO(currentTrip.end_date), "yyyy/M/d")}
          totalJpy={stats.totalJpy}
          totalTwd={stats.totalTwd}
          count={stats.count}
          activeDays={stats.activeDays}
          dailyAvgJpy={stats.dailyAvgJpy}
          topCategoryIcon={stats.topCategory?.icon ?? "📦"}
          topCategoryLabel={stats.topCategory?.label ?? "其他"}
          topStoreName={stats.topStore?.name ?? null}
          topStoreCount={stats.topStore?.count ?? 0}
          topExpenseTitle={stats.topExpense.title}
          topExpenseJpy={stats.topExpense.amount_jpy}
          totalCashback={stats.totalCashback}
        />
      </div>
    </>
  );
}
