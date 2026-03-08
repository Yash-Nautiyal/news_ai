import { NextResponse } from "next/server";
import { getSupabaseAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase/admin";
import type { Source } from "@/types";

export const dynamic = "force-dynamic";

export async function PUT(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    if (!hasSupabaseAdminConfig()) {
      return NextResponse.json({ error: "Supabase not configured." }, { status: 503 });
    }
    const { id } = await context.params;
    const supabase = getSupabaseAdminClient();
    const { data: row, error } = await supabase
      .from("media_sources")
      .select("id,name,source_type,url,youtube_channel_id,is_active")
      .eq("id", id)
      .single();
    if (error || !row) {
      return NextResponse.json({ error: "Source not found." }, { status: 404 });
    }
    const { error: updateError } = await supabase
      .from("media_sources")
      .update({ is_active: !row.is_active })
      .eq("id", id);
    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 },
      );
    }
    const source: Source = {
      id: row.id,
      name: row.name,
      url: row.url ?? "",
      source_type: row.source_type as Source["source_type"],
      rss_url: null,
      youtube_channel_id: row.youtube_channel_id,
      is_active: !row.is_active,
      last_scraped_at: null,
      error_count: 0,
    };
    return NextResponse.json(source);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to toggle source." },
      { status: 500 },
    );
  }
}
