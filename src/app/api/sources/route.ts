import { NextResponse } from "next/server";
import { getMediaSourcesFromSupabase } from "@/lib/supabase/reference";
import { hasSupabaseAdminConfig } from "@/lib/supabase/admin";
import type { SourceType } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    if (!hasSupabaseAdminConfig()) {
      return NextResponse.json([]);
    }
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as SourceType | null;
    const sources = await getMediaSourcesFromSupabase(type ?? undefined);
    return NextResponse.json(sources);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load sources." },
      { status: 500 },
    );
  }
}
