"use client";

import { useState, useMemo } from "react";
import { useTVChannels } from "@/hooks/useTVChannels";
import { useTVClips } from "@/hooks/useTVClips";
import type { Article } from "@/types";
import { ChannelCard } from "@/components/tv/ChannelCard";

function getYouTubeId(clip: Article): string | null {
  if (clip.youtube_video_id) return clip.youtube_video_id;
  const url = (clip.media_url || clip.url || "").trim();
  if (!url) return null;

  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      // e.g. /embed/VIDEO_ID
      const parts = u.pathname.split("/").filter(Boolean);
      const embedIndex = parts.indexOf("embed");
      if (embedIndex >= 0 && parts[embedIndex + 1]) {
        return parts[embedIndex + 1];
      }
    }
    if (u.hostname.includes("youtu.be")) {
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts[0]) return parts[0];
    }
  } catch {
    // ignore invalid URL
  }

  return null;
}

export default function TVPage() {
  const { data: channels, isLoading: loadingChannels } = useTVChannels();
  const { data: clips, isLoading: loadingClips } = useTVClips();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "live" | "offline">("all");
  const [search, setSearch] = useState("");

  const activeCount = channels?.filter((c) => c.is_active).length ?? 0;
  const liveCount = activeCount; // treat all active channels as live

  const clipsByChannelName = useMemo(() => {
    const map = new Map<string, Article[]>();
    for (const clip of clips ?? []) {
      const key = (clip.source_name || "").trim();
      if (!key) continue;
      const list = map.get(key) ?? [];
      list.push(clip);
      map.set(key, list);
    }
    return map;
  }, [clips]);

  const clipMetaByChannelId = useMemo(() => {
    const map = new Map<
      string,
      {
        count: number;
        latestHeadline: string | null;
      }
    >();

    for (const channel of channels ?? []) {
      const list = clipsByChannelName.get(channel.name) ?? [];
      if (!list.length) {
        map.set(channel.id, { count: 0, latestHeadline: null });
        continue;
      }
      const sortedByTime = [...list].sort(
        (a, b) =>
          new Date(b.published_at).getTime() -
          new Date(a.published_at).getTime(),
      );
      const top = sortedByTime[0];
      const latestHeadline =
        top.title || top.summary_english || top.summary_hindi || null;
      map.set(channel.id, { count: list.length, latestHeadline });
    }

    return map;
  }, [channels, clipsByChannelName]);

  const criticalCount =
    channels?.filter((c) => c.today_severity === "CRITICAL").length ?? 0;

  const filtered = (channels ?? []).filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()))
      return false;
    if (filter === "live") {
      return c.is_active;
    }
    if (filter === "offline") {
      return !c.is_active;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const countA = clipMetaByChannelId.get(a.id)?.count ?? 0;
    const countB = clipMetaByChannelId.get(b.id)?.count ?? 0;
    if (countB !== countA) return countB - countA; // channels with clips first
    return a.name.localeCompare(b.name);
  });

  const selectedChannel = useMemo(
    () => (channels ?? []).find((c) => c.id === selectedId) ?? null,
    [channels, selectedId],
  );
  const selectedClips: Article[] = useMemo(() => {
    if (!selectedChannel) return [];
    return clipsByChannelName.get(selectedChannel.name) ?? [];
  }, [clipsByChannelName, selectedChannel]);

  const isLoading = loadingChannels || loadingClips;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          TV Channel Monitor
        </h1>
        <p className="text-slate-600">
          Monitoring {activeCount} active TV channels
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Channels live</p>
          <p className="text-2xl font-bold text-green-600">{liveCount}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Channels without clips</p>
          <p className="text-2xl font-bold text-slate-900">
            {filtered.length -
              filtered.filter(
                (c) => (clipMetaByChannelId.get(c.id)?.count ?? 0) > 0,
              )
                .length}
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
              clipCount={clipMetaByChannelId.get(channel.id)?.count ?? 0}
              latestHeadline={
                clipMetaByChannelId.get(channel.id)?.latestHeadline ?? undefined
              }
              onSelect={() => setSelectedId(channel.id)}
            />
          ))}
        </div>
      )}

      {selectedChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[80vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {selectedChannel.name}
                </h2>
                <p className="text-sm text-slate-600">
                  {selectedClips.length} clips from articles
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="rounded bg-slate-200 px-3 py-1 text-sm"
              >
                Close
              </button>
            </div>

            {selectedClips.length === 0 && (
              <p className="text-sm text-slate-500">
                No TV / YouTube clips found for this channel yet. As analysts
                tag articles with this channel, clips will appear here.
              </p>
            )}

            <div className="space-y-4">
              {selectedClips.map((clip) => {
                const youtubeId = getYouTubeId(clip);
                const isYouTube = Boolean(youtubeId);

                return (
                  <div
                    key={clip.id}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                  >
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-semibold text-slate-900">
                        {clip.title || clip.summary_english}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(clip.published_at).toLocaleString()}
                      </p>
                    </div>

                    {isYouTube ? (
                      <div className="mt-2 aspect-video w-full overflow-hidden rounded-md bg-black">
                        <iframe
                          className="h-full w-full"
                          src={`https://www.youtube.com/embed/${youtubeId}${
                            clip.youtube_timestamp
                              ? `?start=${clip.youtube_timestamp}`
                              : ""
                          }`}
                          title={clip.title ?? youtubeId ?? ""}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                      </div>
                    ) : (
                      <div className="mt-2">
                        <a
                          href={clip.media_url || clip.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-blue-600 underline"
                        >
                          Open clip
                        </a>
                      </div>
                    )}

                    {clip.summary_english && (
                      <p className="mt-2 text-sm text-slate-700">
                        {clip.summary_english}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

