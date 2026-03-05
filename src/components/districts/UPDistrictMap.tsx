"use client";

import { useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import type { DistrictRisk } from "@/types";

const GEO_URL =
  "https://raw.githubusercontent.com/Subhash9325/GeoJson-Data-of-Indian-States/master/uttar_pradesh.geojson";

const RISK_COLORS = [
  "#dcfce7", // 0-20
  "#fef9c3", // 20-40
  "#fed7aa", // 40-60
  "#fca5a5", // 60-80
  "#dc2626", // 80-100
];

function getRiskColor(score: number) {
  if (score <= 20) return RISK_COLORS[0];
  if (score <= 40) return RISK_COLORS[1];
  if (score <= 60) return RISK_COLORS[2];
  if (score <= 80) return RISK_COLORS[3];
  return RISK_COLORS[4];
}

export function UPDistrictMap({
  districtData,
  selectedDistrict,
  onDistrictSelect,
}: {
  districtData: DistrictRisk[];
  selectedDistrict: string | null;
  onDistrictSelect: (name: string) => void;
}) {
  const riskByDistrict = useMemo(() => {
    const m = new Map<string, number>();
    districtData.forEach((d) => m.set(d.district, d.risk_score));
    return m;
  }, [districtData]);

  return (
    <div className="h-full w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ center: [80, 27], scale: 3500 }}
        className="h-full w-full"
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const name = geo.properties?.NAME_2 ?? geo.properties?.name ?? "";
              const risk = riskByDistrict.get(name) ?? 0;
              const fill = getRiskColor(risk);
              const isSelected = selectedDistrict === name;
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={fill}
                  stroke={isSelected ? "#1e293b" : "#94a3b8"}
                  strokeWidth={isSelected ? 2 : 0.5}
                  style={{
                    default: { outline: "none" },
                    hover: {
                      outline: "none",
                      fill: "#94a3b8",
                      cursor: "pointer",
                    },
                    pressed: { outline: "none" },
                  }}
                  onClick={() => onDistrictSelect(name)}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>
    </div>
  );
}
