import type { CreditCard, Expense } from "@/types";

/** Per-card cashback raw amount (before applying card limit cap). */
export function calculateCardCashback(
  expenses: Expense[],
  card: CreditCard
): number {
  const cardExpenses = expenses.filter(
    (e) => e.payment_method === "信用卡" && e.credit_card_id === card.id
  );
  if (cardExpenses.length === 0) return 0;

  const hasPlans = card.plans && card.plans.length > 0;
  if (hasPlans) {
    return card.plans!.reduce((s, plan) => {
      const planTwd = cardExpenses
        .filter((e) => e.credit_card_plan_id === plan.id)
        .reduce((sum, e) => sum + e.amount_twd, 0);
      return s + Math.round((planTwd * plan.cashback_rate) / 100);
    }, 0);
  }

  const cardTwd = cardExpenses.reduce((s, e) => s + e.amount_twd, 0);
  return Math.round((cardTwd * card.cashback_rate) / 100);
}

export function calculateTotalCashback(
  expenses: Expense[],
  cards: CreditCard[]
): number {
  if (cards.length === 0) return 0;
  const creditExpenses = expenses.filter((e) => e.payment_method === "信用卡");
  if (creditExpenses.length === 0) return 0;

  return cards.reduce((total, card) => {
    const cardCashback = calculateCardCashback(creditExpenses, card);
    // cashback_limit stores spending threshold (NTD spent to max out).
    // For plan-based cards, card.cashback_rate === 0; use the highest plan rate instead.
    let maxCashback = Infinity;
    if (card.cashback_limit > 0) {
      const hasPlans = card.plans && card.plans.length > 0;
      const effectiveRate = hasPlans
        ? Math.max(...card.plans!.map((p) => p.cashback_rate))
        : card.cashback_rate;
      if (effectiveRate > 0) {
        maxCashback = Math.round((card.cashback_limit * effectiveRate) / 100);
      }
    }
    return total + Math.min(cardCashback, maxCashback);
  }, 0);
}
