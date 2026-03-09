/**
 * Builds a PDF report from selected articles in the same format as the DIPR sample:
 * Header with logo, Executive Summary, Severity Overview, Story-wise Breakdown, Recommended Actions, Disclaimer.
 */

import fs from "fs";
import path from "path";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "pdf-lib";
import { format } from "date-fns";
import type { Article } from "@/types";

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const MARGIN = 50;
const CONTENT_WIDTH = A4_WIDTH - 2 * MARGIN;
const TITLE_SIZE = 18;
const HEADING_SIZE = 12;
const BODY_SIZE = 10;
const FOOTER_SIZE = 9;
const LOGO_SIZE = 44;

/** Amber/red for "Overall risk assessment" line (sample style). */
const RISK_COLOR = rgb(0.72, 0.35, 0.14);

type DrawContext = {
  page: PDFPage;
  font: PDFFont;
  boldFont: PDFFont;
  y: number;
  fontSize: number;
};

function wrapLines(
  text: string,
  maxWidth: number,
  font: PDFFont,
  fontSize: number,
): string[] {
  const lines: string[] = [];
  const words = text.split(/\s+/).filter(Boolean);
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    const w = font.widthOfTextAtSize(candidate, fontSize);
    if (w <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

type DrawTextOptions = {
  bold?: boolean;
  size?: number;
  indent?: number;
  color?: ReturnType<typeof rgb>;
  /** Override left margin (e.g. for header text to the right of logo). */
  x?: number;
};

function drawText(
  ctx: DrawContext,
  text: string,
  options: DrawTextOptions = {},
): number {
  const { page, font, boldFont, y } = ctx;
  const size = options.size ?? ctx.fontSize ?? BODY_SIZE;
  const fontToUse = options.bold ? boldFont : font;
  const baseX = options.x ?? MARGIN;
  const indent = options.indent ?? 0;
  const maxWidth = CONTENT_WIDTH - indent - (baseX - MARGIN);
  const lines = wrapLines(text, maxWidth, fontToUse, size);
  let currentY = y;
  for (const line of lines) {
    if (currentY < MARGIN + 20) break;
    page.drawText(line, {
      x: baseX + indent,
      y: currentY,
      size,
      font: fontToUse,
      ...(options.color && { color: options.color }),
    });
    currentY -= size + 2;
  }
  return currentY - 4;
}

function drawHeading(ctx: DrawContext, text: string): number {
  let y = drawText(ctx, text, { bold: true, size: HEADING_SIZE });
  return y - 4;
}

function addPageNumber(page: PDFPage, n: number, total: number, font: PDFFont) {
  const text = `Page ${n} of ${total}`;
  const w = font.widthOfTextAtSize(text, FOOTER_SIZE);
  page.drawText(text, {
    x: A4_WIDTH - MARGIN - w,
    y: MARGIN,
    size: FOOTER_SIZE,
    font,
  });
}

function getSeverityCounts(articles: Article[]): Record<string, number> {
  const counts: Record<string, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  };
  for (const a of articles) {
    const s = a.severity ?? "LOW";
    if (s in counts) counts[s]++;
    else counts.LOW++;
  }
  return counts;
}

function getOverallRisk(articles: Article[]): string {
  const hasCritical = articles.some((a) => a.severity === "CRITICAL");
  const hasHigh = articles.some((a) => a.severity === "HIGH");
  if (hasCritical) return "ELEVATED";
  if (hasHigh) return "MODERATE";
  return "LOW";
}

function getRecommendedActions(articles: Article[]): string[] {
  const actions: string[] = [];
  const critical = articles.filter((a) => a.severity === "CRITICAL");
  const byDistrict = new Map<string, Article[]>();
  for (const a of articles) {
    for (const d of a.districts_mentioned ?? []) {
      if (!byDistrict.has(d)) byDistrict.set(d, []);
      byDistrict.get(d)!.push(a);
    }
  }
  if (critical.length > 0) {
    const districts = [...new Set(critical.flatMap((a) => a.districts_mentioned ?? []))];
    if (districts.length)
      actions.push(
        `URGENT: Review critical coverage in ${districts.join(", ")} and prepare response.`,
      );
  }
  actions.push("Share positive governance and development stories through official channels.");
  actions.push("Continue monitoring sentiment and severity for the selected stories.");
  return actions;
}

function getExecutiveSummary(articles: Article[], severityCounts: Record<string, number>): string {
  const n = articles.length;
  const parts: string[] = [];
  parts.push(
    `This report covers ${n} monitored story/stories across Uttar Pradesh.`,
  );
  parts.push(
    `Severity breakdown: ${severityCounts.CRITICAL} critical, ${severityCounts.HIGH} high, ${severityCounts.MEDIUM} medium, ${severityCounts.LOW} low.`,
  );
  const sentiments = articles.map((a) => a.sentiment);
  const pos = sentiments.filter((s) => s === "positive").length;
  const neg = sentiments.filter((s) => s === "negative").length;
  const neu = sentiments.filter((s) => s === "neutral").length;
  const mix = sentiments.filter((s) => s === "mixed").length;
  const sentParts: string[] = [];
  if (pos) sentParts.push(`${pos} positive`);
  if (neg) sentParts.push(`${neg} negative`);
  if (neu) sentParts.push(`${neu} neutral`);
  if (mix) sentParts.push(`${mix} mixed`);
  parts.push(`Sentiment mix: ${sentParts.join(", ")}.`);
  const districts = [...new Set(articles.flatMap((a) => a.districts_mentioned ?? []))];
  if (districts.length)
    parts.push(`Most active districts: ${districts.slice(0, 5).join(", ")}.`);
  const topics = [...new Set(articles.flatMap((a) => a.topics ?? []))];
  if (topics.length) parts.push(`Key themes: ${topics.slice(0, 5).join(", ")}.`);
  return parts.join(" ");
}

async function loadLogoImage(
  doc: PDFDocument,
): Promise<PDFImage | null> {
  try {
    const logoPath = path.join(process.cwd(), "public", "emblem.jpeg");
    if (!fs.existsSync(logoPath)) return null;
    const bytes = fs.readFileSync(logoPath);
    return await doc.embedJpg(bytes);
  } catch {
    return null;
  }
}

type ReportVariant = "selected" | "daily" | "weekly" | "monthly";

type BuildReportOptions = {
  /** Logical report date (YYYY-MM-DD), used in header text. Defaults to today. */
  reportDate?: string;
  /** Controls heading text: Selected Articles / Daily / Weekly / Monthly. Defaults to "selected". */
  variant?: ReportVariant;
};

export async function buildSelectedReportPdf(
  articles: Article[],
  options: BuildReportOptions = {},
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const logoImage = await loadLogoImage(doc);

  const now = new Date();
  const reportDate = options.reportDate || format(now, "yyyy-MM-dd");
  const generatedAt = format(now, "yyyy-MM-dd HH:mm");
  const severityCounts = getSeverityCounts(articles);
  const overallRisk = getOverallRisk(articles);
  const executiveSummary = getExecutiveSummary(articles, severityCounts);
  const recommendedActions = getRecommendedActions(articles);

  let page = doc.addPage();
  let pageNum = 1;
  const pages: PDFPage[] = [page];

  let y = A4_HEIGHT - MARGIN;

  const ctx: DrawContext = {
    page,
    font,
    boldFont,
    y,
    fontSize: BODY_SIZE,
  };

  // Header: logo on top, then text block below it
  if (logoImage) {
    const logoW = LOGO_SIZE;
    const logoH = LOGO_SIZE;
    page.drawImage(logoImage, {
      x: MARGIN,
      y: y - logoH,
      width: logoW,
      height: logoH,
    });
    // Text starts below the logo with a small gap
    y -= logoH + 20;
    ctx.y = y;
  }
  y = drawText(ctx, "DIPR Uttar Pradesh", { bold: true, size: 14 });
  ctx.y = y;
  y = drawText(ctx, "Media Intelligence Report", { bold: true, size: TITLE_SIZE });
  ctx.y = y;
  const variant: ReportVariant = options.variant ?? "selected";
  const variantLabel =
    variant === "daily"
      ? "Daily Report"
      : variant === "weekly"
        ? "Weekly Report"
        : variant === "monthly"
          ? "Monthly Report"
          : "Selected Articles Report";
  y = drawText(
    ctx,
    `${variantLabel} | ${reportDate} | Generated ${generatedAt}`,
    { size: 10 },
  );
  ctx.y = y - 12;

  // Executive Summary
  y = drawHeading(ctx, "EXECUTIVE SUMMARY");
  ctx.y = y;
  y = drawText(ctx, executiveSummary);
  ctx.y = y - 8;

  // Severity Overview
  y = drawHeading(ctx, "SEVERITY OVERVIEW");
  ctx.y = y;
  const s = (n: number) => (n === 1 ? "story" : "stories");
  const sevLine =
    `CRITICAL: ${severityCounts.CRITICAL} ${s(severityCounts.CRITICAL)} | HIGH: ${severityCounts.HIGH} ${s(severityCounts.HIGH)} | MEDIUM: ${severityCounts.MEDIUM} ${s(severityCounts.MEDIUM)} | LOW: ${severityCounts.LOW} ${s(severityCounts.LOW)}`;
  y = drawText(ctx, sevLine);
  ctx.y = y;
  y = drawText(ctx, `Overall risk assessment: ${overallRisk}`, {
    bold: true,
    color: RISK_COLOR,
  });
  ctx.y = y - 12;

  // Story-wise breakdown
  y = drawHeading(ctx, "STORY-WISE BREAKDOWN");
  ctx.y = y;

  for (let i = 0; i < articles.length; i++) {
    const a = articles[i];
    if (ctx.y < MARGIN + 80) {
      page = doc.addPage();
      pages.push(page);
      pageNum++;
      ctx.page = page;
      ctx.y = A4_HEIGHT - MARGIN;
    }

    const title = a.title || "No title";
    y = drawText(ctx, `Story ${i + 1}: ${title}`, { bold: true });
    ctx.y = y;
    y = drawText(
      ctx,
      `Source: ${a.source_name} | Published: ${format(new Date(a.published_at), "dd MMM yyyy, hh:mm a")}`,
    );
    ctx.y = y;
    // Sentiment and Severity with bold values (sample style)
    const sentimentLabel = "Sentiment: ";
    const sentimentVal =
      a.sentiment.charAt(0).toUpperCase() + a.sentiment.slice(1);
    const severityLabel = " | Severity: ";
    const severityVal = a.severity ?? "LOW";
    const x0 = MARGIN;
    const w1 = ctx.font.widthOfTextAtSize(sentimentLabel, BODY_SIZE);
    const w2 = ctx.boldFont.widthOfTextAtSize(sentimentVal, BODY_SIZE);
    const w3 = ctx.font.widthOfTextAtSize(severityLabel, BODY_SIZE);
    ctx.page.drawText(sentimentLabel, { x: x0, y: ctx.y, size: BODY_SIZE, font: ctx.font });
    ctx.page.drawText(sentimentVal, { x: x0 + w1, y: ctx.y, size: BODY_SIZE, font: ctx.boldFont });
    ctx.page.drawText(severityLabel, { x: x0 + w1 + w2, y: ctx.y, size: BODY_SIZE, font: ctx.font });
    ctx.page.drawText(severityVal, { x: x0 + w1 + w2 + w3, y: ctx.y, size: BODY_SIZE, font: ctx.boldFont });
    y = ctx.y - BODY_SIZE - 6;
    ctx.y = y;
    const districts = (a.districts_mentioned ?? []).join(", ");
    const topics = (a.topics ?? []).join(", ");
    y = drawText(ctx, `Districts: ${districts || "—"} | Topics: ${topics || "—"}`);
    ctx.y = y;
    // Summary: prefer summary_english, then analyst_synopsis, then AI short_summary, then content excerpt
    const aiShort = (a.ai_insights as { short_summary?: string } | undefined)?.short_summary?.trim();
    const summaryText =
      (a.summary_english && a.summary_english.trim()) ||
      (a.analyst_synopsis && a.analyst_synopsis.trim()) ||
      aiShort ||
      (a.content && a.content.trim().slice(0, 600) + (a.content.length > 600 ? "…" : "")) ||
      "No summary available for this story.";
    y = drawText(ctx, "Summary:", { bold: true });
    ctx.y = y;
    y = drawText(ctx, summaryText, { indent: 4 });
    ctx.y = y;
    y = drawText(ctx, "AI Analysis:", { bold: true });
    ctx.y = y;
    const aiInsights = a.ai_insights as
      | { narrative_analysis?: string; expanded_summary?: string }
      | null
      | undefined;
    const aiText =
      aiInsights?.narrative_analysis ||
      aiInsights?.expanded_summary ||
      "No AI analysis available for this story.";
    y = drawText(ctx, aiText, { indent: 4 });
    ctx.y = y - 12;
  }

  // Recommended Actions
  if (ctx.y < MARGIN + 60) {
    page = doc.addPage();
    pages.push(page);
    pageNum++;
    ctx.page = page;
    ctx.y = A4_HEIGHT - MARGIN;
  }
  y = drawHeading(ctx, "RECOMMENDED ACTIONS");
  ctx.y = y;
  for (let i = 0; i < recommendedActions.length; i++) {
    if (ctx.y < MARGIN + 24) {
      page = doc.addPage();
      pages.push(page);
      pageNum++;
      ctx.page = page;
      ctx.y = A4_HEIGHT - MARGIN;
    }
    y = drawText(ctx, `${i + 1}. ${recommendedActions[i]}`, { indent: 4 });
    ctx.y = y;
  }

  ctx.y -= 16;
  const disclaimer =
    "Disclaimer: This report is auto-generated by the DIPR UP Media Intelligence System (360News). AI analysis is indicative and should be validated by human analysts before action.";
  if (ctx.y < MARGIN + 40) {
    page = doc.addPage();
    pages.push(page);
    pageNum++;
    ctx.page = page;
    ctx.y = A4_HEIGHT - MARGIN;
  }
  y = drawText(ctx, disclaimer, { size: 9 });
  ctx.y = y;

  const totalPages = pages.length;
  for (let i = 0; i < totalPages; i++) {
    addPageNumber(pages[i], i + 1, totalPages, font);
  }

  return doc.save();
}
