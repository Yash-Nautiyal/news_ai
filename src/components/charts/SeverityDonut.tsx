"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { Severity } from "@/types";

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "#dc2626",
  HIGH: "#ea580c",
  MEDIUM: "#eab308",
  LOW: "#64748b",
};

export function SeverityDonut({
  data,
  isLoading,
}: {
  data: Record<string, number>;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="h-[300px] w-full animate-pulse rounded-lg bg-slate-200" />
    );
  }

  const chartData = (["CRITICAL", "HIGH", "MEDIUM", "LOW"] as Severity[])
    .map((key) => ({
      name: key,
      value: data?.[key] ?? 0,
      fill: SEVERITY_COLORS[key] ?? "#94a3b8",
    }))
    .filter((d) => d.value > 0);

  if (!chartData.length) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-lg border border-slate-200 text-slate-500">
        No severity data
      </div>
    );
  }

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
            dataKey="value"
            nameKey="name"
          >
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
