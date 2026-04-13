"use client";

import { useEffect, useState, useCallback } from "react";
import { useApp } from "@/lib/context";
import {
  getCreditCards as getLocalCards,
  addCreditCard as addLocalCard,
  updateCreditCard as updateLocalCard,
  deleteCreditCard as deleteLocalCard,
} from "@/lib/credit-cards";
import type { CreditCard } from "@/types";

export function useCreditCards() {
  const { user, isGuest } = useApp();
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);

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
        setCards(data.cards || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [user?.id, isGuest]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

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
