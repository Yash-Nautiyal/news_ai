# DIPR Media Intelligence — Analyst Upload & Frontend Integration Guide

> For the Cursor agent building the upload forms, article list, and all analyst-facing UI.  
> Every section maps directly to a DB column, enum, or table.

---

## 1. Who Is the Analyst

Three roles exist. Only ADMIN and ANALYST can upload. VIEWER is read-only.

```
user_role: 'ADMIN' | 'ANALYST' | 'VIEWER'
```

On login, fetch the user's role from `public.users` where `auth_id = auth.uid()`. Gate every upload route on role check before rendering forms.

The `analyst_id` on every article INSERT must be set to `public.users.id` (the platform user UUID, not the Supabase auth UUID).

---

## 2. The Seven Upload Types — Entry Point

The upload UI begins with the analyst selecting what type of content they are uploading. This is the `source_type` + optional `upload_sub_type` discriminator.

```
source_type = 'tv'      → TV broadcast clip
source_type = 'print'   → Newspaper / magazine article
source_type = 'online'  → Online article / web portal
source_type = 'youtube' → YouTube video
source_type = 'upload', upload_sub_type = 'image'     → Photo / meme / screenshot / graphic
source_type = 'upload', upload_sub_type = 'whatsapp'  → WhatsApp / Telegram forward
source_type = 'upload', upload_sub_type = 'manual'    → Field intelligence / internal note
```

Show these as 7 tiles / tabs at the start of the upload flow. Selecting one determines which form fields appear.

---

## 3. Common Fields (All 7 Types)

These fields appear on every upload form regardless of type.

### 3.1 Fields the Analyst Must Fill

| Field | DB Column | UI Element | Notes |
|---|---|---|---|
| Published / Broadcast Date & Time | `published_at` | Date + time picker | Required |
| Title / Headline | `title` | Text input, max 300 chars | Required |
| Content / Body Text | `content` | Textarea | Required. For TV/YouTube: transcript or summary. For image: OCR or description. |
| Source URL / Evidence Link | `url` | URL input | Optional for print. Required for online. |
| Language | `content_language` | Dropdown | See enum below |
| **Analyst Synopsis** | `analyst_synopsis` | Textarea, min 30 chars | **REQUIRED, non-empty.** Analyst's own words. This is the primary AI input. |
| Districts Mentioned | `districts_mentioned` | Multi-select | Values from `UP_DISTRICTS` / `geo_districts.name` |
| Persons Named | `persons_named` | Multi-select + type-ahead | Values from `entities` WHERE category IN ('minister','official') |
| Schemes Referenced | `schemes_referenced` | Multi-select + type-ahead | Values from `entities` WHERE category = 'scheme' |
| Departments Mentioned | `departments_mentioned` | Multi-select + type-ahead | Values from `entities` WHERE category = 'department' |
| Topics / Tags | `topics` | Tag input (free text) | Governance tags, free entry |
| Sentiment | `sentiment` | Radio / segmented control | See enum below |
| Tone | `tone` | Dropdown | See enum below |
| Severity | `severity_analyst` | Radio / segmented control | See enum below. Analyst sets this — NOT the `severity` column. |
| Is Law & Order Issue | `is_law_order` | Toggle / checkbox | Default: false |
| Risk Flag | `risk_flag` | Toggle / checkbox | Default: false |
| Incident Categories | `incident_category_ids` | Multi-select | Values from `incident_categories.name`. Only show if `is_law_order = true` OR analyst ticks a "crime/incident" checkbox. |
| Action Required | `action_required` | Multi-select | See enum below |
| SWOT Tag | `swot_tag` | Dropdown, optional | Optional |
| Internal Notes | `internal_notes` | Textarea, optional | Private, not shown to VIEWER role |

### 3.2 Fields the Analyst Should NOT See or Fill

These are set automatically — never show them in the upload form:

| DB Column | Set By | How |
|---|---|---|
| `id` | DB | `uuid_generate_v4()` |
| `analyst_id` | API | From logged-in user session |
| `entry_status` | DB | DEFAULT `'submitted'` on INSERT |
| `divisions_mentioned` | DB Trigger | Auto-populated from `districts_mentioned` |
| `severity` | DB Trigger | Auto-resolved from `severity_analyst` / `severity_ai` |
| `severity_ai` | API (Groq) | Set after AI runs, not at upload time |
| `ai_insights` | API (Groq) | Set on first article open, NULL at upload |
| `summary_english` | API (Groq) | Set after AI runs |
| `summary_hindi` | API (Groq) | Set after AI runs |
| `alerted` | API | Set when alert is dispatched |
| `viral_risk_score` | API | Computed on save |
| `created_at` / `updated_at` | DB | Auto |

