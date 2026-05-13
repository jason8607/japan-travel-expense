import type { Trip, Expense, TripMember, CategoryItem, Profile, CreditCard } from "@/types";
import { DEFAULT_CATEGORIES } from "@/types";
import { calculateSettlements } from "@/lib/settlement";
import type {
  WidgetSnapshot,
  WidgetCategorySlice,
  WidgetTripSummary,
  WidgetSettlement,
  WidgetCashback,
  WidgetCashbackTop,
} from "@/types/widget";

/** Calendar yyyy-MM-dd in the device local timezone (matches expense form + useExpenses todayTotal). */
function localCalendarDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDate(yyyyMmDd: string): Date {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function addDays(yyyyMmDd: string, n: number): string {
  const d = parseDate(yyyyMmDd);
  d.setUTCDate(d.getUTCDate() + n);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`;
}

function diffDaysInclusive(start: string, end: string): number {
  return Math.max(
    1,
    Math.round(
      (parseDate(end).getTime() - parseDate(start).getTime()) / (1000 * 60 * 60 * 24),
    ) + 1,
  );
}

function resolveCategory(
  value: string,
  customCategories: CategoryItem[],
): { label: string; icon: string; color: string } {
  const found =
    customCategories.find((c) => c.value === value) ||
    DEFAULT_CATEGORIES.find((c) => c.value === value);
  if (found) return { label: found.label, icon: found.icon, color: found.color };
  return { label: value, icon: "📦", color: "#8E7C65" };
}

function buildCashback(expenses: Expense[], cards: CreditCard[]): WidgetCashback | null {
  if (cards.length === 0) return null;
  const creditExpenses = expenses.filter((e) => e.payment_method === "信用卡");
  if (creditExpenses.length === 0) return null;

  let totalTwd = 0;
  let totalWeightedRate = 0;
  let totalRateWeight = 0;
  let topCard: WidgetCashbackTop | null = null;
  let topCashback = 0;
  let cardCount = 0;

  for (const card of cards) {
    const cardExpenses = creditExpenses.filter((e) => e.credit_card_id === card.id);
    if (cardExpenses.length === 0) continue;

    const cardTwd = cardExpenses.reduce((s, e) => s + e.amount_twd, 0);
    let cardCashback = 0;
    let effectiveRate = card.cashback_rate;

    if (card.plans && card.plans.length > 0) {
      cardCashback = card.plans.reduce((s, plan) => {
        const planTwd = cardExpenses
          .filter((e) => e.credit_card_plan_id === plan.id)
          .reduce((sum, e) => sum + e.amount_twd, 0);
        return s + Math.round((planTwd * plan.cashback_rate) / 100);
      }, 0);
      effectiveRate = cardTwd > 0 ? (cardCashback / cardTwd) * 100 : card.cashback_rate;
    } else {
      cardCashback = Math.round((cardTwd * card.cashback_rate) / 100);
    }

    cardCashback = Math.min(cardCashback, card.cashback_limit);
    totalTwd += cardCashback;
    totalWeightedRate += effectiveRate * cardTwd;
    totalRateWeight += cardTwd;
    cardCount++;

    if (cardCashback > topCashback) {
      topCashback = cardCashback;
      const rateLabel = `${effectiveRate.toFixed(1)}% 海外消費`;
      topCard = {
        cardName: card.name,
        cashbackTwd: cardCashback,
        rateLabel,
        rate: effectiveRate,
      };
    }
  }

  if (cardCount === 0) return null;

  const averageRate = totalRateWeight > 0 ? totalWeightedRate / totalRateWeight : 0;
  return {
    totalTwd: Math.round(totalTwd),
    cardCount,
    averageRate: Math.round(averageRate * 10) / 10,
    topCard,
  };
}

interface BuildArgs {
  trip: Trip | null;
  expenses: Expense[];
  members: TripMember[];
  profile: Profile | null;
  isGuest: boolean;
  isLoggedIn: boolean;
  customCategories?: CategoryItem[];
  cards?: CreditCard[];
}

export function buildWidgetSnapshot({
  trip,
  expenses,
  members,
  isGuest,
  isLoggedIn,
  customCategories = [],
  cards = [],
}: BuildArgs): WidgetSnapshot {
  const today = localCalendarDateString();

  const todayExpenses = expenses.filter((e) => e.expense_date === today);
  const spentJpy = todayExpenses.reduce((sum, e) => sum + (e.amount_jpy || 0), 0);
  const spentTwd = todayExpenses.reduce((sum, e) => sum + (e.amount_twd || 0), 0);

  let budgetJpy: number | null = null;
  let remainingJpy: number | null = null;
  if (trip?.budget_jpy && trip.budget_jpy > 0) {
    const days = diffDaysInclusive(trip.start_date, trip.end_date);
    budgetJpy = Math.round(trip.budget_jpy / days);
    remainingJpy = budgetJpy - spentJpy;
  }

  const categoryMap = new Map<string, number>();
  for (const e of todayExpenses) {
    categoryMap.set(e.category, (categoryMap.get(e.category) || 0) + (e.amount_jpy || 0));
  }
  const todayByCategory: WidgetCategorySlice[] = Array.from(categoryMap.entries())
    .map(([category, amountJpy]) => {
      const meta = resolveCategory(category, customCategories);
      return { category, label: meta.label, icon: meta.icon, color: meta.color, amountJpy };
    })
    .sort((a, b) => b.amountJpy - a.amountJpy);

  let tripSummary: WidgetTripSummary | null = null;
  if (trip) {
    const dailyMap = new Map<string, number>();
    for (const e of expenses) {
      if (e.expense_date >= trip.start_date && e.expense_date <= trip.end_date) {
        dailyMap.set(
          e.expense_date,
          (dailyMap.get(e.expense_date) || 0) + (e.amount_jpy || 0),
        );
      }
    }

    const dailyTotals: Array<{ date: string; amountJpy: number }> = [];
    let cursor = trip.start_date;
    const end = trip.end_date;
    while (cursor <= end) {
      dailyTotals.push({ date: cursor, amountJpy: dailyMap.get(cursor) || 0 });
      cursor = addDays(cursor, 1);
      if (dailyTotals.length > 90) break;
    }

    const totalJpy = dailyTotals.reduce((s, p) => s + p.amountJpy, 0);

    let topSettlement: WidgetSettlement | null = null;
    let settled = true;
    if (members.length >= 2) {
      const { settlements } = calculateSettlements(expenses, members);
      if (settlements.length > 0) {
        settled = false;
        const top = [...settlements].sort((a, b) => b.amount - a.amount)[0];
        topSettlement = {
          fromName: top.fromName,
          fromEmoji: top.fromEmoji,
          toName: top.toName,
          toEmoji: top.toEmoji,
          amountJpy: top.amount,
        };
      }
    }

    tripSummary = {
      id: trip.id,
      name: trip.name,
      startDate: trip.start_date,
      endDate: trip.end_date,
      totalJpy: Math.round(totalJpy),
      dailyTotals,
      topSettlement,
      settled,
    };
  }

  return {
    version: 1,
    isLoggedIn,
    isGuest,
    generatedAt: new Date().toISOString(),
    today: {
      spentJpy: Math.round(spentJpy),
      spentTwd: Math.round(spentTwd),
      budgetJpy,
      remainingJpy,
    },
    todayByCategory,
    trip: tripSummary,
    cashback: buildCashback(expenses, cards),
  };
}
