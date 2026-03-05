"use client";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { TVChannel } from "@/types";
import { MOCK_TV_CHANNELS } from "@/lib/mockData";

export function useTVChannels() {
  return useQuery({
    queryKey: ["tv", "channels"],
    queryFn: async (): Promise<TVChannel[]> => {
      if (USE_MOCK) {
        return MOCK_TV_CHANNELS;
      }
      const { data } = await api.get<TVChannel[]>("/api/tv/channels");
      return Array.isArray(data) ? data : [];
    },
    staleTime: 60 * 1000,
  });
}
