export type Category =
  | "餐飲"
  | "交通"
  | "購物"
  | "住宿"
  | "門票"
  | "藥品"
  | "其他";

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
  notion_token: string | null;
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
    tax_type: string;
  }[];
  total: number;
  payment_method: string;
}

export const CATEGORIES: { value: Category; label: string; icon: string; color: string }[] = [
  { value: "餐飲", label: "餐飲", icon: "🍽️", color: "#F59E0B" },
  { value: "交通", label: "交通", icon: "🚆", color: "#3B82F6" },
  { value: "購物", label: "購物", icon: "🛍️", color: "#EC4899" },
  { value: "住宿", label: "住宿", icon: "🏨", color: "#10B981" },
  { value: "門票", label: "門票", icon: "🎫", color: "#8B5CF6" },
  { value: "藥品", label: "藥品", icon: "💊", color: "#EF4444" },
  { value: "其他", label: "其他", icon: "📦", color: "#6B7280" },
];

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

export const DEFAULT_AVATARS = [
  "👨", "👩", "🧑", "👦", "👧", "🧔", "👱", "👲",
];
