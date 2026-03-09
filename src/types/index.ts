// Source and severity enums (match schema.sql)
export type SourceType = "tv" | "print" | "online" | "youtube" | "upload";
export type UploadSubType = "image" | "whatsapp" | "manual";
export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type Sentiment = "positive" | "negative" | "neutral" | "mixed";
export type SwotTag = "strength" | "weakness" | "opportunity" | "threat";
export type ClipMediaType = "youtube" | "file" | "url" | "none";
export type ContentLanguage =
  | "hindi"
  | "english"
  | "urdu"
  | "bhojpuri"
  | "awadhi"
  | "mixed"
  | "other";
export type EntryStatus = "draft" | "submitted" | "reviewed" | "archived";
export type ToneType =
  | "critical"
  | "neutral"
  | "supportive"
  | "sensational"
  | "factual"
  | "propaganda"
  | "mixed";
export type VerificationStatus =
  | "verified"
  | "unverified"
  | "partially_verified";
export type ActionTarget =
  | "alert_dm"
  | "alert_police"
  | "alert_cm_office"
  | "media_response"
  | "monitor"
  | "ignore";

export interface ClipAIInsights {
  short_summary: string;
  expanded_summary: string;
  narrative_analysis: string;
  risk_points: string[];
  misinformation_checks: string[];
  key_entities: string[];
  recommended_actions: string[];
  model_name: string;
  generated_at: string;
}

export interface Article {
  id: string;
  title: string | null;
  content: string;
  summary_english: string;
  summary_hindi: string;
  url: string;
  source_name: string;
  source_type: SourceType;
  published_at: string;
  /** Same as created_at in DB; alias for compatibility */
  ingested_at: string;
  /** Schema: content_language */
  language: string;
  sentiment: Sentiment;
  sentiment_score: number;
  severity: Severity | null;
  districts_mentioned: string[];
  /** Schema: persons_named (entities minister/official) */
  persons_named: string[];
  /** Schema: schemes_referenced (entities scheme) */
  schemes_referenced: string[];
  /** Schema: departments_mentioned (entities department) */
  departments_mentioned: string[];
  topics: string[];
  is_law_order: boolean;
  risk_flag: boolean;
  swot_tag: SwotTag | null;
  misinformation_signal: boolean;
  alerted: boolean;
  youtube_video_id: string | null;
  youtube_timestamp: number | null;
  keywords_matched: string[];
  severity_analyst?: Severity | null;
  severity_ai?: Severity | null;
  upload_section?: "online" | "tv" | null;
  upload_category?: string | null;
  media_type?: ClipMediaType;
  media_url?: string | null;
  media_storage_path?: string | null;
  media_mime_type?: string | null;
  media_duration_seconds?: number | null;
  tv_telecast_date?: string | null;
  tv_telecast_time?: string | null;
  tv_program?: string | null;
  tv_personality?: string | null;
  ai_insights?: ClipAIInsights | null;
  // --- Schema-aligned optional fields (articles table)
  analyst_id?: string | null;
  entry_status?: EntryStatus;
  upload_sub_type?: UploadSubType | null;
  source_id?: string | null;
  content_language?: ContentLanguage;
  analyst_synopsis?: string;
  divisions_mentioned?: string[];
  constituency_vidhan_sabha?: string[];
  constituency_lok_sabha?: string[];
  /** incident_categories by name (not UUID) */
  incident_category_ids?: string[];
  tone?: ToneType | null;
  verification_status?: VerificationStatus;
  action_required?: ActionTarget[];
  internal_notes?: string | null;
  viral_risk_score?: number;
  type_metadata?: Record<string, unknown>;
  created_at?: string;
  // Backward compat: map to persons_named / schemes_referenced in repo when reading from articles
  /** @deprecated Use persons_named */
  politicians_mentioned?: string[];
  /** @deprecated Use schemes_referenced */
  schemes_mentioned?: string[];
}

export interface AlertRecord {
  id: string;
  article_id: string;
  severity: Severity;
  channels: string[];
  message_body: string;
  sent_at: string;
  article?: Article;
}

export type KeywordCategory =
  | "governance"
  | "law_order"
  | "districts"
  | "officials"
  | "schemes";
export type KeywordStatus = "pending" | "active" | "rejected";

export interface Keyword {
  id: string;
  term: string;
  term_hindi: string | null;
  category: KeywordCategory;
  variants: string[];
  is_active: boolean;
  status: KeywordStatus;
  created_at: string;
}

export interface Source {
  id: string;
  name: string;
  url: string;
  source_type: SourceType;
  rss_url: string | null;
  youtube_channel_id: string | null;
  is_active: boolean;
  last_scraped_at: string | null;
  error_count: number;
}

export type UserRole = "ADMIN" | "ANALYST" | "VIEWER";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  is_active: boolean;
}

export interface Report {
  id: string;
  report_type: "daily" | "weekly" | "monthly" | "selected";
  report_date: string;
  summary_text: string;
  download_url: string;
  created_at: string;
}

export interface DistrictRisk {
  district: string;
  district_hindi: string;
  risk_score: number;
  article_count: number;
  critical_count: number;
  high_count: number;
  dominant_sentiment: Sentiment;
  top_topics: string[];
  latest_headline: string | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface ArticleFilters {
  page?: number;
  size?: number;
  date_from?: string;
  date_to?: string;
  source_type?: SourceType | "";
  severity?: Severity | "";
  district?: string;
  sentiment?: Sentiment | "";
  search?: string;
  source_name?: string;
  entity?: string;
}

// Analytics response types
export interface SentimentTrendPoint {
  timestamp: string;
  positive: number;
  negative: number;
  neutral: number;
  mixed?: number;
}

export interface TopicDistributionItem {
  topic: string;
  count: number;
}

export interface SourceVolumeItem {
  source_name: string;
  source_type: SourceType;
  count: number;
}

export interface EntityCooccurrenceNode {
  id: string;
  label: string;
  type: "politicians" | "districts" | "schemes";
  count: number;
}

export interface EntityCooccurrenceLink {
  source: string;
  target: string;
  weight: number;
}

export interface EntityCooccurrenceData {
  nodes: EntityCooccurrenceNode[];
  links: EntityCooccurrenceLink[];
}

// TV channel
export interface TVChannel {
  id: string;
  name: string;
  youtube_channel_id: string | null;
  is_active: boolean;
  is_live?: boolean;
  last_checked: string | null;
  last_transcript: string | null;
  today_severity: Severity | null;
}

// System status
export interface SystemStatus {
  monitoring_active: boolean;
  last_ingest: string | null;
  active_sources: number;
  queued_jobs: number;
}
