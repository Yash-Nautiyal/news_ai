import { NextResponse } from "next/server";
import { getSimilarArticles } from "@/lib/clips/repository";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const params = await context.params;
    const items = await getSimilarArticles(params.id);
    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load similar articles.",
      },
      { status: 500 },
    );
  }
}
