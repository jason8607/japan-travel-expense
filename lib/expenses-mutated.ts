/** Dispatched after any client-side expense mutation so all `useExpenses` instances refetch (e.g. widget sync in root layout). */
export const EXPENSES_MUTATED_EVENT = "ryocho-expenses-mutated";

export function notifyExpensesMutated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EXPENSES_MUTATED_EVENT));
}
