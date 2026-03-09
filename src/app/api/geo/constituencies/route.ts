import { NextResponse } from "next/server";
import { getConstituenciesByDistrictFromSupabase } from "@/lib/supabase/reference";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const district = searchParams.get("district");
    if (!district) {
      return NextResponse.json(
        { error: "district query parameter is required" },
        { status: 400 },
      );
    }
    const rows = await getConstituenciesByDistrictFromSupabase(district);
    return NextResponse.json(rows);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load constituencies.";
    console.error("[api/geo/constituencies]", message, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

