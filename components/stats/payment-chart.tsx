"use client";

import { formatCompactJPY } from "@/lib/exchange-rate";
import type { Expense } from "@/types";
import { PAYMENT_METHODS } from "@/types";
import dynamic from "next/dynamic";

const LazyPieChart = dynamic(
  () => import("./lazy-pie-chart").then((m) => ({ default: m.LazyPieChart })),
  { ssr: false, loading: () => <div className="w-28 h-28 rounded-full bg-muted animate-pulse" /> }
);

interface PaymentChartProps {
  expenses: Expense[];
  title?: string;
}

export function PaymentChart({ expenses, title = "支付方式" }: PaymentChartProps) {
  const total = expenses.reduce((s, e) => s + e.amount_jpy, 0);
  if (total === 0) return null;

  const data = PAYMENT_METHODS.map((pm) => {
    const amount = expenses
      .filter((e) => e.payment_method === pm.value)
      .reduce((s, e) => s + e.amount_jpy, 0);
    return {
      name: pm.label,
      icon: pm.icon,
      value: amount,
      color: pm.color,
      percentage: Math.round((amount / total) * 100),
    };
  })
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <h3 className="font-bold mb-3">{title}</h3>
      <div className="flex items-center gap-4">
        <div className="shrink-0 w-28 h-28">
          <LazyPieChart data={data} />
        </div>
        <div className="flex-1 space-y-1.5">
          {data.map((item) => (
            <div key={item.name} className="flex items-center gap-2 text-sm">
              <div
                className="shrink-0 w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="flex-1">{item.icon} {item.name}</span>
              <span className="text-muted-foreground text-xs">
                {item.percentage}%
              </span>
              <span className="font-medium text-xs">
                {formatCompactJPY(item.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