### 3.3 Fields That Are Optional and Can Be Skipped

These exist in the schema but are not required at upload time. Analyst can leave blank:

```
swot_tag              → Optional classification
constituency_vidhan_sabha → Optional, fine to skip
constituency_lok_sabha    → Optional, fine to skip
action_required       → Optional, defaults to {}
internal_notes        → Optional
verification_status   → Defaults to 'unverified', analyst can upgrade
```

**`verification_status`** has a default of `'unverified'`. Analyst can optionally change to `'verified'` or `'partially_verified'` at upload time if they have confidence. It is not required.

---

## 4. Enum Values for Every Dropdown

### content_language
```
'hindi' | 'english' | 'urdu' | 'bhojpuri' | 'awadhi' | 'mixed' | 'other'
```
Default: `'hindi'`

### sentiment
```
'positive' | 'negative' | 'neutral' | 'mixed'
```

### tone
```
'critical'    → Attacks government / institution
'neutral'     → Balanced reporting
'supportive'  → Favourable to government
'sensational' → Alarmist, dramatised
'factual'     → Dry, data-driven
'propaganda'  → Deliberate bias / political messaging
'mixed'       → Multiple tones
```

### severity (analyst sets `severity_analyst`)
```
'CRITICAL'  → Immediate threat, requires 0–15 min escalation
'HIGH'      → Serious incident, 1hr escalation
'MEDIUM'    → Notable, 4hr escalation
'LOW'       → Routine / monitor
```
Trigger auto-resolves: `severity = severity_analyst` if set, else `severity_ai`.

### verification_status (optional at upload, defaults to 'unverified')
```
'verified'           → Confirmed from source
'unverified'         → Not yet checked (DEFAULT)
'partially_verified' → Some facts confirmed
```

### entry_status — DO NOT SHOW IN UPLOAD FORM
```
'draft'     → Auto-save in progress (set by frontend on auto-save)
'submitted' → DEFAULT on INSERT (set by DB, not analyst)
'reviewed'  → Set by supervisor/senior via article detail view
'archived'  → Soft-delete via admin action
```
The upload form should never ask the analyst to set this. It lands as `'submitted'` automatically. A separate "review" action in the article detail view transitions it to `'reviewed'`.

### swot_tag (optional)
```
'strength' | 'weakness' | 'opportunity' | 'threat'
```

### action_required (multi-select, optional)
```
'alert_dm'        → Alert District Magistrate
'alert_police'    → Alert Police / SSP
'alert_cm_office' → Alert CM Office
'media_response'  → Prepare media response
'monitor'         → Continue monitoring
'ignore'          → No action needed
```

---

## 5. Type-Specific Fields by Upload Type

These appear **in addition to** the common fields in Section 3. They go into `type_metadata JSONB`.

### 5.1 TV Broadcast (`source_type = 'tv'`)

| Field | Key in type_metadata | UI Element | Notes |
|---|---|---|---|
| Channel Name | `channel_name` | Dropdown | From `media_sources` WHERE source_type = 'tv'. Required. |
| Programme Name | `programme_name` | Text input | Optional |
| Clip Duration | `clip_duration_sec` | Number input (seconds) | Required |
| Audio Language | `audio_language` | Dropdown | hindi / english / urdu / regional |
| Anchor / Reporter | `anchor_reporter` | Text input | Optional |
| Broadcast Slot | `broadcast_slot` | Dropdown | See enum below |
| Ticker Text | `ticker_text` | Text input, max 200 chars | Optional, the bottom-of-screen ticker |
| Channel Type | `channel_type` | Auto-filled from channel selection | national / regional |

**broadcast_slot enum:**
```
'prime_time' | 'morning' | 'daytime' | 'afternoon' | 'night' | 'late_night' | 'breaking_news'
```

Also set on the article row (not in type_metadata):
- `source_id` → lookup from `media_sources` by channel_name + source_type='tv'
- `source_name` → denormalized from channel selection
- `upload_sub_type` → NULL (not used for tv)

