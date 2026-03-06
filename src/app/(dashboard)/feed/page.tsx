"use client";

import { Suspense, useMemo, useState, useCallback } from "react";
import { useArticles } from "@/hooks/useArticles";
import {
  useSentimentTrend,
  useSeverityDistribution,
} from "@/hooks/useAnalytics";
import { useDistrictRisk } from "@/hooks/useDistricts";
import { useSources } from "@/hooks/useSources";
import { ArticleFilters } from "@/components/articles/ArticleFilters";
import { ArticleTable } from "@/components/articles/ArticleTable";
import { ArticleDetailSheet } from "@/components/articles/ArticleDetailSheet";
import { SelectedArticlesReportSheet } from "@/components/articles/SelectedArticlesReportSheet";
import type { Article, ArticleFilters as AF } from "@/types";

function toYYYYMMDD(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function FeedPage() {
  const today = toYYYYMMDD(new Date());
  const [filters, setFilters] = useState<AF>({
    page: 1,
    size: 25,
    date_from: today,
    date_to: today,
  });
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(
    null,
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedArticlesMap, setSelectedArticlesMap] = useState<
    Map<string, Article>
  >(new Map());
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data, isLoading, dataUpdatedAt } = useArticles(filters, {
    refetchInterval: autoRefresh ? 30_000 : undefined,
  });

  const { data: severityData } = useSeverityDistribution("24h");
  const { data: districtRisk } = useDistrictRisk();
  const { data: sources } = useSources();

  const stats = useMemo(() => {
    const todayTotal = data?.total ?? 0;
    const critical = severityData?.CRITICAL ?? 0;
    const districtsActive = districtRisk?.length ?? 0;
    const sourcesOnline = sources?.filter((s) => s.is_active).length ?? 0;
    return {
      todayArticles: todayTotal,
      criticalAlerts: critical,
      districtsActive,
      sourcesOnline,
    };
  }, [data?.total, severityData, districtRisk, sources]);

  const handleFiltersChange = useCallback((f: AF) => {
    setFilters((prev) => ({ ...prev, ...f, page: 1 }));
  }, []);

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
      })
    : "—";

  const selectedArticles = useMemo(
    () => Array.from(selectedArticlesMap.values()),
    [selectedArticlesMap],
  );

  const handleSelectionChange = useCallback(
    (ids: Set<string>) => {
      setSelectedIds(ids);
      const items = data?.items ?? [];
      setSelectedArticlesMap((prev) => {
        const next = new Map(prev);
        prev.forEach((_, id) => {
          if (!ids.has(id)) next.delete(id);
        });
        items.forEach((a) => {
          if (ids.has(a.id)) next.set(a.id, a);
        });
        return next;
      });
    },
    [data?.items],
  );

  const openReportSheet = () => {
    if (selectedIds.size > 0) setShowReportSheet(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold ">Live Media Feed</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Today&apos;s Articles</p>
          <p className="text-2xl font-bold text-slate-900">
            {stats.todayArticles}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Critical Alerts</p>
          <p className="text-2xl font-bold text-red-600">
            {stats.criticalAlerts}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Districts Active</p>
          <p className="text-2xl font-bold text-slate-900">
            {stats.districtsActive}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Sources Online</p>
          <p className="text-2xl font-bold text-slate-900">
            {stats.sourcesOnline}
          </p>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="text-sm text-slate-500">Loading filters...</div>
        }
      >
        <ArticleFilters onFiltersChange={handleFiltersChange} />
      </Suspense>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Last updated: {lastUpdated}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openReportSheet}
            disabled={selectedIds.size === 0}
            title={
              selectedIds.size === 0
                ? "Select one or more articles to create a report"
                : `Create report for ${selectedIds.size} selected`
            }
            className="flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white"
          >
            <span className="text-base leading-none">+</span>
            Report
            {selectedIds.size > 0 && (
              <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-xs">
                {selectedIds.size}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setAutoRefresh((v) => !v)}
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              autoRefresh
                ? "bg-green-100 text-green-800"
                : "bg-slate-200 text-slate-600"
            }`}
          >
            Auto-refresh: {autoRefresh ? "ON" : "OFF"}
          </button>
        </div>
      </div>

      <ArticleTable
        articles={data?.items ?? []}
        isLoading={isLoading}
        total={data?.total ?? 0}
        page={filters.page ?? 1}
        size={filters.size ?? 25}
        onPageChange={(p) => setFilters((prev) => ({ ...prev, page: p }))}
        onSizeChange={(s) =>
          setFilters((prev) => ({ ...prev, size: s, page: 1 }))
        }
        onArticleSelect={(a: Article) => setSelectedArticleId(a.id)}
        onArticlePlay={(a: Article) => setSelectedArticleId(a.id)}
        selectedIds={selectedIds}
        onSelectionChange={handleSelectionChange}
      />

      {showReportSheet && (
        <SelectedArticlesReportSheet
          articles={selectedArticles}
          onClose={() => setShowReportSheet(false)}
        />
      )}

      <ArticleDetailSheet
        articleId={selectedArticleId}
        onClose={() => setSelectedArticleId(null)}
        onViewSimilar={(id) => setSelectedArticleId(id)}
      />
    </div>
  );
}
