"use client";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  SentimentTrendPoint,
  TopicDistributionItem,
  SourceVolumeItem,
  DistrictRisk,
  EntityCooccurrenceData,
} from "@/types";
import {
  MOCK_DISTRICT_RISK,
  MOCK_ENTITY_GRAPH,
  MOCK_KEYWORD_TRENDING,
  MOCK_SEVERITY_DISTRIBUTION,
  MOCK_SENTIMENT_TREND,
  MOCK_SOURCE_VOLUME,
  MOCK_TOPIC_DISTRIBUTION,
} from "@/lib/mockData";

type Period = "24h" | "7d" | "30d";

const STALE_MS = 5 * 60 * 1000;

export function useSentimentTrend(period: Period) {
  return useQuery({
    queryKey: ["analytics", "sentiment-trend", period],
    queryFn: async (): Promise<SentimentTrendPoint[]> => {
      if (USE_MOCK) {
        return MOCK_SENTIMENT_TREND;
      }
      const { data } = await api.get<SentimentTrendPoint[]>("/api/analytics/sentiment-trend", {
        params: { period },
      });
      return Array.isArray(data) ? data : [];
    },
    staleTime: STALE_MS,
  });
}

export function useTopicDistribution(period: string) {
  return useQuery({
    queryKey: ["analytics", "topic-distribution", period],
    queryFn: async (): Promise<TopicDistributionItem[]> => {
      if (USE_MOCK) {
        return MOCK_TOPIC_DISTRIBUTION;
      }
      const { data } = await api.get<TopicDistributionItem[]>("/api/analytics/topic-distribution", {
        params: { period },
      });
      return Array.isArray(data) ? data : [];
    },
    staleTime: STALE_MS,
  });
}

export function useDistrictRisk() {
  return useQuery({
    queryKey: ["analytics", "district-risk"],
    queryFn: async (): Promise<DistrictRisk[]> => {
      if (USE_MOCK) {
        return MOCK_DISTRICT_RISK;
      }
      const { data } = await api.get<DistrictRisk[]>("/api/analytics/district-risk");
      return Array.isArray(data) ? data : [];
    },
    staleTime: STALE_MS,
  });
}

export function useSourceVolume(period: string) {
  return useQuery({
    queryKey: ["analytics", "source-volume", period],
    queryFn: async (): Promise<SourceVolumeItem[]> => {
      if (USE_MOCK) {
        return MOCK_SOURCE_VOLUME;
      }
      const { data } = await api.get<SourceVolumeItem[]>("/api/analytics/source-volume", {
        params: { period },
      });
      return Array.isArray(data) ? data : [];
    },
    staleTime: STALE_MS,
  });
}

export function useSeverityDistribution(period: string) {
  return useQuery({
    queryKey: ["analytics", "severity-distribution", period],
    queryFn: async (): Promise<Record<string, number>> => {
      if (USE_MOCK) {
        return MOCK_SEVERITY_DISTRIBUTION;
      }
      const { data } = await api.get<Record<string, number>>(
        "/api/analytics/severity-distribution",
        { params: { period } }
      );
      return data ?? {};
    },
    staleTime: STALE_MS,
  });
}

export function useEntityCooccurrence() {
  return useQuery({
    queryKey: ["analytics", "entity-cooccurrence"],
    queryFn: async (): Promise<EntityCooccurrenceData> => {
      if (USE_MOCK) {
        return MOCK_ENTITY_GRAPH;
      }
      const { data } = await api.get<EntityCooccurrenceData>("/api/analytics/entity-cooccurrence");
      return data ?? { nodes: [], links: [] };
    },
    staleTime: STALE_MS,
  });
}

export function useKeywordTrending(period?: string) {
  return useQuery({
    queryKey: ["analytics", "keyword-trending", period],
    queryFn: async (): Promise<{ keyword: string; count: number }[]> => {
      if (USE_MOCK) {
        return MOCK_KEYWORD_TRENDING;
      }
      const { data } = await api.get<{ keyword: string; count: number }[]>(
        "/api/analytics/keyword-trending",
        period ? { params: { period } } : undefined
      );
      return Array.isArray(data) ? data : [];
    },
    staleTime: STALE_MS,
  });
}
