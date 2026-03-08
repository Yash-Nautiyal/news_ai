"use client";

import type { Article } from "@/types";

function getYouTubeEmbedUrl(article: Pick<Article, "youtube_video_id" | "youtube_timestamp">) {
  if (!article.youtube_video_id) return null;
  const start = article.youtube_timestamp ?? 0;
  return `https://www.youtube.com/embed/${article.youtube_video_id}?start=${start}`;
}

function isLikelyVideoUrl(url: string) {
  return /\.(mp4|webm|mov|avi|mkv)(\?.*)?$/i.test(url);
}

export function ClipPlayer({
  article,
  compact = false,
}: {
  article: Pick<
    Article,
    | "id"
    | "youtube_video_id"
    | "youtube_timestamp"
    | "media_url"
    | "media_type"
    | "source_type"
    | "title"
  >;
  compact?: boolean;
}) {
  const youtubeEmbed = getYouTubeEmbedUrl(article);
  const heightClass = compact ? "h-36" : "h-64";
  const mediaUrl = article.media_url || null;

  if (youtubeEmbed) {
    return (
      <div className={`w-full overflow-hidden rounded-lg bg-black ${heightClass}`}>
        <iframe
          title={article.title || `clip-${article.id}`}
          src={youtubeEmbed}
          className="h-full w-full"
          allowFullScreen
        />
      </div>
    );
  }

  if (mediaUrl && (article.media_type === "file" || isLikelyVideoUrl(mediaUrl))) {
    return (
      <video
        className={`w-full rounded-lg bg-black object-contain ${heightClass}`}
        src={mediaUrl}
        controls
        preload="metadata"
      />
    );
  }

  if (mediaUrl && article.media_type === "url") {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
        <a
          href={mediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Open clip URL
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
      No playable clip available.
    </div>
  );
}
