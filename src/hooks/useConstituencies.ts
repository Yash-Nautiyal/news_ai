"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type GeoConstituency = {
  id: string;
  name: string;
  district: string;
  division: string;
  constituency_no: number | null;
  is_sc_reserved: boolean;
  ls_constituency: string | null;
};

export function useConstituencies(district: string | null) {
  return useQuery({
    queryKey: ["constituencies", district],
    enabled: !!district,
    queryFn: async (): Promise<GeoConstituency[]> => {
      if (!district) return [];
      const { data } = await api.get<GeoConstituency[]>(
        "/api/geo/constituencies",
        { params: { district } },
      );
      return Array.isArray(data) ? data : [];
    },
  });
}

