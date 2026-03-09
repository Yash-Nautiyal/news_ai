# DIPR — Developer Data Flow Guide

A simple, step-by-step guide to how the app connects to the database, fetches data, and uploads articles. Written for developers new to the project.

---

## 1. Big picture in one diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  BROWSER (React components)                                                 │
│  • Uses hooks: useArticles(), useArticle(id), useSources(), etc.             │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                    NEXT_PUBLIC_USE_MOCK_DATA?
                    ┌───────────────┴───────────────┐
                    │ true                          │ false
                    ▼                               ▼
            Return mock data                 HTTP request to
            from memory                      /api/articles, /api/entities, ...
                    │                               │
                    │                               ▼
                    │                       ┌─────────────────────────────────┐
                    │                       │  NEXT.JS API ROUTES              │
                    │                       │  src/app/api/articles/route.ts    │
                    │                       │  src/app/api/entities/route.ts    │
                    │                       │  etc.                             │
                    │                       └───────────────┬─────────────────┘
                    │                                       │
                    │                       hasSupabaseAdminConfig()?
                    │                       ┌───────────────┴───────────────┐
                    │                       │ true                          │ false
                    │                       ▼                               ▼
                    │               Supabase client                 Mock / empty
                    │               (articles, entities,             (or legacy "clips")
                    │                media_sources, ...)
                    │                       │
                    └──────────────────────┴───────────────────────────────►
                                            │
                                            ▼
                                    ┌───────────────┐
                                    │  SUPABASE     │
                                    │  (PostgreSQL) │
                                    │  tables:      │
                                    │  articles,    │
                                    │  entities,    │
                                    │  media_sources│
                                    │  etc.         │
                                    └───────────────┘
```

**In short:**

- **Frontend** uses **hooks** to get data.
- A **env flag** decides: use **mock data** in memory, or call **API routes**.
- **API routes** call **repository / Supabase** functions.
- Another check decides: use **Supabase** (real DB) or **mock/legacy**.

---

## 2. Environment variables that control the flow

| Variable                    | Where it's read                               | What it does                                                                                                            |
| --------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_USE_MOCK_DATA` | **Browser** (hooks) and **Server** (optional) | `"true"` → hooks return mock data and **do not** call the API. `"false"` → hooks call `/api/...` and you get real data. |
| `NEXT_PUBLIC_SUPABASE_URL`  | **Server** only (`src/lib/supabase/admin.ts`) | Your Supabase project URL. Required for real DB.                                                                        |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server** only (`src/lib/supabase/admin.ts`) | Secret key that lets the server read/write all tables. Never expose in the browser.                                     |

**Typical setup:**

- **Development with fake data:**  
  `NEXT_PUBLIC_USE_MOCK_DATA=true`  
  (no Supabase needed; everything comes from `src/lib/mockData.ts`)

- **Development / production with real DB:**  
  `NEXT_PUBLIC_USE_MOCK_DATA=false`  
  `NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co`  
  `SUPABASE_SERVICE_ROLE_KEY=eyJ...`

See `.env.example` for a template.

---

## 3. Where the database connection lives

All Supabase access goes through **one** client, created on the **server** only.

**File:** `src/lib/supabase/admin.ts`

- **`hasSupabaseAdminConfig()`**  
  Returns `true` only if both `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set.  
  Used to decide: “Should we use Supabase or mock/legacy?”

- **`getSupabaseAdminClient()`**  
  Creates (and caches) the Supabase client with the service role key.  
  All reads/writes to the database use this client.

So: **no database connection in the browser**. The browser talks to your own API routes; the API routes use `admin.ts` to talk to Supabase.

---

## 4. How the frontend gets data (fetching)

### Step 1: Component uses a hook

Example: article list page.

```ts
// In a React component
const { data } = useArticles({ page: 1, size: 25 });
```

### Step 2: Hook checks mock flag

**File:** `src/hooks/useArticles.ts`

```ts
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

