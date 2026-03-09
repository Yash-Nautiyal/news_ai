import { NextResponse } from "next/server";
import { format } from "date-fns";
import { getArticleById } from "@/lib/clips/repository";
import type { Article } from "@/types";
import { generateInsightsForArticle } from "@/lib/articles/generateInsights";
import { buildSelectedReportPdf } from "@/lib/reports/buildSelectedReportPdf";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const articleIds = body?.article_ids as unknown;
    if (!Array.isArray(articleIds) || articleIds.length === 0) {
      return NextResponse.json(
        { error: "article_ids must be a non-empty array." },
        { status: 400 },
      );
    }
    const ids = articleIds.filter((id): id is string => typeof id === "string");
    if (ids.length === 0) {
      return NextResponse.json(
        { error: "At least one valid article id is required." },
        { status: 400 },
      );
    }

    const articles: Article[] = [];
    for (const id of ids) {
      const article = await getArticleById(id);
      if (article) articles.push(article);
    }
    if (articles.length === 0) {
      return NextResponse.json(
        { error: "No articles found for the given ids." },
        { status: 404 },
      );
    }

    // Ensure AI summary exists for each article before building the report
    for (let i = 0; i < articles.length; i++) {
      if (!articles[i].ai_insights) {
        articles[i].ai_insights = await generateInsightsForArticle(articles[i]);
      }
    }

    const reportDate = format(new Date(), "yyyy-MM-dd");
    const pdfBytes = await buildSelectedReportPdf(articles);
    const filename = `DIPR-UP-Report-selected-${reportDate}.pdf`;

    return new NextResponse(pdfBytes, {
      status: 201,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdfBytes.length),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate report.",
      },
      { status: 500 },
    );
  }
}
