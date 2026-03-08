/**
 * Supabase data layer for the `articles` table (schema.sql).
 * Used when hasSupabaseAdminConfig() is true and NEXT_PUBLIC_USE_MOCK_DATA is false.
 * See SCHEMA_HANDOFF_CHECKLIST.md and DIPR_Analyst_Upload_Guide.md.
 */

import type { Article, ArticleFilters, PaginatedResponse, Severity } from "@/types";
import { getSupabaseAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase/admin";

export type ArticleRow = {
  id: string;
  created_at: string;
  updated_at: string;
  analyst_id: string;
  entry_status: string;
  source_type: string;
  upload_sub_type: string | null;
  source_id: string | null;
  source_name: string;
  published_at: string;
  title: string | null;
  content: string;
  url: string;
  content_language: string;
  analyst_synopsis: string;
  districts_mentioned: string[];
  divisions_mentioned: string[];
  persons_named: string[];
  schemes_referenced: string[];
  departments_mentioned: string[];
  topics: string[];
  keywords_matched: string[];
  incident_category_ids: string[];
  sentiment: string;
  sentiment_score: number;
  tone: string | null;
  swot_tag: string | null;
  severity: string | null;
  severity_analyst: string | null;
  severity_ai: string | null;
  is_law_order: boolean;
  risk_flag: boolean;
  misinformation_signal: boolean;
  alerted: boolean;
  verification_status: string;
  action_required: string[];
  internal_notes: string | null;
  media_type: string;
  media_url: string | null;
  media_storage_path: string | null;
  media_mime_type: string | null;
  media_duration_seconds: number | null;
  summary_english: string;
  summary_hindi: string;
  viral_risk_score: number;
  type_metadata: Record<string, unknown>;
  ai_insights: Record<string, unknown> | null;
  youtube_video_id: string | null;
  youtube_timestamp: number | null;
  constituency_vidhan_sabha: string[];
  constituency_lok_sabha: string[];
};

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  }
  return [];
}

function parseNum(value: unknown): number {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string") return parseFloat(value) || 0;
  return 0;
}

export function articleRowToArticle(row: ArticleRow): Article {
  const personsNamed = parseStringArray(row.persons_named);
  const schemesRef = parseStringArray(row.schemes_referenced);
  const ai = row.ai_insights as Record<string, unknown> | null;
  return {
    id: row.id,
    title: row.title,
    content: row.content ?? "",
    summary_english: row.summary_english ?? "",
    summary_hindi: row.summary_hindi ?? "",
    url: row.url ?? "",
    source_name: row.source_name ?? "Unknown source",
    source_type: (row.source_type as Article["source_type"]) ?? "online",
    published_at: row.published_at,
    ingested_at: row.created_at ?? row.published_at,
    language: row.content_language ?? "hindi",
    sentiment: (row.sentiment as Article["sentiment"]) ?? "neutral",
    sentiment_score: parseNum(row.sentiment_score),
    severity: (row.severity as Severity) ?? null,
    districts_mentioned: parseStringArray(row.districts_mentioned),
    persons_named: personsNamed,
    schemes_referenced: schemesRef,
    departments_mentioned: parseStringArray(row.departments_mentioned),
    topics: parseStringArray(row.topics),
    is_law_order: Boolean(row.is_law_order),
    risk_flag: Boolean(row.risk_flag),
    swot_tag: (row.swot_tag as Article["swot_tag"]) ?? null,
    misinformation_signal: Boolean(row.misinformation_signal),
    alerted: Boolean(row.alerted),
    youtube_video_id: row.youtube_video_id ?? null,
    youtube_timestamp: row.youtube_timestamp ?? null,
    keywords_matched: parseStringArray(row.keywords_matched),
    severity_analyst: (row.severity_analyst as Severity) ?? null,
    severity_ai: (row.severity_ai as Severity) ?? null,
    media_type: (row.media_type as Article["media_type"]) ?? "none",
    media_url: row.media_url ?? null,
    media_storage_path: row.media_storage_path ?? null,
    media_mime_type: row.media_mime_type ?? null,
    media_duration_seconds: row.media_duration_seconds ?? null,
    ai_insights: ai
      ? {
          short_summary: String(ai.short_summary ?? ""),
          expanded_summary: String(ai.expanded_summary ?? ""),
          narrative_analysis: String(ai.narrative_analysis ?? ""),
          risk_points: parseStringArray(ai.risk_points),
          misinformation_checks: parseStringArray(ai.misinformation_checks),
          key_entities: parseStringArray(ai.key_entities),
          recommended_actions: parseStringArray(ai.recommended_actions),
          model_name: String(ai.model_name ?? ""),
          generated_at: String(ai.generated_at ?? new Date().toISOString()),
        }
      : null,
    politicians_mentioned: personsNamed,
    schemes_mentioned: schemesRef,
    entry_status: row.entry_status as Article["entry_status"],
    upload_sub_type: (row.upload_sub_type as Article["upload_sub_type"]) ?? null,
    source_id: row.source_id ?? null,
    content_language: row.content_language as Article["content_language"],
    analyst_synopsis: row.analyst_synopsis,
    divisions_mentioned: parseStringArray(row.divisions_mentioned),
    constituency_vidhan_sabha: parseStringArray(row.constituency_vidhan_sabha),
    constituency_lok_sabha: parseStringArray(row.constituency_lok_sabha),
    incident_category_ids: parseStringArray(row.incident_category_ids),
    tone: (row.tone as Article["tone"]) ?? null,
    verification_status: row.verification_status as Article["verification_status"],
    action_required: (row.action_required as Article["action_required"]) ?? [],
    internal_notes: row.internal_notes ?? null,
    viral_risk_score: parseNum(row.viral_risk_score),
    type_metadata: row.type_metadata ?? {},
    created_at: row.created_at,
  };
}

