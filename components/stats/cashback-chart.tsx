"use client";

import { useCreditCards } from "@/hooks/use-credit-cards";
import { useApp } from "@/lib/context";
import { cn } from "@/lib/utils";
import type { CreditCard, Expense } from "@/types";
import { CreditCard as CreditCardIcon, Settings } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

interface CashbackChartProps {
  expenses: Expense[];
}

interface CardStat {
  card: CreditCard;
  totalTwd: number;
  cashbackEarned: number;
  spendingThreshold: number;
  hasThreshold: boolean;
  progress: number;
  isMaxed: boolean;
  txCount: number;
  rateLabel: string;
  maxCashback: number;
}

function buildRateLabel(card: CreditCard): string {
  const plans = card.plans ?? [];
  if (plans.length === 0) return `${card.cashback_rate}%`;
  const rates = plans.map((p) => p.cashback_rate).filter((r) => r > 0);
  if (rates.length === 0) return `${card.cashback_rate}%`;
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  return min === max ? `${min}%` : `${min}~${max}%`;
}

function calcCardStat(card: CreditCard, cardExpenses: Expense[]): CardStat {
  const hasPlans = !!card.plans && card.plans.length > 0;
  const totalTwd = cardExpenses.reduce((s, e) => s + e.amount_twd, 0);

  let totalCashback = 0;
  if (hasPlans) {
    totalCashback = card.plans!.reduce((sum, plan) => {
      const planTwd = cardExpenses
        .filter((e) => e.credit_card_plan_id === plan.id)
        .reduce((s, e) => s + e.amount_twd, 0);
      return sum + Math.round((planTwd * plan.cashback_rate) / 100);
    }, 0);
  } else {
    totalCashback = Math.round((totalTwd * card.cashback_rate) / 100);
  }

  // cashback_limit is the spending threshold (NTD spent to max out cashback).
  const spendingThreshold = card.cashback_limit > 0 ? card.cashback_limit : 0;
  const hasThreshold = spendingThreshold > 0;
  const progress = hasThreshold
    ? Math.min((totalTwd / spendingThreshold) * 100, 100)
    : 0;
  const isMaxed = hasThreshold && totalTwd >= spendingThreshold;

  const maxCashback =
    hasThreshold && card.cashback_rate > 0
      ? Math.round((spendingThreshold * card.cashback_rate) / 100)
      : 0;

  return {
    card,
    totalTwd,
    cashbackEarned: totalCashback,
    spendingThreshold,
    hasThreshold,
    progress,
    isMaxed,
    txCount: cardExpenses.length,
    rateLabel: buildRateLabel(card),
    maxCashback,
  };
}

export function CashbackChart({ expenses }: CashbackChartProps) {
  const { user, isGuest } = useApp();
  const { cards: ownCards, loading: ownLoading } = useCreditCards();

  const stats = useMemo(() => {
    if (ownCards.length === 0) return null;

    const creditExpenses = expenses.filter(
      (e) => e.payment_method === "信用卡"
    );

    const myExpenses = isGuest
      ? creditExpenses
      : creditExpenses.filter((e) => e.paid_by === user?.id);

    const cards = ownCards
      .map((card) => {
        const cardExpenses = myExpenses.filter(
          (e) => e.credit_card_id === card.id
        );
        return calcCardStat(card, cardExpenses);
      })
      .filter((c) => c.txCount > 0);

    const unassignedCount = myExpenses.filter((e) => !e.credit_card_id).length;

    return { cards, unassignedCount };
  }, [ownCards, expenses, isGuest, user?.id]);

  if (ownLoading) return null;
  if (!stats) return null;
  if (stats.cards.length === 0 && stats.unassignedCount === 0) return null;

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <CreditCardIcon className="h-4 w-4 text-primary" />
          信用卡回饋
        </h3>
        <Link
          href="/settings"
          className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
        >
          <Settings className="h-3 w-3" />
          管理
        </Link>
      </div>

      <div className="divide-y divide-border/60">
        {stats.cards.map((stat) => (
          <CardRow key={stat.card.id} stat={stat} />
        ))}

        {stats.unassignedCount > 0 && (
          <p className="mt-3 rounded-lg bg-warning-subtle px-3 py-2 text-[11px] text-warning-foreground">
            有 {stats.unassignedCount} 筆信用卡消費未指定卡片，不列入回饋計算
          </p>
        )}
      </div>
    </div>
  );
}