---

### 5.2 Print (`source_type = 'print'`)

| Field | Key in type_metadata | UI Element | Notes |
|---|---|---|---|
| Newspaper Name | `newspaper_name` | Dropdown | From `media_sources` WHERE source_type = 'print'. Required. |
| Edition City | `edition_city` | Dropdown / text | City of the edition, e.g. "Lucknow" |
| Page Number | `page_number` | Number input | Required |
| Front Page | `front_page` | Toggle | Boolean |
| Column Position | `column_position` | Dropdown | See enum below |
| Headline Size | `headline_size` | Dropdown | See enum below |
| Photo Accompanying | `photo_accompanying` | Toggle | Boolean |
| OCR Text | `ocr_text` | Textarea | Auto-extracted from scan, analyst-editable |

**column_position enum:**
```
'left' | 'center' | 'right' | 'box' | 'lead'
```

**headline_size enum:**
```
'banner' | 'multi_column' | 'single_column' | 'brief'
```

Print articles typically have no `url` — leave as empty string. `source_id` and `source_name` populated from newspaper selection.

---

### 5.3 Online (`source_type = 'online'`)

| Field | Key in type_metadata | UI Element | Notes |
|---|---|---|---|
| Publication Name | `publication_name` | Dropdown + free text | From `media_sources` WHERE source_type='online', but also allows free entry |
| Article Category | `article_category` | Dropdown | See enum below |
| Byline | `byline` | Text input | Optional, author name |
| Social Shares | `social_shares` | Number input | Optional |
| Source Tier | `source_tier` | Dropdown | national / state / district / hyperlocal |
| Paywall | `paywall` | Toggle | Boolean |
| Article Screenshot | `article_screenshot_path` | File upload | Optional, storage path |

**article_category enum:**
```
'politics' | 'crime' | 'health' | 'education' | 'economy' | 'development' | 'other'
```

**source_tier enum:**
```
'national' | 'state' | 'district' | 'hyperlocal'
```

`url` is required for online articles. `source_id` populated if publication matches a known `media_sources` row, else NULL. `source_name` = publication_name always.

---

### 5.4 YouTube (`source_type = 'youtube'`)

| Field | Key in type_metadata | UI Element | Notes |
|---|---|---|---|
| Channel Name | `yt_channel_name` | Text input | Required |
| Channel Type | `yt_channel_type` | Dropdown | See enum below |
| Video Duration | `video_duration` | Text input (mm:ss) | Required |
| View Count | `view_count` | Number input | Optional, used for viral_risk_score |
| Subscriber Count | `subscriber_count` | Number input | Optional |
| Video Type | `video_type` | Dropdown | See enum below |
| Transcript Excerpt | `transcript_excerpt` | Textarea, max 500 chars | Optional |

**yt_channel_type enum:**
```
'official_goup'  → Official UP government channel
'media'          → News media channel
'citizen'        → Independent / citizen journalist
'political'      → Political party / leader channel
'other'
```

**video_type enum:**
```
'full_video' | 'short' | 'live' | 'premiere'
```

`url` should be the YouTube video URL. `source_id` is NULL for YouTube (not in media_sources). `upload_sub_type` is NULL.

---

### 5.5 Image Upload (`source_type = 'upload'`, `upload_sub_type = 'image'`)

| Field | Key in type_metadata | UI Element | Notes |
|---|---|---|---|
| Image Type | `image_type` | Dropdown | See enum below |
| Image Source Platform | `image_source` | Dropdown | See enum below |
| Persons Identifiable | `persons_identifiable` | Tag input | Named individuals visible in the image |
| Location Visible | `location_visible` | Text input | Free text + district |
| Original vs Edited | `original_vs_edited` | Dropdown | original / edited / unknown |
| Authenticity | `authenticity` | Dropdown | See enum below |
| Capture Date | `capture_date` | Date picker | Optional, when image was captured |

**image_type enum:**
```
'photograph' | 'infographic' | 'meme' | 'screenshot' | 'poster' | 'cartoon' | 'other'
```

**image_source (platform) enum:**
```
'whatsapp' | 'facebook' | 'twitter' | 'instagram' | 'telegram' | 'news_photo' | 'unknown' | 'other'
```

