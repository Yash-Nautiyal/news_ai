"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DistrictRisk } from "@/types";

const DEFAULT_FILL = "#fefee9";
const SELECTED_FILL = "#ff6a00"; // vivid orange for clear selection
type MarkerSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

const MARKER_COLORS: Record<
  MarkerSeverity,
  { dot: string; pulse: string; ring: string }
> = {
  CRITICAL: {
    dot: "#ff3b30",
    pulse: "rgba(255,99,90,0.68)",
    ring: "#ff8a80",
  },
  HIGH: { dot: "#ff7a1a", pulse: "rgba(255,146,72,0.5)", ring: "#ffb26b" },
  MEDIUM: { dot: "#eab308", pulse: "rgba(234,179,8,0.45)", ring: "#facc15" },
  LOW: { dot: "#94a3b8", pulse: "rgba(148,163,184,0.55)", ring: "#94a3b8" },
};

const VIEWBOX_WIDTH = 4000;
const VIEWBOX_HEIGHT = 2600;

const NON_DISTRICT_IDS = new Set([
  "path3015",
  "path5460",
  "path5464",
  "path5468",
  "path5480",
  "path5922",
  "path5924",
  "path6053",
  "path4439",
  "uttar_pradesh_2_",
  "haryana_1_",
  "haryana",
  "uttaranchal_2_",
  "delhi_ncr",
  "Ebene_2",
  "svg2",
  "base",
  "defs120",
  "defs7",
  "svg4211",
  "metadata3763",
  "perspective3765",
]);

function toSvgId(displayName: string | null): string | null {
  if (!displayName) return null;
  const normalized = displayName.trim().toLowerCase();
  // Legacy/current naming compatibility in dataset vs SVG ids
  if (normalized === "prayagraj" || normalized === "allahabad") {
    return "Allahabad";
  }
  return displayName.replace(/\s+/g, "_");
}

function toDisplayName(svgId: string): string {
  return svgId.replace(/_/g, " ");
}

function isDistrictPath(id: string): boolean {
  if (!id || NON_DISTRICT_IDS.has(id)) return false;
  if (id.startsWith("path") && id.length > 4) return false;
  return true;
}

