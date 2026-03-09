"use client";

import { formatDistanceToNow } from "date-fns";
import type { TVChannel } from "@/types";

const SEVERITY_CLASS: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800",
  HIGH: "bg-orange-100 text-orange-800",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  LOW: "bg-slate-100 text-slate-700",
};

export function ChannelCard({
  channel,
  onSelect,
  clipCount = 0,
  latestHeadline,
}: {
  channel: TVChannel;
  onSelect: () => void;
  clipCount?: number;
  latestHeadline?: string;
}) {
  const lastChecked = channel.last_checked
    ? formatDistanceToNow(new Date(channel.last_checked), { addSuffix: true })
    : "—";
  // Treat all active channels as "live" for monitoring purposes.
  const isLive = channel.is_active !== false;

  return (
    <div
      className="cursor-pointer rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
      onClick={onSelect}
    >
      <div className="flex items-start justify-between">
        <h3 className="font-semibold text-slate-900">{channel.name}</h3>
        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">TV</span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            isLive ? "bg-green-500 animate-pulse" : "bg-red-500"
          }`}
        />
        <span className="text-sm text-slate-600">
          {isLive ? "Live" : "Disabled"}
        </span>
      </div>
      {channel.today_severity && (
        <span
          className={`mt-2 inline-block rounded px-2 py-0.5 text-xs font-medium ${
            SEVERITY_CLASS[channel.today_severity]
          }`}
        >
          {channel.today_severity}
        </span>
      )}
      <p className="hindi-text mt-2 line-clamp-2 italic text-slate-600">
        {latestHeadline || channel.last_transcript || "—"}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Last checked: {lastChecked} • Clips: {clipCount}
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className="rounded bg-slate-200 px-2 py-1 text-xs font-medium hover:bg-slate-300"
        >
          View clips
        </button>
      </div>
    </div>
  );
}
