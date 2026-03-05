"use client";

import { useState, useMemo } from "react";
import { useDistricts } from "@/hooks/useDistricts";
import { UPDistrictMap } from "@/components/districts/UPDistrictMap";
import { DistrictList } from "@/components/districts/DistrictList";
import { DistrictDetailSheet } from "@/components/districts/DistrictDetailSheet";
import { useRouter } from "next/navigation";

export default function DistrictsPage() {
  const router = useRouter();
  const { data: districtData, isLoading } = useDistricts();
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const sorted = useMemo(
    () => [...(districtData ?? [])].sort((a, b) => b.risk_score - a.risk_score),
    [districtData],
  );

  const selected = selectedDistrict
    ? (sorted.find((d) => d.district === selectedDistrict) ?? null)
    : null;

  const highestRisk = sorted[0];
  const criticalCount = sorted.filter((d) => d.risk_score >= 80).length;
  const totalToday = sorted.reduce((s, d) => s + d.article_count, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">
        District Intelligence
      </h1>
      <p className="text-slate-600">Sorted by risk</p>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Highest risk today</p>
          <p className="font-medium text-slate-900">
            {highestRisk?.district ?? "—"}
          </p>
          {highestRisk && (
            <span className="mt-1 inline-block rounded bg-red-100 px-2 py-0.5 text-xs text-red-800">
              {highestRisk.risk_score}
            </span>
          )}
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Total articles today</p>
          <p className="text-2xl font-bold text-slate-900">{totalToday}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">
            Districts with CRITICAL alerts
          </p>
          <p className="text-2xl font-bold text-red-600">{criticalCount}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <div className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Search district..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <div className="max-h-[500px] overflow-y-auto rounded-lg border border-slate-200 bg-white p-2">
            {isLoading ? (
              <div className="animate-pulse space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-10 rounded bg-slate-200" />
                ))}
              </div>
            ) : (
              <DistrictList
                districts={sorted}
                selectedDistrict={selectedDistrict}
                onSelect={setSelectedDistrict}
                search={search}
              />
            )}
          </div>
        </div>
        <div className="min-h-[450px]">
          {isLoading ? (
            <div className="h-[450px] animate-pulse rounded-lg bg-slate-200" />
          ) : (
            <UPDistrictMap
              districtData={sorted}
              selectedDistrict={selectedDistrict}
              onDistrictSelect={setSelectedDistrict}
            />
          )}
        </div>
      </div>

      <DistrictDetailSheet
        district={selected}
        onClose={() => setSelectedDistrict(null)}
        onViewArticles={(district) =>
          router.push(`/feed?district=${encodeURIComponent(district)}`)
        }
      />
    </div>
  );
}