const ARTICLES_SELECT =
  "id,created_at,updated_at,analyst_id,entry_status,source_type,upload_sub_type,source_id,source_name,published_at,title,content,url,content_language,analyst_synopsis,districts_mentioned,divisions_mentioned,persons_named,schemes_referenced,departments_mentioned,topics,keywords_matched,incident_category_ids,sentiment,sentiment_score,tone,swot_tag,severity,severity_analyst,severity_ai,is_law_order,risk_flag,misinformation_signal,alerted,verification_status,action_required,internal_notes,media_type,media_url,media_storage_path,media_mime_type,media_duration_seconds,summary_english,summary_hindi,viral_risk_score,type_metadata,ai_insights,youtube_video_id,youtube_timestamp,constituency_vidhan_sabha,constituency_lok_sabha";

export async function getArticlesPageFromSupabase(
  filters: ArticleFilters & { entity?: string },
): Promise<PaginatedResponse<Article>> {
  const supabase = getSupabaseAdminClient();
  const page = Math.max(1, Number(filters.page) || 1);
  const size = Math.max(1, Math.min(100, Number(filters.size) || 25));
  const from = (page - 1) * size;
  const to = from + size - 1;

  let query = supabase
    .from("articles")
    .select(ARTICLES_SELECT, { count: "exact" })
    .order("published_at", { ascending: false })
    .range(from, to);

  if (filters.source_type) {
    query = query.eq("source_type", filters.source_type);
  }
  if (filters.severity) {
    query = query.eq("severity", filters.severity);
  }
  if (filters.sentiment) {
    query = query.eq("sentiment", filters.sentiment);
  }
  if (filters.district) {
    query = query.contains("districts_mentioned", [filters.district]);
  }
  if (filters.source_name) {
    query = query.ilike("source_name", `%${filters.source_name}%`);
  }
  if (filters.date_from) {
    query = query.gte("published_at", filters.date_from);
  }
  if (filters.date_to) {
    const end = new Date(filters.date_to);
    end.setHours(23, 59, 59, 999);
    query = query.lte("published_at", end.toISOString());
  }
  if (filters.search && filters.search.trim()) {
    const term = filters.search.trim();
    query = query.or(`title.ilike.%${term}%,analyst_synopsis.ilike.%${term}%,content.ilike.%${term}%`);
  }
  if (filters.entity && filters.entity.trim()) {
    const entityEscaped = filters.entity.trim().replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    query = query.or(
      `persons_named.cs.{"${entityEscaped}"},schemes_referenced.cs.{"${entityEscaped}"},departments_mentioned.cs.{"${entityEscaped}"},keywords_matched.cs.{"${entityEscaped}"}`,
    );
  }

  const { data, error, count } = await query;

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as ArticleRow[];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / size));

  return {
    items: rows.map(articleRowToArticle),
    total,
    page,
    size,
    pages,
  };
}

