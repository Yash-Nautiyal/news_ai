"use client";

import { useSources } from "@/hooks/useSources";
import { useToggleSource, useScrapeSourceNow } from "@/hooks/useSources";
import { SOURCE_TYPE_LABELS } from "@/lib/constants";
import { formatDistanceToNow } from "date-fns";

export default function AdminSourcesPage() {
  const { data: sources, isLoading } = useSources();
  const toggle = useToggleSource();
  const scrape = useScrapeSourceNow();

  const activeCount = sources?.filter((s) => s.is_active).length ?? 0;
  const typeCount = new Set(sources?.map((s) => s.source_type) ?? []).size;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Source Management</h1>
        <p className="text-slate-600">
          {activeCount} active sources across {typeCount} source types
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-slate-200" />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-sm text-slate-600">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last scraped</th>
                <th className="px-4 py-3">Errors</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(sources ?? []).map((s) => (
                <tr key={s.id} className="border-b">
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3">
                    {SOURCE_TYPE_LABELS[s.source_type]}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggle.mutate(s.id)}
                      disabled={toggle.isPending}
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        s.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {s.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {s.last_scraped_at
                      ? formatDistanceToNow(new Date(s.last_scraped_at), {
                          addSuffix: true,
                        })
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {s.error_count > 0 ? (
                      <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-800">
                        {s.error_count}
                      </span>
                    ) : (
                      "0"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => scrape.mutate(s.id)}
                      disabled={scrape.isPending}
                      className="rounded bg-slate-200 px-2 py-0.5 text-xs hover:bg-slate-300"
                    >
                      Scrape now
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
