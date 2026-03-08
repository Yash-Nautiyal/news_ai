/**
 * Supabase reads for reference tables: media_sources, entities, incident_categories, alerts, reports.
 * Used when hasSupabaseAdminConfig() is true.
 */

import type { Source, SourceType, TVChannel } from "@/types";
import { getSupabaseAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase/admin";

type MediaSourceRow = {
  id: string;
  name: string;
  source_type: string;
  channel_type: string | null;
  print_city: string | null;
  source_tier: string | null;
  url: string | null;
  youtube_channel_id: string | null;
  is_active: boolean;
  sort_order: number;
};

export async function getMediaSourcesFromSupabase(
  sourceType?: SourceType,
): Promise<Source[]> {
  if (!hasSupabaseAdminConfig()) return [];
  const supabase = getSupabaseAdminClient();
  let query = supabase
    .from("media_sources")
    .select("id,name,source_type,channel_type,print_city,source_tier,url,youtube_channel_id,is_active,sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (sourceType) {
    query = query.eq("source_type", sourceType);
  }
  const { data, error } = await query;
  if (error) return [];
  const rows = (data ?? []) as MediaSourceRow[];
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    url: row.url ?? "",
    source_type: row.source_type as SourceType,
    rss_url: null,
    youtube_channel_id: row.youtube_channel_id,
    is_active: row.is_active,
    last_scraped_at: null,
    error_count: 0,
  }));
}

export async function getTVChannelsFromSupabase(): Promise<TVChannel[]> {
  const sources = await getMediaSourcesFromSupabase("tv");
  return sources.map((s) => ({
    id: s.id,
    name: s.name,
    youtube_channel_id: s.youtube_channel_id,
    is_active: s.is_active,
    is_live: undefined,
    last_checked: null,
    last_transcript: null,
    today_severity: null,
  }));
}

export type EntityRow = {
  id: string;
  name: string;
  name_hindi: string | null;
  category: string;
  sub_category: string | null;
  portfolio: string | null;
  is_active: boolean;
  sort_order: number;
};

export async function getEntitiesFromSupabase(category?: string): Promise<EntityRow[]> {
  if (!hasSupabaseAdminConfig()) return [];
  const supabase = getSupabaseAdminClient();
  let query = supabase
    .from("entities")
    .select("id,name,name_hindi,category,sub_category,portfolio,is_active,sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (category) {
    query = query.eq("category", category);
  }
  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as EntityRow[];
}

/** Fetch entities for multiple categories (e.g. minister + official for "persons named"). */
export async function getEntitiesByCategoriesFromSupabase(
  categories: string[],
): Promise<EntityRow[]> {
  if (!hasSupabaseAdminConfig() || categories.length === 0) return [];
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("entities")
    .select("id,name,name_hindi,category,sub_category,portfolio,is_active,sort_order")
    .eq("is_active", true)
    .in("category", categories)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) return [];
  return (data ?? []) as EntityRow[];
}

export type IncidentCategoryRow = {
  id: string;
  name: string;
  name_hindi: string | null;
  group_name: string;
  is_active: boolean;
  sort_order: number;
};

export async function getIncidentCategoriesFromSupabase(): Promise<IncidentCategoryRow[]> {
  if (!hasSupabaseAdminConfig()) return [];
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("incident_categories")
    .select("id,name,name_hindi,group_name,is_active,sort_order")
    .eq("is_active", true)
    .order("group_name")
    .order("sort_order", { ascending: true });
  if (error) return [];
  return (data ?? []) as IncidentCategoryRow[];
}

export type AlertRow = {
  id: string;
  article_id: string;
  severity: string;
  channels: string[];
  message_body: string;
  sent_at: string;
  acknowledged: boolean;
};

export async function getAlertsFromSupabase(filters: {
  page?: number;
  size?: number;
  severity?: string;
  date_from?: string;
  date_to?: string;
  district?: string;
  unread?: boolean;
}): Promise<{ items: AlertRow[]; total: number; page: number; size: number; pages: number }> {
  if (!hasSupabaseAdminConfig()) {
    return { items: [], total: 0, page: 1, size: 25, pages: 1 };
  }
  const supabase = getSupabaseAdminClient();
  const page = Math.max(1, filters.page ?? 1);
  const size = Math.max(1, Math.min(100, filters.size ?? 25));
  const from = (page - 1) * size;
  const to = from + size - 1;

  let query = supabase
    .from("alerts")
    .select("id,article_id,severity,channels,message_body,sent_at,acknowledged", { count: "exact" })
    .order("sent_at", { ascending: false })
    .range(from, to);

  if (filters.severity) query = query.eq("severity", filters.severity);
  if (filters.unread) query = query.eq("acknowledged", false);
  if (filters.date_from) query = query.gte("sent_at", filters.date_from);
  if (filters.date_to) {
    const end = new Date(filters.date_to);
    end.setHours(23, 59, 59, 999);
    query = query.lte("sent_at", end.toISOString());
  }

  const { data, error, count } = await query;
  if (error) return { items: [], total: 0, page: 1, size: 25, pages: 1 };
  const items = (data ?? []) as AlertRow[];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / size));

  if (filters.district && items.length > 0) {
    const articleIds = [...new Set(items.map((a) => a.article_id))];
    const { data: articles } = await supabase
      .from("articles")
      .select("id,districts_mentioned")
      .in("id", articleIds);
    const districtSet = new Set(
      (articles ?? []).filter((a: { districts_mentioned?: string[] }) =>
        (a.districts_mentioned ?? []).includes(filters.district!),
      ).map((a: { id: string }) => a.id),
    );
    const filtered = items.filter((a) => districtSet.has(a.article_id));
    return {
      items: filtered,
      total: filtered.length,
      page: 1,
      size: filtered.length,
      pages: 1,
    };
  }

  return { items, total, page, size, pages };
}

export type ReportRow = {
  id: string;
  report_type: string;
  report_date: string;
  summary_text: string;
  download_url: string | null;
  storage_path: string | null;
  created_at: string;
};

export async function getReportsFromSupabase(type?: string): Promise<ReportRow[]> {
  if (!hasSupabaseAdminConfig()) return [];
  const supabase = getSupabaseAdminClient();
  let query = supabase
    .from("reports")
    .select("id,report_type,report_date,summary_text,download_url,storage_path,created_at")
    .order("report_date", { ascending: false });
  if (type) query = query.eq("report_type", type);
  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as ReportRow[];
}

export type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
};

export async function getUsersFromSupabase(): Promise<UserRow[]> {
  if (!hasSupabaseAdminConfig()) return [];
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("id,email,name,role,is_active")
    .order("name");
  if (error) return [];
  return (data ?? []) as UserRow[];
}
