"use client";

import { useState } from "react";
import {
  useSentimentTrend,
  useTopicDistribution,
  useSourceVolume,
  useSeverityDistribution,
  useEntityCooccurrence,
  useKeywordTrending,
} from "@/hooks/useAnalytics";
import { SentimentTrendChart } from "@/components/charts/SentimentTrendChart";
import { TopicDistributionChart } from "@/components/charts/TopicDistributionChart";
import { SourceVolumeChart } from "@/components/charts/SourceVolumeChart";
import { SeverityDonut } from "@/components/charts/SeverityDonut";
import { EntityCooccurrenceGraph } from "@/components/charts/EntityCooccurrenceGraph";
import { KeywordWordCloud } from "@/components/charts/KeywordWordCloud";
import type { AnalyticsPeriod } from "@/types";

const PERIODS: { value: AnalyticsPeriod; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>("all");

  const { data: sentimentData, isLoading: sentimentLoading } =
    useSentimentTrend(period);
  const { data: topicData, isLoading: topicLoading } =
    useTopicDistribution(period);
  const { data: sourceData, isLoading: sourceLoading } =
    useSourceVolume(period);
  const { data: severityData, isLoading: severityLoading } =
    useSeverityDistribution(period);
  const { data: entityData, isLoading: entityLoading } =
    useEntityCooccurrence(period);
  const { data: keywordTrending } = useKeywordTrending(period);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">
          Analytics & Insights
        </h1>
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPeriod(p.value)}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                period === p.value
                  ? "bg-slate-900 text-white"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:col-span-3">
          <h2 className="text-lg font-semibold text-slate-900">
            Sentiment trend
          </h2>
          <p className="text-sm text-slate-500">
            Article count by sentiment over time
          </p>
          <div className="mt-4">
            <SentimentTrendChart
              data={sentimentData ?? []}
              period={period}
              onPeriodChange={setPeriod}
              isLoading={sentimentLoading}
            />
          </div>
        </div>
        <div className="lg:col-span-2">
          <TopicDistributionChart
            data={topicData ?? []}
            isLoading={topicLoading}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900">
            Severity distribution
          </h2>
          <p className="text-sm text-slate-500">Articles by severity</p>
          <div className="mt-4">
            <SeverityDonut
              data={severityData ?? {}}
              isLoading={severityLoading}
            />
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm  lg:col-span-3">
          <h2 className="text-lg font-semibold text-slate-900">
            Source volume
          </h2>
          <p className="text-sm text-slate-500">
            Top 15 sources by article count
          </p>
          <div className="mt-4">
            <SourceVolumeChart
              data={sourceData ?? []}
              isLoading={sourceLoading}
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Entity co-occurrence
        </h2>
        <p className="text-sm text-slate-500">
          Politicians, districts, and schemes in the same articles
        </p>
        <div className="mt-4">
          <EntityCooccurrenceGraph
            data={entityData}
            isLoading={entityLoading}
            onNodeClick={(id) => {
              window.location.href = `/feed?entity=${encodeURIComponent(id)}`;
            }}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Top keywords this period
          </h2>
          <p className="text-sm text-slate-500">
            Size indicates frequency in this period
          </p>
          <div className="mt-4">
            {keywordTrending?.length ? (
              <KeywordWordCloud
                words={keywordTrending.map((k) => ({
                  text: k.keyword,
                  value: k.count,
                }))}
              />
            ) : (
              <p className="text-sm text-slate-500">No keyword data</p>
            )}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Trending topics
          </h2>
          <p className="text-sm text-slate-500">Topics with notable activity</p>
          <div className="mt-4">
            {topicData?.length ? (
              <ul className="space-y-2">
                {topicData.slice(0, 5).map((t) => (
                  <li
                    key={t.topic}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>{t.topic}</span>
                    <span className="text-slate-500">{t.count} articles</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No topic data</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
