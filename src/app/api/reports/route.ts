import { NextResponse } from "next/server";
import { getReportsFromSupabase } from "@/lib/supabase/reference";
import type { Report } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as Report["report_type"] | null;
    const rows = await getReportsFromSupabase(type ?? undefined);
    const reports: Report[] = rows.map((r) => ({
      id: r.id,
      report_type: r.report_type as Report["report_type"],
      report_date: r.report_date,
      summary_text: r.summary_text,
      download_url: r.download_url ?? "",
      created_at: r.created_at,
    }));
    return NextResponse.json(reports);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load reports." },
      { status: 500 },
    );
  }
}