// Inside the hook's queryFn:
if (USE_MOCK) {
  return { items: MOCK_ARTICLES, total: MOCK_ARTICLES.length, ... };
}
// Otherwise:
const { data } = await api.get("/api/articles", { params: filters });
return data;
```

- If **mock** → return data from `src/lib/mockData.ts` (no HTTP request).
- If **not mock** → call **GET /api/articles** with filters.

### Step 3: API route runs on the server

**File:** `src/app/api/articles/route.ts`

- Parses query params (page, size, source_type, district, etc.).
- Calls **`getArticlesPage(filters)`** from the repository.

### Step 4: Repository chooses Supabase or mock

**File:** `src/lib/clips/repository.ts`

```ts
export async function getArticlesPage(filters) {
  if (useSupabaseArticles()) {
    return getArticlesPageFromSupabase(filters); // Real DB
  }
  // Otherwise: load from legacy "clips" or in-memory mock
  const all = await getAllArticles();
  // ... filter and paginate in memory
}
```

`useSupabaseArticles()` is just **`hasSupabaseAdminConfig()`** (same as in `admin.ts`).

### Step 5: Supabase runs the query

**File:** `src/lib/supabase/articles.ts`

- **`getArticlesPageFromSupabase(filters)`** uses `getSupabaseAdminClient()` and runs:

  ```ts
  supabase.from("articles").select(...).order("published_at", { ascending: false }).range(from, to)
  ```

- Applies filters (source_type, severity, district, date range, search, entity).
- Maps each row to the **Article** type with **`articleRowToArticle(row)`**.
- Returns `{ items, total, page, size, pages }`.

### End-to-end flow (fetch articles)

```
useArticles(filters)
  → if USE_MOCK: return MOCK_ARTICLES
  → else: api.get("/api/articles", params)
        → GET /api/articles/route.ts
          → getArticlesPage(filters)
            → if hasSupabaseAdminConfig(): getArticlesPageFromSupabase(filters)
                → supabase.from("articles").select(...)
                → articleRowToArticle() for each row
                → return { items, total, page, size, pages }
            → else: getAllArticles() then filter/paginate (mock or legacy)
        ← return JSON
  ← data to component
```

Same idea for **one article** and **similar articles**:

- **One article:** component uses `useArticle(id)` → **GET /api/articles/[id]** → **getArticleById(id)** → **getArticleByIdFromSupabase(id)** or mock.
- **Similar articles:** component uses `useSimilarArticles(articleId)` → **GET /api/articles/[id]/similar** → **getSimilarArticles(articleId)** (which uses **getAllArticles()** and then scores by district/topic/persons/schemes).

---

## 5. How uploading (creating) an article works

### Step 1: User submits the upload form

**File:** `src/app/(dashboard)/upload/page.tsx`

- User picks an upload type (TV, Print, Online, YouTube, Image, WhatsApp, Manual).
- Fills common fields (title, content, analyst synopsis, districts, persons, schemes, etc.) and type-specific fields (stored in `type_metadata`).
- Clicks **Submit article**.
- Form runs **`validateForm()`**; if there are errors, it shows them and **does not** call the API.
- If valid, it calls:

  ```ts
  await api.post("/api/articles", buildPayload());
  ```

- **`buildPayload()`** builds one object with all common fields plus **`type_metadata`** (and optional **`source_id`** / **`source_name`**).

### Step 2: API route receives the body

**File:** `src/app/api/articles/route.ts` (export **POST**)

- Reads JSON body.
- Checks **`hasSupabaseAdminConfig()`**; if false, returns 503.
- Validates **source_type** and **analyst_synopsis** (min 30 chars).
- Calls **`insertArticleIntoSupabase(payload)`**.

### Step 3: Insert into Supabase

**File:** `src/lib/supabase/articles.ts`

- **`insertArticleIntoSupabase(payload)`**:
  - Uses **`getSupabaseAdminClient()`**.
  - Resolves **analyst_id** (from payload or env **SEED_ANALYST_ID** or default seed analyst UUID).
  - Builds a row object: **does not** set **divisions_mentioned** or **severity** (DB triggers set those).
  - Runs **`supabase.from("articles").insert(row).select("id").single()`**.
  - Returns **`{ id }`**.

### Step 4: Response back to the form

- API returns **201** with **`{ id }`**.
- Form shows success and can redirect to the feed with the new article id.

**Flow in one line:**

```
Upload form → validateForm() → api.post("/api/articles", payload)
  → POST /api/articles/route.ts
    → insertArticleIntoSupabase(payload)
      → getSupabaseAdminClient().from("articles").insert(row)
  ← { id }
  → redirect to feed
