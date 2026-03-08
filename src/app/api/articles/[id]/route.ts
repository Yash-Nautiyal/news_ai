import { NextResponse } from "next/server";
import { getArticleById } from "@/lib/clips/repository";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const params = await context.params;
    const article = await getArticleById(params.id);
    if (!article) {
      return NextResponse.json({ error: "Article not found." }, { status: 404 });
    }
    return NextResponse.json(article);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load article details.",
      },
      { status: 500 },
    );
  }
}
