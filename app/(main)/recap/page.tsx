"use client";

import { EmptyState } from "@/components/layout/empty-state";
import { LoadingState } from "@/components/layout/loading-state";
import {
  WrappedCard,
  type WrappedCardVariant,
} from "@/components/recap/wrapped-card";
import { useCategories } from "@/hooks/use-categories";
import { useCreditCards } from "@/hooks/use-credit-cards";
import { useExpenses } from "@/hooks/use-expenses";
import { useApp } from "@/lib/context";
import {
  canCopyImage,
  canShareImage,
  copyImageToClipboard,
  downloadImage,
  isIosStandalone,
  isTouchDevice,
  shareImageNative,
} from "@/lib/share-image";
import { format, parseISO } from "date-fns";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Loader2,
  Plane,
  Receipt,
  Share2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const ICON_SRC = "/icon-transparent.png";

async function loadIconDataUrl(): Promise<string> {
  const res = await fetch(ICON_SRC);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

interface CardConfig {
  key: string;
  title: string;
  kicker?: string;
  big: string;
  sub: string;
  note?: string;
  badge?: string;
  decorText?: string;
  variant: WrappedCardVariant;
}

export default function RecapPage() {
  const { user, currentTrip, isGuest, loading: ctxLoading } = useApp();
  const { expenses, loading } = useExpenses();
  const { categories } = useCategories();
  const { cards } = useCreditCards();
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dragStartXRef = useRef<number | null>(null);
  const [idx, setIdx] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [iconDataUrl, setIconDataUrl] = useState<string | null>(null);
  const [touch, setTouch] = useState(false);

  useEffect(() => {
    setTouch(isTouchDevice());
    let cancelled = false;
    loadIconDataUrl()
      .then((url) => {
        if (!cancelled) setIconDataUrl(url);
      })
      .catch((err) => {
        console.error("Failed to preload icon:", err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    if (!currentTrip || expenses.length === 0) return null;

    const totalJpy = expenses.reduce((s, e) => s + e.amount_jpy, 0);
    const totalTwd = expenses.reduce((s, e) => s + e.amount_twd, 0);

    const dateSet = new Set(expenses.map((e) => e.expense_date));
    const activeDays = dateSet.size;

    const topExpense = expenses.reduce((max, e) =>
      e.amount_jpy > max.amount_jpy ? e : max
    );

    const catAmount = new Map<string, number>();
    const catCount = new Map<string, number>();
    for (const e of expenses) {
      catAmount.set(e.category, (catAmount.get(e.category) || 0) + e.amount_jpy);
      catCount.set(e.category, (catCount.get(e.category) || 0) + 1);
    }
    const topCatEntry = [...catAmount.entries()].sort((a, b) => b[1] - a[1])[0];
    const topCatInfo = categories.find((c) => c.value === topCatEntry?.[0]);

    const storeFreq = new Map<string, number>();
    for (const e of expenses) {
      const name = e.store_name?.trim();
      if (name) storeFreq.set(name, (storeFreq.get(name) || 0) + 1);
    }
    const topStoreEntry =
      [...storeFreq.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;

    const dailyMap = new Map<string, number>();
    for (const e of expenses) {
      dailyMap.set(
        e.expense_date,
        (dailyMap.get(e.expense_date) || 0) + e.amount_jpy
      );
    }
    const dailyEntries = [...dailyMap.entries()].sort((a, b) =>
      a[0].localeCompare(b[0])
    );
    const maxDay = dailyEntries.reduce(
      (max, [date, amount]) =>
        amount > max.amount ? { date, amount } : max,
      { date: "", amount: 0 }
    );

    const creditExpenses = expenses.filter(
      (e) => e.payment_method === "信用卡"
    );
    // Only count expenses paid by current user
    const myCreditExpenses = isGuest
      ? creditExpenses
      : creditExpenses.filter((e) => e.paid_by === user?.id);
    let cappedCashback = 0;
    let topCashbackCardName: string | null = null;
    let topCashbackAmount = 0;
    for (const card of cards) {
      const cardExps = myCreditExpenses.filter(
        (e) => e.credit_card_id === card.id
      );
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
      const capped =
        card.cashback_limit > 0 ? Math.min(cardCb, card.cashback_limit) : cardCb;
      cappedCashback += capped;
      if (capped > topCashbackAmount) {
        topCashbackAmount = capped;
        topCashbackCardName = card.name;
      }
    }

    return {
      totalJpy,
      totalTwd,
      count: expenses.length,
      activeDays,
      topExpense,
      topCategory: topCatInfo
        ? {
            icon: topCatInfo.icon,
            label: topCatInfo.label,
            amount: topCatEntry[1],
            count: catCount.get(topCatEntry[0]) ?? 0,
          }
        : null,
      topStore: topStoreEntry
        ? { name: topStoreEntry[0], count: topStoreEntry[1] }
        : null,
      maxDay,
      totalCashback: cappedCashback,
      topCashbackCardName,
    };
  }, [expenses, currentTrip, categories, cards, isGuest, user?.id]);

  const wrapped = useMemo(() => {
    if (!stats || !currentTrip) return null;
    const tripStart = parseISO(currentTrip.start_date);
    const tripEnd = parseISO(currentTrip.end_date);
    const year = format(tripStart, "yyyy");
    const tripRange = `${format(tripStart, "yyyy.MM.dd")} — ${format(
      tripEnd,
      "MM.dd"
    )}`;

    const configs: CardConfig[] = [
      {
        key: "cover",
        variant: "cover",
        kicker: "TRAVEL RECAP",
        title: "你的旅程",
        big: currentTrip.name,
        sub: `${tripRange} · ${stats.activeDays} 天有消費紀錄`,
      },
      {
        key: "total",
        variant: "total",
        kicker: "TOTAL SPENT",
        title: "這趟你們花了",
        big: `¥${stats.totalJpy.toLocaleString()}`,
        sub: `≈ NT$${stats.totalTwd.toLocaleString()}`,
        note: `共 ${stats.count} 筆消費 · ${stats.activeDays} 天`,
        badge: "★ 旅費總結 ★",
      },
    ];

    if (stats.topCategory) {
      const pct = Math.round(
        (stats.topCategory.amount / stats.totalJpy) * 100
      );
      configs.push({
        key: "fav",
        variant: "category",
        kicker: "TOP CATEGORY",
        title: "花最多的類別是",
        big: `${stats.topCategory.icon} ${stats.topCategory.label}`,
        sub: `¥${stats.topCategory.amount.toLocaleString()} · 佔 ${pct}%`,
        note: `這個類別共有 ${stats.topCategory.count} 筆，是這趟旅行最重的支出記憶。`,
        decorText: stats.topCategory.label.slice(0, 1),
      });
    }

    if (stats.topStore) {
      configs.push({
        key: "store",
        variant: "store",
        kicker: "REVISITED PLACE",
        title: "最常出現的店名",
        big: stats.topStore.name,
        sub: `去了 ${stats.topStore.count} 次`,
        note: "旅途中的日常風景",
      });
    }

    configs.push({
      key: "big",
      variant: "big",
      kicker: "BIGGEST EXPENSE",
      title: "最揮霍的一筆",
      big: `¥${stats.topExpense.amount_jpy.toLocaleString()}`,
      sub: stats.topExpense.title,
      note: [
        stats.topExpense.store_name,
        format(parseISO(stats.topExpense.expense_date), "yyyy/M/d"),
      ]
        .filter(Boolean)
        .join(" · "),
      badge: "但絕對值得",
    });

    if (stats.totalCashback > 0) {
      configs.push({
        key: "card",
        variant: "cashback",
        kicker: "SMART CARD",
        title: "聰明刷卡賺到",
        big: `NT$${stats.totalCashback.toLocaleString()}`,
        sub: stats.topCashbackCardName
          ? `主要來自 ${stats.topCashbackCardName}`
          : "刷卡幫你省下的錢",
        note: "省下一頓晚餐的錢",
      });
    }

    if (stats.maxDay.date) {
      configs.push({
        key: "day",
        variant: "day",
        kicker: "BIGGEST DAY",
        title: "花最瘋的一天",
        big: `¥${stats.maxDay.amount.toLocaleString()}`,
        sub: format(parseISO(stats.maxDay.date), "yyyy/M/d"),
        note: "最揮霍的一天",
      });
    }

    configs.push({
      key: "finale",
      variant: "finale",
      kicker: "FIN.",
      title: "謝謝這趟旅行。",
      big: `${stats.count} 筆`,
      sub: `${stats.activeDays} 天 · ¥${stats.totalJpy.toLocaleString()} 的回憶`,
      note: `${currentTrip.name} · ${tripRange}`,
      badge: "分 享 給 旅 伴",
    });

    return { year, cards: configs };
  }, [stats, currentTrip]);

  async function captureBlob(): Promise<Blob | null> {
    const node = cardRefs.current[idx];
    if (!node) return null;
    const { toPng } = await import("html-to-image");
    const opts = {
      pixelRatio: 2,
      quality: 1,
      cacheBust: true,
      // Strip the card's drop-shadow during capture so the PNG corners
      // outside the rounded shape are truly transparent.
      style: { boxShadow: "none" },
      filter: (n: HTMLElement) =>
        !(n instanceof HTMLElement && n.dataset.exportHide === "true"),
    };
    // iOS Safari workaround: html-to-image sometimes skips embedded images
    // on the first pass, so run it a few times before using the result.
    await toPng(node, opts);
    await toPng(node, opts);
    const dataUrl = await toPng(node, opts);
    const res = await fetch(dataUrl);
    return await res.blob();
  }

  async function handleDownload() {
    if (!wrapped || !currentTrip) return;
    const current = wrapped.cards[idx];
    const filename = `${currentTrip.name}-${current.title}.png`;
    setDownloading(true);
    try {
      const blob = await captureBlob();
      if (!blob) return;
      // iOS standalone PWA can't trigger <a download>; route through share
      // sheet so 儲存影像 saves to Photos.
      if (isIosStandalone() && canShareImage()) {
        const result = await shareImageNative(
          blob,
          filename,
          `${currentTrip.name} · ${current.title}`
        );
        if (result === "unsupported") {
          downloadImage(blob, filename);
          toast.success("圖片已儲存");
        }
        return;
      }
      downloadImage(blob, filename);
      toast.success("圖片已儲存");
    } catch (err) {
      console.error("Download error:", err);
      toast.error(
        `下載失敗：${err instanceof Error ? err.message : "未知錯誤"}`
      );
    } finally {
      setDownloading(false);
    }
  }

  async function handleShare() {
    if (!wrapped || !currentTrip) return;
    const current = wrapped.cards[idx];
    setSharing(true);
    try {
      const blob = await captureBlob();
      if (!blob) return;
      // Desktop: native share UI is awkward, copy to clipboard instead.
      if (!isTouchDevice()) {
        if (canCopyImage()) {
          await copyImageToClipboard(blob);
          toast.success("圖片已複製到剪貼簿");
        } else {
          downloadImage(blob, `${currentTrip.name}-${current.title}.png`);
          toast.success("已下載圖片（瀏覽器不支援複製到剪貼簿）");
        }
        return;
      }
      const result = await shareImageNative(
        blob,
        `${currentTrip.name}-${current.title}.png`,
        `${currentTrip.name} · ${current.title}`
      );
      if (result === "unsupported") {
        toast.error("此裝置不支援原生分享，請改用下載");
      }
    } catch (err) {
      console.error("Share error:", err);
      toast.error(
        `分享失敗：${err instanceof Error ? err.message : "未知錯誤"}`
      );
    } finally {
      setSharing(false);
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
        description="有了旅程與消費紀錄後，就能產生可以分享的旅行回顧卡片。"
        action={{ label: "建立旅程", href: "/trip/new" }}
      />
    );
  }

  if (!stats || !wrapped) {
    return (
      <EmptyState
        icon={Receipt}
        title="還沒有回顧素材"
        description="新增消費後，這裡會把旅程花費變成可分享的亮點卡片。"
        action={{ label: "新增消費", href: "/records/new" }}
      />
    );
  }

  const total = wrapped.cards.length;
  // Mobile uses native share; desktop falls back to clipboard copy.
  const shareSupported = touch ? canShareImage() : canCopyImage();
  const shareLabel = touch ? "分享" : "複製圖片";
  const shareDisabledHint = touch
    ? "此裝置不支援原生分享"
    : "此瀏覽器不支援複製圖片";
  const CARD_WIDTH = 340;

  return (
    <>
      <div className="px-4 pb-8">
        <div className="text-center pt-2 pb-4">
          <div className="text-[11px] tracking-[0.2em] text-muted-foreground">
            WRAPPED · {wrapped.year}
          </div>
        </div>

        <div className="flex flex-col items-center gap-5">
          <div
            className="relative overflow-hidden rounded-[28px]"
            style={{ width: CARD_WIDTH }}
          >
            <div
              className="flex"
              onPointerDown={(e) => {
                if (e.pointerType === "mouse" && e.button !== 0) return;
                dragStartXRef.current = e.clientX;
                setIsDragging(true);
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (dragStartXRef.current === null) return;
                const dx = e.clientX - dragStartXRef.current;
                let offset = dx;
                if (idx === 0 && dx > 0) offset = dx * 0.3;
                if (idx === total - 1 && dx < 0) offset = dx * 0.3;
                setDragOffset(offset);
              }}
              onPointerUp={(e) => {
                if (dragStartXRef.current === null) return;
                const threshold = CARD_WIDTH * 0.2;
                if (dragOffset < -threshold && idx < total - 1) {
                  setIdx((i) => i + 1);
                } else if (dragOffset > threshold && idx > 0) {
                  setIdx((i) => i - 1);
                }
                setDragOffset(0);
                setIsDragging(false);
                dragStartXRef.current = null;
                try {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                } catch {}
              }}
              onPointerCancel={(e) => {
                setDragOffset(0);
                setIsDragging(false);
                dragStartXRef.current = null;
                try {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                } catch {}
              }}
              style={{
                touchAction: "pan-y",
                userSelect: "none",
                cursor: isDragging ? "grabbing" : "grab",
                transform: `translateX(${-idx * CARD_WIDTH + dragOffset}px)`,
                transition: isDragging
                  ? "none"
                  : "transform 400ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              {wrapped.cards.map((c, i) => (
                <div
                  key={c.key}
                  style={{ width: CARD_WIDTH, flexShrink: 0 }}
                >
                  <WrappedCard
                    ref={(el) => {
                      cardRefs.current[i] = el;
                    }}
                    tripName={currentTrip.name}
                    year={wrapped.year}
                    title={c.title}
                    kicker={c.kicker}
                    big={c.big}
                    sub={c.sub}
                    note={c.note}
                    badge={c.badge}
                    decorText={c.decorText}
                    variant={c.variant}
                    index={i}
                    total={total}
                    iconSrc={iconDataUrl ?? ICON_SRC}
                  />
                </div>
              ))}
            </div>
            {idx > 0 && (
              <button
                type="button"
                onClick={() => setIdx((i) => Math.max(0, i - 1))}
                aria-label="上一張"
                className="absolute bottom-5 left-5 flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md transition-colors hover:bg-white/30 active:bg-white/40"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            {idx < total - 1 && (
              <button
                type="button"
                onClick={() => setIdx((i) => Math.min(total - 1, i + 1))}
                aria-label="下一張"
                className="absolute bottom-5 right-5 flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md transition-colors hover:bg-white/30 active:bg-white/40"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
            )}
          </div>

          <div className="flex w-full max-w-85 gap-3">
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading || sharing}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted disabled:opacity-60"
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              下載圖片
            </button>
            <button
              type="button"
              onClick={handleShare}
              disabled={sharing || downloading || !shareSupported}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60"
              title={shareSupported ? undefined : shareDisabledHint}
            >
              {sharing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Share2 className="h-4 w-4" />
              )}
              {shareLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
