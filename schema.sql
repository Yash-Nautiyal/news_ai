-- =============================================================================
-- DIPR MEDIA INTELLIGENCE PLATFORM — SUPABASE SCHEMA
-- Source of truth: DIPR_Media_Intelligence_Master.docx + index.ts + constants.ts
-- No RLS policies — add separately
-- =============================================================================
--
-- EXTENSIBILITY DESIGN:
--   People (ministers, officials) → `entities` table, category = 'person'
--   Departments                   → `entities` table, category = 'department'
--   Schemes                       → `entities` table, category = 'scheme'
--   TV channels / print sources   → `media_sources` table
--   Crime/incident categories     → `incident_categories` table
--   Geo (divisions/districts/
--     constituencies)             → `geo_districts`, `geo_constituencies`
--
--   ALL of these are admin-manageable via CRUD — no code changes needed.
--   The `articles` table references them via text arrays (flexible) or FK where needed.
--
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";


-- ─────────────────────────────────────────────────────────────────────────────
-- ENUMS  (exactly matching index.ts + every dropdown in the doc)
-- ─────────────────────────────────────────────────────────────────────────────

-- Matches SourceType in index.ts exactly
CREATE TYPE source_type AS ENUM (
  'tv', 'print', 'online', 'youtube', 'upload'
);

-- 'upload' sub-types (image / whatsapp / manual)
CREATE TYPE upload_sub_type AS ENUM (
  'image', 'whatsapp', 'manual'
);

-- Matches Severity in index.ts exactly
CREATE TYPE severity_level AS ENUM (
  'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'
);

-- Matches Sentiment in index.ts + 'mixed' (all 4 appear in doc Section 4.4)
CREATE TYPE sentiment_type AS ENUM (
  'positive', 'negative', 'neutral', 'mixed'
);

-- Matches SwotTag in index.ts exactly
CREATE TYPE swot_tag AS ENUM (
  'strength', 'weakness', 'opportunity', 'threat'
);

-- Matches ClipMediaType in index.ts exactly
CREATE TYPE clip_media_type AS ENUM (
  'youtube', 'file', 'url', 'none'
);

-- Matches Report.report_type in index.ts exactly
CREATE TYPE report_type AS ENUM (
  'daily', 'weekly', 'monthly'
);

-- Matches UserRole in index.ts exactly
CREATE TYPE user_role AS ENUM (
  'ADMIN', 'ANALYST', 'VIEWER'
);

-- Tone — from Section 4.1 common fields dropdown in doc
CREATE TYPE tone_type AS ENUM (
  'critical', 'neutral', 'supportive', 'sensational', 'factual', 'propaganda', 'mixed'
);

-- Verification — from Section 4.1 common fields
CREATE TYPE verification_status AS ENUM (
  'verified', 'unverified', 'partially_verified'
);

-- Entry workflow
CREATE TYPE entry_status AS ENUM (
  'draft', 'submitted', 'reviewed', 'archived'
);

-- Content language — from Section 4.1 dropdown in doc
CREATE TYPE content_language AS ENUM (
  'hindi', 'english', 'urdu', 'bhojpuri', 'awadhi', 'mixed', 'other'
);

-- TV broadcast slot — from Section 4.2.1
CREATE TYPE broadcast_slot AS ENUM (
  'prime_time', 'morning', 'daytime', 'afternoon', 'night', 'late_night', 'breaking_news'
);

-- TV/YouTube channel type — from Section 4.2.1 + 4.2.4
CREATE TYPE channel_type AS ENUM (
  'national', 'regional'
);

-- Source tier — from Section 4.2.2 online fields
CREATE TYPE source_tier AS ENUM (
  'national', 'state', 'district', 'hyperlocal'
);

-- Print column position — from Section 4.2.3
CREATE TYPE column_position AS ENUM (
  'left', 'center', 'right', 'box', 'lead'
);

-- Print headline size — from Section 4.2.3
CREATE TYPE headline_size AS ENUM (
  'banner', 'multi_column', 'single_column', 'brief'
);

-- YouTube video type — from Section 4.2.4
CREATE TYPE youtube_video_type AS ENUM (
  'full_video', 'short', 'live', 'premiere'
);

-- YouTube channel classification — from Section 4.2.4
CREATE TYPE youtube_channel_type AS ENUM (
  'official_goup', 'media', 'citizen', 'political', 'other'
);

-- Image source platform — from Section 4.2.5
CREATE TYPE image_source_platform AS ENUM (
  'whatsapp', 'facebook', 'twitter', 'instagram', 'telegram',
  'news_photo', 'unknown', 'other'
);

