import { NextResponse } from "next/server";
import { getEntityCooccurrence } from "@/lib/clips/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getEntityCooccurrence();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load entity cooccurrence." },
      { status: 500 },
    );
  }
}