```

---

## 6. Reference data (dropdowns and lookups)

Used for upload form dropdowns and filters. All go through **API routes** when not in mock mode, then to **Supabase** if configured.

### Entities (persons, schemes, departments)

- **Frontend:** calls **GET /api/entities** with `?category=scheme` or `?categories=minister,official`.
- **API:** `src/app/api/entities/route.ts` → **getEntitiesFromSupabase(category)** or **getEntitiesByCategoriesFromSupabase(categories)**.
- **Supabase:** `src/lib/supabase/reference.ts` → **`supabase.from("entities").select(...).eq("is_active", true)`**.

### Incident categories

- **Frontend:** **GET /api/incident-categories**.
- **API:** `src/app/api/incident-categories/route.ts` → **getIncidentCategoriesFromSupabase()**.
- **Supabase:** **`supabase.from("incident_categories").select(...)`**.

### Media sources (TV, print, online)

- **Frontend:** **GET /api/sources?type=tv** (or print, online).
- **API:** `src/app/api/sources/route.ts` → **getMediaSourcesFromSupabase(type)**.
- **Supabase:** **`supabase.from("media_sources").select(...).eq("source_type", type)`**.

### TV channels (same as sources with type=tv)

- **Frontend:** **GET /api/tv/channels**.
- **API:** `src/app/api/tv/channels/route.ts` → **getTVChannelsFromSupabase()** (uses media_sources where source_type = 'tv').

### Alerts, reports, users

- **Alerts:** **GET /api/alerts** → **getAlertsFromSupabase(filters)** → **`supabase.from("alerts")`** (+ optional article fetch).
- **Reports:** **GET /api/reports** → **getReportsFromSupabase(type)** → **`supabase.from("reports")`**.
- **Users:** **GET /api/users** → **getUsersFromSupabase()** → **`supabase.from("users")`**.

All reference helpers live in **`src/lib/supabase/reference.ts`** and use **`getSupabaseAdminClient()`** and **`hasSupabaseAdminConfig()`**.

---

## 7. Analytics (charts and dashboards)

Analytics (sentiment trend, district risk, source volume, etc.) **do not** have their own tables. They are computed from **articles**.

Flow:

1. **Frontend** calls e.g. **GET /api/analytics/sentiment-trend?period=7d**.
2. **API route** (e.g. `src/app/api/analytics/sentiment-trend/route.ts`) calls **`getSentimentTrend(period)`** from **`src/lib/clips/repository.ts`**.
3. **Repository** calls **`getAllArticles()`** (which uses **getArticlesForAnalyticsFromSupabase()** when Supabase is configured, else mock/legacy).
4. **getSentimentTrend** filters articles by period and buckets by date and sentiment (positive/negative/neutral/mixed), then returns an array of **{ timestamp, positive, negative, neutral, mixed }**.

So: **analytics = repository functions that read articles and aggregate in memory**. When Supabase is on, articles come from **getArticlesForAnalyticsFromSupabase()** (capped limit).

Same idea for:

- **getDistrictRisk()** → district risk from articles.
- **getSourceVolume()** → counts by source_name + source_type.
- **getTopicDistribution()** → counts by topic.
- **getSeverityDistribution()** → counts by severity.
- **getEntityCooccurrence()** → builds entity graph from articles (persons, districts, schemes).
- **getKeywordTrending()** → counts by keyword.

---

## 8. Quick reference: API route → function → table

| What                      | API route                          | Server function                                               | Supabase table / source                                        |
| ------------------------- | ---------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------- |
| Article list (paginated)  | GET /api/articles                  | getArticlesPage → getArticlesPageFromSupabase                 | **articles**                                                   |
| One article               | GET /api/articles/[id]             | getArticleById → getArticleByIdFromSupabase                   | **articles**                                                   |
| Similar articles          | GET /api/articles/[id]/similar     | getSimilarArticles (uses getAllArticles)                      | **articles** (via getArticlesForAnalyticsFromSupabase or mock) |
| Create article            | POST /api/articles                 | insertArticleIntoSupabase                                     | **articles** (insert)                                          |
| Entities                  | GET /api/entities                  | getEntitiesFromSupabase / getEntitiesByCategoriesFromSupabase | **entities**                                                   |
| Incident categories       | GET /api/incident-categories       | getIncidentCategoriesFromSupabase                             | **incident_categories**                                        |
| Sources (TV/print/online) | GET /api/sources                   | getMediaSourcesFromSupabase                                   | **media_sources**                                              |
| TV channels               | GET /api/tv/channels               | getTVChannelsFromSupabase                                     | **media_sources** (type=tv)                                    |
| Alerts                    | GET /api/alerts                    | getAlertsFromSupabase                                         | **alerts**                                                     |
| Reports                   | GET /api/reports                   | getReportsFromSupabase                                        | **reports**                                                    |
| Users                     | GET /api/users                     | getUsersFromSupabase                                          | **users**                                                      |
| Sentiment trend           | GET /api/analytics/sentiment-trend | getSentimentTrend                                             | Articles (in memory)                                           |
| District risk             | GET /api/analytics/district-risk   | getDistrictRisk                                               | Articles (in memory)                                           |
| Other analytics           | GET /api/analytics/...             | getSourceVolume, getTopicDistribution, etc.                   | Articles (in memory)                                           |

---

## 9. File map (where to look)

| Purpose                                                  | File(s)                                           |
| -------------------------------------------------------- | ------------------------------------------------- |
| Supabase connection & config check                       | `src/lib/supabase/admin.ts`                       |
| Article read/write (Supabase)                            | `src/lib/supabase/articles.ts`                    |
| Reference data read (Supabase)                           | `src/lib/supabase/reference.ts`                   |
| Article list / one / similar / analytics (orchestration) | `src/lib/clips/repository.ts`                     |
| HTTP client (base URL, auth)                             | `src/lib/api.ts`                                  |
| Mock data when USE_MOCK_DATA=true                        | `src/lib/mockData.ts`                             |
| Hooks that call API or return mock                       | `src/hooks/useArticles.ts`, `useSources.ts`, etc. |
| API entry points                                         | `src/app/api/**/route.ts`                         |
| Upload form & validation                                 | `src/app/(dashboard)/upload/page.tsx`             |

---

## 10. Important rules (from schema handoff)

- **Do not set** **divisions_mentioned** or **severity** when inserting/updating articles. The database sets them with triggers.
- **analyst_id** on articles: set from session when you have auth; otherwise the API uses **SEED_ANALYST_ID** or the default seed analyst UUID.
- **incident_category_ids** in the DB store **category names** (e.g. `"Communal Violence"`), not UUIDs.
- **districts_mentioned** values must match **geo_districts.name** (and **UP_DISTRICTS** in constants).

For full schema details, see **schema.sql** and **SCHEMA_HANDOFF_CHECKLIST.md**.

---

That’s the full flow: env → mock vs API → API route → repository vs Supabase → tables. Use this guide to trace any “where does this data come from?” or “what runs when I click submit?” question.