-- Image type — from Section 4.2.5
CREATE TYPE image_type AS ENUM (
  'photograph', 'infographic', 'meme', 'screenshot', 'poster', 'cartoon', 'other'
);

-- Image authenticity — from Section 4.2.5
CREATE TYPE image_authenticity AS ENUM (
  'verified_real', 'suspected_fake', 'confirmed_fake', 'unknown'
);

-- Original vs edited — from Section 4.2.5
CREATE TYPE image_edit_status AS ENUM (
  'original', 'edited', 'unknown'
);

-- WhatsApp content type — from Section 4.2.6
CREATE TYPE whatsapp_content_type AS ENUM (
  'text_message', 'image', 'video_thumbnail', 'audio_transcript', 'forward_chain'
);

-- WhatsApp forwarded as — from Section 4.2.6
CREATE TYPE whatsapp_forward_type AS ENUM (
  'first_hand', 'forward', 'viral_forward'
);

-- WhatsApp reach estimate — from Section 4.2.6
CREATE TYPE reach_estimate AS ENUM (
  'local', 'district', 'divisional', 'state_wide', 'unknown'
);

-- WhatsApp content classification — from Section 4.2.6
CREATE TYPE whatsapp_classification AS ENUM (
  'rumour', 'genuine_alert', 'political_message', 'criminal_threat',
  'public_complaint', 'government_communication', 'misinformation', 'other'
);

-- Manual entry report type — from Section 4.2.7
CREATE TYPE manual_report_type AS ENUM (
  'field_intelligence', 'inter_department_note', 'verbal_report', 'complaint', 'other'
);

-- Manual urgency — from Section 4.2.7
CREATE TYPE urgency_level AS ENUM (
  'immediate', 'within_24hrs', 'routine', 'fyi'
);

-- Manual confidentiality — from Section 4.2.7
CREATE TYPE confidentiality_level AS ENUM (
  'open', 'restricted', 'confidential'
);

-- Article category (online) — from Section 4.2.2
CREATE TYPE article_category AS ENUM (
  'politics', 'crime', 'health', 'education', 'economy', 'development', 'other'
);

-- Action required targets — from Section 4.1
CREATE TYPE action_target AS ENUM (
  'alert_dm', 'alert_police', 'alert_cm_office', 'media_response', 'monitor', 'ignore'
);

-- WhatsApp action flagged — from Section 4.2.6
CREATE TYPE whatsapp_action AS ENUM (
  'alert_police', 'alert_dm', 'monitor', 'respond_publicly', 'ignore'
);

-- Alert dispatch channel
CREATE TYPE alert_channel AS ENUM (
  'whatsapp', 'sms', 'dashboard'
);

-- Entity category (people, departments, schemes — all in one managed table)
CREATE TYPE entity_category AS ENUM (
  'minister',       -- cabinet ministers, CM, DyCM
  'official',       -- IAS/IPS officers, DMs, SSPs, commissioners
  'department',     -- UP government departments & bodies
  'scheme',         -- UP government schemes & programmes
  'organisation'    -- political parties, PSUs, boards, commissions
);


-- ─────────────────────────────────────────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id     UUID UNIQUE,   -- links to auth.users(id); REFERENCES added after auth schema exists
  email       TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  role        user_role NOT NULL DEFAULT 'VIEWER',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.users IS
  'Platform users. role controls upload permissions and dashboard access. '
  'ADMIN = full CRUD + keyword management. ANALYST = upload + edit own. VIEWER = read-only.';


-- ─────────────────────────────────────────────────────────────────────────────
-- ENTITIES  (ministers, officials, departments, schemes — all admin-managed)
-- ─────────────────────────────────────────────────────────────────────────────
-- This is the SINGLE table for everything that appears in the dropdowns:
--   "Person(s) Named", "Scheme / Programme Referenced", keyword taxonomy cats A/B/C.
-- Add new ministers, new schemes, new departments via admin UI — no code changes.

CREATE TABLE public.entities (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,                 -- canonical English name
  name_hindi    TEXT,                          -- Hindi name
  category      entity_category NOT NULL,
  sub_category  TEXT,                          -- e.g. 'cabinet_minister', 'ias_officer', 'psu'
  portfolio     TEXT,                          -- for ministers: their portfolio
  aliases       TEXT[] NOT NULL DEFAULT '{}', -- alternate spellings, abbreviations, honorifics
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    INTEGER NOT NULL DEFAULT 0,    -- controls dropdown order
  metadata      JSONB NOT NULL DEFAULT '{}',  -- flexible extra fields per category
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (name, category)
);

CREATE INDEX idx_entities_category   ON public.entities(category);
CREATE INDEX idx_entities_active     ON public.entities(is_active);
CREATE INDEX idx_entities_name_trgm  ON public.entities USING GIN (name gin_trgm_ops);
CREATE INDEX idx_entities_aliases    ON public.entities USING GIN (aliases);

