"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { UP_DISTRICTS, SOURCE_TYPE_LABELS } from "@/lib/constants";
import type {
  ArticleFilters as AF,
  SourceType,
  Severity,
  Sentiment,
} from "@/types";

const SOURCE_TYPES: (SourceType | "")[] = [
  "",
  "tv",
  "print",
  "online",
  "youtube",
  "upload",
];
const SEVERITIES: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
const SENTIMENTS: (Sentiment | "")[] = ["", "positive", "negative", "neutral"];

function toYYYYMMDD(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function ArticleFilters({
  onFiltersChange,
}: {
  onFiltersChange: (f: AF) => void;
}) {
  const searchParams = useSearchParams();
  const today = toYYYYMMDD(new Date());

  const [dateFrom, setDateFrom] = useState(
    searchParams.get("date_from") ?? today,
  );
  const [dateTo, setDateTo] = useState(searchParams.get("date_to") ?? today);
  const [sourceType, setSourceType] = useState<AF["source_type"]>(
    (searchParams.get("source_type") as AF["source_type"]) ?? "",
  );
  const [severityChips, setSeverityChips] = useState<Set<Severity>>(() => {
    const s = searchParams.get("severity");
    if (!s) return new Set();
    return new Set(
      s
        .split(",")
        .filter((x): x is Severity => SEVERITIES.includes(x as Severity)),
    );
  });
  const [district, setDistrict] = useState(searchParams.get("district") ?? "");
  const [sentiment, setSentiment] = useState<AF["sentiment"]>(
    (searchParams.get("sentiment") as AF["sentiment"]) ?? "",
  );
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [searchDebounced, setSearchDebounced] = useState(search);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const buildFilters = useCallback((): AF => {
    return {
      page: 1,
      size: 25,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      source_type: sourceType || undefined,
      severity: severityChips.size ? Array.from(severityChips)[0] : undefined,
      district: district || undefined,
      sentiment: sentiment || undefined,
      search: searchDebounced || undefined,
    };
  }, [
    dateFrom,
    dateTo,
    sourceType,
    severityChips,
    district,
    sentiment,
    searchDebounced,
  ]);

  useEffect(() => {
    onFiltersChange(buildFilters());
  }, [buildFilters, onFiltersChange]);

  const hasActive =
    dateFrom !== today ||
    dateTo !== today ||
    !!sourceType ||
    severityChips.size > 0 ||
    !!district ||
    !!sentiment ||
    !!search;

  const clearFilters = () => {
    setDateFrom(today);
    setDateTo(today);
    setSourceType("");
    setSeverityChips(new Set());
    setDistrict("");
    setSentiment("");
    setSearch("");
    setSearchDebounced("");
  };

  const toggleSeverity = (s: Severity) => {
    setSeverityChips((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
        <select
          value={sourceType}
          onChange={(e) => setSourceType(e.target.value as AF["source_type"])}
          className="rounded border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="">All sources</option>
          {SOURCE_TYPES.filter(Boolean).map((st) => (
            <option key={st} value={st}>
              {SOURCE_TYPE_LABELS[st]}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-1">
          {SEVERITIES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleSeverity(s)}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                severityChips.has(s)
                  ? "bg-slate-800 text-white"
                  : "bg-slate-200 text-slate-700 hover:bg-slate-300"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <select
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          className="max-w-[180px] rounded border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="">All districts</option>
          {UP_DISTRICTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          value={sentiment}
          onChange={(e) => setSentiment(e.target.value as AF["sentiment"])}
          className="rounded border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="">All sentiment</option>
          {SENTIMENTS.filter(Boolean).map((s) => (
            <option key={s} value={s}>
              {s === "positive"
                ? "Positive"
                : s === "negative"
                  ? "Negative"
                  : "Neutral"}
            </option>
          ))}
        </select>
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400">
            🔍
          </span>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48 rounded border border-slate-300 py-1.5 pl-7 pr-2 text-sm"
          />
        </div>
        {hasActive && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