export async function getArticleByIdFromSupabase(id: string): Promise<Article | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("articles")
    .select(ARTICLES_SELECT)
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }
  return data ? articleRowToArticle(data as ArticleRow) : null;
}

/** Fetch articles for analytics. Capped to avoid huge reads. */
export async function getArticlesForAnalyticsFromSupabase(
  limit = 2000,
): Promise<Article[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("articles")
    .select(ARTICLES_SELECT)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as ArticleRow[];
  return rows.map(articleRowToArticle);
}

export function useSupabaseArticles(): boolean {
  return hasSupabaseAdminConfig();
}

const SEED_ANALYST_ID = "00000000-0000-0000-0000-000000000001";

export type InsertArticlePayload = {
  analyst_id?: string | null;
  source_type: string;
  upload_sub_type?: string | null;
  source_id?: string | null;
  source_name: string;
  published_at: string;
  title: string | null;
  content: string;
  url?: string;
  content_language?: string;
  analyst_synopsis: string;
  districts_mentioned?: string[];
  persons_named?: string[];
  schemes_referenced?: string[];
  departments_mentioned?: string[];
  topics?: string[];
  keywords_matched?: string[];
  incident_category_ids?: string[];
  sentiment?: string;
  sentiment_score?: number;
  tone?: string | null;
  swot_tag?: string | null;
  severity_analyst?: string | null;
  is_law_order?: boolean;
  risk_flag?: boolean;
  verification_status?: string;
  action_required?: string[];
  internal_notes?: string | null;
  media_type?: string;
  media_url?: string | null;
  media_storage_path?: string | null;
  media_mime_type?: string | null;
  media_duration_seconds?: number | null;
  type_metadata?: Record<string, unknown>;
  entry_status?: "draft" | "submitted";
};

export async function insertArticleIntoSupabase(
  payload: InsertArticlePayload,
): Promise<{ id: string }> {
  const supabase = getSupabaseAdminClient();
  const analystId =
    payload.analyst_id && payload.analyst_id.trim()
      ? payload.analyst_id
      : process.env.SEED_ANALYST_ID ?? SEED_ANALYST_ID;

  const row = {
    analyst_id: analystId,
    source_type: payload.source_type,
    upload_sub_type: payload.upload_sub_type ?? null,
    source_id: payload.source_id ?? null,
    source_name: payload.source_name ?? "",
    published_at: payload.published_at,
    title: payload.title ?? null,
    content: payload.content ?? "",
    url: payload.url ?? "",
    content_language: payload.content_language ?? "hindi",
    analyst_synopsis: payload.analyst_synopsis.trim(),
    districts_mentioned: parseStringArray(payload.districts_mentioned),
    persons_named: parseStringArray(payload.persons_named),
    schemes_referenced: parseStringArray(payload.schemes_referenced),
    departments_mentioned: parseStringArray(payload.departments_mentioned),
    topics: parseStringArray(payload.topics),
    keywords_matched: parseStringArray(payload.keywords_matched),
    incident_category_ids: parseStringArray(payload.incident_category_ids),
    sentiment: payload.sentiment ?? "neutral",
    sentiment_score: payload.sentiment_score ?? 0,
    tone: payload.tone ?? null,
    swot_tag: payload.swot_tag ?? null,
    severity_analyst: payload.severity_analyst ?? null,
    is_law_order: payload.is_law_order ?? false,
    risk_flag: payload.risk_flag ?? false,
    verification_status: payload.verification_status ?? "unverified",
    action_required: Array.isArray(payload.action_required) ? payload.action_required : [],
    internal_notes: payload.internal_notes ?? null,
    media_type: payload.media_type ?? "none",
    media_url: payload.media_url ?? null,
    media_storage_path: payload.media_storage_path ?? null,
    media_mime_type: payload.media_mime_type ?? null,
    media_duration_seconds: payload.media_duration_seconds ?? null,
    type_metadata: payload.type_metadata ?? {},
    entry_status: payload.entry_status ?? "submitted",
  };

  const { data, error } = await supabase
    .from("articles")
    .insert(row)
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error("Insert did not return id");
  return { id: data.id };
}