COMMENT ON TABLE public.entities IS
  'Master list of all named entities for dropdown tagging: ministers, officials, '
  'departments, schemes, organisations. Admin-managed. '
  'Articles reference entities by name (text array) for flexibility. '
  'Add new entities via admin UI — frontend dropdowns source from this table. '
  'metadata JSONB: ministers → {party, constituency, since}; schemes → {launch_date, nodal_dept, budget_crore}';


-- ─────────────────────────────────────────────────────────────────────────────
-- INCIDENT CATEGORIES  (admin-managed, used in multi-select dropdown)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.incident_categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT UNIQUE NOT NULL,        -- e.g. 'Murder', 'Communal Violence'
  name_hindi  TEXT,
  group_name  TEXT NOT NULL DEFAULT 'general', -- grouping: 'crime','disaster','protest','other'
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incident_cat_active ON public.incident_categories(is_active);

COMMENT ON TABLE public.incident_categories IS
  'All crime/incident types that appear in the Incident/Crime Category multi-select dropdown. '
  'Admin-managed. Add new categories without any code changes.';


-- ─────────────────────────────────────────────────────────────────────────────
-- GEO — DISTRICTS & CONSTITUENCIES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.geo_districts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT UNIQUE NOT NULL,      -- e.g. "Lucknow" — matches UP_DISTRICTS in constants.ts
  name_hindi    TEXT NOT NULL DEFAULT '',
  division      TEXT NOT NULL,             -- e.g. "Lucknow"
  is_active     BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_geo_dist_division ON public.geo_districts(division);

COMMENT ON TABLE public.geo_districts IS
  '75 UP districts. Names match UP_DISTRICTS in constants.ts exactly. '
  'division auto-populates the Division field when analyst selects a district.';


