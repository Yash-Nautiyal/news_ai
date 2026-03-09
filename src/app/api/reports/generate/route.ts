import { NextResponse } from "next/server";
import { format } from "date-fns";
import type { Report } from "@/types";
import { getAllArticles } from "@/lib/clips/repository";
import type { Article } from "@/types";
import { generateInsightsForArticle } from "@/lib/articles/generateInsights";
import { buildSelectedReportPdf } from "@/lib/reports/buildSelectedReportPdf";
import { hasSupabaseAdminConfig } from "@/lib/supabase/admin";
import { uploadReportPdfAndUpsert } from "@/lib/supabase/reports";

export const dynamic = "force-dynamic";

type PeriodicReportType = Extract<Report["report_type"], "daily" | "weekly" | "monthly">;

type DateRange = {
  from: Date;
  to: Date;
};

function computeDateRange(report_type: PeriodicReportType, report_date: string): DateRange | null {
  const base = new Date(report_date);
  if (Number.isNaN(base.getTime())) return null;

  const from = new Date(base);
  const to = new Date(base);

  if (report_type === "daily") {
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }

  if (report_type === "weekly") {
    // 7-day window ending on report_date (inclusive).
    from.setDate(base.getDate() - 6);
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }

  if (report_type === "monthly") {
    from.setDate(1);
    from.setHours(0, 0, 0, 0);
    // Move to first day of next month then step back one millisecond.
    to.setMonth(base.getMonth() + 1, 1);
    to.setHours(0, 0, 0, 0);
    to.setMilliseconds(to.getMilliseconds() - 1);
    return { from, to };
  }

  return null;
}

function filterArticlesByRange(articles: Article[], range: DateRange): Article[] {
  const fromTs = range.from.getTime();
  const toTs = range.to.getTime();
  return articles.filter((a) => {
    const ts = new Date(a.published_at).getTime();
    return ts >= fromTs && ts <= toTs;
  });
}

function buildSummaryExcerpt(
  report_type: PeriodicReportType,
  articles: Article[],
  range: DateRange,
): string {
  const n = articles.length;
  const fromLabel = format(range.from, "d MMM yyyy");
  const toLabel = format(range.to, "d MMM yyyy");
  const districts = [...new Set(articles.flatMap((a) => a.districts_mentioned ?? []))]
    .slice(0, 5)
    .join(", ");

  let periodLabel: string;
  if (report_type === "daily") {
    periodLabel = `for ${toLabel}`;
  } else if (report_type === "weekly") {
    periodLabel = `for ${fromLabel} – ${toLabel}`;
  } else {
    periodLabel = `for ${format(range.from, "MMMM yyyy")}`;
  }

  const storyLabel = n === 1 ? "story" : "stories";
  return `${report_type.charAt(0).toUpperCase()}${report_type.slice(
    1,
  )} report ${periodLabel}: ${n} ${storyLabel} included.${
    districts ? ` Key districts: ${districts}.` : ""
  }`;
}

export async function POST(request: Request) {
  try {
    if (!hasSupabaseAdminConfig()) {
      return NextResponse.json(
        {
          error:
            "Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable report generation.",
        },
        { status: 503 },
      );
    }

    const body = await request.json();
    const report_type = body?.report_type as Report["report_type"] | undefined;
    const report_date = body?.report_date as string | undefined;

    if (!report_type || !report_date) {
      return NextResponse.json(
        { error: "report_type and report_date required." },
        { status: 400 },
      );
    }

    if (!["daily", "weekly", "monthly"].includes(report_type)) {
      return NextResponse.json(
        { error: "Only daily, weekly, and monthly reports can be generated here." },
        { status: 400 },
      );
    }

    const range = computeDateRange(report_type as PeriodicReportType, report_date);
    if (!range) {
      return NextResponse.json(
        { error: "Invalid report_date. Use format YYYY-MM-DD." },
        { status: 400 },
      );
    }

    const allArticles = await getAllArticles();
    const articles = filterArticlesByRange(allArticles, range);

    // Ensure AI insights are populated so the PDF has rich content when there is data.
    if (articles.length > 0) {
      for (let i = 0; i < articles.length; i += 1) {
        if (!articles[i].ai_insights) {
          articles[i].ai_insights = await generateInsightsForArticle(articles[i]);
        }
      }
    }

    const pdfBytes = await buildSelectedReportPdf(articles, {
      reportDate: report_date,
      variant: report_type as PeriodicReportType,
    });

    const summary_text = buildSummaryExcerpt(
      report_type as PeriodicReportType,
      articles,
      range,
    );

    const { id, download_url } = await uploadReportPdfAndUpsert(pdfBytes, {
      report_type,
      report_date,
      summary_text,
      created_by: (body?.created_by as string | null) ?? null,
    });

    const response: Report = {
      id,
      report_type,
      report_date,
      summary_text,
      download_url,
      created_at: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate report." },
      { status: 500 },
    );
  }
}
