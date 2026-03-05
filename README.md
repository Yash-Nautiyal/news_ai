# DIPR UP Media Monitor – Frontend

Next.js 14+ (App Router) frontend for the DIPR Uttar Pradesh media monitoring platform. Built per the **DIPR UP Media Monitor — Cursor Build Guide** in the repo root.

## Quick start

```bash
cd news_ai
cp .env.example .env.local
# Edit .env.local: set NEXT_PUBLIC_API_URL and AUTH_SECRET (e.g. openssl rand -base64 32)
npm install --legacy-peer-deps
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Unauthenticated users are redirected to `/login`. Use backend credentials to sign in.

## Stack

- **Next.js** (App Router), **TypeScript**, **Tailwind CSS**
- **React Query** – data fetching
- **NextAuth v5** – JWT auth (credentials provider, backend at `NEXT_PUBLIC_API_URL`)
- **Recharts** – sentiment, topic, source, severity charts
- **D3** – entity co-occurrence graph
- **@vnedyalk0v/react19-simple-maps** – UP district map (React 19 compatible)

## Structure

- `src/app/(auth)/login` – login page
- `src/app/(dashboard)/` – feed, analytics, districts, tv, alerts, reports, keywords, upload, admin
- `src/components/` – layout, articles, charts, districts, tv, alerts, keywords
- `src/hooks/` – useArticles, useAnalytics, useAlerts, useKeywords, useReports, useSources, useDistricts, useTVChannels
- `src/lib/` – api (axios), auth (NextAuth), constants (UP districts, labels), utils
- `src/types/` – shared TypeScript types

## Backend

Expects a FastAPI server at `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`) with routes under `/api/` as described in the build guide (auth, articles, analytics, tv, alerts, keywords, reports, sources, upload, users, system).

## Demo checklist

See the **Demo Day Checklist** in the main build guide for seeding data, triggering ingestion, and verifying feed, TV monitor, district map, reports, and Hindi text.
