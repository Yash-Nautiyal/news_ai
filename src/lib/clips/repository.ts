import type {
  Article,
  ArticleFilters,
  DistrictRisk,
  EntityCooccurrenceData,
  EntityCooccurrenceLink,
  EntityCooccurrenceNode,
  PaginatedResponse,
  Severity,
  SentimentTrendPoint,
  Source,
  SourceVolumeItem,
  TVChannel,
  TopicDistributionItem,
} from "@/types";
import {
  MOCK_ARTICLES,
  MOCK_ENTITY_GRAPH,
  MOCK_TV_CHANNELS,
} from "@/lib/mockData";
import {
  getClipBucketName,
  getSupabaseAdminClient,
  hasSupabaseAdminConfig,
} from "@/lib/supabase/admin";
import {
  getArticleByIdFromSupabase,
  getArticlesForAnalyticsFromSupabase,
  getArticlesPageFromSupabase,
  useSupabaseArticles,
} from "@/lib/supabase/articles";
import { normalizeEntity } from "./utils";

/**
 * Schema handoff: When using the `articles` table (schema.sql), use column names:
 * persons_named, schemes_referenced, departments_mentioned, content_language,
 * analyst_synopsis, created_at. Do NOT set divisions_mentioned or severity (triggers).
 * See SCHEMA_HANDOFF_CHECKLIST.md.
 *
 * Current implementation reads from the legacy "clips" table (with clip_media, etc.).
 * When migrating to `articles`: select from "articles", map url <- articles.url,
 * ingested_at <- articles.created_at, and use persons_named/schemes_referenced
 * (and departments_mentioned) directly from the row.
 */

type ClipRow = {
  id: string;
  title: string | null;
  content: string;
  summary_english: string;
  summary_hindi: string;
  source_url: string | null;
  source_name: string;
  source_type: Article["source_type"];
  upload_section: "online" | "tv" | null;
  upload_category: string | null;
  language: string;
  sentiment: Article["sentiment"];
  sentiment_score: number;
  severity_analyst: Severity | null;
  severity_ai: Severity | null;
  districts_mentioned: string[] | null;
  politicians_mentioned?: string[] | null;
  schemes_mentioned?: string[] | null;
  persons_named?: string[] | null;
  schemes_referenced?: string[] | null;
  departments_mentioned?: string[] | null;
  topics: string[] | null;
  is_law_order: boolean;
  risk_flag: boolean;
  swot_tag: Article["swot_tag"];
  misinformation_signal: boolean;
  alerted: boolean;
  keywords_matched: string[] | null;
  published_at: string;
  ingested_at: string;
  clip_media?: ClipMediaRow[] | null;
  tv_clip_metadata?: TVClipMetadataRow[] | TVClipMetadataRow | null;
  clip_ai_insights?: ClipAIInsightRow[] | ClipAIInsightRow | null;
};

type ClipMediaRow = {
  media_type: "youtube" | "file" | "url" | "none";
  youtube_video_id: string | null;
  youtube_timestamp: number | null;
  media_url: string | null;
  storage_path: string | null;
  mime_type: string | null;
  duration_seconds: number | null;
  file_name: string | null;
};

type TVClipMetadataRow = {
  telecast_date: string | null;
  telecast_time: string | null;
  program: string | null;
  personality: string | null;
  description: string | null;
  duration_seconds: number | null;
};

type ClipAIInsightRow = {
  short_summary: string | null;
  expanded_summary: string | null;
  narrative_analysis: string | null;
  risk_points: unknown;
  misinformation_checks: unknown;
  key_entities: unknown;
  recommended_actions: unknown;
  model_name: string | null;
  generated_at: string | null;
};

function firstRelation<T>(value: T[] | T | null | undefined): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function parseStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  }
  return [];
}

function severityRank(value: string | null | undefined) {
  if (value === "CRITICAL") return 4;
  if (value === "HIGH") return 3;
  if (value === "MEDIUM") return 2;
  if (value === "LOW") return 1;
  return 0;
}

