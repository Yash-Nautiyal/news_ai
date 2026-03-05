"use client";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AlertRecord, PaginatedResponse } from "@/types";
import { MOCK_ALERTS } from "@/lib/mockData";

export interface AlertFilters {
  page?: number;
  size?: number;
  severity?: string;
  date_from?: string;
  date_to?: string;
  district?: string;
}

function buildParams(f: AlertFilters): Record<string, string | number | undefined> {
  const params: Record<string, string | number | undefined> = {};
  if (f.page != null) params.page = f.page;
  if (f.size != null) params.size = f.size;
  if (f.severity) params.severity = f.severity;
  if (f.date_from) params.date_from = f.date_from;
  if (f.date_to) params.date_to = f.date_to;
  if (f.district) params.district = f.district;
  return params;
}

export function useAlerts(filters: AlertFilters = {}) {
  return useQuery({
    queryKey: ["alerts", filters],
    queryFn: async (): Promise<PaginatedResponse<AlertRecord>> => {
      if (USE_MOCK) {
        return {
          items: MOCK_ALERTS,
          total: MOCK_ALERTS.length,
          page: filters.page ?? 1,
          size: filters.size ?? MOCK_ALERTS.length,
          pages: 1,
        };
      }
      const { data } = await api.get<PaginatedResponse<AlertRecord>>("/api/alerts", {
        params: buildParams(filters),
      });
      return data;
    },
  });
}

export function useRecentAlerts(unreadOnly = false) {
  return useQuery({
    queryKey: ["alerts", "recent", unreadOnly],
    queryFn: async (): Promise<PaginatedResponse<AlertRecord>> => {
      if (USE_MOCK) {
        return {
          items: MOCK_ALERTS,
          total: MOCK_ALERTS.length,
          page: 1,
          size: MOCK_ALERTS.length,
          pages: 1,
        };
      }
      const { data } = await api.get<PaginatedResponse<AlertRecord>>("/api/alerts", {
        params: { size: 5, unread: unreadOnly },
      });
      return data;
    },
    refetchInterval: 60 * 1000,
  });
}

export function useTestAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (USE_MOCK) {
        return { ok: true };
      }
      const { data } = await api.post("/api/alerts/test");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });
}
