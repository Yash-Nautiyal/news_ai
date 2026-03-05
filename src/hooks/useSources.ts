"use client";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Source, SourceType } from "@/types";
import { MOCK_SOURCES } from "@/lib/mockData";

export function useSources(type?: SourceType) {
  return useQuery({
    queryKey: ["sources", type],
    queryFn: async (): Promise<Source[]> => {
      if (USE_MOCK) {
        return MOCK_SOURCES.filter((s) => !type || s.source_type === type);
      }
      const { data } = await api.get<Source[]>("/api/sources", {
        params: type ? { type } : undefined,
      });
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useToggleSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (USE_MOCK) {
        return MOCK_SOURCES.find((s) => s.id === id) ?? MOCK_SOURCES[0];
      }
      const { data } = await api.put<Source>(`/api/sources/${id}/toggle`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources"] });
    },
  });
}

export function useScrapeSourceNow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (USE_MOCK) {
        return { ok: true };
      }
      const { data } = await api.post(`/api/sources/${id}/scrape-now`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources"] });
    },
  });
}
