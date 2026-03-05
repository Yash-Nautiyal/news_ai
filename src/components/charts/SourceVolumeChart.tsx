"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { SourceVolumeItem, SourceType } from "@/types";

const TYPE_COLOR: Record<SourceType, string> = {
  tv: "#8b5cf6",
  print: "#3b82f6",
  online: "#14b8a6",
  youtube: "#ef4444",
  upload: "#94a3b8",
};

export function SourceVolumeChart({
  data,
  isLoading,
}: {
  data: SourceVolumeItem[];
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="h-[400px] w-full animate-pulse rounded-lg bg-slate-200" />
    );
  }
  if (!data?.length) {
    return (
      <div className="flex h-[400px] items-center justify-center rounded-lg border border-slate-200 text-slate-500">
        No source volume data
      </div>
    );
  }

  const chartData = data.slice(0, 15).map((d) => ({
    ...d,
    name:
      d.source_name.length > 20
        ? d.source_name.slice(0, 20) + "…"
        : d.source_name,
    fill: TYPE_COLOR[d.source_type] ?? "#94a3b8",
  }));

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis type="number" tick={{ fontSize: 12 }} />
          <YAxis
            type="category"
            dataKey="name"
            width={95}
            tick={{ fontSize: 11 }}
          />
          <Tooltip formatter={(value: number) => [value, "Articles"]} />
          <Bar dataKey="count" name="Articles" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={entry.source_name} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
