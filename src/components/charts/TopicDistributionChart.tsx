"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { TopicDistributionItem } from "@/types";

const COLORS = [
  "#3b82f6",
  "#22c55e",
  "#eab308",
  "#f97316",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#6366f1",
];

export function TopicDistributionChart({
  data,
  isLoading,
}: {
  data: TopicDistributionItem[];
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="h-[300px] w-full animate-pulse rounded-lg bg-slate-200" />
    );
  }
  if (!data?.length) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-lg border border-slate-200 text-slate-500">
        No topic data
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.count, 0);
  const chartData = data.slice(0, 10).map((d, i) => ({
    ...d,
    color: COLORS[i % COLORS.length],
  }));

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius="50%"
            outerRadius="80%"
            paddingAngle={2}
            dataKey="count"
            nameKey="topic"
          >
            {chartData.map((entry, index) => (
              <Cell key={entry.topic} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(
              value: number,
              name: string,
              props: { payload: { count: number } },
            ) => {
              const pct = total
                ? ((props.payload.count / total) * 100).toFixed(1)
                : "0";
              return [`${value} (${pct}%)`, name];
            }}
          />
          <Legend layout="vertical" align="right" />
        </PieChart>
      </ResponsiveContainer>
      <p className="text-center text-sm text-slate-500">
        Total: {total} articles
      </p>
    </div>
  );
}
