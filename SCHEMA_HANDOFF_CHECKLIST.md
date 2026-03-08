# DIPR Schema Handoff — Cursor Agent Checklist

> **Read this before touching any table, query, or insert.**  
> Source of truth: `schema.sql` + `DIPR_Analyst_Upload_Guide.md`.

---

## Tables

| Table                 | Purpose                                                               | Who writes     |
| --------------------- | --------------------------------------------------------------------- | -------------- |
| `users`               | Analysts/admins; links to `auth.users` via `auth_id`                  | Admin UI       |
| `entities`            | Ministers, officials, departments, schemes, organisations             | Admin UI       |
| `incident_categories` | Crime/incident types (multi-select)                                   | Admin UI       |
| `geo_districts`       | 75 UP districts — names must match `UP_DISTRICTS` in `constants.ts`   | Seeded, static |
| `geo_constituencies`  | 403 VS, 80 LS via `ls_constituency`                                   | Seeded, static |
| `media_sources`       | TV (70), print, online — feeds dropdowns                              | Admin UI       |
| **`articles`**        | **Central table.** All 7 upload types. `source_type` = discriminator. | Analysts / API |
| `ai_queue`            | One row per article, `UNIQUE(article_id)`; dedup for Groq             | API            |
| `alerts`              | Dispatch log; immutable after sent                                    | API            |
| `district_risk`       | Per-district risk snapshot (75 rows)                                  | API/cron       |
| `reports`             | Daily/weekly/monthly; `UNIQUE(report_type, report_date)`              | API            |
| `audit_logs`          | INSERT-only admin CRUD + analyst severity/status                      | API            |
| `system_status`       | Singleton `id = 1`                                                    | API            |

---

## Articles: Critical Rules

### Do NOT set from API

- **`divisions_mentioned`** — Filled by trigger from `districts_mentioned`. Never write.
- **`severity`** — Resolved by trigger from `severity_analyst` / `severity_ai`. Only set `severity_analyst` (analyst) or `severity_ai` (Groq).

### Column naming (DB ↔ frontend)

- **`persons_named`** — From `entities` (minister, official). Frontend/API use this name.
- **`schemes_referenced`** — From `entities` (scheme).
- **`schemes_mentioned`** / **`politicians_mentioned`** — Legacy names; when using `articles` table, read/write **`schemes_referenced`** and **`persons_named`**.
- **`incident_category_ids`** — Stores **category names** (e.g. `'Communal Violence'`, `'Rape'`), **not** UUIDs.

### Geo

- **`districts_mentioned`** — Values must match `geo_districts.name` exactly (= `UP_DISTRICTS` in `constants.ts`).
- **`constituency_vidhan_sabha`** / **`constituency_lok_sabha`** — Optional arrays of names.

### Required / important fields

- **`analyst_synopsis`** — NOT NULL, non-empty (trimmed length > 0). Primary input for Groq.
- **`source_id`** — FK to `media_sources.id` when type is tv/print/online; set **`source_name`** (denormalized) from `media_sources.name`.
- **`upload_sub_type`** — Only when `source_type = 'upload'`: `'image'` | `'whatsapp'` | `'manual'`.

### AI lazy-load (when implemented)

1. Article opened → if `ai_insights IS NULL`, check `ai_queue` for `article_id`.
2. No row → INSERT `ai_queue` (pending) → call Groq → write `articles.ai_insights`, `summary_english`, `summary_hindi` → set `ai_queue.status = 'done'`.
3. Never set `severity` directly; set `severity_ai` from Groq or `severity_analyst` from analyst.

---

## Enums (quick ref)

- **source_type:** `tv` | `print` | `online` | `youtube` | `upload`
- **upload_sub_type:** `image` | `whatsapp` | `manual`
- **severity_level:** `CRITICAL` | `HIGH` | `MEDIUM` | `LOW`
- **sentiment_type:** `positive` | `negative` | `neutral` | `mixed`
- **content_language:** `hindi` | `english` | `urdu` | `bhojpuri` | `awadhi` | `mixed` | `other`
- **entry_status:** `draft` | `submitted` | `reviewed` | `archived`
- **user_role:** `ADMIN` | `ANALYST` | `VIEWER`

---

## Seed analyst

- **id:** `00000000-0000-0000-0000-000000000001`
- **email:** `seed.analyst@dipr.up.gov.in`
- **name:** Seed Analyst
- **role:** ADMIN  
  (Used for seed data attribution only.)

---

## Not done yet (do not assume)

- RLS policies
- Column rename `incident_category_ids` → `incident_categories`
- `summary_hindi_reviewed`
- Storage buckets (`media-uploads`, `report-exports`)
- `supabase gen types typescript` (types in `index.ts` may not match all columns)
- Groq lazy-load wiring
- WhatsApp alert routing
- `district_risk` refresh cron
- Audit log writes from API

---

## Using Supabase (no mock data)

Set in `.env.local`:

- `NEXT_PUBLIC_USE_MOCK_DATA=false`
- `NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY=your-service-role-key`

When both are set, the app uses the `articles`, `media_sources`, `alerts`, `reports`, `users` tables (and reference tables) via the API. No mock data is used.

---

## District name note

- **Canonical district names** = `geo_districts.name` = `UP_DISTRICTS` in `constants.ts`.
- If using “Prayagraj” in app, ensure DB/trigger use the same (schema trigger map may use “Allahabad” for division; district name should match `UP_DISTRICTS`).
