"use client";

import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/context";
import { useCreditCards } from "@/hooks/use-credit-cards";
import type { CreditCard, Expense, Profile } from "@/types";
import { cn } from "@/lib/utils";
import { CreditCard as CreditCardIcon, Settings } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import Link from "next/link";

interface CashbackChartProps {
  expenses: Expense[];
}

interface MemberCards {
  user_id: string;
  profile: Profile | null;
  cards: CreditCard[];
}

interface PlanStat {
  planId: string;
  planName: string;
  rate: number;
  totalTwd: number;
  cashback: number;
}

interface CardStat {
  card: CreditCard;
  totalTwd: number;
  cashbackEarned: number;
  progress: number;
  isMaxed: boolean;
  txCount: number;
  hasPlans: boolean;
  planBreakdown: PlanStat[];
}

interface MemberStat {
  userId: string;
  profile: Profile | null;
  cards: CardStat[];
  unassignedCount: number;
}

const maxedColor = "text-amber-500";

function calcCardStat(card: CreditCard, cardExpenses: Expense[]): CardStat {
  const hasPlans = !!card.plans && card.plans.length > 0;
  let planBreakdown: PlanStat[] = [];
  let totalCashback = 0;
  const totalTwd = cardExpenses.reduce((s, e) => s + e.amount_twd, 0);

  if (hasPlans) {
    planBreakdown = card.plans!.map((plan) => {
      const planExpenses = cardExpenses.filter(
        (e) => e.credit_card_plan_id === plan.id
      );
      const planTwd = planExpenses.reduce((s, e) => s + e.amount_twd, 0);
      const cashback = Math.round((planTwd * plan.cashback_rate) / 100);
      return {
        planId: plan.id,
        planName: plan.name,
        rate: plan.cashback_rate,
        totalTwd: planTwd,
        cashback,
      };
    });

    const unplannedExpenses = cardExpenses.filter(
      (e) => !e.credit_card_plan_id
    );
    if (unplannedExpenses.length > 0) {
      const unplannedTwd = unplannedExpenses.reduce(
        (s, e) => s + e.amount_twd,
        0
      );
      planBreakdown.push({
        planId: "__unassigned__",
        planName: "未指定方案",
        rate: 0,
        totalTwd: unplannedTwd,
        cashback: 0,
      });
    }

    totalCashback = planBreakdown.reduce((s, p) => s + p.cashback, 0);
  } else {
    totalCashback = Math.round((totalTwd * card.cashback_rate) / 100);
  }

  const progress = Math.min(
    (totalCashback / card.cashback_limit) * 100,
    100
  );
  const isMaxed = totalCashback >= card.cashback_limit;

  return {
    card,
    totalTwd,
    cashbackEarned: totalCashback,
    progress,
    isMaxed,
    txCount: cardExpenses.length,
    hasPlans,
    planBreakdown,
  };
}

