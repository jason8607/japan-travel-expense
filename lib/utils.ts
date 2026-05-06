import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { subDays, parseISO, format } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getPreTripDate(startDate: string): string {
  return format(subDays(parseISO(startDate), 1), "yyyy-MM-dd");
}

export function isPreTripDate(date: string, startDate: string): boolean {
  return date < startDate;
}

export function formatDateLabel(date: string, startDate?: string): string {
  if (startDate && isPreTripDate(date, startDate)) return "行前";
  const DAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];
  const d = parseISO(date);
  return `${format(d, "M/d")}(${DAY_LABELS[d.getDay()]})`;
}

// Render an ISO date (yyyy-mm-dd) into a glanceable label that mirrors how
// people verbally check their own ledger: "today / yesterday" prefix for the
// most common entry windows, otherwise a neutral yyyy/mm/dd. Avoids iOS's
// verbose "2026年5月5日" native rendering.
export function formatExpenseDate(iso: string): string {
  if (!iso) return "選擇日期";
  const [yStr, mStr, dStr] = iso.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);
  if (!y || !m || !d) return iso;

  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((date.getTime() - today.getTime()) / 86_400_000);

  const formatted = `${y} / ${String(m).padStart(2, "0")} / ${String(d).padStart(2, "0")}`;

  if (diffDays === 0) return `今天 · ${formatted}`;
  if (diffDays === -1) return `昨天 · ${formatted}`;
  if (diffDays === -2) return `前天 · ${formatted}`;

  return formatted;
}
