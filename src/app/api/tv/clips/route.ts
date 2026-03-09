import { NextResponse } from "next/server";
import type { Article } from "@/types";
import { hasSupabaseAdminConfig } from "@/lib/supabase/admin";
import { getArticlesForAnalyticsFromSupabase } from "@/lib/supabase/articles";
import { getAllArticles } from "@/lib/clips/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    let articles: Article[];
    if (hasSupabaseAdminConfig()) {
      // Read from the unified `articles` table in Supabase.
      articles = await getArticlesForAnalyticsFromSupabase(1000);
    } else {
      // Fallback for local/mock mode: use legacy clips pipeline / mock data.
      articles = await getAllArticles();
    }

    const clips = articles.filter(
      (a) => a.source_type === "tv" || a.source_type === "youtube",
    );

    return NextResponse.json(clips);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load TV clips from articles.",
      },
      { status: 500 },
    );
  }
}

