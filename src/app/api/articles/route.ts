import { NextResponse } from "next/server";
import { getArticlesPage } from "@/lib/clips/repository";
import type { ArticleFilters } from "@/types";

export const dynamic = "force-dynamic";

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
