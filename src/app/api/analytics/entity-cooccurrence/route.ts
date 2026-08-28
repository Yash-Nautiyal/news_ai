import { NextResponse } from "next/server";
import { getEntityCooccurrence } from "@/lib/clips/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") ?? "all";
    const data = await getEntityCooccurrence(period);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load entity cooccurrence." },
      { status: 500 },
    );
  }
}