// Wave path generator: quadratic bezier peaks alternate above/below baseline.
// Control y = 2 * amplitude (quadratic midpoint y = controlY / 2).
// Spans x = -50..150 (200 wide, period = 50), enough for seamless -50 translate loop.
function buildWavePath(amplitude: number): string {
  const c = amplitude * 2;
  return `M -50 0 Q -37.5 ${c} -25 0 T 0 0 T 25 0 T 50 0 T 75 0 T 100 0 T 125 0 T 150 0 L 150 100 L -50 100 Z`;
}

// Match WaterMoire's behavior: more slosh near empty, less near full.
function amplitudeFor(progress: number): number {
  if (progress >= 85) return 1.5;
  if (progress <= 15) return 5;
  return 3.5;
}

interface WaterRingProps {
  id: string;
  progress: number;
  hasThreshold: boolean;
  color: string;
}

function WaterRing({ id, progress, hasThreshold, color }: WaterRingProps) {
  const RING_R = 45;
  const INNER_R = 38;
  const INNER_TOP = 50 - INNER_R; // 12
  const INNER_BOTTOM = 50 + INNER_R; // 88
  const INNER_H = INNER_R * 2; // 76
  const circumference = 2 * Math.PI * RING_R;
  const dashLen = hasThreshold ? (progress / 100) * circumference : 0;
  const surfaceY = INNER_BOTTOM - (progress / 100) * INNER_H;
  const clipId = `water-clip-${id}`;
  const showWater = progress > 0;

  return (
    <svg viewBox="0 0 100 100" className="h-16 w-16 shrink-0">
      <defs>
        <clipPath id={clipId}>
          <circle cx="50" cy="50" r={INNER_R} />
        </clipPath>
      </defs>

      {/* Gray track ring */}
      <circle
        cx="50"
        cy="50"
        r={RING_R}
        fill="none"
        stroke="var(--muted)"
        strokeWidth="4"
      />

      {/* Inner background */}
      <circle cx="50" cy="50" r={INNER_R} fill="var(--card)" />

      {/* Water wave (clipped to inner circle) */}
      {showWater && (
        <g clipPath={`url(#${clipId})`} opacity="0.4">
          <g transform={`translate(0 ${surfaceY})`}>
            <path d={buildWavePath(amplitudeFor(progress))} fill={color}>
              <animateTransform
                attributeName="transform"
                type="translate"
                from="0 0"
                to="-50 0"
                dur="1.8s"
                repeatCount="indefinite"
              />
            </path>
          </g>
        </g>
      )}

      {/* Progress arc (rounded line caps), drawn on top so it sits above water */}
      {hasThreshold && progress > 0 && (
        <circle
          cx="50"
          cy="50"
          r={RING_R}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${dashLen} ${circumference}`}
          transform="rotate(-90 50 50)"
        />
      )}

      {/* Percentage text */}
      <text
        x="50"
        y="56"
        textAnchor="middle"
        fontSize="16"
        fontWeight="700"
        fill="var(--foreground)"
      >
        {hasThreshold ? `${Math.round(progress)}%` : "∞"}
      </text>
    </svg>
  );
}

function fillTone() {
  return { color: "var(--primary)", text: "text-primary" };
}

function CardRow({ stat }: { stat: CardStat }) {
  const {
    card,
    totalTwd,
    cashbackEarned,
    spendingThreshold,
    hasThreshold,
    progress,
    isMaxed,
    txCount,
    rateLabel,
    maxCashback,
  } = stat;

  const tone = fillTone();

  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base shrink-0">💳</span>
          <span className="text-sm font-medium truncate">{card.name}</span>
        </div>
        <span className="text-[11px] text-muted-foreground shrink-0">
          {rateLabel}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <WaterRing
          id={card.id}
          progress={progress}
          hasThreshold={hasThreshold}
          color={tone.color}
        />

        <div className="flex-1 min-w-0">
          <div className="text-[11px] text-muted-foreground">已回饋</div>
          <div
            className={cn(
              "text-2xl font-bold tabular-nums leading-tight",
              tone.text
            )}
          >
            NT${cashbackEarned.toLocaleString()}
          </div>
          <div className="text-[11px] text-muted-foreground tabular-nums">
            NT${totalTwd.toLocaleString()}
            {hasThreshold && (
              <> / NT${spendingThreshold.toLocaleString()}</>
            )}
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{txCount} 筆</span>
        {hasThreshold ? (
          isMaxed ? (
            <span className={cn(tone.text, "font-medium")}>已達上限</span>
          ) : (
            <span>
              還能刷 NT$
              {Math.max(spendingThreshold - totalTwd, 0).toLocaleString()}
            </span>
          )
        ) : (
          <span>無上限</span>
        )}
      </div>
    </div>
  );
}
