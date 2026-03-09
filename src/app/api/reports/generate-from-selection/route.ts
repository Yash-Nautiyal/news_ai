import { NextResponse } from "next/server";
import { format } from "date-fns";
import { getArticleById } from "@/lib/clips/repository";
import type { Article } from "@/types";
import { generateInsightsForArticle } from "@/lib/articles/generateInsights";
import { buildSelectedReportPdf } from "@/lib/reports/buildSelectedReportPdf";
import { hasSupabaseAdminConfig } from "@/lib/supabase/admin";
import { uploadReportPdfAndUpsert } from "@/lib/supabase/reports";

export const dynamic = "force-dynamic";

function buildSummaryExcerpt(articles: Article[], reportDate: string): string {
  const n = articles.length;
  const districts = [...new Set(articles.flatMap((a) => a.districts_mentioned ?? []))].slice(0, 5).join(", ");
  return `Selected articles report: ${n} story${n !== 1 ? "ies" : ""}. Generated ${reportDate}.${districts ? ` Districts: ${districts}.` : ""}`;
}

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

    let saveError: string | null = null;
    if (hasSupabaseAdminConfig()) {
      try {
        const summaryText = buildSummaryExcerpt(articles, reportDate);
        await uploadReportPdfAndUpsert(pdfBytes, {
          report_type: "selected",
          report_date: reportDate,
          summary_text: summaryText,
          created_by: (body?.created_by as string) ?? null,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        saveError = message;
        console.error("[generate-from-selection] Report save failed (PDF still returned):", message);
      }
    } else {
      saveError = "Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to save reports.";
      console.warn("[generate-from-selection]", saveError);
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(pdfBytes.length),
    };
    if (saveError) headers["X-Report-Save-Error"] = saveError;

    return new NextResponse(pdfBytes, {
      status: 201,
      headers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate report.";
    console.error("[generate-from-selection]", message, error);
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
