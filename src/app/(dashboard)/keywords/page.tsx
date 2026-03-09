"use client";

import { useState } from "react";
import { useKeywords, useCreateKeyword, useUpdateKeyword } from "@/hooks/useKeywords";
import { useSession } from "next-auth/react";
import { KEYWORD_CATEGORY_LABELS } from "@/lib/constants";
import type { KeywordCategory, Keyword } from "@/types";

export default function KeywordsPage() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role ?? "VIEWER";
  const [category, setCategory] = useState<KeywordCategory | "">("");
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "">("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data: keywords, isLoading } = useKeywords(
    category || undefined,
    statusFilter || undefined,
  );

  const filtered = (keywords ?? []).filter(
    (k) =>
      !search ||
      k.term.toLowerCase().includes(search.toLowerCase()) ||
      (k.term_hindi && k.term_hindi.includes(search)),
  );
  const activeCount = (keywords ?? []).filter(
    (k) => k.is_active && k.status === "active",
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Keyword Management
          </h1>
          <p className="text-slate-600">
            {activeCount} active keywords monitoring UP media
          </p>
        </div>
        {(role === "ADMIN" || role === "ANALYST") && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Add keyword
          </button>
        )}
      </div>

      {/* No pending approval concept anymore; status is derived from is_active */}

      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as KeywordCategory | "")}
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All categories</option>
          {(
            [
              "governance",
              "law_order",
              "districts",
              "officials",
              "schemes",
            ] as const
          ).map((c) => (
            <option key={c} value={c}>
              {KEYWORD_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as "active" | "inactive" | "")
          }
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
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
                <th className="px-4 py-3">Term</th>
                <th className="px-4 py-3">Hindi</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Variants</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                {(role === "ADMIN" || role === "ANALYST") && (
                  <th className="px-4 py-3">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((k) => (
                <tr key={k.id} className="border-b">
                  <td className="px-4 py-3 font-medium">{k.term}</td>
                  <td className="hindi-text px-4 py-3">
                    {k.term_hindi ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">
                      {KEYWORD_CATEGORY_LABELS[k.category]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                {k.category === "districts"
                  ? k.variants[0] ?? "—"
                  : (k.variants?.length ?? 0) > 0
                    ? k.variants.join(", ")
                    : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        k.status === "active"
                          ? "bg-green-100 text-green-800"
                      : "bg-slate-100 text-slate-700"
                      }`}
                    >
                  {k.status === "active" ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                {k.created_at
                  ? new Date(k.created_at).toLocaleDateString()
                  : "—"}
                  </td>
                  {(role === "ADMIN" || role === "ANALYST") && (
                    <td className="px-4 py-3">
                  <StatusToggleButton
                    keyword={k}
                    disabled={!(role === "ADMIN" || role === "ANALYST")}
                  />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <KeywordFormDialog
          onClose={() => setShowForm(false)}
          isAdmin={role === "ADMIN"}
        />
      )}
    </div>
  );
}
function StatusToggleButton({
  keyword,
  disabled,
}: {
  keyword: Keyword;
  disabled: boolean;
}) {
  const update = useUpdateKeyword();
  const isUpdating = update.isPending;
  const nextActive = !keyword.is_active;
  const label = nextActive ? "Activate" : "Deactivate";

  return (
    <button
      type="button"
      disabled={disabled || isUpdating}
      onClick={() =>
        update.mutate({
          id: keyword.id,
          is_active: nextActive,
          source_table: keyword.source_table,
        })
      }
      className={`rounded px-2 py-0.5 text-xs ${
        nextActive
          ? "bg-green-50 text-green-800 hover:bg-green-100"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      } disabled:opacity-50`}
    >
      {label}
    </button>
  );
}

function KeywordFormDialog({
  onClose,
  isAdmin,
}: {
  onClose: () => void;
  isAdmin: boolean;
}) {
  const [term, setTerm] = useState("");
  const [termHindi, setTermHindi] = useState("");
  const [category, setCategory] = useState<KeywordCategory>("governance");
  const [entityCategory, setEntityCategory] = useState<string>("minister");
  const [incidentGroup, setIncidentGroup] = useState<string>("crime");
  const [variants, setVariants] = useState("");
  const create = useCreateKeyword();

  const handleSubmit = () => {
    const variantList = variants
      .split("\n")
      .map((v) => v.trim())
      .filter(Boolean);
    const payload = {
      term,
      term_hindi: termHindi || null,
      category,
      variants: variantList,
      entity_category:
        category === "law_order" || category === "districts"
          ? undefined
          : entityCategory,
      incident_group_name: category === "law_order" ? incidentGroup : undefined,
    };
    create.mutate(payload, { onSuccess: onClose });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6">
        <h2 className="text-lg font-bold">Add keyword</h2>
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-sm text-slate-600">
              English term *
            </label>
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600">Hindi term</label>
            <input
              value={termHindi}
              onChange={(e) => setTermHindi(e.target.value)}
              className="hindi-text mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as KeywordCategory)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            >
              {(
                [
                  "governance",
                  "law_order",
                  "districts",
                  "officials",
                  "schemes",
                ] as const
              ).map((c) => (
                <option key={c} value={c}>
                  {KEYWORD_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          {category !== "law_order" && category !== "districts" && (
            <div>
              <label className="block text-sm text-slate-600">
                Entity category (entities table)
              </label>
              <select
                value={entityCategory}
                onChange={(e) => setEntityCategory(e.target.value)}
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
              >
                <option value="minister">Minister</option>
                <option value="official">Official</option>
                <option value="department">Department</option>
                <option value="scheme">Scheme</option>
                <option value="organisation">Organisation</option>
              </select>
            </div>
          )}
          {category === "law_order" && (
            <div>
              <label className="block text-sm text-slate-600">
                Law &amp; order group
              </label>
              <select
                value={incidentGroup}
                onChange={(e) => setIncidentGroup(e.target.value)}
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
              >
                <option value="crime">Crime</option>
                <option value="communal">Communal</option>
                <option value="protest">Protest</option>
                <option value="disaster">Disaster</option>
                <option value="security">Security</option>
                <option value="misinformation">Misinformation</option>
                <option value="other">Other</option>
              </select>
            </div>
          )}
          {category === "districts" && (
            <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Districts are read-only static geo data (geo_districts). New districts
              must be added via the admin database, not from this screen.
            </p>
          )}
          <div>
            <label className="block text-sm text-slate-600">
              Variants (one per line)
            </label>
            <textarea
              value={variants}
              onChange={(e) => setVariants(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              placeholder="e.g. yogi\nyogi ji"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-300 px-4 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!term.trim() || create.isPending}
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            Add keyword
          </button>
        </div>
      </div>
    </div>
  );
}
