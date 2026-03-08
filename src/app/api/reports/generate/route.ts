import { NextResponse } from "next/server";
import type { Report } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const report_type = body?.report_type as Report["report_type"] | undefined;
    const report_date = body?.report_date as string | undefined;
    if (!report_type || !report_date) {
      return NextResponse.json(
        { error: "report_type and report_date required." },
        { status: 400 },
      );
    }
    // TODO: generate report (aggregate articles, create PDF, upload to storage, insert into reports)
    return NextResponse.json(
      {
        id: "stub",
        report_type,
        report_date,
        summary_text: "Report generation not yet implemented.",
        download_url: null,
        created_at: new Date().toISOString(),
      } as Report,
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate report." },
      { status: 500 },
    );
  }
}
