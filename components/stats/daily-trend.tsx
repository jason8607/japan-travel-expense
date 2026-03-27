"use client";

import { useId } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { format, parseISO, eachDayOfInterval, min, max, startOfDay } from "date-fns";
import { formatJPY } from "@/lib/exchange-rate";
import type { Expense } from "@/types";

interface DailyTrendProps {
  expenses: Expense[];
  startDate: string;
  endDate: string;
}

export function DailyTrend({ expenses, startDate, endDate }: DailyTrendProps) {
  const gradientId = useId();
  if (expenses.length === 0) return null;

  const today = startOfDay(new Date());
  const tripStart = parseISO(startDate);
  const tripEnd = parseISO(endDate);

  const expenseDates = expenses
    .map((e) => parseISO(e.expense_date))
    .filter((d) => !isNaN(d.getTime()));

  const rangeStart = min([tripStart, today, ...expenseDates]);
  const rangeEnd = max([tripEnd, today, ...expenseDates]);

  const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });

  const data = days.map((day) => {
    const dateStr = format(day, "yyyy-MM-dd");
    const dayExpenses = expenses.filter((e) => e.expense_date === dateStr);
    const total = dayExpenses.reduce((s, e) => s + e.amount_jpy, 0);
    return {
      date: format(day, "M/d"),
      amount: total,
    };
  });

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <h3 className="font-bold mb-3">每日趨勢</h3>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F97316" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis hide />
            <Tooltip
              formatter={(value) => [formatJPY(Number(value)), "金額"]}
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid #eee",
              }}
            />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="#F97316"
              strokeWidth={2}
              fill={`url(#${gradientId})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
