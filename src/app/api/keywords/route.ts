import { NextResponse } from "next/server";
import type { Keyword } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json([] as Keyword[]);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load keywords." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Keywords table not in schema yet; return stub.
    return NextResponse.json(
      {
        id: "stub",
        term: body?.term ?? "",
        term_hindi: body?.term_hindi ?? null,
        category: body?.category ?? "governance",
        variants: Array.isArray(body?.variants) ? body.variants : [],
        is_active: false,
        status: "pending",
        created_at: new Date().toISOString(),
      } as Keyword,
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create keyword." },
      { status: 500 },
    );
  }
}
