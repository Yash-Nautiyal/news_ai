import { NextResponse } from "next/server";
import { getSupabaseAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    if (!hasSupabaseAdminConfig()) {
      const msg =
        "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to store alerts.";
      console.error("[alerts/test] " + msg);
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    const supabase = getSupabaseAdminClient();

    // Pick the most recent article as the target for the test alert
    const { data: article, error: articleError } = await supabase
      .from("articles")
      .select("id,title,source_name,published_at")
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (articleError) {
      console.error("[alerts/test] Failed to load latest article:", articleError.message);
      return NextResponse.json(
        { error: "Could not load latest article for test alert." },
        { status: 500 },
      );
    }

    if (!article?.id) {
      const msg = "No articles found to attach the test alert.";
      console.error("[alerts/test] " + msg);
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    const messageBody = `Test alert for monitoring configuration.\nSource: ${
      (article as { source_name?: string }).source_name ?? "Unknown source"
    }\nTitle: ${(article as { title?: string }).title ?? "Untitled"}`;

    const { data: inserted, error: insertError } = await supabase
      .from("alerts")
      .insert({
        article_id: article.id,
        severity: "CRITICAL",
        channels: ["dashboard"],
        message_body: messageBody,
      })
      .select("id,sent_at,severity,channels,message_body")
      .single();

    if (insertError) {
      console.error("[alerts/test] Failed to insert alert:", insertError.message);
      return NextResponse.json(
        { error: "Failed to store test alert in alerts history." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, alert: inserted });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error while sending test alert.";
    console.error("[alerts/test]", message, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
