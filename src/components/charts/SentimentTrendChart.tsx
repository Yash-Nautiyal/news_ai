"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { SentimentTrendPoint } from "@/types";

const COLORS = {
  positive: "#22c55e",
  negative: "#ef4444",
  neutral: "#94a3b8",
};

export function SentimentTrendChart({
  data,
  period,
  onPeriodChange,
  isLoading,
}: {
  data: SentimentTrendPoint[];
  period: "24h" | "7d" | "30d";
  onPeriodChange: (p: "24h" | "7d" | "30d") => void;
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
        No sentiment data for this period
      </div>
    );
  }

  const formatX = (ts: string) => {
    const d = new Date(ts);
    if (period === "24h")
      return d.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  };

  const chartData = data.map((d) => ({
    ...d,
    time: formatX(d.timestamp),
  }));

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {(["24h", "7d", "30d"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPeriodChange(p)}
            className={`rounded px-3 py-1 text-sm font-medium ${
              period === p
                ? "bg-slate-900 text-white"
                : "bg-slate-200 text-slate-700"
            }`}
          >
            {p === "24h" ? "24h" : p === "7d" ? "7d" : "30d"}
          </button>
        ))}
      </div>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="time" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value: number) => [value, ""]}
              labelFormatter={(_, payload) =>
                payload?.[0]?.payload?.timestamp ?? ""
              }
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="positive"
              stroke={COLORS.positive}
              name="Positive"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="negative"
              stroke={COLORS.negative}
              name="Negative"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="neutral"
              stroke={COLORS.neutral}
              name="Neutral"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
