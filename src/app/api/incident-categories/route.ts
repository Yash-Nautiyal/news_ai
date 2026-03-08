import { NextResponse } from "next/server";
import { getIncidentCategoriesFromSupabase } from "@/lib/supabase/reference";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getIncidentCategoriesFromSupabase();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load incident categories." },
      { status: 500 },
    );
  }
}
