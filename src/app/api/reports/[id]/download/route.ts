import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Report ID required." }, { status: 400 });
  }
  // TODO: get signed URL from Supabase storage for report file
  return NextResponse.json({ url: "" });
}
