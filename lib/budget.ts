import type { Expense, Trip, TripMember } from "@/types";

/** Number of inclusive days in the trip. Minimum 1 to avoid divide-by-zero. */
export function tripDays(trip: Pick<Trip, "start_date" | "end_date">): number {
  const start = new Date(trip.start_date);
  const end = new Date(trip.end_date);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 1;
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.floor(ms / 86400000) + 1);
}

/**
 * Returns the effective daily budget for a member.
 * - Uses daily_budget_jpy if set and > 0.
 * - Falls back to floor(total_budget_jpy / tripDays) if total is set.
 * - Returns null when both are unset (feature off for this member).
 */
export function effectiveDailyBudgetJpy(
  member: Pick<TripMember, "daily_budget_jpy" | "total_budget_jpy">,
  trip: Pick<Trip, "start_date" | "end_date">,
): number | null {
  if (member.daily_budget_jpy != null && member.daily_budget_jpy > 0) {
    return member.daily_budget_jpy;
  }
  if (member.total_budget_jpy != null && member.total_budget_jpy > 0) {
    const days = tripDays(trip);
    return Math.floor(member.total_budget_jpy / days);
  }
  return null;
}

/** True when daily_budget_jpy is null/unset but total_budget_jpy is set (auto-derived). Used by UI. */
export function isDailyBudgetDerived(
  member: Pick<TripMember, "daily_budget_jpy" | "total_budget_jpy">,
): boolean {
  return (
    (member.daily_budget_jpy == null || member.daily_budget_jpy <= 0) &&
    member.total_budget_jpy != null &&
    member.total_budget_jpy > 0
  );
}

/** Today's date string in Asia/Tokyo as YYYY-MM-DD. */
export function todayInJapan(now: Date = new Date()): string {
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return formatted; // en-CA locale returns YYYY-MM-DD directly
}

/**
 * Personal JPY share of a single expense for userId.
 * Mirrors the calculation in app/(main)/summary/page.tsx.
 *
 * @param allMemberIds - all member user IDs in the trip, used when participants is empty (all-split fallback)
 */
export function personalShareJpy(
  expense: Expense,
  userId: string,
  allMemberIds: string[],
): number {
  if (expense.split_type === "split") {
    const sharers = expense.participants?.length
      ? expense.participants
      : allMemberIds;
    if (!sharers.includes(userId)) return 0;
    return Math.floor(expense.amount_jpy / sharers.length);
  }
  if ((expense.owner_id || expense.paid_by) === userId) {
    return expense.amount_jpy;
  }
  return 0;
}

/** Sum of personal JPY shares across all expenses dated `day` (YYYY-MM-DD). */
export function todaySpentJpy(
  expenses: Expense[],
  userId: string,
  day: string,
  allMemberIds: string[],
): number {
  return expenses
    .filter((e) => e.expense_date === day)
    .reduce((sum, e) => sum + personalShareJpy(e, userId, allMemberIds), 0);
}