async function loadRawClipRows() {
  if (!hasSupabaseAdminConfig()) return null;

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("clips")
    .select(
      "*, clip_media(media_type,youtube_video_id,youtube_timestamp,media_url,storage_path,mime_type,duration_seconds,file_name), tv_clip_metadata(telecast_date,telecast_time,program,personality,description,duration_seconds), clip_ai_insights(short_summary,expanded_summary,narrative_analysis,risk_points,misinformation_checks,key_entities,recommended_actions,model_name,generated_at)",
    )
    .order("published_at", { ascending: false });

  if (error) throw new Error(error.message);
  return {
    supabase,
    rows: (data || []) as ClipRow[],
  };
}

function toArticleFromMock(article: Article): Article {
  return {
    ...article,
    severity_analyst: article.severity,
    severity_ai: null,
    upload_section:
      article.source_type === "tv"
        ? "tv"
        : article.source_type === "upload"
          ? "online"
          : null,
    upload_category: null,
    media_type: article.youtube_video_id ? "youtube" : "none",
    media_url: article.youtube_video_id
      ? `https://www.youtube.com/watch?v=${article.youtube_video_id}`
      : null,
    media_storage_path: null,
    media_mime_type: null,
    media_duration_seconds: null,
    tv_telecast_date: null,
    tv_telecast_time: null,
    tv_program: null,
    tv_personality: null,
    ai_insights: null,
  };
}

function toArticleFromRow(row: ClipRow, clipBucket: string): Article {
  const media = firstRelation(row.clip_media) as ClipMediaRow | null;
  const tvMeta = firstRelation(row.tv_clip_metadata) as TVClipMetadataRow | null;
  const ai = firstRelation(row.clip_ai_insights) as ClipAIInsightRow | null;
  const supabase = getSupabaseAdminClient();

  const mediaUrl =
    media?.media_type === "file" && media.storage_path
      ? supabase.storage.from(clipBucket).getPublicUrl(media.storage_path).data
          .publicUrl
      : media?.media_url || null;

  const personsNamed = parseStringArray(
    row.persons_named ?? row.politicians_mentioned,
  );
  const schemesRef = parseStringArray(
    row.schemes_referenced ?? row.schemes_mentioned,
  );
  const deptsMentioned = parseStringArray(row.departments_mentioned);

  return {
    id: row.id,
    title: row.title,
    content: row.content || "",
    summary_english: row.summary_english || "",
    summary_hindi: row.summary_hindi || "",
    url: row.source_url || mediaUrl || `https://local.clip/${row.id}`,
    source_name: row.source_name || "Unknown source",
    source_type: row.source_type || "online",
    published_at: row.published_at || new Date().toISOString(),
    ingested_at: row.ingested_at || row.published_at || new Date().toISOString(),
    language: row.language || "en",
    sentiment: row.sentiment || "neutral",
    sentiment_score:
      typeof row.sentiment_score === "number" ? row.sentiment_score : 50,
    severity: row.severity_analyst || row.severity_ai || null,
    districts_mentioned: parseStringArray(row.districts_mentioned),
    persons_named: personsNamed,
    schemes_referenced: schemesRef,
    departments_mentioned: deptsMentioned,
    topics: parseStringArray(row.topics),
    is_law_order: Boolean(row.is_law_order),
    risk_flag: Boolean(row.risk_flag),
    swot_tag: row.swot_tag || null,
    misinformation_signal: Boolean(row.misinformation_signal),
    alerted: Boolean(row.alerted),
    youtube_video_id: media?.youtube_video_id || null,
    youtube_timestamp: media?.youtube_timestamp || null,
    keywords_matched: parseStringArray(row.keywords_matched),
    severity_analyst: row.severity_analyst || null,
    severity_ai: row.severity_ai || null,
    upload_section: row.upload_section || null,
    upload_category: row.upload_category || null,
    media_type: media?.media_type || "none",
    media_url: mediaUrl,
    media_storage_path: media?.storage_path || null,
    media_mime_type: media?.mime_type || null,
    media_duration_seconds: media?.duration_seconds || null,
    tv_telecast_date: tvMeta?.telecast_date || null,
    tv_telecast_time: tvMeta?.telecast_time || null,
    tv_program: tvMeta?.program || null,
    tv_personality: tvMeta?.personality || null,
    ai_insights: ai
      ? {
          short_summary: ai.short_summary || "",
          expanded_summary: ai.expanded_summary || "",
          narrative_analysis: ai.narrative_analysis || "",
          risk_points: parseStringArray(ai.risk_points),
          misinformation_checks: parseStringArray(ai.misinformation_checks),
          key_entities: parseStringArray(ai.key_entities),
          recommended_actions: parseStringArray(ai.recommended_actions),
          model_name: ai.model_name || "",
          generated_at: ai.generated_at || new Date().toISOString(),
        }
      : null,
    politicians_mentioned: personsNamed,
    schemes_mentioned: schemesRef,
  };
}

