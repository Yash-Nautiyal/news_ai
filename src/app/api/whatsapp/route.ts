import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { getSupabaseAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase/admin";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_WHATSAPP_FROM; // e.g. "whatsapp:+14155238886"
const toNumber = process.env.TWILIO_WHATSAPP_TO; // e.g. "whatsapp:+919876543210"

export async function POST(req: NextRequest) {
  if (!accountSid || !authToken || !fromNumber || !toNumber) {
    return NextResponse.json(
      { error: "Twilio credentials not configured. Check your .env.local file." },
      { status: 500 },
    );
  }

  const body = await req.json();
  const { title, summary, severity, source_name, article_id } = body as {
    title: string;
    summary: string;
    severity?: string;
    source_name?: string;
    article_id?: string;
  };

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const severityEmoji: Record<string, string> = {
    CRITICAL: "🔴",
    HIGH: "🟠",
    MEDIUM: "🟡",
    LOW: "🟢",
  };

  const emoji = severity ? (severityEmoji[severity] ?? "📰") : "📰";

  const messageBody = [
    `${emoji} *News Alert*`,
    "",
    `*${title}*`,
    "",
    summary ? `📋 *Summary:*\n${summary}` : "",
    "",
    [
      source_name ? `Source: ${source_name}` : "",
      severity ? `Severity: ${severity}` : "",
    ]
      .filter(Boolean)
      .join(" | "),
  ]
    .join("\n")
    .trim();

  try {
    const client = twilio(accountSid, authToken);
    const message = await client.messages.create({
      from: fromNumber,
      to: toNumber,
      body: messageBody,
    });

    let saveError: string | undefined;
    if (article_id && hasSupabaseAdminConfig()) {
      try {
        const supabase = getSupabaseAdminClient();
        const { error } = await supabase.from("alerts").insert({
          article_id,
          severity: severity ?? "MEDIUM",
          channels: ["whatsapp"],
          message_body: messageBody,
        });
        if (error) {
          console.error("[whatsapp] Failed to insert alert:", error.message);
          saveError = "Alert sent on WhatsApp but could not be saved to alert history.";
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[whatsapp] Unexpected error while inserting alert:", msg);
        saveError = "Alert sent on WhatsApp but could not be saved to alert history.";
      }
    } else if (article_id && !hasSupabaseAdminConfig()) {
      console.warn(
        "[whatsapp] Supabase not configured; WhatsApp alert will not be stored in alerts table.",
      );
      saveError =
        "Alert sent on WhatsApp, but database is not configured so it was not stored in alert history.";
    }

    return NextResponse.json({
      success: true,
      sid: message.sid,
      alertSaved: !saveError,
      ...(saveError ? { saveError } : {}),
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to send WhatsApp message";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
