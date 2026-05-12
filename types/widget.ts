export interface WidgetSnapshot {
  version: 1;
  isLoggedIn: boolean;
  isGuest: boolean;
  generatedAt: string;
  today: WidgetTodaySummary;
  todayByCategory: WidgetCategorySlice[];
  trip: WidgetTripSummary | null;
}

export interface WidgetTodaySummary {
  spentJpy: number;
  spentTwd: number;
  budgetJpy: number | null;
  remainingJpy: number | null;
}

export interface WidgetCategorySlice {
  category: string;
  label: string;
  icon: string;
  color: string;
  amountJpy: number;
}

export interface WidgetTripSummary {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  totalJpy: number;
  dailyTotals: Array<{ date: string; amountJpy: number }>;
  topSettlement: WidgetSettlement | null;
  settled: boolean;
}

export interface WidgetSettlement {
  fromName: string;
  fromEmoji: string;
  toName: string;
  toEmoji: string;
  amountJpy: number;
}