export function CashbackChart({ expenses }: CashbackChartProps) {
  const { user, currentTrip, isGuest } = useApp();
  const { cards: ownCards, loading: ownLoading } = useCreditCards();

  const [memberCards, setMemberCards] = useState<MemberCards[] | null>(null);
  const [memberLoading, setMemberLoading] = useState(false);

  useEffect(() => {
    if (isGuest || !currentTrip) {
      setMemberCards(null);
      return;
    }

    let cancelled = false;
    setMemberLoading(true);
    (async () => {
      try {
        const res = await fetch(
          `/api/trip-cashback?trip_id=${currentTrip.id}`
        );
        if (!res.ok) {
          if (!cancelled) setMemberCards(null);
          return;
        }
        const data = await res.json();
        if (!cancelled) setMemberCards(data.members || []);
      } catch {
        if (!cancelled) setMemberCards(null);
      } finally {
        if (!cancelled) setMemberLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentTrip?.id, isGuest]);

  const memberStats: MemberStat[] = useMemo(() => {
    const creditExpenses = expenses.filter(
      (e) => e.payment_method === "信用卡"
    );

    // Guest mode or fallback: single-user flat list
    if (isGuest || !memberCards) {
      if (ownCards.length === 0) return [];
      const cardStats = ownCards.map((card) => {
        const cardExpenses = creditExpenses.filter(
          (e) => e.credit_card_id === card.id
        );
        return calcCardStat(card, cardExpenses);
      });
      const unassignedCount = creditExpenses.filter(
        (e) => !e.credit_card_id
      ).length;
      return [
        {
          userId: user?.id || "guest",
          profile: null,
          cards: cardStats,
          unassignedCount,
        },
      ];
    }

    // Multi-member: group by member
    return memberCards
      .map((m) => {
        const userExpenses = creditExpenses.filter(
          (e) => e.paid_by === m.user_id
        );
        const cardStats = m.cards.map((card) => {
          const cardExpenses = userExpenses.filter(
            (e) => e.credit_card_id === card.id
          );
          return calcCardStat(card, cardExpenses);
        });
        const unassignedCount = userExpenses.filter(
          (e) => !e.credit_card_id
        ).length;
        return {
          userId: m.user_id,
          profile: m.profile,
          cards: cardStats,
          unassignedCount,
        };
      })
      .filter((m) => m.cards.length > 0 || m.unassignedCount > 0);
  }, [memberCards, ownCards, expenses, isGuest, user?.id]);

  // Bring current user to the top
  const orderedStats = useMemo(() => {
    if (!user) return memberStats;
    const me = memberStats.find((s) => s.userId === user.id);
    if (!me) return memberStats;
    return [me, ...memberStats.filter((s) => s.userId !== user.id)];
  }, [memberStats, user]);

  if ((isGuest && ownLoading) || (!isGuest && memberLoading && !memberCards)) {
    return null;
  }
  if (orderedStats.length === 0) return null;

  const showMemberHeaders =
    !isGuest && orderedStats.filter((s) => s.cards.length > 0).length >= 2;

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <CreditCardIcon className="h-4 w-4 text-primary" />
          信用卡回饋進度
        </h3>
        <Link
          href="/settings"
          className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
        >
          <Settings className="h-3 w-3" />
          管理
        </Link>
      </div>

      <div className="space-y-5">
        {orderedStats.map((member, idx) => {
          const isMe = user?.id === member.userId;
          const memberName = isMe
            ? "我"
            : member.profile?.display_name || "成員";

          return (
            <div key={member.userId} className="space-y-3">
              {showMemberHeaders && (
                <div
                  className={cn(
                    "flex items-center gap-2",
                    idx > 0 && "pt-3 border-t border-border/60"
                  )}
                >
                  <UserAvatar
                    avatarUrl={member.profile?.avatar_url}
                    avatarEmoji={member.profile?.avatar_emoji}
                    name={memberName}
                    size="xs"
                  />
                  <span className="text-xs font-medium text-foreground">
                    {memberName}
                  </span>
                  {isMe && (
                    <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                      你
                    </span>
                  )}
                </div>
              )}

              {member.cards.length === 0 ? (
                <p className="text-[11px] text-muted-foreground pl-1">
                  尚未設定信用卡
                </p>
              ) : (
                <div className="space-y-4">
                  {member.cards.map(
                    ({
                      card,
                      totalTwd,
                      cashbackEarned,
                      progress,
                      isMaxed,
                      txCount,
                      hasPlans,
                      planBreakdown,
                    }) => (
                      <div key={card.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-base">💳</span>
                            <span className="text-sm font-medium">
                              {card.name}
                            </span>
                            {!hasPlans && (
                              <span className="text-[10px] text-muted-foreground">
                                {card.cashback_rate}%
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <span
                              className={cn(
                                "text-sm font-bold",
                                isMaxed ? maxedColor : "text-primary"
                              )}
                            >
                              NT${cashbackEarned.toLocaleString()}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {" "}
                              / NT${card.cashback_limit.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              "h-full w-full rounded-full transition-[transform] duration-500 origin-left",
                              isMaxed
                                ? "bg-linear-to-r from-amber-400 to-amber-500"
                                : "bg-linear-to-r from-primary/70 to-primary"
                            )}
                            style={{ transform: `scaleX(${progress / 100})` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>
                            消費 NT${totalTwd.toLocaleString()} · {txCount} 筆
                          </span>
                          {isMaxed ? (
                            <span className={cn(maxedColor, "font-medium")}>
                              已達上限
                            </span>
                          ) : (
                            <span>
                              還差 NT$
                              {(
                                card.cashback_limit - cashbackEarned
                              ).toLocaleString()}
                            </span>
                          )}
                        </div>

                        {hasPlans && planBreakdown.length > 0 && (
                          <div className="pl-3 space-y-1 ml-1">
                            {planBreakdown
                              .filter((p) => p.totalTwd > 0)
                              .map((p) => (
                                <div
                                  key={p.planId}
                                  className="flex items-center justify-between text-[11px]"
                                >
                                  <span className="text-muted-foreground">
                                    {p.planName}
                                    {p.rate > 0 && (
                                      <span className="text-muted-foreground ml-1">
                                        {p.rate}%
                                      </span>
                                    )}
                                  </span>
                                  <span className="text-muted-foreground">
                                    NT${p.totalTwd.toLocaleString()}
                                    {p.cashback > 0 && (
                                      <span className="text-primary ml-1">
                                        +NT${p.cashback.toLocaleString()}
                                      </span>
                                    )}
                                  </span>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              )}

              {member.unassignedCount > 0 && (
                <p className="text-[11px] text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                  有 {member.unassignedCount} 筆信用卡消費未指定卡片，不列入回饋計算
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
