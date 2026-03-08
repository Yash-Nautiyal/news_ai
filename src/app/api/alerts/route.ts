import { NextResponse } from "next/server";
import { getAlertsFromSupabase } from "@/lib/supabase/reference";
import { getArticleById } from "@/lib/clips/repository";
import type { AlertRecord, PaginatedResponse } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filters = {
      page: Number(searchParams.get("page") || "1"),
      size: Number(searchParams.get("size") || "25"),
      severity: searchParams.get("severity") || undefined,
      date_from: searchParams.get("date_from") || undefined,
      date_to: searchParams.get("date_to") || undefined,
      district: searchParams.get("district") || undefined,
      unread: searchParams.get("unread") === "true",
    };
    const result = await getAlertsFromSupabase(filters);
    const items: AlertRecord[] = await Promise.all(
      result.items.map(async (row) => {
        const article = await getArticleById(row.article_id);
        return {
          id: row.id,
          article_id: row.article_id,
          severity: row.severity as AlertRecord["severity"],
          channels: Array.isArray(row.channels) ? row.channels : [],
          message_body: row.message_body,
          sent_at: row.sent_at,
          article,
        };
      }),
    );
    const payload: PaginatedResponse<AlertRecord> = {
      items,
      total: result.total,
      page: result.page,
      size: result.size,
      pages: result.pages,
    };
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load alerts." },
      { status: 500 },
    );
  }
}
