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
