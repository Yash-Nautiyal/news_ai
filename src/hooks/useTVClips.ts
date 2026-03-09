"use client";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Article } from "@/types";
import { MOCK_ARTICLES } from "@/lib/mockData";

export function useTVClips() {
  return useQuery({
    queryKey: ["tv", "clips"],
    queryFn: async (): Promise<Article[]> => {
      if (USE_MOCK) {
        return MOCK_ARTICLES.filter(
          (a) => a.source_type === "tv" || a.source_type === "youtube",
        );
      }
      const { data } = await api.get<Article[]>("/api/tv/clips");
      return Array.isArray(data) ? data : [];
    },
    staleTime: 60 * 1000,
  });
}

