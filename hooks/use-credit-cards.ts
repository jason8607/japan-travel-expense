"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useApp } from "@/lib/context";
import {
  getCreditCards as getLocalCards,
  addCreditCard as addLocalCard,
  updateCreditCard as updateLocalCard,
  deleteCreditCard as deleteLocalCard,
} from "@/lib/credit-cards";
import type { CreditCard } from "@/types";

// Module-level cache
let cardCache: CreditCard[] | null = null;
let cardCacheUserId: string | null = null;

export function useCreditCards() {
  const { user, isGuest } = useApp();
  const uid = user?.id || null;

  // Use cache if available and for same user
  const cached = uid && cardCacheUserId === uid ? cardCache : null;
  const [cards, setCards] = useState<CreditCard[]>(cached || []);
  const [loading, setLoading] = useState(!cached);
  const mountedRef = useRef(true);

  const fetchCards = useCallback(async () => {
    if (isGuest || !user) {
      setCards(getLocalCards());
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/credit-cards");
      if (res.ok) {
        const data = await res.json();
        const fetched = data.cards || [];
        cardCache = fetched;
        cardCacheUserId = user.id;
        if (mountedRef.current) {
          setCards(fetched);
        }
      }
    } catch {
      // ignore
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [user?.id, isGuest]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isGuest && uid && cardCacheUserId === uid && cardCache) {
      setCards(cardCache);
      setLoading(false);
      fetchCards(); // background refresh
    } else {
      fetchCards();
    }
  }, [fetchCards, isGuest, uid]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const addCard = useCallback(
    async (data: Omit<CreditCard, "id">): Promise<CreditCard | null> => {
      if (isGuest || !user) {
        const card = addLocalCard(data);
        if (card) setCards(getLocalCards());
        return card;
      }

      try {
        const res = await fetch("/api/credit-cards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) return null;
        const { card } = await res.json();
        await fetchCards();
        return card;
      } catch {
        return null;
      }
    },
    [isGuest, user, fetchCards]
  );

  const updateCard = useCallback(
    async (
      id: string,
      updates: Partial<Omit<CreditCard, "id">>
    ): Promise<CreditCard | null> => {
      if (isGuest || !user) {
        const card = updateLocalCard(id, updates);
        if (card) setCards(getLocalCards());
        return card;
      }

      try {
        const res = await fetch("/api/credit-cards", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, ...updates }),
        });
        if (!res.ok) return null;
        const { card } = await res.json();
        await fetchCards();
        return card;
      } catch {
        return null;
      }
    },
    [isGuest, user, fetchCards]
  );

  const deleteCard = useCallback(
    async (id: string): Promise<boolean> => {
      if (isGuest || !user) {
        const ok = deleteLocalCard(id);
        if (ok) setCards(getLocalCards());
        return ok;
      }

      try {
        const res = await fetch(`/api/credit-cards?id=${id}`, {
          method: "DELETE",
        });
        if (!res.ok) return false;
        await fetchCards();
        return true;
      } catch {
        return false;
      }
    },
    [isGuest, user, fetchCards]
  );

  return { cards, loading, addCard, updateCard, deleteCard, refresh: fetchCards };
}
