"use client";

import { formatCompactJPY } from "@/lib/exchange-rate";
import type { Expense } from "@/types";
import { PAYMENT_METHODS } from "@/types";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

interface PaymentChartProps {
  expenses: Expense[];
}

export function PaymentChart({ expenses }: PaymentChartProps) {
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
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <h3 className="font-bold mb-3">支付方式</h3>
      <div className="flex items-center gap-4">
        <div className="shrink-0 w-28 h-28">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={50}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
                strokeWidth={2}
                stroke="#fff"
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
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
