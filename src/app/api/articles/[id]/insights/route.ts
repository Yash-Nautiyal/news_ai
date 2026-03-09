import { NextResponse } from "next/server";
import { getArticleById } from "@/lib/clips/repository";
import { generateInsightsForArticle } from "@/lib/articles/generateInsights";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const params = await context.params;
    const article = await getArticleById(params.id);
    if (!article) {
      return NextResponse.json({ error: "Article not found." }, { status: 404 });
    }

    const hadCached = !!article.ai_insights;
    const insights = await generateInsightsForArticle(article);

    return NextResponse.json({
      cached: hadCached,
      insights,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate insights.",
      },
      { status: 500 },
    );
  }
}
