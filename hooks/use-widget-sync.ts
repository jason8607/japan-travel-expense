"use client";

import { useEffect, useRef } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { useApp } from "@/lib/context";
import { useExpenses } from "@/hooks/use-expenses";
import { useCategories } from "@/hooks/use-categories";
import { useCreditCards } from "@/hooks/use-credit-cards";
import { isNativeApp } from "@/lib/capacitor";
import { buildWidgetSnapshot } from "@/lib/widget-snapshot";
import { widgetSync } from "@/lib/native/widget-sync";

export function useWidgetSync(): void {
  const { currentTrip, tripMembers, profile, user, isGuest, loading: appLoading } =
    useApp();
  const { expenses, loading: expensesLoading } = useExpenses();
  const { categories } = useCategories();
  const { cards, loading: cardsLoading } = useCreditCards();

  const latestRef = useRef({
    currentTrip,
    tripMembers,
    profile,
    user,
    isGuest,
    expenses,
    categories,
    cards,
  });

  useEffect(() => {
    latestRef.current = {
      currentTrip,
      tripMembers,
      profile,
      user,
      isGuest,
      expenses,
      categories,
      cards,
    };
  });

  useEffect(() => {
    if (!isNativeApp()) return;
    // Wait for AppProvider auth + trip bootstrap; otherwise we can persist a snapshot
    // with isLoggedIn=false while getUser() is still in flight (child effects can run
    // before the parent init await completes).
    if (appLoading) return;
    if (expensesLoading) return;
    if (cardsLoading) return;

    const handle = setTimeout(() => {
      const snapshot = buildWidgetSnapshot({
        trip: currentTrip,
        expenses,
        members: tripMembers,
        profile,
        isGuest,
        isLoggedIn: Boolean(user) || isGuest || Boolean(currentTrip),
        customCategories: categories,
        cards,
      });
      widgetSync.write(snapshot);
    }, 600);

    return () => clearTimeout(handle);
  }, [
    appLoading,
    currentTrip,
    expenses,
    expensesLoading,
    tripMembers,
    profile,
    user,
    isGuest,
    categories,
    cards,
    cardsLoading,
  ]);

  useEffect(() => {
    if (!isNativeApp()) return;
    const sub = CapacitorApp.addListener("appStateChange", ({ isActive }) => {
      if (!isActive) return;
      const s = latestRef.current;
      const snapshot = buildWidgetSnapshot({
        trip: s.currentTrip,
        expenses: s.expenses,
        members: s.tripMembers,
        profile: s.profile,
        isGuest: s.isGuest,
        isLoggedIn: Boolean(s.user) || s.isGuest || Boolean(s.currentTrip),
        customCategories: s.categories,
        cards: s.cards,
      });
      widgetSync.write(snapshot);
    });
    return () => {
      sub.then((s) => s.remove());
    };
  }, []);
}
