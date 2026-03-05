"use client";

import { useTVChannels } from "@/hooks/useTVChannels";
import { ChannelCard } from "@/components/tv/ChannelCard";
import { useState } from "react";

export default function TVPage() {
  const { data: channels, isLoading } = useTVChannels();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "live" | "offline">("all");
  const [search, setSearch] = useState("");

  const activeCount = channels?.filter((c) => c.is_active).length ?? 0;
  const liveCount =
    channels?.filter(
      (c) =>
        c.last_checked &&
        (Date.now() - new Date(c.last_checked).getTime()) / 60000 < 15,
    ).length ?? 0;
  const criticalCount =
    channels?.filter((c) => c.today_severity === "CRITICAL").length ?? 0;

  const filtered = (channels ?? []).filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()))
      return false;
    if (filter === "live") {
      if (!c.last_checked) return false;
      return (Date.now() - new Date(c.last_checked).getTime()) / 60000 < 15;
    }
    if (filter === "offline") {
      if (!c.last_checked) return true;
      return (Date.now() - new Date(c.last_checked).getTime()) / 60000 >= 15;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const aLive =
      a.last_checked &&
      (Date.now() - new Date(a.last_checked).getTime()) / 60000 < 15
        ? 1
        : 0;
    const bLive =
      b.last_checked &&
      (Date.now() - new Date(b.last_checked).getTime()) / 60000 < 15
        ? 1
        : 0;
    return bLive - aLive;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          TV Channel Monitor
        </h1>
        <p className="text-slate-600">
          Monitoring {activeCount} of 70 channels
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Channels live</p>
          <p className="text-2xl font-bold text-green-600">{liveCount}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Channels offline</p>
          <p className="text-2xl font-bold text-slate-900">
            {filtered.length - liveCount}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Critical TV alerts today</p>
          <p className="text-2xl font-bold text-red-600">{criticalCount}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`rounded px-3 py-1 text-sm ${filter === "all" ? "bg-slate-900 text-white" : "bg-slate-200"}`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setFilter("live")}
          className={`rounded px-3 py-1 text-sm ${filter === "live" ? "bg-slate-900 text-white" : "bg-slate-200"}`}
        >
          Live
        </button>
        <button
          type="button"
          onClick={() => setFilter("offline")}
          className={`rounded px-3 py-1 text-sm ${filter === "offline" ? "bg-slate-900 text-white" : "bg-slate-200"}`}
        >
          Offline
        </button>
        <input
          type="text"
          placeholder="Search channel..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded border border-slate-300 px-3 py-1 text-sm"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-lg bg-slate-200"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {sorted.map((channel) => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              onSelect={() => setSelectedId(channel.id)}
            />
          ))}
        </div>
      )}

      {selectedId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-4">
            <p className="text-slate-600">
              Channel detail sheet (ID: {selectedId})
            </p>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="mt-2 rounded bg-slate-200 px-3 py-1 text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