export async function getAllArticles() {
  if (useSupabaseArticles()) {
    return getArticlesForAnalyticsFromSupabase();
  }
  const raw = await loadRawClipRows();
  if (!raw) return MOCK_ARTICLES.map(toArticleFromMock);
  const clipBucket = getClipBucketName();
  return raw.rows.map((row) => toArticleFromRow(row, clipBucket));
}

function filterArticles(
  items: Article[],
  filters: ArticleFilters & { entity?: string },
) {
  return items.filter((item) => {
    if (filters.source_type && item.source_type !== filters.source_type)
      return false;
    if (filters.severity && item.severity !== filters.severity) return false;
    if (filters.sentiment && item.sentiment !== filters.sentiment) return false;
    if (
      filters.source_name &&
      !item.source_name.toLowerCase().includes(filters.source_name.toLowerCase())
    ) {
      return false;
    }
    if (
      filters.district &&
      !item.districts_mentioned.some((district) =>
        district.toLowerCase().includes(filters.district!.toLowerCase()),
      )
    ) {
      return false;
    }
    if (filters.date_from) {
      const from = new Date(filters.date_from).getTime();
      if (new Date(item.published_at).getTime() < from) return false;
    }
    if (filters.date_to) {
      const endDate = new Date(filters.date_to);
      endDate.setHours(23, 59, 59, 999);
      if (new Date(item.published_at).getTime() > endDate.getTime()) return false;
    }

    if (filters.search) {
      const haystack = [
        item.title || "",
        item.content || "",
        item.summary_english || "",
        item.summary_hindi || "",
        item.source_name || "",
        ...item.topics,
        ...item.keywords_matched,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(filters.search.toLowerCase())) return false;
    }

    if (filters.entity) {
      const normalized = normalizeEntity(filters.entity);
      const entities = [
        ...item.persons_named,
        ...item.districts_mentioned,
        ...item.schemes_referenced,
        ...item.keywords_matched,
      ].map(normalizeEntity);
      if (!entities.includes(normalized)) return false;
    }

    return true;
  });
}

export async function getArticlesPage(
  filters: ArticleFilters & { entity?: string },
): Promise<PaginatedResponse<Article>> {
  if (useSupabaseArticles()) {
    return getArticlesPageFromSupabase(filters);
  }
  const all = await getAllArticles();
  const filtered = filterArticles(all, filters).sort(
    (a, b) =>
      new Date(b.published_at).getTime() - new Date(a.published_at).getTime(),
  );

  const page = Math.max(1, Number(filters.page) || 1);
  const size = Math.max(1, Number(filters.size) || 25);
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const start = (page - 1) * size;
  const items = filtered.slice(start, start + size);

  return {
    items,
    total,
    page,
    size,
    pages,
  };
}

export async function getArticleById(id: string) {
  if (useSupabaseArticles()) {
    return getArticleByIdFromSupabase(id);
  }
  const found = MOCK_ARTICLES.find((a) => a.id === id);
  return found ? toArticleFromMock(found) : null;
}

