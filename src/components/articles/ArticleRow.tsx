"use client";

import { formatDistanceToNow } from "date-fns";
import type { Article, SourceType } from "@/types";
import { SOURCE_TYPE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const SOURCE_ICON: Record<SourceType, string> = {
  tv: "📺",
  print: "📰",
  online: "🌐",
  youtube: "▶️",
  upload: "📤",
};

const SEVERITY_CLASS: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800",
  HIGH: "bg-orange-100 text-orange-800",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  LOW: "bg-slate-100 text-slate-700",
};

const SENTIMENT_CLASS: Record<string, string> = {
  positive: "text-green-600",
  negative: "text-red-600",
  neutral: "text-slate-500",
};

export function ArticleRow({
  article,
  selected,
  onToggleSelect,
  onView,
  onPlay,
}: {
  article: Article;
  selected: boolean;
  onToggleSelect: (checked: boolean) => void;
  onView: () => void;
  onPlay?: () => void;
}) {
  const timeAgo = formatDistanceToNow(new Date(article.published_at), {
    addSuffix: true,
  });
  const districts = article.districts_mentioned ?? [];
  const showDistricts = districts.slice(0, 3);
  const moreDistricts = districts.length - 3;
  const topics = (article.topics ?? []).slice(0, 2);

  return (
    <tr
      className="cursor-pointer border-b border-slate-200 hover:bg-slate-50"
      onClick={onView}
    >
      <td
        className="w-10 py-3 pl-4 pr-2 align-top"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onToggleSelect(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
        />
      </td>
      <td className="py-3 pr-2 pl-2 align-top">
        <div className="flex flex-wrap items-center gap-2">
          {article.severity && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                SEVERITY_CLASS[article.severity] ?? "bg-slate-100",
              )}
            >
              {article.severity}
            </span>
          )}
          <span className="text-slate-500">
            {SOURCE_ICON[article.source_type]}
          </span>
          <span className="text-sm text-slate-700">{article.source_name}</span>
        </div>
        <p className="hindi-text mt-1 line-clamp-2 font-medium text-slate-900">
          {article.title || "No title"}
        </p>
      </td>
      <td className="py-3 pr-2 align-top">
        <div className="flex flex-wrap gap-1">
          {showDistricts.map((d) => (
            <span
              key={d}
              className="rounded bg-slate-200 px-1.5 py-0.5 text-xs text-slate-700"
            >
              {d}
            </span>
          ))}
          {moreDistricts > 0 && (
            <span className="text-xs text-slate-500">
              +{moreDistricts} more
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap gap-1">
          {topics.map((t) => (
            <span
              key={t}
              className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-800"
            >
              {t}
            </span>
          ))}
        </div>
      </td>
      <td className="py-3 pr-2 align-top">
        <span
          className={cn(
            "text-sm font-medium",
            SENTIMENT_CLASS[article.sentiment],
          )}
        >
          {article.sentiment} ({article.sentiment_score}%)
        </span>
      </td>
      <td className="py-3 pr-2 align-top text-sm text-slate-500">{timeAgo}</td>
      <td className="py-3 pl-2 align-top">
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onView();
            }}
            className="rounded bg-slate-200 px-2 py-1 text-xs font-medium hover:bg-slate-300"
          >
            View
          </button>
          {article.youtube_video_id && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onPlay?.();
              }}
              className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-200"
            >
              ▶ Play
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
