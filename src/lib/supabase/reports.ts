/**
 * Supabase: upload report PDF to storage (bucket media-uploads) and insert/upsert into reports table.
 * See schema.sql reports table and DIPR_Analyst_Upload_Guide.md.
 */

import { getSupabaseAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase/admin";

const REPORTS_BUCKET = "media-uploads";

export type InsertReportPayload = {
  report_type: "daily" | "weekly" | "monthly" | "selected";
  report_date: string; // YYYY-MM-DD
  summary_text: string;
  download_url?: string | null;
  storage_path?: string | null;
  created_by?: string | null;
};

/**
 * Uploads PDF bytes to bucket "media-uploads" at reports/{type}/{date}/{id}.pdf
 * and inserts or updates a row in public.reports.
 * Daily/weekly/monthly reports stay unique per (report_type, report_date)
 * via a partial unique index; 'selected' reports can have multiple per day.
 * Returns { id, storage_path, download_url } or throws. Logs errors to console for developers.
 */
export async function uploadReportPdfAndUpsert(
  pdfBytes: Uint8Array,
  payload: InsertReportPayload,
): Promise<{ id: string; storage_path: string; download_url: string }> {
  if (!hasSupabaseAdminConfig()) {
    const msg = "Supabase not configured (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).";
    console.error("[reports] " + msg);
    throw new Error(msg);
  }

  const supabase = getSupabaseAdminClient();
  const id = crypto.randomUUID();
  const date = payload.report_date;
  const storagePath = `reports/${payload.report_type}/${date}/${id}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from(REPORTS_BUCKET)
    .upload(storagePath, pdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    console.error("[reports] Storage upload failed:", uploadError.message, { bucket: REPORTS_BUCKET, path: storagePath });
    throw new Error(`Report upload failed: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage.from(REPORTS_BUCKET).getPublicUrl(storagePath);
  const download_url = urlData.publicUrl;

  const row = {
    id,
    report_type: payload.report_type,
    report_date: payload.report_date,
    summary_text: payload.summary_text.slice(0, 10000) || "",
    download_url,
    storage_path: storagePath,
    created_by: payload.created_by ?? null,
  };

  const { error: insertError } =
    payload.report_type === "selected"
      ? await supabase.from("reports").insert(row)
      : await supabase.from("reports").upsert(row, {
          onConflict: "report_type,report_date",
        });

  if (insertError) {
    console.error("[reports] Reports table insert/upsert failed:", insertError.message, { report_type: payload.report_type, report_date: payload.report_date });
    throw new Error(`Report save failed: ${insertError.message}`);
  }

  return { id, storage_path: storagePath, download_url };
}
