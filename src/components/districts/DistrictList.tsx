"use client";

import type { DistrictRisk } from "@/types";
import { cn } from "@/lib/utils";

const SEVERITY_CLASS: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800",
  HIGH: "bg-orange-100 text-orange-800",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  LOW: "bg-slate-100 text-slate-700",
};

function riskToSeverity(score: number): string {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
}

export function DistrictList({
  districts,
  selectedDistrict,
  onSelect,
  search,
}: {
  districts: DistrictRisk[];
  selectedDistrict: string | null;
  onSelect: (name: string) => void;
  search: string;
}) {
  const filtered = districts.filter(
    (d) =>
      d.district.toLowerCase().includes(search.toLowerCase()) ||
      (d.district_hindi && d.district_hindi.includes(search)),
  );

  return (
    <ul className="space-y-1">
      {filtered.map((d, i) => {
        const severity = riskToSeverity(d.risk_score);
        return (
          <li key={d.district}>
            <button
              type="button"
              onClick={() => onSelect(d.district)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm",
                selectedDistrict === d.district
                  ? "bg-slate-200 font-medium"
                  : "hover:bg-slate-100",
              )}
            >
              <span className="flex items-center gap-2">
                <span className="text-slate-400">{i + 1}</span>
                <span>{d.district}</span>
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-xs font-medium",
                    SEVERITY_CLASS[severity],
                  )}
                >
                  {severity}
                </span>
              </span>
              <span className="text-slate-500">{d.article_count}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
