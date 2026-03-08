import { NextResponse } from "next/server";
import {
  getEntitiesFromSupabase,
  getEntitiesByCategoriesFromSupabase,
} from "@/lib/supabase/reference";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const categories = searchParams.get("categories"); // comma-separated: minister,official
    let data: Awaited<ReturnType<typeof getEntitiesFromSupabase>>;
    if (categories) {
      const list = categories.split(",").map((c) => c.trim()).filter(Boolean);
      data = await getEntitiesByCategoriesFromSupabase(list);
    } else {
      data = await getEntitiesFromSupabase(category ?? undefined);
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load entities." },
      { status: 500 },
    );
  }
}
