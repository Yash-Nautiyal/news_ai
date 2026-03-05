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

export function DistrictDetailSheet({
  district,
  onClose,
  onViewArticles,
}: {
  district: DistrictRisk | null;
  onClose: () => void;
  onViewArticles?: (district: string) => void;
}) {
  if (!district) return null;

  const severity = riskToSeverity(district.risk_score);

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[600px] flex-col border-l border-slate-200 bg-white shadow-xl">
      <div className="flex h-16 shrink-0 items-center justify-between border-b px-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {district.district}
          </h2>
          {district.district_hindi && (
            <p className="hindi-text text-sm text-slate-500">
              {district.district_hindi}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              SEVERITY_CLASS[severity],
            )}
          >
            {severity}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <section>
          <h3 className="text-sm font-medium text-slate-600">Article stats</h3>
          <p className="mt-1 text-sm text-slate-700">
            Today: {district.article_count} articles ({district.critical_count}{" "}
            critical, {district.high_count} high)
          </p>
        </section>
        <section className="mt-4">
          <h3 className="text-sm font-medium text-slate-600">
            Dominant sentiment
          </h3>
          <p className="mt-1 text-sm text-slate-700">
            {district.dominant_sentiment}
          </p>
        </section>
        {district.top_topics?.length ? (
          <section className="mt-4">
            <h3 className="text-sm font-medium text-slate-600">Top topics</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {district.top_topics.map((t) => (
                <span
                  key={t}
                  className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800"
                >
                  {t}
                </span>
              ))}
            </div>
          </section>
        ) : null}
        {district.latest_headline && (
          <section className="mt-4">
            <h3 className="text-sm font-medium text-slate-600">
              Latest headline
            </h3>
            <p className="mt-1 text-sm text-slate-700">
              {district.latest_headline}
            </p>
          </section>
        )}
      </div>
      <div className="shrink-0 border-t p-4">
        <button
          type="button"
          onClick={() => onViewArticles?.(district.district)}
          className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          View all articles from {district.district}
        </button>
      </div>
    </div>
  );
}
