"use client";

import { useState } from "react";
import { useAlerts } from "@/hooks/useAlerts";
import { useSession } from "next-auth/react";
import { format } from "date-fns";

const SEVERITY_CLASS: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800",
  HIGH: "bg-orange-100 text-orange-800",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  LOW: "bg-slate-100 text-slate-700",
};

export default function AlertsPage() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role ?? "VIEWER";
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAlerts({ page, size: 20 });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pages = Math.ceil(total / 20) || 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Alert History</h1>
        {role === "ADMIN" && (
          <p className="text-xs text-slate-500">
            Alerts are created automatically when WhatsApp alerts are sent.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">CRITICAL alerts today</p>
          <p className="text-2xl font-bold text-red-800">
            {items.filter((a) => a.severity === "CRITICAL").length}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">HIGH alerts today</p>
          <p className="text-2xl font-bold text-orange-600">
            {items.filter((a) => a.severity === "HIGH").length}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Total sent</p>
          <p className="text-2xl font-bold text-slate-900">{total}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded bg-slate-200"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <p>
              No alerts sent yet. Alerts will appear here when critical content
              is detected.
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-sm text-slate-600">
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Delivery</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((alert) => (
                <tr key={alert.id} className="border-b">
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {format(new Date(alert.sent_at), "dd MMM yyyy, HH:mm")}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        SEVERITY_CLASS[alert.severity]
                      }`}
                    >
                      {alert.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {alert.article?.source_name ?? "—"}
                  </td>
                  <td className="hindi-text max-w-[200px] truncate px-4 py-3 text-sm">
                    {alert.article?.title ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {alert.channels?.includes("whatsapp") && (
                      <span className="text-green-600">WhatsApp ✓</span>
                    )}
                    {alert.channels?.includes("email") && (
                      <span className="ml-2 text-blue-600">Email ✓</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {alert.article_id && (
                      <a
                        href={`/feed?article=${alert.article_id}`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        View article
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {pages > 1 && (
          <div className="flex justify-between border-t px-4 py-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded border px-3 py-1 text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-slate-600">
              Page {page} of {pages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page >= pages}
              className="rounded border px-3 py-1 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
