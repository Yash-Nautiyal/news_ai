"use client";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Report } from "@/types";
import { MOCK_REPORTS } from "@/lib/mockData";

export type ReportType = "daily" | "weekly" | "monthly" | "selected";

export function useReports(type?: ReportType) {
  return useQuery({
    queryKey: ["reports", type],
    queryFn: async (): Promise<Report[]> => {
      if (USE_MOCK) {
        return MOCK_REPORTS.filter((r) => !type || r.report_type === type);
      }
      const { data } = await api.get<Report[]>("/api/reports", {
        params: type ? { type } : undefined,
      });
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useGenerateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      report_type: ReportType;
      report_date: string;
    }) => {
      if (USE_MOCK) {
        return {
          id: "mock-report",
          report_type: input.report_type,
          report_date: input.report_date,
          summary_text: "Mock report generated for demo purposes.",
          download_url: "https://example.com/report/mock.pdf",
          created_at: new Date().toISOString(),
        } as Report;
      }
      const { data } = await api.post<Report>("/api/reports/generate", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

export function useReportDownloadUrl(id: string | null) {
  return useQuery({
    queryKey: ["reports", "download", id],
    queryFn: async (): Promise<string> => {
      if (USE_MOCK) {
        const found = MOCK_REPORTS.find((r) => r.id === id) ?? MOCK_REPORTS[0];
        return found?.download_url ?? "";
      }
      const { data } = await api.get<{ url: string }>(`/api/reports/${id}/download`);
      return (data as { url?: string }).url ?? "";
    },
    enabled: !!id,
  });
}

/** Result after generating a report from selected articles (PDF download, optional save error). */
export type SelectedReportResult = {
  success: true;
  filename: string;
  saveError?: string;
};

function triggerPdfDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function useGenerateReportFromSelection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (articleIds: string[]): Promise<SelectedReportResult> => {
      if (USE_MOCK) {
        const blob = new Blob(
          ["Mock PDF – enable real data to generate actual report."],
          { type: "application/pdf" },
        );
        const reportDate = new Date().toISOString().slice(0, 10);
        triggerPdfDownload(blob, `DIPR-UP-Report-selected-${reportDate}.pdf`);
        return { success: true, filename: `DIPR-UP-Report-selected-${reportDate}.pdf` };
      }
      const { data, headers } = await api.post<Blob>(
        "/api/reports/generate-from-selection",
        { article_ids: articleIds },
        { responseType: "blob" },
      );
      const contentDisposition = headers["content-disposition"];
      const match = contentDisposition?.match(/filename="?([^";\n]+)"?/);
      const filename =
        match?.[1] ?? `DIPR-UP-Report-selected-${new Date().toISOString().slice(0, 10)}.pdf`;
      triggerPdfDownload(data, filename);
      const saveError = headers["x-report-save-error"];
      if (saveError && typeof saveError === "string") {
        console.warn("[useGenerateReportFromSelection] Report save warning:", saveError);
      }
      return {
        success: true,
        filename,
        ...(saveError && typeof saveError === "string" ? { saveError } : {}),
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}
