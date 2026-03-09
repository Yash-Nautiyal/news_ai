"use client";

import { useEffect, useState } from "react";
import type { DistrictRisk } from "@/types";
import { cn } from "@/lib/utils";
import { useConstituencies } from "@/hooks/useConstituencies";

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

const LUCKNOW_CENTRAL_NAME = "Lucknow Central";
const LUCKNOW_CENTRAL_BOOTHS = Array.from({ length: 10 }, (_, index) => index + 1);
const LUCKNOW_CENTRAL_BOOTH_1_ARTICLES = [
  {
    title:
      "Lucknow Civic Budget 2026-27 Approved: Rs 4,692 Crore Plan Prioritises Cleanliness Over Roads",
    url: "https://www.oneindia.com/lucknow/lucknow-civic-budget-2026-27-approved-4-692-crore-plan-prioritises-cleanliness-over-roads-8006835.html",
    source: "OneIndia",
  },
  {
    title: "Lucknow leads as UP's first zero fresh waste dump city",
    url: "https://www.newindianexpress.com/nation/2026/Jan/21/lucknow-leads-as-ups-first-zero-fresh-waste-dump-city",
    source: "The New Indian Express",
  },
  {
    title:
      "594km Ganga Expressway set to open for vehicular movement in late March",
    url: "https://timesofindia.indiatimes.com/city/lucknow/594km-ganga-expressway-set-to-open-for-vehicular-movement-in-late-march/articleshow/128394799.cms",
    source: "The Times of India",
  },
];
const LUCKNOW_ARTICLE_LINKS = [
  {
    title: "लखनऊ में स्मार्ट ट्रैफिक मॉनिटरिंग सिस्टम का विस्तार",
    url: "https://example.com/article/lucknow-smart-traffic",
    source: "Hindustan Lucknow",
  },
  {
    title: "लखनऊ सेंट्रल क्षेत्र में पेयजल लाइन सुधार कार्य शुरू",
    url: "https://example.com/article/lucknow-central-waterline",
    source: "Dainik Jagran Lucknow",
  },
  {
    title: "चारबाग से हजरतगंज तक सफाई अभियान तेज, स्थानीय नागरिकों ने सराहा",
    url: "https://example.com/article/lucknow-cleanliness-drive",
    source: "Amar Ujala Lucknow",
  },
  {
    title: "लखनऊ में प्राथमिक स्वास्थ्य केंद्रों को नई सुविधाएं मिलने की तैयारी",
    url: "https://example.com/article/lucknow-health-upgrade",
    source: "Live Hindustan",
  },
  {
    title: "लखनऊ सेंट्रल के बाजारों में सुरक्षा व्यवस्था बढ़ाई गई",
    url: "https://example.com/article/lucknow-central-security",
    source: "News18 UP",
  },
];

function pickRandomLucknowArticles(count: number) {
  return [...LUCKNOW_ARTICLE_LINKS]
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
}

