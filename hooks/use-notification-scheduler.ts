"use client";

import { useEffect, useRef } from "react";

import { useCreditCards } from "@/hooks/use-credit-cards";
import { useExpenses } from "@/hooks/use-expenses";
import { isNativeApp } from "@/lib/capacitor";
import { calculateCardCashback } from "@/lib/cashback";
import { useApp } from "@/lib/context";
import { loadPrefs } from "@/lib/notification-prefs";
import {
  ensurePermission,
  getPermissionStatus,
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

export function useNotificationScheduler(): void {
  const { currentTrip } = useApp();
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
        const cashback = calculateCardCashback(expenses, card);
        const percent = (cashback / card.cashback_limit) * 100;
        if (percent < threshold) continue;
        if (hasNotified(currentTrip.id, card.id, threshold)) continue;
        await sendCashbackWarning({
          cardId: card.id,
          cardName: card.name,
          cashback,
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
}