CREATE TABLE public.geo_constituencies (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  district        TEXT NOT NULL REFERENCES public.geo_districts(name) ON DELETE CASCADE,
  division        TEXT NOT NULL,
  constituency_no INTEGER,
  is_sc_reserved  BOOLEAN NOT NULL DEFAULT FALSE,
  ls_constituency TEXT,    -- parent Lok Sabha constituency
  is_active       BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_geo_const_district  ON public.geo_constituencies(district);
CREATE INDEX idx_geo_const_division  ON public.geo_constituencies(division);
CREATE INDEX idx_geo_const_ls        ON public.geo_constituencies(ls_constituency);

COMMENT ON TABLE public.geo_constituencies IS
  '403 Vidhan Sabha constituencies. (SC) flag from Delimitation Commission 2008. '
  'ls_constituency maps each VS to its parent Lok Sabha seat (80 total).';


-- ─────────────────────────────────────────────────────────────────────────────
-- MEDIA SOURCES  (TV channels + print outlets + online sources)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.media_sources (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                TEXT NOT NULL,
  source_type         source_type NOT NULL,
  channel_type        channel_type,              -- for tv: national/regional
  print_city          TEXT,                      -- for print: which city edition
  source_tier         source_tier,               -- for online/print
  url                 TEXT,
  youtube_channel_id  TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Note: Appendix F has duplicate channel names (e.g. APN News appears 3x in regional list).
  -- Uniqueness is enforced on (name, source_type, sort_order) to preserve all RFP entries.
  UNIQUE (name, source_type, sort_order)
);

CREATE INDEX idx_media_src_type    ON public.media_sources(source_type);
CREATE INDEX idx_media_src_active  ON public.media_sources(is_active);
CREATE INDEX idx_media_src_name    ON public.media_sources(name, source_type);

COMMENT ON TABLE public.media_sources IS
  'Approved TV channels (Appendix F: 70), print outlets (Appendix G: 20 cities+UP), '
  'and online sources. Feeds the Channel Name / Newspaper Name / Publication Name dropdowns. '
  'Admin adds new sources here — no code changes needed.';


-- ─────────────────────────────────────────────────────────────────────────────
-- ARTICLES  (central content table — all 7 upload types)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.articles (

  -- ── System fields (auto, not analyst-entered)
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_status    entry_status NOT NULL DEFAULT 'submitted',
  analyst_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),   -- = ingested_at in Article interface
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- ── Media type classification
  source_type         source_type NOT NULL,
  upload_sub_type     upload_sub_type,
  -- upload_sub_type: only set when source_type = 'upload'
  --   'image'     → Photo / graphic / meme
  --   'whatsapp'  → WhatsApp/Telegram forward or screenshot
  --   'manual'    → Field intelligence / internal note

  -- ── Source reference
  source_id       UUID REFERENCES public.media_sources(id) ON DELETE SET NULL,
  source_name     TEXT NOT NULL DEFAULT '',  -- denormalized for display speed

  -- ── Timestamps
  published_at    TIMESTAMPTZ NOT NULL,   -- broadcast date/time, publication date, upload date

  -- ── Common fields from Section 4.1 (analyst-entered)
  title               TEXT,               -- Headline / Title (max 300 chars per doc)
  content             TEXT NOT NULL DEFAULT '',     -- full article text / OCR text / free text body
  url                 TEXT NOT NULL DEFAULT '',     -- Evidence / Source Link
  content_language    content_language NOT NULL DEFAULT 'hindi',

  -- analyst synopsis — separate from AI; required for ALL types
  analyst_synopsis    TEXT NOT NULL,
  -- TV/YouTube: analyst watches and writes this. AI uses it as primary context.
  -- Online/Print: analyst's interpretation. AI also reads the URL content.
  -- Image/WhatsApp/Manual: analyst description of the content.

  -- ── Geo (Section 4.1 — district multi-select, division auto, constituency optional)
  districts_mentioned       TEXT[] NOT NULL DEFAULT '{}',  -- values from geo_districts.name
  divisions_mentioned       TEXT[] NOT NULL DEFAULT '{}',  -- auto-populated from districts via trigger
  constituency_vidhan_sabha TEXT[] NOT NULL DEFAULT '{}',  -- 403 VS constituencies
  constituency_lok_sabha    TEXT[] NOT NULL DEFAULT '{}',  -- 80 LS constituencies

  -- ── Entity tags (Section 4.1)
  persons_named       TEXT[] NOT NULL DEFAULT '{}',  -- from entities WHERE category IN (minister, official)
  schemes_referenced  TEXT[] NOT NULL DEFAULT '{}',  -- from entities WHERE category = scheme
  departments_mentioned TEXT[] NOT NULL DEFAULT '{}', -- from entities WHERE category = department

  -- ── Keyword tags (Section 4.1 — category A governance tags, free tags)
  topics              TEXT[] NOT NULL DEFAULT '{}',
  keywords_matched    TEXT[] NOT NULL DEFAULT '{}',

  -- ── Classification (Section 4.1)
  sentiment           sentiment_type NOT NULL DEFAULT 'neutral',
  sentiment_score     NUMERIC(4,3) NOT NULL DEFAULT 0,
  tone                tone_type,
  swot_tag            swot_tag,

  -- ── Severity (Section 4.1 + 4.3)
  severity            severity_level,       -- resolved final: analyst beats AI
  severity_analyst    severity_level,       -- analyst-set
  severity_ai         severity_level,       -- Groq suggestion

  -- ── Flags (Section 4.1)
  is_law_order          BOOLEAN NOT NULL DEFAULT FALSE,
  risk_flag             BOOLEAN NOT NULL DEFAULT FALSE,
  misinformation_signal BOOLEAN NOT NULL DEFAULT FALSE,
  alerted               BOOLEAN NOT NULL DEFAULT FALSE,

  -- ── Verification & workflow (Section 4.1)
  verification_status   verification_status NOT NULL DEFAULT 'unverified',
  action_required       action_target[] NOT NULL DEFAULT '{}',
  internal_notes        TEXT,

  -- ── Incident / crime categories (Section 4.1 conditional field)
  incident_category_ids TEXT[] NOT NULL DEFAULT '{}',  -- names from incident_categories table

  -- ── Media attachment (for clip, scan, screenshot)
  media_type              clip_media_type NOT NULL DEFAULT 'none',
  media_url               TEXT,
  media_storage_path      TEXT,
  media_mime_type         TEXT,
  media_duration_seconds  INTEGER,

  -- ── AI summaries (bilingual, populated by AI or copied from analyst_synopsis)
  summary_english TEXT NOT NULL DEFAULT '',
  summary_hindi   TEXT NOT NULL DEFAULT '',

  -- ── Viral risk score (Section 2.5.2 + Section 4.2.4 YouTube)
  -- Computed by API on save: based on view_count, subscriber_count, severity, sentiment.
  -- Stored here for dashboard sorting/filtering. Refreshed on article update.
  -- Scale: 0.00 – 100.00
  viral_risk_score NUMERIC(5,2) NOT NULL DEFAULT 0,

  -- ── Type-specific fields stored as JSONB
  -- Full schema documented in COMMENT below
  type_metadata   JSONB NOT NULL DEFAULT '{}',

  -- ── AI insights — LAZY CACHE (null = not yet run)
  -- Shape matches ClipAIInsights in index.ts exactly
  -- NULL → Groq runs on first article open → stored here → never re-runs
  -- Set to NULL manually to force regeneration
  ai_insights     JSONB,

  -- ── Legacy fields kept for interface compatibility (index.ts Article)
  upload_section  TEXT,
  upload_category TEXT,
  youtube_video_id      TEXT,
  youtube_timestamp     INTEGER,
  tv_telecast_date      DATE,
  tv_telecast_time      TIME,
  tv_program            TEXT,
  tv_personality        TEXT,

  CONSTRAINT analyst_synopsis_nonempty CHECK (length(trim(analyst_synopsis)) > 0)
);

