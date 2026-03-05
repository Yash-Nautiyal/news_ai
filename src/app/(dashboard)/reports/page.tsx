"use client";

import { useState } from "react";
import { useReports, useGenerateReport } from "@/hooks/useReports";
import { useSession } from "next-auth/react";
import { format } from "date-fns";

export default function ReportsPage() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role ?? "VIEWER";
  const canGenerate = role === "ADMIN" || role === "ANALYST";
  const [tab, setTab] = useState<"daily" | "weekly" | "monthly">("daily");
  const { data: reports, isLoading } = useReports(tab);
  const generateReport = useGenerateReport();
  const [showGenerate, setShowGenerate] = useState(false);
  const [generateType, setGenerateType] = useState<
    "daily" | "weekly" | "monthly"
  >("daily");
  const [generateDate, setGenerateDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );

  const handleGenerate = () => {
    generateReport.mutate(
      { report_type: generateType, report_date: generateDate },
      {
        onSuccess: () => {
          setShowGenerate(false);
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        {canGenerate && (
          <button
            type="button"
            onClick={() => setShowGenerate(true)}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Generate report
          </button>
        )}
      </div>

      {canGenerate && showGenerate && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="font-semibold text-slate-900">Generate on-demand</h2>
          <div className="mt-4 flex flex-wrap gap-4">
            <div>
              <label className="block text-sm text-slate-600">Type</label>
              <select
                value={generateType}
                onChange={(e) =>
                  setGenerateType(
                    e.target.value as "daily" | "weekly" | "monthly",
                  )
                }
                className="mt-1 rounded border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600">Date</label>
              <input
                type="date"
                value={generateDate}
                onChange={(e) => setGenerateDate(e.target.value)}
                className="mt-1 rounded border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generateReport.isPending}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {generateReport.isPending ? "Generating…" : "Generate"}
              </button>
              <button
                type="button"
                onClick={() => setShowGenerate(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {(["daily", "weekly", "monthly"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              tab === t
                ? "bg-slate-900 text-white"
                : "bg-slate-200 text-slate-700"
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-lg bg-slate-200"
            />
          ))}
        </div>
      ) : !reports?.length ? (
        <div className="rounded-lg border border-slate-200 bg-white py-16 text-center text-slate-500">
          No {tab} reports generated yet
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map((r) => (
            <div
              key={r.id}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="font-medium text-slate-900">
                {format(new Date(r.report_date), "EEEE, d MMMM yyyy")}
              </p>
              <span className="mt-1 inline-block rounded bg-slate-100 px-2 py-0.5 text-xs">
                {r.report_type}
              </span>
              <p className="mt-2 line-clamp-3 text-sm text-slate-600">
                {r.summary_text}
              </p>
              <div className="mt-3 flex gap-2">
                <a
                  href={r.download_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  Download PDF
                </a>
                <a
                  href={r.download_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-slate-500 hover:underline"
                >
                  View in browser
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