function riskToSeverity(score: number): MarkerSeverity {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [lastClickedId, setLastClickedId] = useState<string | null>(null);
  const [mapSelectedDistrict, setMapSelectedDistrict] = useState<string | null>(
    null,
  );
  const [manualZoomOut, setManualZoomOut] = useState(false);
  const [mapAspectRatio, setMapAspectRatio] = useState<number>(
    VIEWBOX_WIDTH / VIEWBOX_HEIGHT,
  );
  const [markerPositions, setMarkerPositions] = useState<
    Record<string, { leftPct: number; topPct: number }>
  >({});
  const [focusPoint, setFocusPoint] = useState<{
    leftPct: number;
    topPct: number;
  } | null>(null);
  const markerDistricts = useMemo(() => {
    const seen = new Set<string>();
    const out: Array<{ id: string; name: string; severity: MarkerSeverity }> =
      [];

    districtData.forEach((d) => {
      const name = d.district?.trim();
      if (!name) return;
      const id = toSvgId(name);
      if (!id || seen.has(id)) return;
      seen.add(id);
      out.push({ id, name, severity: riskToSeverity(d.risk_score) });
    });

    return out;
  }, [districtData]);
  const availableDistrictNames = useMemo(
    () => new Set(districtData.map((d) => d.district.trim().toLowerCase())),
    [districtData],
  );

  useEffect(() => {
    fetch(`/up_map_plain.svg?v=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.text())
      .then(setSvgContent)
      .catch(() => setSvgContent(null));
  }, []);

  // Update path visuals based on selected district.
  useEffect(() => {
    if (!svgContent || !containerRef.current) return;
    const svg = containerRef.current.querySelector("svg");
    if (!svg) return;

    const normalizedSelected = toSvgId(mapSelectedDistrict ?? selectedDistrict);
    const paths = svg.querySelectorAll<SVGPathElement>("path[id]");

    paths.forEach((path) => {
      const id = path.getAttribute("id");
      if (!id || !isDistrictPath(id)) return;

      const isSelected = id === normalizedSelected;
      // SVG files already contain inline style fill; update style.fill directly
      path.style.fill = isSelected ? SELECTED_FILL : DEFAULT_FILL;
      path.style.stroke = isSelected ? "#9a3412" : "#a5a7a9";
      path.style.strokeWidth = isSelected ? "4px" : "3px";
      path.style.opacity = normalizedSelected
        ? isSelected
          ? "1"
          : "0.28"
        : "1";
      path.style.cursor = "pointer";
      path.style.transition =
        "fill 0.25s ease, opacity 0.25s ease, stroke 0.25s ease, stroke-width 0.25s ease";
    });
  }, [svgContent, selectedDistrict, mapSelectedDistrict]);

  // Remove large empty margins in source SVG by fitting viewBox to district paths.
  useEffect(() => {
    if (!svgContent || !containerRef.current) return;
    const root = containerRef.current;
    const raf = requestAnimationFrame(() => {
      const svg = root.querySelector("svg") as SVGSVGElement | null;
      if (!svg) return;

      const districtPaths = Array.from(
        svg.querySelectorAll<SVGPathElement>("path[id]"),
      ).filter((p) => {
        const id = p.getAttribute("id");
        return !!id && isDistrictPath(id);
      });
      if (!districtPaths.length) return;

      let minX = Number.POSITIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;

      districtPaths.forEach((path) => {
        const box = path.getBBox();
        minX = Math.min(minX, box.x);
        minY = Math.min(minY, box.y);
        maxX = Math.max(maxX, box.x + box.width);
        maxY = Math.max(maxY, box.y + box.height);
      });

      if (
        !isFinite(minX) ||
        !isFinite(minY) ||
        !isFinite(maxX) ||
        !isFinite(maxY)
      )
        return;

      const pad = 18;
      const vbX = minX - pad;
      const vbY = minY - pad;
      const vbW = maxX - minX + pad * 2;
      const vbH = maxY - minY + pad * 2;
      if (vbW <= 0 || vbH <= 0) return;

      svg.setAttribute("viewBox", `${vbX} ${vbY} ${vbW} ${vbH}`);
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
      setMapAspectRatio(vbW / vbH);
    });

    return () => cancelAnimationFrame(raf);
  }, [svgContent]);

  // Compute focus point for zoom (works for marker click, map click, or external selection).
  useEffect(() => {
    if (!svgContent || !containerRef.current) return;
    const activeDistrict = mapSelectedDistrict ?? selectedDistrict;
    if (!activeDistrict) {
      setFocusPoint(null);
      return;
    }

    const root = containerRef.current;
    const activeId = toSvgId(activeDistrict);
    if (!activeId) return;

    const fromMarker = markerPositions[activeId];
    if (fromMarker) {
      setFocusPoint(fromMarker);
      return;
    }

    const raf = requestAnimationFrame(() => {
      const svg = root.querySelector("svg");
      const path = svg?.querySelector(
        `path[id="${activeId}"]`,
      ) as SVGGraphicsElement | null;
      if (!path) return;
      const containerRect = root.getBoundingClientRect();
      const rect = path.getBoundingClientRect();
      if (
        !containerRect.width ||
        !containerRect.height ||
        !rect.width ||
        !rect.height
      )
        return;
      setFocusPoint({
        leftPct:
          ((rect.left + rect.width / 2 - containerRect.left) /
            containerRect.width) *
          100,
        topPct:
          ((rect.top + rect.height / 2 - containerRect.top) /
            containerRect.height) *
          100,
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [svgContent, selectedDistrict, mapSelectedDistrict, markerPositions]);

  // Compute marker positions from rendered path bounds for precise centering.
  useEffect(() => {
    if (!svgContent || !containerRef.current) return;
    const root = containerRef.current;
    const compute = () => {
      const svg = root.querySelector("svg");
      if (!svg) return;
      const containerRect = root.getBoundingClientRect();
      if (!containerRect.width || !containerRect.height) return;

      const next: Record<string, { leftPct: number; topPct: number }> = {};
      markerDistricts.forEach((district) => {
        const path = svg.querySelector(
          `path[id="${district.id}"]`,
        ) as SVGGraphicsElement | null;
        if (!path) return;
        const rect = path.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        next[district.id] = {
          leftPct: ((centerX - containerRect.left) / containerRect.width) * 100,
          topPct: ((centerY - containerRect.top) / containerRect.height) * 100,
        };
      });
      setMarkerPositions(next);
    };

    const raf = requestAnimationFrame(compute);
    const resizeObserver = new ResizeObserver(() => compute());
    resizeObserver.observe(root);
    const svg = root.querySelector("svg");
    if (svg) resizeObserver.observe(svg);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
    };
  }, [svgContent, markerDistricts]);

  const handleMarkerClick = useCallback(
    (name: string, id: string) => {
      setManualZoomOut(false);
      setMapSelectedDistrict(name);
      setLastClickedId(id);
      // Marker click should drive page-level selection and open side panel.
      onDistrictSelect(name);
    },
    [onDistrictSelect],
  );

  const handleSvgClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target as Element | null;
      const path = target?.closest?.("path[id]") as SVGPathElement | null;
      if (!path) return;

      const id = path.getAttribute("id");
      if (!id || !isDistrictPath(id)) return;
      setManualZoomOut(false);
      setLastClickedId(id);
      const root = containerRef.current;
      const rect = path.getBoundingClientRect();
      const containerRect = root?.getBoundingClientRect();
      if (containerRect && containerRect.width && containerRect.height) {
        setFocusPoint({
          leftPct:
            ((rect.left + rect.width / 2 - containerRect.left) /
              containerRect.width) *
            100,
          topPct:
            ((rect.top + rect.height / 2 - containerRect.top) /
              containerRect.height) *
            100,
        });
      }
      if (id === "Allahabad" && availableDistrictNames.has("prayagraj")) {
        setMapSelectedDistrict("Prayagraj");
      } else {
        setMapSelectedDistrict(toDisplayName(id));
      }
    },
    [availableDistrictNames],
  );

  const handleZoomOut = useCallback(() => {
    setManualZoomOut(true);
    setMapSelectedDistrict(null);
    setFocusPoint(null);
  }, []);

  if (!svgContent) {
    return (
      <div className="flex min-h-[520px] w-full items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
        <p className="text-slate-500">Loading map…</p>
      </div>
    );
  }

  const activeDistrict = manualZoomOut
    ? null
    : (mapSelectedDistrict ?? selectedDistrict);
  const hasFocus = Boolean(activeDistrict && focusPoint);
  const zoomScale = hasFocus ? 1.85 : 1;
  const offsetX = hasFocus && focusPoint ? 50 - focusPoint.leftPct : 0;
  const offsetY = hasFocus && focusPoint ? 50 - focusPoint.topPct : 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
      style={{
        minHeight: 520,
        aspectRatio: mapAspectRatio,
      }}
    >
      <div
        className="absolute inset-0 transition-transform duration-500 ease-out"
        style={{
          transform: `translate(${offsetX}%, ${offsetY}%) scale(${zoomScale})`,
          transformOrigin: "center center",
          willChange: "transform",
        }}
      >
        <div
          className="relative h-full w-full [&_svg]:h-full [&_svg]:w-full [&_svg]:object-contain [&_svg]:block"
          onClickCapture={handleSvgClick}
        >
          <div dangerouslySetInnerHTML={{ __html: svgContent }} />
        </div>

        {/* Blinking markers — overlay matches map aspect ratio so % positions align */}
        <div className="pointer-events-none absolute inset-0 z-1">
          {markerDistricts.map((d) => (
            <button
              key={d.id}
              type="button"
              aria-label={`${d.name} district`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleMarkerClick(d.name, d.id);
              }}
              className="pointer-events-auto absolute z-10 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white bg-red-500 shadow-md ring-1 ring-red-400/60 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
              style={{
                left: `${markerPositions[d.id]?.leftPct ?? -999}%`,
                top: `${markerPositions[d.id]?.topPct ?? -999}%`,
                backgroundColor: MARKER_COLORS[d.severity].dot,
                boxShadow: `0 0 0 1px ${MARKER_COLORS[d.severity].ring}`,
              }}
            >
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full"
                style={{ backgroundColor: MARKER_COLORS[d.severity].pulse }}
              />
              <span className="relative h-1.5 w-1.5 rounded-full bg-white" />
            </button>
          ))}
        </div>
      </div>

      {hasFocus && (
        <div
          className="pointer-events-none absolute inset-0 bg-slate-900/10 transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      <div className="pointer-events-none absolute inset-0 z-20 bg-linear-to-b from-transparent via-transparent to-slate-100/35" />

      {hasFocus && (
        <button
          type="button"
          onClick={handleZoomOut}
          className="absolute bottom-3 left-1/2 z-30 -translate-x-1/2 rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-slate-700 shadow ring-1 ring-slate-300 transition hover:bg-white"
        >
          Zoom out
        </button>
      )}

      <div className="absolute right-2 top-2 z-20 rounded bg-white/90 px-2 py-1 text-xs text-slate-700 shadow">
        selected: {mapSelectedDistrict ?? selectedDistrict ?? "none"} | path:{" "}
        {lastClickedId ?? "none"}
      </div>
    </div>
  );
}
