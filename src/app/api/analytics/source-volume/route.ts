import { NextResponse } from "next/server";
import { getSourceVolume } from "@/lib/clips/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") ?? "7d";
    const data = await getSourceVolume(period);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load source volume." },
      { status: 500 },
    );
  }
}
