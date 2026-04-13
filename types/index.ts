export type Category = string;

export type PaymentMethod = "現金" | "信用卡" | "PayPay" | "Suica" | "其他";

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
  notion_database_id: string | null;
  created_by: string;
  created_at: string;
}

export interface TripMember {
  trip_id: string;
  user_id: string;
  role: MemberRole;
  profile?: Profile;
}

export interface TripSchedule {
  id: string;
  trip_id: string;
  date: string;
  location: string;
  region: string;
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
  receipt_image_url: string | null;
  notion_page_id: string | null;
  created_at: string;
  profile?: Profile;
  items?: ExpenseItem[];
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

export interface CreditCard {
  id: string;
  name: string;
  cashback_rate: number;
  cashback_limit: number;
}

export interface OCRResult {
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
  }[];
  total: number;
  payment_method: string;
}

export const DEFAULT_CATEGORIES: CategoryItem[] = [
  { id: "default-food",     value: "餐飲", label: "餐飲", icon: "🍽️", color: "#F59E0B" },
  { id: "default-transport", value: "交通", label: "交通", icon: "🚆", color: "#3B82F6" },
  { id: "default-shopping",  value: "購物", label: "購物", icon: "🛍️", color: "#EC4899" },
  { id: "default-hotel",     value: "住宿", label: "住宿", icon: "🏨", color: "#10B981" },
  { id: "default-ticket",    value: "門票", label: "門票", icon: "🎫", color: "#8B5CF6" },
  { id: "default-medicine",  value: "藥品", label: "藥品", icon: "💊", color: "#EF4444" },
  { id: "default-beauty",    value: "美妝", label: "美妝", icon: "💄", color: "#F472B6" },
  { id: "default-clothes",   value: "衣服", label: "衣服", icon: "👕", color: "#A78BFA" },
  { id: "default-other",     value: "其他", label: "其他", icon: "📦", color: "#6B7280" },
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