-- Standard filters (ArticleFilters in index.ts)
CREATE INDEX idx_art_source_type    ON public.articles(source_type);
CREATE INDEX idx_art_severity       ON public.articles(severity);
CREATE INDEX idx_art_sentiment      ON public.articles(sentiment);
CREATE INDEX idx_art_published_at   ON public.articles(published_at DESC);
CREATE INDEX idx_art_created_at     ON public.articles(created_at DESC);
CREATE INDEX idx_art_analyst_id     ON public.articles(analyst_id);
CREATE INDEX idx_art_source_name    ON public.articles(source_name);
CREATE INDEX idx_art_entry_status   ON public.articles(entry_status);
CREATE INDEX idx_art_upload_sub     ON public.articles(upload_sub_type) WHERE upload_sub_type IS NOT NULL;
CREATE INDEX idx_art_risk           ON public.articles(risk_flag) WHERE risk_flag = TRUE;
CREATE INDEX idx_art_law_order      ON public.articles(is_law_order) WHERE is_law_order = TRUE;
CREATE INDEX idx_art_alerted        ON public.articles(alerted);
CREATE INDEX idx_art_ai_null        ON public.articles(id) WHERE ai_insights IS NULL;
CREATE INDEX idx_art_misinfo        ON public.articles(misinformation_signal) WHERE misinformation_signal = TRUE;
CREATE INDEX idx_art_viral          ON public.articles(viral_risk_score DESC) WHERE viral_risk_score > 0;

-- Array/JSONB GIN indexes
CREATE INDEX idx_art_districts      ON public.articles USING GIN (districts_mentioned);
CREATE INDEX idx_art_persons        ON public.articles USING GIN (persons_named);
CREATE INDEX idx_art_schemes        ON public.articles USING GIN (schemes_referenced);
CREATE INDEX idx_art_keywords       ON public.articles USING GIN (keywords_matched);
CREATE INDEX idx_art_incidents      ON public.articles USING GIN (incident_category_ids);
CREATE INDEX idx_art_topics         ON public.articles USING GIN (topics);
CREATE INDEX idx_art_type_meta      ON public.articles USING GIN (type_metadata);

-- Full-text search
CREATE INDEX idx_art_fts ON public.articles USING GIN (
  to_tsvector('english',
    coalesce(title, '') || ' ' ||
    coalesce(analyst_synopsis, '') || ' ' ||
    coalesce(content, '')
  )
);
CREATE INDEX idx_art_title_trgm ON public.articles USING GIN (title gin_trgm_ops);

COMMENT ON COLUMN public.articles.analyst_synopsis IS
  'Required for ALL types. Cannot be empty.
   TV/YouTube: analyst writes this after watching — it is the AI primary context.
   Online/Print: analyst interpretation on top of article content.
   Image/WhatsApp/Manual: analyst description of what the content contains.
   Groq receives this + persons_named + schemes_referenced + districts_mentioned.
   For unknown/new topics Groq also uses web_search tool.';