export async function getSimilarArticles(articleId: string) {
  const all = await getAllArticles();
  const current = all.find((article) => article.id === articleId);
  if (!current) return [];

  const scored = all
    .filter((article) => article.id !== articleId)
    .map((candidate) => {
      let score = 0;
      if (candidate.source_type === current.source_type) score += 1;
      score += candidate.districts_mentioned.filter((district) =>
        current.districts_mentioned.includes(district),
      ).length;
      score += candidate.topics.filter((topic) => current.topics.includes(topic))
        .length;
      score += candidate.keywords_matched.filter((keyword) =>
        current.keywords_matched.includes(keyword),
      ).length;
      return { candidate, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((item) => item.candidate);

  return scored;
}

function periodMs(period?: string) {
  if (period === "24h") return 24 * 60 * 60 * 1000;
  if (period === "30d") return 30 * 24 * 60 * 60 * 1000;
  return 7 * 24 * 60 * 60 * 1000;
}

function filterByPeriod(articles: Article[], period?: string) {
  const now = Date.now();
  const maxAge = periodMs(period);
  return articles.filter(
    (article) => now - new Date(article.published_at).getTime() <= maxAge,
  );
}

export async function getSeverityDistribution(period?: string) {
  const articles = filterByPeriod(await getAllArticles(), period);
  const result: Record<string, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  };
  for (const article of articles) {
    if (article.severity) result[article.severity] += 1;
  }
  return result;
}

export async function getSourceVolume(period?: string): Promise<SourceVolumeItem[]> {
  const articles = filterByPeriod(await getAllArticles(), period);
  const map = new Map<string, SourceVolumeItem>();
  for (const article of articles) {
    const key = `${article.source_name}__${article.source_type}`;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(key, {
        source_name: article.source_name,
        source_type: article.source_type,
        count: 1,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 15);
}

export async function getTopicDistribution(
  period?: string,
): Promise<TopicDistributionItem[]> {
  const articles = filterByPeriod(await getAllArticles(), period);
  const map = new Map<string, number>();
  for (const article of articles) {
    for (const topic of article.topics) {
      map.set(topic, (map.get(topic) || 0) + 1);
    }
  }
  return Array.from(map.entries())
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getKeywordTrending(period?: string) {
  const articles = filterByPeriod(await getAllArticles(), period);
  const map = new Map<string, number>();
  for (const article of articles) {
    for (const keyword of article.keywords_matched) {
      map.set(keyword, (map.get(keyword) || 0) + 1);
    }
  }
  return Array.from(map.entries())
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50);
}

export async function getSentimentTrend(period?: string): Promise<SentimentTrendPoint[]> {
  const articles = filterByPeriod(await getAllArticles(), period);
  const bucketByHour = period === "24h";
  const buckets = new Map<
    string,
    { positive: number; negative: number; neutral: number; mixed: number }
  >();

  for (const article of articles) {
    const date = new Date(article.published_at);
    if (bucketByHour) {
      date.setMinutes(0, 0, 0);
    } else {
      date.setHours(0, 0, 0, 0);
    }
    const key = date.toISOString();
    const bucket = buckets.get(key) || { positive: 0, negative: 0, neutral: 0, mixed: 0 };
    const s = article.sentiment;
    if (s === "positive" || s === "negative" || s === "neutral" || s === "mixed") {
      bucket[s] += 1;
    }
    buckets.set(key, bucket);
  }

  return Array.from(buckets.entries())
    .map(([timestamp, value]) => ({
      timestamp,
      positive: value.positive,
      negative: value.negative,
      neutral: value.neutral,
      mixed: value.mixed,
    }))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

export async function getDistrictRisk(): Promise<DistrictRisk[]> {
  const articles = await getAllArticles();
  const grouped = new Map<
    string,
    {
      items: Article[];
      sentiment: Record<"positive" | "negative" | "neutral" | "mixed", number>;
      topics: Map<string, number>;
    }
  >();

  for (const article of articles) {
    for (const district of article.districts_mentioned) {
      const entry = grouped.get(district) || {
        items: [],
        sentiment: { positive: 0, negative: 0, neutral: 0, mixed: 0 },
        topics: new Map<string, number>(),
      };
      entry.items.push(article);
      const s = article.sentiment;
      if (s === "positive" || s === "negative" || s === "neutral" || s === "mixed") {
        entry.sentiment[s] += 1;
      }
      for (const topic of article.topics) {
        entry.topics.set(topic, (entry.topics.get(topic) || 0) + 1);
      }
      grouped.set(district, entry);
    }
  }

  return Array.from(grouped.entries())
    .map(([district, value]) => {
      const criticalCount = value.items.filter((item) => item.severity === "CRITICAL")
        .length;
      const highCount = value.items.filter((item) => item.severity === "HIGH").length;
      const riskScore = Math.min(
        100,
        criticalCount * 25 + highCount * 12 + value.items.length * 2,
      );
      const dominantSentiment =
        Object.entries(value.sentiment).sort((a, b) => b[1] - a[1])[0]?.[0] ||
        "neutral";
      const topTopics = Array.from(value.topics.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([topic]) => topic);
      const latest = value.items.sort(
        (a, b) =>
          new Date(b.published_at).getTime() - new Date(a.published_at).getTime(),
      )[0];

      return {
        district,
        district_hindi: district,
        risk_score: riskScore,
        article_count: value.items.length,
        critical_count: criticalCount,
        high_count: highCount,
        dominant_sentiment: dominantSentiment as Article["sentiment"],
        top_topics: topTopics,
        latest_headline: latest?.title || null,
      };
    })
    .sort((a, b) => b.risk_score - a.risk_score);
}

export async function getSources(): Promise<Source[]> {
  const articles = await getAllArticles();
  const grouped = new Map<
    string,
    {
      source_type: Article["source_type"];
      latest: string;
      count: number;
    }
  >();

  for (const article of articles) {
    const key = article.source_name;
    const current = grouped.get(key);
    if (!current) {
      grouped.set(key, {
        source_type: article.source_type,
        latest: article.ingested_at,
        count: 1,
      });
      continue;
    }
    current.count += 1;
    if (new Date(article.ingested_at) > new Date(current.latest)) {
      current.latest = article.ingested_at;
    }
  }

  return Array.from(grouped.entries()).map(([name, value], idx) => ({
    id: `source-${idx + 1}`,
    name,
    url: "",
    source_type: value.source_type,
    rss_url: null,
    youtube_channel_id: null,
    is_active: true,
    last_scraped_at: value.latest,
    error_count: 0,
  }));
}

export async function getTVChannels(): Promise<TVChannel[]> {
  const articles = await getAllArticles();
  const tvArticles = articles.filter(
    (article) => article.source_type === "tv" || article.upload_section === "tv",
  );

  if (!tvArticles.length) return MOCK_TV_CHANNELS;

  const grouped = new Map<string, Article[]>();
  for (const article of tvArticles) {
    const key = article.source_name || "Unknown TV Source";
    const list = grouped.get(key) || [];
    list.push(article);
    grouped.set(key, list);
  }

  return Array.from(grouped.entries()).map(([channelName, items]) => {
    const sorted = [...items].sort(
      (a, b) =>
        new Date(b.ingested_at).getTime() - new Date(a.ingested_at).getTime(),
    );
    const latest = sorted[0];
    const topSeverity = [...items]
      .filter((item) => item.severity)
      .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))[0]
      ?.severity;

    return {
      id: channelName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name: channelName,
      youtube_channel_id: null,
      is_active: true,
      is_live: true,
      last_checked: latest?.ingested_at || latest?.published_at || null,
      last_transcript:
        latest?.summary_english || latest?.content?.slice(0, 300) || null,
      today_severity: topSeverity || null,
    };
  });
}

export async function getEntityCooccurrence(
  period?: string,
  minWeight = 1,
): Promise<EntityCooccurrenceData> {
  const articles = filterByPeriod(await getAllArticles(), period);
  if (!articles.length) return MOCK_ENTITY_GRAPH;

  if (hasSupabaseAdminConfig()) {
    const clipIds = articles.map((article) => article.id);
    if (clipIds.length > 0) {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from("clip_entities")
        .select("clip_id,entity_type,entity_value,normalized_value")
        .in("clip_id", clipIds);

      if (!error && data) {
        const relevant = data.filter((row) =>
          ["person", "district", "scheme"].includes(row.entity_type),
        );
        const byClip = new Map<
          string,
          Array<{
            id: string;
            label: string;
            type: EntityCooccurrenceNode["type"];
          }>
        >();
        const nodeMap = new Map<
          string,
          EntityCooccurrenceNode & { clipIds: Set<string> }
        >();

        for (const row of relevant) {
          const type: EntityCooccurrenceNode["type"] =
            row.entity_type === "person"
              ? "politicians"
              : row.entity_type === "district"
                ? "districts"
                : "schemes";
          const id = row.normalized_value;
          const label = row.entity_value;
          const list = byClip.get(row.clip_id) || [];
          if (!list.some((item) => item.id === id)) {
            list.push({ id, label, type });
            byClip.set(row.clip_id, list);
          }

          const existing = nodeMap.get(id);
          if (existing) {
            existing.clipIds.add(row.clip_id);
          } else {
            nodeMap.set(id, {
              id,
              label,
              type,
              count: 1,
              clipIds: new Set([row.clip_id]),
            });
          }
        }

        const linkCounter = new Map<string, number>();
        byClip.forEach((items) => {
          for (let i = 0; i < items.length; i += 1) {
            for (let j = i + 1; j < items.length; j += 1) {
              const key = [items[i].id, items[j].id].sort().join("__");
              linkCounter.set(key, (linkCounter.get(key) || 0) + 1);
            }
          }
        });

        const nodes: EntityCooccurrenceNode[] = Array.from(nodeMap.values()).map(
          (node) => ({
            id: node.id,
            label: node.label,
            type: node.type,
            count: node.clipIds.size,
          }),
        );
        const links: EntityCooccurrenceLink[] = Array.from(
          linkCounter.entries(),
        ).flatMap(([key, weight]) => {
          if (weight < minWeight) return [];
          const [source, target] = key.split("__");
          return [{ source, target, weight }];
        });

        return { nodes, links };
      }
    }
  }

  const nodeCounter = new Map<string, EntityCooccurrenceNode>();
  const linkCounter = new Map<string, number>();

  const trackNode = (
    id: string,
    label: string,
    type: EntityCooccurrenceNode["type"],
  ) => {
    const existing = nodeCounter.get(id);
    if (existing) {
      existing.count += 1;
      return;
    }
    nodeCounter.set(id, { id, label, type, count: 1 });
  };

  for (const article of articles) {
    const entities: Array<{
      id: string;
      label: string;
      type: EntityCooccurrenceNode["type"];
    }> = [];

    article.persons_named.forEach((person) => {
      const id = normalizeEntity(person);
      entities.push({ id, label: person, type: "politicians" });
      trackNode(id, person, "politicians");
    });
    article.districts_mentioned.forEach((district) => {
      const id = normalizeEntity(district);
      entities.push({ id, label: district, type: "districts" });
      trackNode(id, district, "districts");
    });
    article.schemes_referenced.forEach((scheme) => {
      const id = normalizeEntity(scheme);
      entities.push({ id, label: scheme, type: "schemes" });
      trackNode(id, scheme, "schemes");
    });

    for (let i = 0; i < entities.length; i += 1) {
      for (let j = i + 1; j < entities.length; j += 1) {
        const key = [entities[i].id, entities[j].id].sort().join("__");
        linkCounter.set(key, (linkCounter.get(key) || 0) + 1);
      }
    }
  }

  const links: EntityCooccurrenceLink[] = Array.from(linkCounter.entries())
    .flatMap(([key, weight]) => {
      if (weight < minWeight) return [];
      const [source, target] = key.split("__");
      return [{ source, target, weight }];
    });

  return {
    nodes: Array.from(nodeCounter.values()),
    links,
  };
}