**authenticity enum:**
```
'verified_real' | 'suspected_fake' | 'confirmed_fake' | 'unknown'
```

`source_id` is NULL. `source_name` = platform name string. File goes to Supabase storage bucket `media-uploads`, path stored in `media_storage_path`.

---

### 5.6 WhatsApp / Telegram Forward (`source_type = 'upload'`, `upload_sub_type = 'whatsapp'`)

| Field | Key in type_metadata | UI Element | Notes |
|---|---|---|---|
| Content Type | `content_type` | Dropdown | See enum below |
| Forwarded As | `forwarded_as` | Dropdown | first_hand / forward / viral_forward |
| Platform | `platform` | Dropdown | whatsapp / telegram / signal / other |
| Group Source | `group_source` | Text input | Anonymized, e.g. "Local Journalist Group Kanpur" |
| Reach Estimate | `reach_estimate` | Dropdown | local / district / divisional / state_wide / unknown |
| Content Classification | `content_classification` | Dropdown | See enum below |
| Action Flagged | `action_flagged` | Multi-select | alert_police / alert_dm / monitor / respond_publicly / ignore |

**content_type enum:**
```
'text_message' | 'image' | 'video_thumbnail' | 'audio_transcript' | 'forward_chain'
```

**content_classification enum:**
```
'rumour' | 'genuine_alert' | 'political_message' | 'criminal_threat' |
'public_complaint' | 'government_communication' | 'misinformation' | 'other'
```

`source_id` is NULL. `source_name` = platform (e.g. "WhatsApp"). Screenshot goes to storage `media-uploads`.

---

### 5.7 Manual / Field Intelligence (`source_type = 'upload'`, `upload_sub_type = 'manual'`)

| Field | Key in type_metadata | UI Element | Notes |
|---|---|---|---|
| Report Type | `report_type` | Dropdown | See enum below |
| Source Description | `source_description` | Text input | Anonymized, optional |
| Information Date | `information_date` | Date picker | When info was gathered (may differ from entry date) |
| Corroborated By | `corroborated_by` | Text input | Optional |
| Urgency | `urgency` | Dropdown | immediate / within_24hrs / routine / fyi |
| Response Recommended | `response_recommended` | Textarea, max 300 chars | Optional |
| Confidentiality | `confidentiality` | Dropdown | open / restricted / confidential |

**report_type enum:**
```
'field_intelligence' | 'inter_department_note' | 'verbal_report' | 'complaint' | 'other'
```

`source_id` is NULL. `url` is empty. No file upload required (though `media_storage_path` can hold an attachment if provided).

---

## 6. How Dropdowns Are Populated (API Queries)

The frontend must fetch these on form load and cache them. All are small, rarely-changing tables.

### Persons Named (multi-select, type-ahead)
```sql
SELECT name, name_hindi, sub_category
FROM public.entities
WHERE category IN ('minister', 'official')
  AND is_active = true
ORDER BY sort_order, name;
```
Show as: `"Yogi Adityanath (Chief Minister)"` — name + sub_category as hint.

### Schemes Referenced (multi-select, type-ahead)
```sql
SELECT name, name_hindi
FROM public.entities
WHERE category = 'scheme'
  AND is_active = true
ORDER BY sort_order, name;
```

### Departments Mentioned (multi-select, type-ahead)
```sql
SELECT name, name_hindi
FROM public.entities
WHERE category = 'department'
  AND is_active = true
ORDER BY sort_order, name;
```

### Organisations (if needed for topics/tagging)
```sql
SELECT name, name_hindi
FROM public.entities
WHERE category = 'organisation'
  AND is_active = true
ORDER BY sort_order, name;
```

### Incident Categories (multi-select, grouped)
```sql
SELECT name, name_hindi, group_name
FROM public.incident_categories
WHERE is_active = true
ORDER BY group_name, sort_order;
```
Group them visually by `group_name`: crime, communal, protest, disaster, security, misinformation, other.  
The value stored in `incident_category_ids[]` is the **name string**, not the UUID.

### Districts (multi-select)
Use `UP_DISTRICTS` from `constants.ts` directly — 75 values, static. Or query:
```sql
SELECT name, name_hindi, division FROM public.geo_districts WHERE is_active = true ORDER BY name;
```
After analyst selects districts, **do not** compute divisions in the frontend — the DB trigger handles `divisions_mentioned` automatically.