function getBoothArticles(booth: number) {
  if (booth === 1) {
    return LUCKNOW_CENTRAL_BOOTH_1_ARTICLES;
  }
  return pickRandomLucknowArticles(3);
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
  const { data: constituencies, isLoading } = useConstituencies(
    district.district,
  );
  const [isLucknowCentralOpen, setIsLucknowCentralOpen] = useState(false);
  const [selectedBooth, setSelectedBooth] = useState<number | null>(null);
  const [boothArticles, setBoothArticles] = useState(LUCKNOW_ARTICLE_LINKS.slice(0, 3));

  useEffect(() => {
    setIsLucknowCentralOpen(false);
    setSelectedBooth(null);
    setBoothArticles(LUCKNOW_ARTICLE_LINKS.slice(0, 3));
  }, [district.district]);

  const isLucknowDistrict = district.district.trim().toLowerCase() === "lucknow";

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
        <section className="mt-4">
          <h3 className="text-sm font-medium text-slate-600">
            Vidhan Sabha constituencies
          </h3>
          {isLoading ? (
            <p className="mt-1 text-xs text-slate-500">
              Loading constituencies…
            </p>
          ) : !constituencies?.length ? (
            <p className="mt-1 text-sm text-slate-500">
              No active constituencies mapped for this district.
            </p>
          ) : (
            <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
              <p className="text-xs text-slate-500">
                {constituencies.length} assembly constituenc
                {constituencies.length === 1 ? "y" : "ies"} in{" "}
                <span className="font-medium text-slate-700">
                  {district.district}
                </span>
                .
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {constituencies.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      if (
                        isLucknowDistrict &&
                        c.name.trim().toLowerCase() ===
                          LUCKNOW_CENTRAL_NAME.toLowerCase()
                      ) {
                        setIsLucknowCentralOpen((prev) => !prev);
                        setSelectedBooth(null);
                        setBoothArticles(LUCKNOW_ARTICLE_LINKS.slice(0, 3));
                      }
                    }}
                    className={cn(
                      "flex flex-col justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm shadow-sm transition",
                      isLucknowDistrict &&
                        c.name.trim().toLowerCase() ===
                          LUCKNOW_CENTRAL_NAME.toLowerCase() &&
                        "hover:border-blue-300 hover:bg-blue-50/60",
                      isLucknowCentralOpen &&
                        c.name.trim().toLowerCase() ===
                          LUCKNOW_CENTRAL_NAME.toLowerCase() &&
                        "border-blue-500 bg-blue-50 ring-1 ring-blue-200",
                    )}
                  >
                    <div>
                      <p className="font-medium text-slate-900">
                        {c.constituency_no
                          ? `#${c.constituency_no} ${c.name}`
                          : c.name}
                      </p>
                      {c.ls_constituency && (
                        <p className="mt-0.5 text-xs text-slate-500">
                          Lok Sabha: {c.ls_constituency}
                        </p>
                      )}
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span>{c.division}</span>
                      <div className="flex items-center gap-2">
                        {isLucknowDistrict &&
                          c.name.trim().toLowerCase() ===
                            LUCKNOW_CENTRAL_NAME.toLowerCase() && (
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 font-semibold text-blue-800">
                              View booths
                            </span>
                          )}
                        {c.is_sc_reserved && (
                          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-purple-800">
                            SC reserved
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              {isLucknowCentralOpen && isLucknowDistrict && (
                <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50/60 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-slate-800">
                      {LUCKNOW_CENTRAL_NAME} booths
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsLucknowCentralOpen(false);
                        setSelectedBooth(null);
                      }}
                      className="rounded-md border border-blue-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Close
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {LUCKNOW_CENTRAL_BOOTHS.map((booth) => (
                      <button
                        key={booth}
                        type="button"
                        onClick={() => {
                          const isSameBooth = selectedBooth === booth;
                          setSelectedBooth(isSameBooth ? null : booth);
                          setBoothArticles(
                            isSameBooth ? LUCKNOW_ARTICLE_LINKS.slice(0, 3) : getBoothArticles(booth),
                          );
                        }}
                        className={cn(
                          "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-700",
                          selectedBooth === booth &&
                            "border-blue-500 bg-blue-100 text-blue-800",
                        )}
                      >
                        Booth {booth}
                      </button>
                    ))}
                  </div>
                  {selectedBooth && (
                    <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
                      <p className="text-sm font-medium text-slate-800">
                        Booth {selectedBooth} article links
                      </p>
                      <div className="mt-3 space-y-2">
                        {boothArticles.map((article) => (
                          <a
                            key={`${selectedBooth}-${article.url}`}
                            href={article.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block rounded-lg border border-slate-200 px-3 py-2 transition hover:border-blue-300 hover:bg-blue-50/50"
                          >
                            <p className="text-sm font-medium text-blue-700">
                              {article.title}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {article.source}
                            </p>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
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
