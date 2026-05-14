export type Category = string;

export type PaymentMethod = "現金" | "信用卡" | "PayPay" | "Suica" | "其他";

export type OCRPaymentCode = "cash" | "credit_card" | "paypay" | "suica" | "other";

export type SplitType = "personal" | "split";

export type MemberRole = "owner" | "member";

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  avatar_emoji: string;
  created_at: string;
}

export interface Trip {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  currency: string;
  cash_budget: number | null;
  budget_jpy: number | null;
  created_by: string;
  created_at: string;
}

export interface TripMember {
  trip_id: string;
  user_id: string;
  role: MemberRole;
  profile?: Profile;
  total_budget_jpy: number | null;
  daily_budget_jpy: number | null;
}

export interface Expense {
  id: string;
  trip_id: string;
  paid_by: string;
  title: string;
  title_ja: string | null;
  amount_jpy: number;
  amount_twd: number;
  exchange_rate: number;
  category: Category;
  payment_method: PaymentMethod;
  location: string | null;
  store_name: string | null;
  store_name_ja: string | null;
  expense_date: string;
  split_type: SplitType;
  owner_id: string | null;
  credit_card_id: string | null;
  credit_card_plan_id: string | null;
  input_currency: "JPY" | "TWD";
  note: string | null;
  receipt_image_url: string | null;
  created_at: string;
  profile?: Profile;
  items?: ExpenseItem[];
  // Subset split participants. Only meaningful when split_type === 'split'.
  // Empty/undefined for split expenses means "all members" (legacy fallback).
  participants?: string[];
}

export interface ExpenseItem {
  id: string;
  expense_id: string;
  name: string;
  name_ja: string | null;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_type: string | null;
}

export type TaxType = "reduced" | "standard";

export interface CategoryItem {
  id: string;
  value: string;
  label: string;
  icon: string;
  color: string;
}

export interface CreditCardPlan {
  id: string;
  credit_card_id: string;
  name: string;
  cashback_rate: number;
}

export interface CreditCard {
  id: string;
  name: string;
  cashback_rate: number;
  cashback_limit: number;
  plans?: CreditCardPlan[];
}

export interface OCRResult {
  is_receipt: boolean;
  store_name_ja: string;
  store_name: string;
  date: string;
  items: {
    name_ja: string;
    name: string;
    quantity: number;
    unit_price: number;
    tax_rate: number;
    tax_type: TaxType;
    category: Category;
  }[];
  total: number;
  payment_method: OCRPaymentCode;
}

export const DEFAULT_CATEGORIES: CategoryItem[] = [
  { id: "default-food",     value: "餐飲", label: "餐飲", icon: "🍜", color: "#E27A4A" },
  { id: "default-transport", value: "交通", label: "交通", icon: "🚄", color: "#5E8AB5" },
  { id: "default-shopping",  value: "購物", label: "購物", icon: "🛍️", color: "#D16B84" },
  { id: "default-hotel",     value: "住宿", label: "住宿", icon: "🏨", color: "#7AAE8C" },
  { id: "default-ticket",    value: "門票", label: "門票", icon: "🎫", color: "#9776C4" },
  { id: "default-medicine",  value: "藥品", label: "藥品", icon: "💊", color: "#C9604F" },
  { id: "default-beauty",    value: "美妝", label: "美妝", icon: "💄", color: "#D58AA3" },
  { id: "default-clothes",   value: "衣服", label: "衣服", icon: "👕", color: "#A892C9" },
  { id: "default-other",     value: "其他", label: "其他", icon: "📦", color: "#8E7C65" },
];

/** @deprecated Use useCategories() hook instead */
export const CATEGORIES = DEFAULT_CATEGORIES;

export const PAYMENT_METHODS: {
  value: PaymentMethod;
  label: string;
  icon: string;
  color: string;
}[] = [
  { value: "現金", label: "現金", icon: "💴", color: "#10B981" },
  { value: "信用卡", label: "信用卡", icon: "💳", color: "#3B82F6" },
  { value: "PayPay", label: "PayPay", icon: "📱", color: "#EC4899" },
  { value: "Suica", label: "Suica", icon: "🚃", color: "#06B6D4" },
  { value: "其他", label: "其他", icon: "💰", color: "#6B7280" },
];
