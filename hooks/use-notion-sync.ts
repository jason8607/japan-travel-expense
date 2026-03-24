"use client";

import { useApp } from "@/lib/context";

export function useNotionSync() {
  const { currentTrip } = useApp();

  const syncExpense = async (expenseId: string) => {
    if (!currentTrip?.notion_token || !currentTrip?.notion_database_id) return;

    try {
      await fetch("/api/notion-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expenseId,
          notionToken: currentTrip.notion_token,
          databaseId: currentTrip.notion_database_id,
        }),
      });
    } catch {
      // Background sync — fail silently
    }
  };

  return { syncExpense };
}
