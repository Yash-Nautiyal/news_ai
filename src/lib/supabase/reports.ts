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
  const date = payload.report_date;
  const id = crypto.randomUUID();
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

  const baseRow = {
    report_type: payload.report_type,
    report_date: payload.report_date,
    summary_text: payload.summary_text.slice(0, 10000) || "",
    download_url,
    storage_path: storagePath,
    created_by: payload.created_by ?? null,
  };

  // Always try a plain INSERT first. For daily/weekly/monthly, a partial unique
  // index on (report_type, report_date) may reject duplicates with 23505.
  const { data: insertData, error: insertError } = await supabase
    .from("reports")
    .insert({ id, ...baseRow })
    .select("id,storage_path,download_url")
    .single();

  if (insertError && (insertError as { code?: string }).code === "23505") {
    // Conflict on (report_type, report_date) – update the existing row instead.
    const { data: updateData, error: updateError } = await supabase
      .from("reports")
      .update(baseRow)
      .eq("report_type", payload.report_type)
      .eq("report_date", payload.report_date)
      .select("id,storage_path,download_url")
      .single();

    if (updateError || !updateData) {
      console.error(
        "[reports] Reports table update after conflict failed:",
        updateError?.message ?? "No data returned",
        { report_type: payload.report_type, report_date: payload.report_date },
      );
      throw new Error(
        `Report save failed after conflict: ${updateError?.message ?? "unknown error"}`,
      );
    }

    return {
      id: updateData.id,
      storage_path: updateData.storage_path ?? storagePath,
      download_url: updateData.download_url ?? download_url,
    };
  }

  if (insertError || !insertData) {
    console.error(
      "[reports] Reports table insert failed:",
      insertError?.message ?? "No data returned",
      { report_type: payload.report_type, report_date: payload.report_date },
    );
    throw new Error(`Report save failed: ${insertError?.message ?? "unknown error"}`);
  }

  return {
    id: insertData.id,
    storage_path: insertData.storage_path ?? storagePath,
    download_url: insertData.download_url ?? download_url,
  };
}
