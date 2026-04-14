"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

interface ChartDataItem {
  name: string;
  value: number;
  color: string;
}

interface LazyPieChartProps {
  data: ChartDataItem[];
}

export function LazyPieChart({ data }: LazyPieChartProps) {
  return (
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
  );
}