### TV Channels
```sql
SELECT id, name, channel_type
FROM public.media_sources
WHERE source_type = 'tv' AND is_active = true
ORDER BY sort_order, name;
```

### Print / Newspaper Names
```sql
SELECT id, name, print_city, source_tier
FROM public.media_sources
WHERE source_type = 'print' AND is_active = true
ORDER BY sort_order, name;
```

### Online Publications
```sql
SELECT id, name, source_tier
FROM public.media_sources
WHERE source_type = 'online' AND is_active = true
ORDER BY sort_order, name;
```

---

## 7. Saving an Article — INSERT Logic

### Step 1: Resolve source_id and source_name
- If `source_type` is `tv`, `print`, or `online` and analyst selected a known source:
  ```
  source_id   = media_sources.id (from dropdown selection)
  source_name = media_sources.name (denormalized copy)
  ```
- If `source_type` is `youtube`, `upload` or source not in media_sources:
  ```
  source_id   = NULL
  source_name = analyst-entered name or platform name
  ```

### Step 2: Build the INSERT

```sql
INSERT INTO public.articles (
  analyst_id,
  source_type, upload_sub_type,
  source_id, source_name,
  published_at, title, content, url,
  content_language, analyst_synopsis,
  districts_mentioned,
  -- divisions_mentioned: DO NOT SET — trigger handles it
  persons_named, schemes_referenced, departments_mentioned,
  topics, keywords_matched,
  incident_category_ids,
  sentiment, tone, swot_tag,
  severity_analyst,
  -- severity: DO NOT SET — trigger handles it
  is_law_order, risk_flag,
  verification_status,
  action_required,
  internal_notes,
  media_type, media_url, media_storage_path, media_mime_type, media_duration_seconds,
  type_metadata
  -- entry_status: DO NOT SET — defaults to 'submitted'
  -- ai_insights: DO NOT SET — NULL by default
) VALUES (...)
RETURNING id;
```

### Step 3: After INSERT
- `entry_status` is automatically `'submitted'`
- `divisions_mentioned` is automatically filled by trigger
- `severity` is automatically resolved by trigger from `severity_analyst`
- Queue an AI job: `INSERT INTO ai_queue (article_id) VALUES ($id) ON CONFLICT DO NOTHING`

---

## 8. Draft Auto-Save

If the analyst starts filling the form but hasn't submitted:

1. After 30 seconds of inactivity, auto-save by calling the same INSERT but set `entry_status = 'draft'` explicitly (override the default):
   ```sql
   INSERT INTO public.articles (..., entry_status) VALUES (..., 'draft')
   ```
2. On next form load, if a draft exists for this analyst, pre-fill the form from the draft row.
3. On final submit, UPDATE the draft row: `SET entry_status = 'submitted'`.

---

## 9. Article List View

### Columns to show

| Column | Source | Notes |
|---|---|---|
| Title | `articles.title` | Truncate at 80 chars |
| Source | `articles.source_name` + `source_type` badge | e.g. "NDTV · Online" |
| Published | `articles.published_at` | Relative time ("2h ago") |
| Districts | `articles.districts_mentioned` | Show first 2, "+N more" |
| Severity | `articles.severity` | Colour-coded badge |
| Sentiment | `articles.sentiment` | Colour-coded |
| Status | `articles.entry_status` | Badge: draft / submitted / reviewed / archived |
| Flags | `is_law_order`, `risk_flag`, `alerted` | Icon indicators |

### Severity badge colours (from `constants.ts` SEVERITY_COLORS)
```
CRITICAL → red
HIGH     → orange
MEDIUM   → yellow
LOW      → slate
```

### Filters available (from `ArticleFilters` in `index.ts`)
```
date_from / date_to   → published_at range
source_type           → 'tv' | 'print' | 'online' | 'youtube' | 'upload' | ''
severity              → 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | ''
district              → single district name (contains check in districts_mentioned)
sentiment             → 'positive' | 'negative' | 'neutral' | 'mixed' | ''
search                → full-text against title + analyst_synopsis + content
source_name           → exact source name filter
entity                → name appears in persons_named array
```

