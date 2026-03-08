import { NextResponse } from "next/server";
import type { Keyword } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return NextResponse.json({ id, status: "active" } as Keyword);
}
