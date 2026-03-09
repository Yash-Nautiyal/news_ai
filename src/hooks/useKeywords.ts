"use client";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Keyword, KeywordCategory, KeywordStatus } from "@/types";
import { MOCK_KEYWORDS } from "@/lib/mockData";

export function useKeywords(category?: KeywordCategory | "", status?: KeywordStatus | "") {
  return useQuery({
    queryKey: ["keywords", category, status],
    queryFn: async (): Promise<Keyword[]> => {
      if (USE_MOCK) {
        return MOCK_KEYWORDS;
      }
      const params: Record<string, string> = {};
      if (category) params.category = category;
      if (status) params.status = status;
      const { data } = await api.get<Keyword[]>("/api/keywords", { params });
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useKeywordSuggestions() {
  return useQuery({
    queryKey: ["keywords", "suggestions"],
    queryFn: async () => {
      if (USE_MOCK) {
        return [];
      }
      const { data } = await api.get("/api/keywords/suggestions");
      return data;
    },
  });
}

interface CreateKeywordInput {
  term: string;
  term_hindi?: string | null;
  /** UI category on the keywords page */
  category: KeywordCategory;
  /** Aliases / variants to store in TEXT[] where applicable */
  variants: string[];
  /**
   * Optional: explicit entity category for entities table
   * (minister / official / department / scheme / organisation).
   * If omitted, the API will derive this from `category`.
   */
  entity_category?: string;
  /**
   * Optional: incident group name for incident_categories
   * (crime / communal / protest / disaster / security / misinformation / other).
   */
  incident_group_name?: string;
}

export function useCreateKeyword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateKeywordInput) => {
      if (USE_MOCK) {
        return {
          ...input,
          id: "mock",
          is_active: true,
          status: "active",
          created_at: new Date().toISOString(),
          source_table: input.category === "law_order" ? "incident_categories" : input.category === "districts" ? "geo_districts" : "entities",
          source_id: "mock",
          entity_category:
            input.category === "law_order" || input.category === "districts"
              ? null
              : input.entity_category ?? (input.category === "officials" ? "official" : input.category === "schemes" ? "scheme" : "organisation"),
          incident_group_name:
            input.category === "law_order" ? input.incident_group_name ?? "crime" : null,
        } as Keyword;
      }
      const { data } = await api.post<Keyword>("/api/keywords", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["keywords"] });
    },
  });
}

export function useUpdateKeyword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: Partial<Keyword> & { id: string }) => {
      if (USE_MOCK) {
        return { ...(body as Keyword), id } as Keyword;
      }
      const { data } = await api.put<Keyword>(`/api/keywords/${id}`, body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["keywords"] });
    },
  });
}

export function useApproveKeyword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (USE_MOCK) {
        return MOCK_KEYWORDS.find((k) => k.id === id) ?? MOCK_KEYWORDS[0];
      }
      const { data } = await api.post<Keyword>(`/api/keywords/${id}/approve`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["keywords"] });
    },
  });
}

export function useRejectKeyword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      if (USE_MOCK) {
        return { id, reason };
      }
      const { data } = await api.post(`/api/keywords/${id}/reject`, { reason });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["keywords"] });
    },
  });
}

export function useDeleteKeyword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (USE_MOCK) {
        return;
      }
      await api.delete(`/api/keywords/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["keywords"] });
    },
  });
}
