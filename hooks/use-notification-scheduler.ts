"use client";

import { useEffect, useRef } from "react";

import { useCreditCards } from "@/hooks/use-credit-cards";
import { useExpenses } from "@/hooks/use-expenses";
import { isNativeApp } from "@/lib/capacitor";
import { useApp } from "@/lib/context";
import { effectiveDailyBudgetJpy, todayInJapan, todaySpentJpy } from "@/lib/budget";
import { loadPrefs } from "@/lib/notification-prefs";
import {
  ensureNotificationPermission,
  ensurePermission,
  getPermissionStatus,
  notifyDailyBudget,
  scheduleDailyReminder,
  sendCashbackWarning,
} from "@/lib/notifications";

const CASHBACK_NOTIFIED_PREFIX = "ryocho.notif.cashback";

function cashbackNotifiedKey(tripId: string, cardId: string, threshold: number): string {
  return `${CASHBACK_NOTIFIED_PREFIX}.${tripId}.${cardId}.${threshold}`;
}

function hasNotified(tripId: string, cardId: string, threshold: number): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(cashbackNotifiedKey(tripId, cardId, threshold)) === "1";
}

function markNotified(tripId: string, cardId: string, threshold: number): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(cashbackNotifiedKey(tripId, cardId, threshold), "1");
}

const BUDGET_NOTIFIED_PREFIX = "ryocho.notif.budget";

function budgetNotifiedKey(tripId: string, day: string, threshold: number): string {
  return `${BUDGET_NOTIFIED_PREFIX}.${tripId}.${day}.${threshold}`;
}

function hasBudgetNotified(tripId: string, day: string, threshold: number): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(budgetNotifiedKey(tripId, day, threshold)) === "1";
}

function markBudgetNotified(tripId: string, day: string, threshold: number): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(budgetNotifiedKey(tripId, day, threshold), "1");
}

export function useNotificationScheduler(): void {
  const { currentTrip, user, tripMembers, isGuest } = useApp();
  const { expenses } = useExpenses();
  const { cards } = useCreditCards();
  const lastDailyHourRef = useRef<number | null>(null);

  // Re-hydrate daily reminder on launch + when prefs may have changed elsewhere.
  useEffect(() => {
    if (!isNativeApp()) return;
    const prefs = loadPrefs();
    if (!prefs.dailyReminderEnabled) return;

    let cancelled = false;
    (async () => {
      const status = await getPermissionStatus();
      if (cancelled) return;
      if (status?.display !== "granted") return;
      if (lastDailyHourRef.current === prefs.dailyReminderHour) return;
      lastDailyHourRef.current = prefs.dailyReminderHour;
      await scheduleDailyReminder(prefs.dailyReminderHour);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Watch cashback per card; notify when a card crosses the configured threshold for the current trip.
  useEffect(() => {
    if (!isNativeApp()) return;
    if (!currentTrip) return;
    if (cards.length === 0) return;

    const prefs = loadPrefs();
    if (!prefs.cashbackWarningEnabled) return;
    const threshold = prefs.cashbackWarningThreshold;

    let cancelled = false;
    (async () => {
      const status = await getPermissionStatus();
      if (cancelled) return;
      if (status?.display !== "granted") {
        const granted = await ensurePermission();
        if (cancelled || !granted) return;
      }

      for (const card of cards) {
        if (card.cashback_limit <= 0) continue;
        const creditExpenses = expenses.filter(
          (e) => e.payment_method === "信用卡" && e.credit_card_id === card.id
        );
        const spent = creditExpenses.reduce((s, e) => s + e.amount_twd, 0);
        const percent = (spent / card.cashback_limit) * 100;
        if (percent < threshold) continue;
        if (hasNotified(currentTrip.id, card.id, threshold)) continue;
        await sendCashbackWarning({
          cardId: card.id,
          cardName: card.name,
          spent,
          limit: card.cashback_limit,
          threshold,
        });
        markNotified(currentTrip.id, card.id, threshold);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentTrip, expenses, cards]);

  // Fire foreground notification when daily personal budget crosses configured threshold.
  // Cross-platform: works on native (Capacitor) and web (Notification API).
  // Dedupes per trip + per day + per threshold so it fires at most once per day.
  useEffect(() => {
    if (!currentTrip) return;

    const currentUserId = isGuest ? "guest" : (user?.id ?? null);
    if (!currentUserId) return;

    const member = tripMembers.find((m) => m.user_id === currentUserId);
    if (!member) return;

    const dailyBudget = effectiveDailyBudgetJpy(member, currentTrip);
    if (!dailyBudget) return;

    const prefs = loadPrefs();
    if (!prefs.dailyBudgetWarningEnabled) return;
    const threshold = prefs.dailyBudgetWarningThreshold;

    const allMemberIds = tripMembers.map((m) => m.user_id);
    const day = todayInJapan();
    const spent = todaySpentJpy(expenses, currentUserId, day, allMemberIds);
    const percent = (spent / dailyBudget) * 100;
    if (percent < threshold) return;
    if (hasBudgetNotified(currentTrip.id, day, threshold)) return;

    let cancelled = false;
    (async () => {
      const granted = await ensureNotificationPermission();
      if (cancelled || !granted) return;
      await notifyDailyBudget({
        tripName: currentTrip.name,
        spent,
        budget: dailyBudget,
        threshold,
      });
      markBudgetNotified(currentTrip.id, day, threshold);
    })();

    return () => {
      cancelled = true;
    };
  }, [currentTrip, user, tripMembers, expenses, isGuest]);
}
