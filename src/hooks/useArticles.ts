"use client";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Article, ArticleFilters, PaginatedResponse } from "@/types";
import { MOCK_ARTICLES } from "@/lib/mockData";

function buildParams(filters: ArticleFilters): Record<string, string | number | undefined> {
  const params: Record<string, string | number | undefined> = {};
  if (filters.page != null) params.page = filters.page;
  if (filters.size != null) params.size = filters.size;
  if (filters.date_from) params.date_from = filters.date_from;
  if (filters.date_to) params.date_to = filters.date_to;
  if (filters.source_type) params.source_type = filters.source_type;
  if (filters.severity) params.severity = filters.severity;
  if (filters.district) params.district = filters.district;
  if (filters.sentiment) params.sentiment = filters.sentiment;
  if (filters.search) params.search = filters.search;
  if (filters.source_name) params.source_name = filters.source_name;
  return params;
}

export function useArticles(filters: ArticleFilters, options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: ["articles", filters],
    queryFn: async (): Promise<PaginatedResponse<Article>> => {
      if (USE_MOCK) {
        return {
          items: MOCK_ARTICLES,
          total: MOCK_ARTICLES.length,
          page: filters.page ?? 1,
          size: filters.size ?? MOCK_ARTICLES.length,
          pages: 1,
        };
      }
      const { data } = await api.get<PaginatedResponse<Article>>("/api/articles", {
        params: buildParams(filters),
      });
      return data;
    },
    staleTime: 30 * 1000,
    refetchInterval: options?.refetchInterval ?? 30 * 1000,
  });
}

export function useArticle(id: string | null) {
  return useQuery({
    queryKey: ["article", id],
    queryFn: async (): Promise<Article> => {
      if (USE_MOCK) {
        const found = MOCK_ARTICLES.find((a) => a.id === id);
        if (!found) throw new Error("Article not found");
        return found;
      }
      const { data } = await api.get<Article>(`/api/articles/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useSimilarArticles(articleId: string | null) {
  return useQuery({
    queryKey: ["articles", "similar", articleId],
    queryFn: async (): Promise<Article[]> => {
      if (USE_MOCK) {
        return MOCK_ARTICLES.filter((a) => a.id !== articleId);
      }
      const { data } = await api.get<Article[]>(`/api/articles/${articleId}/similar`);
      return Array.isArray(data) ? data : (data as { items?: Article[] }).items ?? [];
    },
    enabled: !!articleId,
  });
}
