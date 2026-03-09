/**
 * Shared AI insights generator for articles.
 * Used by POST /api/articles/[id]/insights and by report generation so that
 * AI summary is created before building the PDF.
 */

import Groq from "groq-sdk";
import type { Article } from "@/types";
import type { ClipAIInsights } from "@/types";

function arrayOfStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function normalizeGeneratedInsights(
  payload: unknown,
  modelName: string,
): ClipAIInsights {
  const obj = (payload || {}) as Record<string, unknown>;
  const entitiesRaw = obj.key_entities;
  const categorized =
    typeof entitiesRaw === "object" &&
    entitiesRaw != null &&
    !Array.isArray(entitiesRaw)
      ? entitiesRaw
      : null;
  const keyEntities = categorized
    ? [
        ...arrayOfStrings((categorized as Record<string, unknown>).persons),
        ...arrayOfStrings((categorized as Record<string, unknown>).districts),
        ...arrayOfStrings((categorized as Record<string, unknown>).schemes),
        ...arrayOfStrings((categorized as Record<string, unknown>).keywords),
      ]
    : arrayOfStrings(entitiesRaw);

  return {
    short_summary:
      typeof obj.short_summary === "string" ? obj.short_summary.trim() : "",
    expanded_summary:
      typeof obj.expanded_summary === "string"
        ? obj.expanded_summary.trim()
        : "",
    narrative_analysis:
      typeof obj.narrative_analysis === "string"
        ? obj.narrative_analysis.trim()
        : "",
    risk_points: arrayOfStrings(obj.risk_points),
    misinformation_checks: arrayOfStrings(obj.misinformation_checks),
    key_entities: Array.from(new Set(keyEntities)),
    recommended_actions: arrayOfStrings(obj.recommended_actions),
    model_name: modelName,
    generated_at: new Date().toISOString(),
  };
}

function fallbackInsightsFromArticle(article: Article): ClipAIInsights {
  const keyEntities = Array.from(
    new Set([
      ...(article.persons_named ?? article.politicians_mentioned ?? []),
      ...article.districts_mentioned,
      ...(article.schemes_referenced ?? article.schemes_mentioned ?? []),
      ...article.keywords_matched,
    ]),
  );

  return {
    short_summary:
      article.summary_english ||
      article.title ||
      "No source summary available for this clip.",
    expanded_summary:
      article.content ||
      article.summary_english ||
      "No additional context available.",
    narrative_analysis:
      "Fallback analysis generated because GROQ_API_KEY is not configured. Configure Groq to enable enriched AI insights.",
    risk_points: article.risk_flag
      ? ["Risk flag detected by analyst/ingestion pipeline."]
      : ["No explicit risk flag detected."],
    misinformation_checks: article.misinformation_signal
      ? ["Misinformation signal is marked for this clip."]
      : ["No misinformation signal currently marked."],
    key_entities: keyEntities,
    recommended_actions: [
      "Verify key claims with primary source before escalation.",
      "Track updates from the same source/channel for continuity.",
    ],
    model_name: "fallback-no-groq",
    generated_at: new Date().toISOString(),
  };
}

/**
 * Generates or returns existing AI insights for an article.
 * If the article already has ai_insights, returns them; otherwise generates via Groq or fallback.
 */
export async function generateInsightsForArticle(
  article: Article,
): Promise<ClipAIInsights> {
  if (article.ai_insights) {
    return article.ai_insights;
  }

  const modelName = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  const groqKey = process.env.GROQ_API_KEY;

  if (!groqKey) {
    return fallbackInsightsFromArticle(article);
  }

  const client = new Groq({ apiKey: groqKey });
  const completion = await client.chat.completions.create({
    model: modelName,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a media-monitoring analyst assistant. Return ONLY valid JSON with keys: short_summary, expanded_summary, narrative_analysis, risk_points (array), misinformation_checks (array), key_entities (object with persons,districts,schemes,keywords arrays), recommended_actions (array). Keep outputs concise and factual.",
      },
      {
        role: "user",
        content: JSON.stringify({
          title: article.title,
          source_name: article.source_name,
          source_type: article.source_type,
          published_at: article.published_at,
          summary_english: article.summary_english,
          content: article.content,
          districts_mentioned: article.districts_mentioned,
          persons_named: article.persons_named ?? article.politicians_mentioned ?? [],
          schemes_referenced: article.schemes_referenced ?? article.schemes_mentioned ?? [],
          keywords_matched: article.keywords_matched,
          sentiment: article.sentiment,
          analyst_severity: article.severity_analyst || article.severity,
        }),
      },
    ],
  });

  const text = completion.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(text) as Record<string, unknown>;
  return normalizeGeneratedInsights(parsed, modelName);
}
