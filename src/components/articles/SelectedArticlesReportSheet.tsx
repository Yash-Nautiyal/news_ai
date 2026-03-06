"use client";

import { useMemo } from "react";
import type { Article } from "@/types";
import { format } from "date-fns";

export function SelectedArticlesReportSheet({
  articles,
  onClose,
}: {
  articles: Article[];
  onClose: () => void;
}) {
  const reportText = useMemo(() => {
    const lines: string[] = [
      "DIPR UP Media Monitor – Selected Articles Report",
      `Generated: ${format(new Date(), "dd MMM yyyy, HH:mm")} IST`,
      `Total articles: ${articles.length}`,
      "",
      "---",
      "",
    ];
    articles.forEach((a, i) => {
      lines.push(`${i + 1}. ${a.title || "No title"}`);
      lines.push(
        `   Source: ${a.source_name} | ${format(new Date(a.published_at), "dd MMM yyyy, HH:mm")}`,
      );
      lines.push(
        `   Sentiment: ${a.sentiment} (${a.sentiment_score}%)${a.severity ? ` | Severity: ${a.severity}` : ""}`,
      );
      lines.push(`   Summary: ${a.summary_english}`);
      if (a.districts_mentioned?.length) {
        lines.push(`   Districts: ${a.districts_mentioned.join(", ")}`);
      }
      if (a.topics?.length) {
        lines.push(`   Topics: ${a.topics.join(", ")}`);
      }
      lines.push("");
    });
    return lines.join("\n");
  }, [articles]);

  const handleCopy = () => {
    void navigator.clipboard.writeText(reportText);
  };

  if (articles.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-lg font-semibold text-slate-900">
            Report: {articles.length} selected article
            {articles.length !== 1 ? "s" : ""}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {articles.map((a, i) => (
              <div
                key={a.id}
                className="rounded-lg border border-slate-200 bg-slate-50/50 p-3"
              >
                <p className="font-medium text-slate-900 hindi-text">
                  {i + 1}. {a.title || "No title"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {a.source_name} ·{" "}
                  {format(new Date(a.published_at), "dd MMM yyyy, HH:mm")}
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {a.sentiment} ({a.sentiment_score}%)
                  {a.severity && (
                    <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-xs">
                      {a.severity}
                    </span>
                  )}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {a.summary_english}
                </p>
                {(a.districts_mentioned?.length || a.topics?.length) && (
                  <p className="mt-2 text-xs text-slate-500">
                    {a.districts_mentioned?.length
                      ? `Districts: ${a.districts_mentioned.join(", ")}`
                      : ""}
                    {a.districts_mentioned?.length && a.topics?.length
                      ? " · "
                      : ""}
                    {a.topics?.length ? `Topics: ${a.topics.join(", ")}` : ""}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 gap-2 border-t border-slate-200 p-4">
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Copy report text
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
