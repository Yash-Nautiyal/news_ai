import { NextResponse } from "next/server";
import { getDistrictRisk } from "@/lib/clips/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getDistrictRisk();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load district risk." },
      { status: 500 },
    );
  }
}
