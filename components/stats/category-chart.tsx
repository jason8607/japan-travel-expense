"use client";

import { formatCompactJPY } from "@/lib/exchange-rate";
import type { Expense } from "@/types";
import { useCategories } from "@/hooks/use-categories";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

interface CategoryChartProps {
  expenses: Expense[];
}

export function CategoryChart({ expenses }: CategoryChartProps) {
  const { categories } = useCategories();
  const total = expenses.reduce((s, e) => s + e.amount_jpy, 0);
  if (total === 0) return null;

  const knownValues = new Set(categories.map((c) => c.value));

  const data = categories.map((cat) => {
    const amount = expenses
      .filter((e) => e.category === cat.value)
      .reduce((s, e) => s + e.amount_jpy, 0);
    return {
      name: cat.label,
      icon: cat.icon,
      value: amount,
      color: cat.color,
      percentage: Math.round((amount / total) * 100),
    };
  });

  const unknownAmount = expenses
    .filter((e) => !knownValues.has(e.category))
    .reduce((s, e) => s + e.amount_jpy, 0);
  if (unknownAmount > 0) {
    data.push({
      name: "其他",
      icon: "📦",
      value: unknownAmount,
      color: "#6B7280",
      percentage: Math.round((unknownAmount / total) * 100),
    });
  }

  const filtered = data
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  if (filtered.length === 0) return null;

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold">分類支出</h3>
      </div>
      <div className="flex items-center gap-4">
        <div className="shrink-0 w-28 h-28">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={filtered}
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
                {filtered.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-1.5">
          {filtered.map((item) => (
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
