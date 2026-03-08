"use client";

import { useArticle, useSimilarArticles } from "@/hooks/useArticles";
import { useClipInsights } from "@/hooks/useClipInsights";
import type { SourceType } from "@/types";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ClipPlayer } from "@/components/media/ClipPlayer";

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

const SWOT_CLASS: Record<string, string> = {
  strength: "bg-green-100 text-green-800",
  weakness: "bg-red-100 text-red-800",
  opportunity: "bg-blue-100 text-blue-800",
  threat: "bg-orange-100 text-orange-800",
};

export function ArticleDetailSheet({
  articleId,
  onClose,
  onViewSimilar,
}: {
  articleId: string | null;
  onClose: () => void;
  onViewSimilar?: (id: string) => void;
}) {
  const { data: article, isLoading } = useArticle(articleId);
  const { data: similar } = useSimilarArticles(articleId);
  const { data: generatedInsights, isLoading: insightsLoading } =
    useClipInsights(articleId);

  if (!articleId) return null;

  if (isLoading || !article) {
    return (
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-[600px] border-l border-slate-200 bg-white shadow-xl">
        <div className="flex h-16 items-center justify-between border-b px-4">
          <span className="text-slate-500">Loading...</span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700"
          >
            ✕
          </button>
        </div>
        <div className="p-4">
          <div className="h-8 w-3/4 animate-pulse rounded bg-slate-200" />
          <div className="mt-4 h-20 animate-pulse rounded bg-slate-100" />
        </div>
      </div>
    );
  }

  const publishedIST = format(
    new Date(article.published_at),
    "dd MMM yyyy, HH:mm",
  );
  const hasPlayableClip = Boolean(
    article.youtube_video_id || article.media_url,
  );
  const aiInsights = generatedInsights || article.ai_insights || null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[600px] flex-col border-l border-slate-200 bg-white shadow-xl">
      <div className="flex h-16 shrink-0 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          {article.severity && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                SEVERITY_CLASS[article.severity],
              )}
            >
              {article.severity}
            </span>
          )}
          <span>{SOURCE_ICON[article.source_type]}</span>
          <span className="font-medium">{article.source_name}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          {publishedIST}
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <h2 className="hindi-text text-xl font-semibold text-slate-900">
          {article.title || "No title"}
        </h2>

        <section className="mt-4">
          <h3 className="text-sm font-medium text-slate-600">
            Summary (English)
          </h3>
          <p className="mt-1 text-sm text-slate-700">
            {article.summary_english}
          </p>
        </section>
        {article.summary_hindi && (
          <section className="mt-3">
            <h3 className="text-sm font-medium text-slate-600">
              Summary (Hindi)
            </h3>
            <p className="hindi-text mt-1 text-sm text-slate-700">
              {article.summary_hindi}
            </p>
          </section>
        )}

        {hasPlayableClip && (
          <section className="mt-4">
            <h3 className="text-sm font-medium text-slate-600">Clip Player</h3>
            <div className="mt-2">
              <ClipPlayer article={article} />
            </div>
          </section>
        )}

        <section className="mt-4 rounded-lg bg-slate-100 p-3">
          <h3 className="text-sm font-medium text-slate-700">AI Analysis</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600">Sentiment</span>
              <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full bg-green-500"
                  style={{ width: `${article.sentiment_score}%` }}
                />
              </div>
              <span className="text-xs">{article.sentiment_score}%</span>
            </div>
            {article.swot_tag && (
              <span
                className={cn(
                  "rounded px-2 py-0.5 text-xs font-medium",
                  SWOT_CLASS[article.swot_tag],
                )}
              >
                {article.swot_tag}
              </span>
            )}
            {article.risk_flag && (
              <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                Risk flag
              </span>
            )}
            {article.is_law_order && (
              <span className="rounded bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">
                Law & order
              </span>
            )}
            {article.misinformation_signal && (
              <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
                Misinformation signal
              </span>
            )}
          </div>
          {insightsLoading && !aiInsights && (
            <p className="mt-3 text-xs text-slate-500">
              Building AI insights from selected clip...
            </p>
          )}
          {aiInsights && (
            <div className="mt-3 space-y-3">
              {aiInsights.short_summary && (
                <div>
                  <p className="text-xs font-medium text-slate-600">
                    AI short summary
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    {aiInsights.short_summary}
                  </p>
                </div>
              )}
              {aiInsights.expanded_summary && (
                <div>
                  <p className="text-xs font-medium text-slate-600">
                    AI expanded summary
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    {aiInsights.expanded_summary}
                  </p>
                </div>
              )}
              {aiInsights.narrative_analysis && (
                <div>
                  <p className="text-xs font-medium text-slate-600">
                    Narrative analysis
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    {aiInsights.narrative_analysis}
                  </p>
                </div>
              )}
              {aiInsights.risk_points?.length ? (
                <div>
                  <p className="text-xs font-medium text-slate-600">
                    Risk points
                  </p>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-slate-700">
                    {aiInsights.risk_points.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {aiInsights.misinformation_checks?.length ? (
                <div>
                  <p className="text-xs font-medium text-slate-600">
                    Misinformation checks
                  </p>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-slate-700">
                    {aiInsights.misinformation_checks.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {aiInsights.key_entities?.length ? (
                <div>
                  <p className="text-xs font-medium text-slate-600">
                    AI key entities
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {aiInsights.key_entities.map((entity) => (
                      <span
                        key={entity}
                        className="rounded bg-slate-200 px-1.5 py-0.5 text-xs"
                      >
                        {entity}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {aiInsights.recommended_actions?.length ? (
                <div>
                  <p className="text-xs font-medium text-slate-600">
                    Recommended actions
                  </p>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-slate-700">
                    {aiInsights.recommended_actions.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {(aiInsights.model_name || aiInsights.generated_at) && (
                <div className="border-t border-slate-200 pt-2 text-xs text-slate-500">
                  {aiInsights.model_name && (
                    <span>Model: {aiInsights.model_name}</span>
                  )}
                  {aiInsights.model_name && aiInsights.generated_at && " · "}
                  {aiInsights.generated_at && (
                    <span>
                      Generated:{" "}
                      {format(
                        new Date(aiInsights.generated_at),
                        "dd MMM yyyy, HH:mm",
                      )}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        <section className="mt-4">
          <h3 className="text-sm font-medium text-slate-600">Entities</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {article.districts_mentioned?.length ? (
              <div className="flex flex-wrap gap-1">
                <span className="text-xs text-slate-500">Districts:</span>
                {article.districts_mentioned.map((d) => (
                  <span
                    key={d}
                    className="rounded bg-slate-200 px-1.5 py-0.5 text-xs"
                  >
                    {d}
                  </span>
                ))}
              </div>
            ) : null}
            {article.politicians_mentioned?.length ? (
              <div className="flex flex-wrap gap-1">
                <span className="text-xs text-slate-500">Politicians:</span>
                {article.politicians_mentioned.map((p) => (
                  <span
                    key={p}
                    className="rounded bg-slate-200 px-1.5 py-0.5 text-xs"
                  >
                    {p}
                  </span>
                ))}
              </div>
            ) : null}
            {article.schemes_mentioned?.length ? (
              <div className="flex flex-wrap gap-1">
                <span className="text-xs text-slate-500">Schemes:</span>
                {article.schemes_mentioned.map((s) => (
                  <span
                    key={s}
                    className="rounded bg-slate-200 px-1.5 py-0.5 text-xs"
                  >
                    {s}
                  </span>
                ))}
              </div>
            ) : null}
            {article.keywords_matched?.length ? (
              <div className="flex flex-wrap gap-1">
                <span className="text-xs text-slate-500">Keywords:</span>
                {article.keywords_matched.map((k) => (
                  <span
                    key={k}
                    className="rounded bg-slate-200 px-1.5 py-0.5 text-xs"
                  >
                    {k}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <section className="mt-4">
          <h3 className="text-sm font-medium text-slate-600">Full text</h3>
          <div className="hindi-text mt-2 max-h-[400px] overflow-y-auto rounded border border-slate-200 p-3 text-sm text-slate-700">
            {article.content || "—"}
          </div>
        </section>

        {similar && similar.length > 0 && (
          <section className="mt-4">
            <h3 className="text-sm font-medium text-slate-600">
              Similar articles
            </h3>
            <ul className="mt-2 space-y-1">
              {similar.slice(0, 5).map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => onViewSimilar?.(a.id)}
                    className="text-left text-sm text-blue-600 hover:underline"
                  >
                    {a.title || a.id}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <div className="flex shrink-0 gap-2 border-t p-4">
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Open source
        </a>
        {similar && similar.length > 0 && (
          <button
            type="button"
            onClick={() => onViewSimilar?.(similar[0].id)}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            View similar
          </button>
        )}
      </div>
    </div>
  );
}