COMMENT ON COLUMN public.articles.type_metadata IS
  'Type-specific fields per source_type. JSONB schema:

  TV (source_type=tv):
    channel_name: string           — must match media_sources.name (source_type=tv)
    programme_name: string         — optional free text
    clip_duration_sec: number      — required
    audio_language: string         — hindi/english/urdu/regional
    anchor_reporter: string        — optional
    broadcast_slot: string         — prime_time/morning/daytime/afternoon/night/late_night/breaking_news
    ticker_text: string            — optional, 200 chars max
    channel_type: string           — national/regional (auto from channel selection)

  Print (source_type=print):
    newspaper_name: string         — must match media_sources.name (source_type=print)
    edition_city: string           — city/district of edition
    page_number: number            — required
    front_page: boolean
    column_position: string        — left/center/right/box/lead
    headline_size: string          — banner/multi_column/single_column/brief
    photo_accompanying: boolean
    ocr_text: string               — auto-extracted, analyst-editable

  Online (source_type=online):
    publication_name: string       — free text + known sources dropdown
    article_category: string       — politics/crime/health/education/economy/development/other
    byline: string                 — optional
    social_shares: number          — optional
    source_tier: string            — national/state/district/hyperlocal
    paywall: boolean
    article_screenshot_path: string — optional storage path

  YouTube (source_type=youtube):
    yt_channel_name: string        — required
    yt_channel_type: string        — official_goup/media/citizen/political/other
    video_duration: string         — mm:ss
    view_count: number
    subscriber_count: number
    video_type: string             — full_video/short/live/premiere
    transcript_excerpt: string     — 500 chars max
    -- Note: viral_risk_score is a top-level articles column (not in JSONB)

  Image (source_type=upload, upload_sub_type=image):
    image_type: string             — photograph/infographic/meme/screenshot/poster/cartoon/other
    image_source: string           — whatsapp/facebook/twitter/instagram/telegram/news_photo/unknown/other
    persons_identifiable: string[] — named individuals visible
    location_visible: string       — free text + district
    original_vs_edited: string     — original/edited/unknown
    authenticity: string           — verified_real/suspected_fake/confirmed_fake/unknown
    capture_date: string           — ISO date, optional

  WhatsApp (source_type=upload, upload_sub_type=whatsapp):
    content_type: string           — text_message/image/video_thumbnail/audio_transcript/forward_chain
    forwarded_as: string           — first_hand/forward/viral_forward
    platform: string               — whatsapp/telegram/signal/other
    group_source: string           — anonymized, e.g. "Local Journalist Group Kanpur"
    reach_estimate: string         — local/district/divisional/state_wide/unknown
    content_classification: string — rumour/genuine_alert/political_message/criminal_threat/
                                     public_complaint/government_communication/misinformation/other
    action_flagged: string[]       — alert_police/alert_dm/monitor/respond_publicly/ignore

  Manual (source_type=upload, upload_sub_type=manual):
    report_type: string            — field_intelligence/inter_department_note/verbal_report/complaint/other
    source_description: string     — anonymized, optional
    information_date: string       — ISO date (when info was gathered, may differ from entry date)
    corroborated_by: string        — optional
    urgency: string                — immediate/within_24hrs/routine/fyi
    response_recommended: string   — 300 chars, optional
    confidentiality: string        — open/restricted/confidential';

COMMENT ON COLUMN public.articles.ai_insights IS
  'Lazy-cached Groq output. Exactly matches ClipAIInsights in index.ts:
   { short_summary, expanded_summary, narrative_analysis, risk_points[],
     misinformation_checks[], key_entities[], recommended_actions[],
     model_name, generated_at }
   NULL = not run yet. Runs automatically on first article open.
   Populated = cached, load from DB, no Groq call.
   Set to NULL manually to force regeneration.';


-- ─────────────────────────────────────────────────────────────────────────────
-- AI QUEUE  (prevents duplicate Groq calls on concurrent article opens)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.ai_queue (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id   UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending',  -- pending | processing | done | failed
  attempts     INTEGER NOT NULL DEFAULT 0,
  last_error   TEXT,
  queued_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  UNIQUE (article_id)
);

CREATE INDEX idx_ai_queue_pending ON public.ai_queue(status)
  WHERE status IN ('pending', 'processing');


-- ─────────────────────────────────────────────────────────────────────────────
-- ALERTS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.alerts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id      UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  severity        severity_level NOT NULL,
  channels        alert_channel[] NOT NULL DEFAULT '{dashboard}',
  message_body    TEXT NOT NULL,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_by         UUID REFERENCES public.users(id) ON DELETE SET NULL,
  acknowledged    BOOLEAN NOT NULL DEFAULT FALSE,
  acknowledged_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ
);

CREATE INDEX idx_alerts_article_id ON public.alerts(article_id);
CREATE INDEX idx_alerts_severity   ON public.alerts(severity);
CREATE INDEX idx_alerts_sent_at    ON public.alerts(sent_at DESC);
CREATE INDEX idx_alerts_unacked    ON public.alerts(acknowledged) WHERE acknowledged = FALSE;

COMMENT ON TABLE public.alerts IS
  'Alert dispatch log. Section 4.3 escalation matrix:
   CRITICAL: 0-15min → DM + SSP + Commissioner + CMO + DGP + DIPR Director (WhatsApp+SMS+Dashboard)
   HIGH:     1hr    → DM + SSP + Commissioner + DIPR Director (WhatsApp+Dashboard)
   MEDIUM:   4hrs   → District Info Officer (Dashboard+Daily report)
   LOW:      8AM    → DIPR Analyst Pool (Daily executive report)';