### Query pattern for list
```sql
SELECT
  id, title, source_name, source_type,
  published_at, created_at,
  districts_mentioned, severity, sentiment,
  entry_status, is_law_order, risk_flag, alerted,
  analyst_synopsis
FROM public.articles
WHERE
  -- apply filters...
  ($source_type IS NULL OR source_type = $source_type)
  AND ($severity IS NULL OR severity = $severity)
  AND ($district IS NULL OR $district = ANY(districts_mentioned))
  AND ($sentiment IS NULL OR sentiment = $sentiment)
  AND ($search IS NULL OR
    to_tsvector('english', coalesce(title,'') || ' ' || coalesce(analyst_synopsis,'')) @@
    plainto_tsquery('english', $search))
ORDER BY published_at DESC
LIMIT $size OFFSET ($page - 1) * $size;
```

---

## 10. Article Detail View

On opening an article:

1. Fetch full row from `articles`.
2. Check `ai_insights IS NULL`:
   - If NULL → trigger AI generation (check `ai_queue` first to avoid duplicate calls)
   - If populated → render the AI panel from `ai_insights` JSONB
3. Display all common fields + type-specific fields from `type_metadata`.
4. Show `entry_status` as a status stepper: `draft → submitted → reviewed → archived`
5. Supervisor-only: show "Mark as Reviewed" button → updates `entry_status = 'reviewed'`
6. Admin-only: show "Archive" button → updates `entry_status = 'archived'`
7. Show `ai_insights` panel once loaded:
   ```
   short_summary        → One-line summary
   expanded_summary     → Full paragraph
   narrative_analysis   → Deeper read
   risk_points[]        → Bullet list
   misinformation_checks[] → Fact-check signals
   key_entities[]       → Named entities Groq identified
   recommended_actions[] → Suggested steps
   ```

### Analyst can edit after submission
Allow editing these fields post-submission (generate audit log entry):
- `severity_analyst` (override AI suggestion)
- `verification_status`
- `entry_status` (only to 'archived', and only ADMIN)
- `persons_named`, `schemes_referenced`, `departments_mentioned`
- `incident_category_ids`
- `action_required`
- `internal_notes`
- `is_law_order`, `risk_flag`
- `tone`, `swot_tag`

Do NOT allow editing `source_type`, `published_at`, `analyst_id`, `content`, `analyst_synopsis` after submission without ADMIN role.

---

## 11. Keywords & Matching

### What `keywords_matched` is

`keywords_matched TEXT[]` on the article contains the specific keyword strings that matched against the content. At upload time, the analyst can manually add keywords. The AI/API layer may also populate this during processing.

There is also a `keywords` table (referenced in `index.ts` as `Keyword` interface) for the admin-managed keyword taxonomy:

```
Keyword.term          → the keyword string
Keyword.term_hindi    → Hindi variant
Keyword.category      → 'governance' | 'law_order' | 'districts' | 'officials' | 'schemes'
Keyword.variants      → alternate spellings, abbreviations
Keyword.is_active     → whether keyword is active
Keyword.status        → 'pending' | 'active' | 'rejected'
```

**Note:** The `keywords` table is in `index.ts` but not yet in `schema.sql`. It needs to be created. The upload form should suggest keywords from this table as the analyst types `topics` or `keywords_matched`.

### How keyword matching works in the upload form
- As analyst types in `topics` or `keywords_matched` tag inputs, do a client-side or API-side match against active `keywords`.
- Auto-suggest matching keywords from the taxonomy.
- Analyst can also add free-form keywords not in the taxonomy.
- `keywords_matched` is what got matched; `topics` is the analyst's own topic tags.

### Keyword category labels (from `constants.ts`)
```
governance  → "Governance"
law_order   → "Law & Order"
districts   → "Districts"
officials   → "Officials"
schemes     → "Schemes"
```

---

## 12. What the Analyst Never Sees

These fields exist in the DB and the `Article` interface but should never be surfaced in the analyst upload form or article list. They are backend/AI-only:

```
divisions_mentioned       → Set by trigger, shown read-only in detail view only
severity                  → Show this in the list/detail (resolved value), but analyst writes to severity_analyst
severity_ai               → Internal, shown as "AI suggestion" label only
ai_insights               → Shown in a separate AI panel, not a form field
summary_english           → Shown read-only in detail view
summary_hindi             → Shown read-only in detail view
viral_risk_score          → Show read-only in detail view
alerted                   → Show as icon/badge, not editable
sentiment_score           → Show read-only as confidence indicator
media_storage_path        → Internal storage reference
created_at                → Show read-only
updated_at                → Show read-only
```

