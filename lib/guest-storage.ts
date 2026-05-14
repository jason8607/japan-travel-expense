import type { Trip, Expense, Category, PaymentMethod, SplitType } from "@/types";

const GUEST_TRIP_KEY = "guest_trip";
const GUEST_EXPENSES_KEY = "guest_expenses";
const GUEST_MODE_KEY = "guest_mode";
const GUEST_OCR_COUNT_KEY = "guest_ocr_count";
const GUEST_MEMBER_BUDGETS_KEY = "ryocho.guest.member-budgets";

interface GuestMemberBudgets {
  total_budget_jpy: number | null;
  daily_budget_jpy: number | null;
}

export function getGuestMemberBudgets(): GuestMemberBudgets {
  if (typeof window === "undefined") return { total_budget_jpy: null, daily_budget_jpy: null };
  try {
    const raw = window.localStorage.getItem(GUEST_MEMBER_BUDGETS_KEY);
    if (!raw) return { total_budget_jpy: null, daily_budget_jpy: null };
    const parsed = JSON.parse(raw) as Partial<GuestMemberBudgets>;
    return {
      total_budget_jpy: parsed.total_budget_jpy ?? null,
      daily_budget_jpy: parsed.daily_budget_jpy ?? null,
    };
  } catch {
    return { total_budget_jpy: null, daily_budget_jpy: null };
  }
}

export function saveGuestMemberBudgets(budgets: GuestMemberBudgets): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GUEST_MEMBER_BUDGETS_KEY, JSON.stringify(budgets));
}
const GUEST_OCR_LIMIT = 10;

function getLocalDateString(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function initGuestTrip(): Trip {
  const trip: Trip = {
    id: "guest",
    name: "我的旅程",
    start_date: getLocalDateString(0),
    end_date: getLocalDateString(7),
    currency: "JPY",
    cash_budget: null,
    budget_jpy: null,
    created_by: "guest",
    created_at: new Date().toISOString(),
  };
  localStorage.setItem(GUEST_TRIP_KEY, JSON.stringify(trip));
  localStorage.setItem(GUEST_MODE_KEY, "true");
  return trip;
}

export function getGuestTrip(): Trip | null {
  try {
    const raw = localStorage.getItem(GUEST_TRIP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.id !== "string" || typeof parsed.name !== "string") {
      localStorage.removeItem(GUEST_TRIP_KEY);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(GUEST_TRIP_KEY);
    return null;
  }
}

export function updateGuestTrip(updates: Partial<Trip>): Trip | null {
  const trip = getGuestTrip();
  if (!trip) return null;
  const start = updates.start_date ?? trip.start_date;
  const end = updates.end_date ?? trip.end_date;
  if (start > end) return null;
  const updated = { ...trip, ...updates, id: "guest" };
  localStorage.setItem(GUEST_TRIP_KEY, JSON.stringify(updated));
  return updated;
}

export function getGuestExpenses(): Expense[] {
  try {
    const raw = localStorage.getItem(GUEST_EXPENSES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      localStorage.removeItem(GUEST_EXPENSES_KEY);
      return [];
    }
    return parsed.filter(
      (e: unknown) => e && typeof e === "object" && "id" in e && "title" in e && "amount_jpy" in e
    );
  } catch {
    localStorage.removeItem(GUEST_EXPENSES_KEY);
    return [];
  }
}

function saveGuestExpenses(expenses: Expense[]): boolean {
  try {
    localStorage.setItem(GUEST_EXPENSES_KEY, JSON.stringify(expenses));
    return true;
  } catch {
    return false;
  }
}

export function addGuestExpense(data: {
  title: string;
  amount_jpy: number;
  amount_twd: number;
  exchange_rate: number;
  category: Category;
  payment_method: PaymentMethod;
  store_name?: string | null;
  location?: string | null;
  expense_date: string;
  split_type?: SplitType;
  credit_card_id?: string | null;
  credit_card_plan_id?: string | null;
  input_currency?: "JPY" | "TWD";
  note?: string | null;
}): Expense | null {
  const expenses = getGuestExpenses();
  const expense: Expense = {
    id: crypto.randomUUID(),
    trip_id: "guest",
    paid_by: "guest",
    title: data.title,
    title_ja: null,
    amount_jpy: data.amount_jpy,
    amount_twd: data.amount_twd,
    exchange_rate: data.exchange_rate,
    category: data.category,
    payment_method: data.payment_method,
    location: data.location ?? null,
    store_name: data.store_name ?? null,
    store_name_ja: null,
    expense_date: data.expense_date,
    split_type: data.split_type || "personal",
    owner_id: null,
    credit_card_id: data.credit_card_id ?? null,
    credit_card_plan_id: data.credit_card_plan_id ?? null,
    input_currency: data.input_currency || "JPY",
    note: data.note ?? null,
    receipt_image_url: null,
    created_at: new Date().toISOString(),
  };
  expenses.unshift(expense);
  if (!saveGuestExpenses(expenses)) return null;
  return expense;
}

export function updateGuestExpense(id: string, updates: Partial<Expense>): Expense | null {
  const expenses = getGuestExpenses();
  const idx = expenses.findIndex((e) => e.id === id);
  if (idx === -1) return null;
  const updated = { ...expenses[idx], ...updates, id };
  const newList = [...expenses];
  newList[idx] = updated;
  if (!saveGuestExpenses(newList)) return null;
  return updated;
}

export function deleteGuestExpense(id: string): boolean {
  const expenses = getGuestExpenses();
  const filtered = expenses.filter((e) => e.id !== id);
  if (filtered.length === expenses.length) return false;
  return saveGuestExpenses(filtered);
}

export function hasGuestData(): boolean {
  return localStorage.getItem(GUEST_MODE_KEY) === "true" && getGuestExpenses().length > 0;
}

export function isGuestMode(): boolean {
  return localStorage.getItem(GUEST_MODE_KEY) === "true";
}

export function getGuestOcrCount(): number {
  try {
    return parseInt(localStorage.getItem(GUEST_OCR_COUNT_KEY) || "0", 10);
  } catch {
    return 0;
  }
}

export function incrementGuestOcrCount(): number {
  const count = getGuestOcrCount() + 1;
  localStorage.setItem(GUEST_OCR_COUNT_KEY, String(count));
  return count;
}

export function getGuestOcrLimit(): number {
  return GUEST_OCR_LIMIT;
}

export function clearGuestData() {
  localStorage.removeItem(GUEST_TRIP_KEY);
  localStorage.removeItem(GUEST_EXPENSES_KEY);
  localStorage.removeItem(GUEST_MODE_KEY);
  localStorage.removeItem(GUEST_OCR_COUNT_KEY);
  localStorage.removeItem(GUEST_MEMBER_BUDGETS_KEY);
}
