"use client";

import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import type { Article, SourceType } from "@/types";
import { SOURCE_TYPE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

async function sendWhatsAppAlert(article: Article) {
  const res = await fetch("/api/whatsapp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      article_id: article.id,
      title: article.title,
      summary: article.summary_english,
      severity: article.severity,
      source_name: article.source_name,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.success) {
    throw new Error(data?.error ?? "Failed to send");
  }
  if (data.saveError) {
    console.warn(
      "[ArticleRow] WhatsApp alert sent but not stored:",
      data.saveError,
    );
  }
}

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
  const [waStatus, setWaStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");

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
          {article.sentiment}
        </span>
      </td>
      <td className="py-3 pr-2 align-top text-sm text-slate-500">{timeAgo}</td>
      <td className="py-3 pl-2 pr-3 align-top">
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
          <button
            type="button"
            title={
              waStatus === "sent"
                ? "Alert sent!"
                : waStatus === "error"
                  ? "Failed — click to retry"
                  : "Send WhatsApp alert"
            }
            disabled={waStatus === "sending" || waStatus === "sent"}
            onClick={async (e) => {
              e.preventDefault();
              setWaStatus("sending");
              try {
                await sendWhatsAppAlert(article);
                setWaStatus("sent");
                setTimeout(() => setWaStatus("idle"), 3000);
              } catch {
                setWaStatus("error");
                setTimeout(() => setWaStatus("idle"), 3000);
              }
            }}
            className={cn(
              "flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors",
              waStatus === "sent"
                ? "bg-green-100 text-green-800"
                : waStatus === "error"
                  ? "bg-red-100 text-red-700"
                  : waStatus === "sending"
                    ? "cursor-wait bg-green-50 text-green-600 opacity-70"
                    : "bg-green-100 text-green-800 hover:bg-green-200",
            )}
          >
            {waStatus === "sending" ? (
              <span className="animate-spin">⟳</span>
            ) : waStatus === "sent" ? (
              "✓"
            ) : waStatus === "error" ? (
              "✕"
            ) : (
              <svg
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5 fill-current"
                aria-hidden="true"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            )}
          </button>
        </div>
      </td>
    </tr>
  );
}
