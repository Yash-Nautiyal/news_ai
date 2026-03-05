"use client";

import { ArticleRow } from "./ArticleRow";
import type { Article, ArticleFilters as AF } from "@/types";

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-200">
      <td className="py-3">
        <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
      </td>
      <td className="py-3">
        <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
      </td>
      <td className="py-3">
        <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
      </td>
      <td className="py-3">
        <div className="h-4 w-16 animate-pulse rounded bg-slate-200" />
      </td>
      <td className="py-3">
        <div className="h-6 w-16 animate-pulse rounded bg-slate-200" />
      </td>
    </tr>
  );
}

export function ArticleTable({
  articles,
  isLoading,
  total,
  page,
  size,
  onPageChange,
  onSizeChange,
  onArticleSelect,
  onArticlePlay,
}: {
  articles: Article[];
  isLoading: boolean;
  total: number;
  page: number;
  size: number;
  onPageChange: (p: number) => void;
  onSizeChange: (s: number) => void;
  onArticleSelect: (a: Article) => void;
  onArticlePlay?: (a: Article) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / size));

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-sm text-slate-600">
              <th className="px-4 py-3">Article</th>
              <th className="px-4 py-3">Districts / Topics</th>
              <th className="px-4 py-3">Sentiment</th>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!articles.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-white py-16 text-center">
        <p className="text-4xl">📭</p>
        <h3 className="mt-2 font-medium text-slate-900">No articles found</h3>
        <p className="mt-1 text-sm text-slate-500">
          No articles match your filters. Try adjusting date range or filters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-sm text-slate-600">
              <th className="px-4 py-3">Article</th>
              <th className="px-4 py-3">Districts / Topics</th>
              <th className="px-4 py-3">Sentiment</th>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {articles.map((article) => (
              <ArticleRow
                key={article.id}
                article={article}
                onView={() => onArticleSelect(article)}
                onPlay={
                  article.youtube_video_id
                    ? () => onArticlePlay?.(article)
                    : undefined
                }
              />
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span>
            Page {page} of {pages}
          </span>
          <select
            value={size}
            onChange={(e) => onSizeChange(Number(e.target.value))}
            className="rounded border border-slate-300 px-2 py-1 text-sm"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span>per page</span>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="rounded border border-slate-300 px-3 py-1 text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pages}
            className="rounded border border-slate-300 px-3 py-1 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
