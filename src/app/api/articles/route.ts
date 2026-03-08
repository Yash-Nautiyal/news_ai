import { NextResponse } from "next/server";
import { getArticlesPage } from "@/lib/clips/repository";
import {
  hasSupabaseAdminConfig,
} from "@/lib/supabase/admin";
import {
  insertArticleIntoSupabase,
  type InsertArticlePayload,
} from "@/lib/supabase/articles";
import type { ArticleFilters } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    if (!hasSupabaseAdminConfig()) {
      return NextResponse.json(
        { error: "Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY." },
        { status: 503 },
      );
    }
    const body = (await request.json()) as InsertArticlePayload;
    if (!body.source_type || !body.analyst_synopsis?.trim()) {
      return NextResponse.json(
        { error: "source_type and analyst_synopsis are required." },
        { status: 400 },
      );
    }
    if (body.analyst_synopsis.trim().length < 30) {
      return NextResponse.json(
        { error: "analyst_synopsis must be at least 30 characters." },
        { status: 400 },
      );
    }
    const { id } = await insertArticleIntoSupabase(body);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create article." },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filters: ArticleFilters & { entity?: string } = {
      page: Number(searchParams.get("page") || "1"),
      size: Number(searchParams.get("size") || "25"),
      date_from: searchParams.get("date_from") || undefined,
      date_to: searchParams.get("date_to") || undefined,
      source_type:
        (searchParams.get("source_type") as ArticleFilters["source_type"]) ||
        undefined,
      severity:
        (searchParams.get("severity") as ArticleFilters["severity"]) || undefined,
      district: searchParams.get("district") || undefined,
      sentiment:
        (searchParams.get("sentiment") as ArticleFilters["sentiment"]) ||
        undefined,
      search: searchParams.get("search") || undefined,
      source_name: searchParams.get("source_name") || undefined,
      entity: searchParams.get("entity") || undefined,
    };

    const payload = await getArticlesPage(filters);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        items: [],
        total: 0,
        page: 1,
        size: 25,
        pages: 1,
        error: error instanceof Error ? error.message : "Failed to load articles.",
      },
      { status: 500 },
    );
  }
}
