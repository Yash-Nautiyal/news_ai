import { NextResponse } from "next/server";
import { getTVChannelsFromSupabase } from "@/lib/supabase/reference";
import { hasSupabaseAdminConfig } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!hasSupabaseAdminConfig()) {
      return NextResponse.json([]);
    }
    const channels = await getTVChannelsFromSupabase();
    return NextResponse.json(channels);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load TV channels." },
      { status: 500 },
    );
  }
}
