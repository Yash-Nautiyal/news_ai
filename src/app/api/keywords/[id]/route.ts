import { NextResponse } from "next/server";
import type { Keyword } from "@/types";

export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  return NextResponse.json({ id, ...body } as Keyword);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await context.params;
  return NextResponse.json({});
}