-- ─────────────────────────────────────────────────────────────────────────────
-- DISTRICT RISK  (periodic snapshot, matches DistrictRisk in index.ts)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.district_risk (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  district            TEXT UNIQUE NOT NULL,  -- matches geo_districts.name
  district_hindi      TEXT NOT NULL DEFAULT '',
  risk_score          NUMERIC(5,2) NOT NULL DEFAULT 0,
  article_count       INTEGER NOT NULL DEFAULT 0,
  critical_count      INTEGER NOT NULL DEFAULT 0,
  high_count          INTEGER NOT NULL DEFAULT 0,
  dominant_sentiment  sentiment_type NOT NULL DEFAULT 'neutral',
  top_topics          TEXT[] NOT NULL DEFAULT '{}',
  latest_headline     TEXT,
  calculated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- REPORTS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.reports (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_type   report_type NOT NULL,
  report_date   DATE NOT NULL,
  summary_text  TEXT NOT NULL DEFAULT '',
  download_url  TEXT,
  storage_path  TEXT,
  created_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (report_type, report_date)
);

CREATE INDEX idx_reports_type_date ON public.reports(report_type, report_date DESC);


-- ─────────────────────────────────────────────────────────────────────────────
-- AUDIT LOGS  (Section 2.5.1 — "admin controls including audit logs")
-- ─────────────────────────────────────────────────────────────────────────────
-- Tracks all admin CRUD on managed tables: entities, incident_categories,
-- media_sources, geo_districts, geo_constituencies, users.
-- Also tracks analyst article edits (severity overrides, status changes).

CREATE TABLE public.audit_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  actor_email  TEXT,                  -- denormalized in case user is deleted
  action       TEXT NOT NULL,         -- 'INSERT' | 'UPDATE' | 'DELETE'
  table_name   TEXT NOT NULL,         -- e.g. 'entities', 'articles', 'media_sources'
  record_id    TEXT NOT NULL,         -- UUID of the affected row (as text)
  record_label TEXT,                  -- human-readable: entity name, article title, etc.
  old_values   JSONB,                 -- snapshot before change (NULL for INSERT)
  new_values   JSONB,                 -- snapshot after change (NULL for DELETE)
  ip_address   INET,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_actor     ON public.audit_logs(actor_id);
CREATE INDEX idx_audit_table     ON public.audit_logs(table_name);
CREATE INDEX idx_audit_record    ON public.audit_logs(table_name, record_id);
CREATE INDEX idx_audit_created   ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_action    ON public.audit_logs(action);

COMMENT ON TABLE public.audit_logs IS
  'Immutable audit trail for all admin CRUD operations (RFP Section 2.5.1). '
  'Rows are INSERT-only — never updated or deleted. '
  'Covered tables: entities, incident_categories, media_sources, geo_districts, '
  'geo_constituencies, users, articles (severity/status changes). '
  'Populated by API layer (not DB trigger) to capture actor identity from session.';


-- ─────────────────────────────────────────────────────────────────────────────
-- SYSTEM STATUS  (singleton, matches SystemStatus in index.ts)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.system_status (
  id                INTEGER PRIMARY KEY DEFAULT 1,
  monitoring_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_ingest       TIMESTAMPTZ,
  active_sources    INTEGER NOT NULL DEFAULT 0,
  queued_jobs       INTEGER NOT NULL DEFAULT 0,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO public.system_status (id) VALUES (1) ON CONFLICT DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGERS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_articles_updated_at  BEFORE UPDATE ON public.articles  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_users_updated_at     BEFORE UPDATE ON public.users     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_entities_updated_at  BEFORE UPDATE ON public.entities  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- Auto-populate divisions_mentioned from districts_mentioned
-- Keys match geo_districts.name (and UP_DISTRICTS in constants.ts) exactly
CREATE OR REPLACE FUNCTION populate_divisions()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  map JSONB := '{
    "Saharanpur":"Saharanpur","Muzaffarnagar":"Saharanpur","Shamli":"Saharanpur",
    "Meerut":"Meerut","Baghpat":"Meerut","Ghaziabad":"Meerut","Hapur":"Meerut","Gautam Buddha Nagar":"Meerut","Bulandshahr":"Meerut",
    "Aligarh":"Aligarh","Hathras":"Aligarh","Mathura":"Aligarh","Kasganj":"Aligarh","Etah":"Aligarh",
    "Agra":"Agra","Firozabad":"Agra","Mainpuri":"Agra",
    "Moradabad":"Moradabad","Rampur":"Moradabad","Amroha":"Moradabad","Bijnor":"Moradabad","Sambhal":"Moradabad",
    "Bareilly":"Bareilly","Pilibhit":"Bareilly","Budaun":"Bareilly","Shahjahanpur":"Bareilly",
    "Lucknow":"Lucknow","Unnao":"Lucknow","Rae Bareli":"Lucknow","Hardoi":"Lucknow","Sitapur":"Lucknow","Lakhimpur Kheri":"Lucknow",
    "Kanpur Nagar":"Kanpur","Kanpur Dehat":"Kanpur","Auraiya":"Kanpur","Etawah":"Kanpur","Farrukhabad":"Kanpur","Kannauj":"Kanpur",
    "Faizabad":"Ayodhya","Ambedkar Nagar":"Ayodhya","Amethi":"Ayodhya","Sultanpur":"Ayodhya","Barabanki":"Ayodhya",
    "Gonda":"Devipatan","Balrampur":"Devipatan","Shravasti":"Devipatan","Bahraich":"Devipatan",
    "Basti":"Basti","Siddharthnagar":"Basti","Sant Kabir Nagar":"Basti",
    "Gorakhpur":"Gorakhpur","Deoria":"Gorakhpur","Kushinagar":"Gorakhpur","Maharajganj":"Gorakhpur",
    "Azamgarh":"Azamgarh","Mau":"Azamgarh","Ballia":"Azamgarh",
    "Varanasi":"Varanasi","Chandauli":"Varanasi","Jaunpur":"Varanasi","Ghazipur":"Varanasi",
    "Mirzapur":"Mirzapur","Sonbhadra":"Mirzapur","Bhadohi":"Mirzapur",
    "Allahabad":"Allahabad","Kaushambi":"Allahabad","Fatehpur":"Allahabad","Pratapgarh":"Allahabad",
    "Chitrakoot":"Chitrakoot","Banda":"Chitrakoot","Hamirpur":"Chitrakoot","Mahoba":"Chitrakoot",
    "Jhansi":"Jhansi","Lalitpur":"Jhansi","Jalaun":"Jhansi"
  }';
  d TEXT; div TEXT; divs TEXT[] := '{}';
BEGIN
  FOREACH d IN ARRAY NEW.districts_mentioned LOOP
    div := map ->> d;
    IF div IS NOT NULL AND NOT (div = ANY(divs)) THEN divs := divs || div; END IF;
  END LOOP;
  NEW.divisions_mentioned := divs;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_articles_divisions
  BEFORE INSERT OR UPDATE OF districts_mentioned ON public.articles
  FOR EACH ROW EXECUTE FUNCTION populate_divisions();


-- Severity resolution: analyst override beats AI
CREATE OR REPLACE FUNCTION resolve_severity()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.severity_analyst IS NOT NULL THEN NEW.severity := NEW.severity_analyst;
  ELSIF NEW.severity_ai IS NOT NULL THEN NEW.severity := NEW.severity_ai;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_articles_severity
  BEFORE INSERT OR UPDATE OF severity_analyst, severity_ai ON public.articles
  FOR EACH ROW EXECUTE FUNCTION resolve_severity();


-- ─────────────────────────────────────────────────────────────────────────────
-- VIEWS
-- ─────────────────────────────────────────────────────────────────────────────

-- Articles pending AI generation (CRITICAL first)
CREATE VIEW public.articles_pending_ai AS
  SELECT id, source_type, upload_sub_type, title, analyst_synopsis,
         districts_mentioned, severity, sentiment, created_at
  FROM public.articles
  WHERE ai_insights IS NULL AND entry_status != 'archived'
  ORDER BY
    CASE severity WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END,
    created_at DESC;

-- 7-day district summary (for DistrictRisk refresh)
CREATE VIEW public.district_summary_7d AS
  SELECT
    d                                                   AS district,
    COUNT(*)                                            AS article_count,
    COUNT(*) FILTER (WHERE a.severity = 'CRITICAL')    AS critical_count,
    COUNT(*) FILTER (WHERE a.severity = 'HIGH')        AS high_count,
    COUNT(*) FILTER (WHERE a.risk_flag)                AS risk_count,
    COUNT(*) FILTER (WHERE a.misinformation_signal)    AS misinfo_count,
    MODE() WITHIN GROUP (ORDER BY a.sentiment::TEXT)   AS dominant_sentiment
  FROM public.articles a, UNNEST(a.districts_mentioned) AS d
  WHERE a.published_at >= NOW() - INTERVAL '7 days'
  GROUP BY d;

-- Today's unacknowledged alerts
CREATE VIEW public.today_alerts AS
  SELECT al.id, al.severity, al.channels, al.message_body, al.sent_at,
         ar.title, ar.source_type, ar.districts_mentioned, ar.source_name
  FROM public.alerts al
  JOIN public.articles ar ON al.article_id = ar.id
  WHERE al.sent_at >= CURRENT_DATE AND al.acknowledged = FALSE
  ORDER BY CASE al.severity WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 ELSE 3 END, al.sent_at DESC;
