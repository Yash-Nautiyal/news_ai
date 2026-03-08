"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ClipAIInsights } from "@/types";

/**
 * Fetches AI insights for an article. Calls POST /api/articles/{articleId}/insights.
 * Uses mock data only (no DB); returns Groq insights or fallback.
 */
export function useClipInsights(articleId: string | null) {
  return useQuery({
    queryKey: ["article", articleId, "insights"],
    enabled: Boolean(articleId),
    queryFn: async (): Promise<ClipAIInsights | null> => {
      if (!articleId) return null;
      const { data } = await api.post<{
        insights?: ClipAIInsights | null;
      }>(`/api/articles/${articleId}/insights`);
      return data?.insights ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });
}