---

## 13. Alert Escalation (for reference, not upload form)

Alerts are written to the `alerts` table by the API after an article is saved with HIGH or CRITICAL severity. The analyst does not trigger alerts manually — the API does after checking severity.

```
CRITICAL → dispatch within 15 min → channels: ['whatsapp','sms','dashboard']
HIGH     → dispatch within 1hr   → channels: ['whatsapp','dashboard']
MEDIUM   → daily report           → channels: ['dashboard']
LOW      → daily report pool      → channels: ['dashboard']
```

The `alerted` boolean on the article row is set to `true` once an alert has been dispatched.

---

## 14. Full Sample Article Rows

### Online article (English)
```json
{
  "source_type": "online",
  "source_name": "NDTV",
  "published_at": "2026-03-07T14:00:00+05:30",
  "title": "Akhilesh Yadav attacks BJP on inflation, corruption",
  "content": "Full article text...",
  "content_language": "english",
  "analyst_synopsis": "SP chief held Lucknow press conference targeting BJP on inflation and power crisis. Tone aggressive. High political significance ahead of 2027.",
  "url": "https://ndtv.com/...",
  "districts_mentioned": ["Lucknow"],
  "persons_named": ["Akhilesh Yadav"],
  "topics": ["politics", "opposition", "inflation", "2027 elections"],
  "keywords_matched": ["BJP", "corruption", "inflation", "SP"],
  "sentiment": "negative",
  "tone": "critical",
  "severity_analyst": "LOW",
  "is_law_order": false,
  "risk_flag": false,
  "verification_status": "verified",
  "incident_category_ids": [],
  "type_metadata": {
    "publication_name": "NDTV",
    "article_category": "politics",
    "byline": "PTI",
    "social_shares": 1240,
    "source_tier": "national",
    "paywall": false
  }
}
```

### Print article (Hindi)
```json
{
  "source_type": "print",
  "source_name": "Dainik Jagran Lucknow",
  "published_at": "2025-11-05T06:00:00+05:30",
  "title": "अखिलेश ने कहा — 2027 में इंडिया गठबंधन के साथ लड़ेगी सपा",
  "content": "Hindi article body...",
  "content_language": "hindi",
  "analyst_synopsis": "Dainik Jagran front-page coverage of Akhilesh confirming INDIA bloc for 2027. Hindi press coverage reaches district-level SP workers.",
  "url": null,
  "districts_mentioned": ["Lucknow"],
  "persons_named": ["Akhilesh Yadav"],
  "topics": ["politics", "2027 elections", "INDIA bloc"],
  "keywords_matched": ["इंडिया गठबंधन", "SP", "2027", "अखिलेश"],
  "sentiment": "neutral",
  "tone": "factual",
  "severity_analyst": "LOW",
  "is_law_order": false,
  "risk_flag": false,
  "verification_status": "verified",
  "incident_category_ids": [],
  "type_metadata": {
    "newspaper_name": "Dainik Jagran",
    "edition_city": "Lucknow",
    "page_number": 1,
    "front_page": true,
    "column_position": "left",
    "headline_size": "banner",
    "photo_accompanying": true
  }
}
```

### CRITICAL communal violence article
```json
{
  "source_type": "online",
  "source_name": "NDTV",
  "published_at": "2024-10-14T10:00:00+05:30",
  "title": "Bahraich violence: Ram Gopal Mishra shot dead during Durga procession",
  "content_language": "english",
  "analyst_synopsis": "CRITICAL communal violence event in Bahraich. Hindu man shot during Durga Puja procession near mosque. Internet shutdown imposed. CM Yogi ordered senior officials to the spot.",
  "districts_mentioned": ["Bahraich"],
  "persons_named": ["Yogi Adityanath", "Keshav Prasad Maurya"],
  "sentiment": "negative",
  "tone": "sensational",
  "severity_analyst": "CRITICAL",
  "is_law_order": true,
  "risk_flag": true,
  "verification_status": "verified",
  "incident_category_ids": ["Communal Violence", "Mob Violence"],
  "type_metadata": {
    "publication_name": "NDTV",
    "article_category": "crime",
    "source_tier": "national",
    "paywall": false
  }
}
```
