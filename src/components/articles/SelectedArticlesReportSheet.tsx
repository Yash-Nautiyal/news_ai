"use client";

import { useState } from "react";
import type { Article } from "@/types";
import { format } from "date-fns";
import { useGenerateReportFromSelection } from "@/hooks/useReports";

export function SelectedArticlesReportSheet({
  articles,
  onClose,
}: {
  articles: Article[];
  onClose: () => void;
}) {
  const [generatedReport, setGeneratedReport] = useState<{
    filename: string;
    saveError?: string;
  } | null>(null);

  const generateReport = useGenerateReportFromSelection();

  const handleGenerate = () => {
    const ids = articles.map((a) => a.id);
    generateReport.mutate(ids, {
      onSuccess: (data) => {
        setGeneratedReport({
          filename: data.filename,
          ...(data.saveError && { saveError: data.saveError }),
        });
      },
    });
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
          {generatedReport ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-green-700">
                PDF report generated and downloaded.
              </p>
              {generatedReport.saveError && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <p className="font-medium">Could not save to database</p>
                  <p className="mt-1 text-amber-700">
                    {generatedReport.saveError}
                  </p>
                  <p className="mt-2 text-xs">
                    Report was still downloaded. Check console for details.
                  </p>
                </div>
              )}
              <p className="text-sm text-slate-600">
                File:{" "}
                <span className="font-mono text-slate-800">
                  {generatedReport.filename}
                </span>
              </p>
              <p className="text-xs text-slate-500">
                Check your downloads folder. You can generate another report or
                close this panel.{" "}
                {!generatedReport.saveError &&
                  "Report is also saved under Reports → Selected."}
              </p>
            </div>
          ) : (
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
                  {(a.districts_mentioned?.length ||
                    (a.persons_named ?? a.politicians_mentioned)?.length ||
                    a.topics?.length) && (
                    <p className="mt-2 text-xs text-slate-500">
                      {a.districts_mentioned?.length
                        ? `Districts: ${a.districts_mentioned.join(", ")}`
                        : ""}
                      {a.districts_mentioned?.length &&
                      ((a.persons_named ?? a.politicians_mentioned)?.length ||
                        a.topics?.length)
                        ? " · "
                        : ""}
                      {(a.persons_named ?? a.politicians_mentioned)?.length
                        ? `Persons: ${(a.persons_named ?? a.politicians_mentioned ?? []).join(", ")}`
                        : ""}
                      {(a.persons_named ?? a.politicians_mentioned)?.length &&
                      a.topics?.length
                        ? " · "
                        : ""}
                      {a.topics?.length ? `Topics: ${a.topics.join(", ")}` : ""}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 border-t border-slate-200 p-4">
          {!generatedReport ? (
            <>
              <p className="text-xs text-slate-500">
                AI summaries will be generated for each story if needed, then
                the PDF report will be created and downloaded.
              </p>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generateReport.isPending}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {generateReport.isPending
                  ? "Generating AI summaries & report…"
                  : "Generate report"}
              </button>
              {generateReport.isError && (
                <p className="text-sm text-red-600">
                  {generateReport.error?.message ?? "Generation failed"}
                </p>
              )}
            </>
          ) : null}
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
