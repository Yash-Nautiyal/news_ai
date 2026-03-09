import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_WHATSAPP_FROM; // e.g. "whatsapp:+14155238886"
const toNumber = process.env.TWILIO_WHATSAPP_TO;     // e.g. "whatsapp:+919876543210"

export async function POST(req: NextRequest) {
  if (!accountSid || !authToken || !fromNumber || !toNumber) {
    return NextResponse.json(
      { error: "Twilio credentials not configured. Check your .env.local file." },
      { status: 500 },
    );
  }

  const body = await req.json();
  const { title, summary, severity, source_name } = body as {
    title: string;
    summary: string;
    severity?: string;
    source_name?: string;
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

    return NextResponse.json({ success: true, sid: message.sid });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to send WhatsApp message";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
