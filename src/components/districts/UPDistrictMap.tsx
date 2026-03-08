"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DistrictRisk } from "@/types";

const DEFAULT_FILL = "#fefee9";
const SELECTED_FILL = "#ff6a00";
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

const SEVERITY_BG: Record<MarkerSeverity, string> = {
  CRITICAL: "#fecaca",
  HIGH: "#fed7aa",
  MEDIUM: "#fef08a",
  LOW: "#f1f5f9",
};
const SEVERITY_FG: Record<MarkerSeverity, string> = {
  CRITICAL: "#991b1b",
  HIGH: "#9a3412",
  MEDIUM: "#854d0e",
  LOW: "#334155",
};

const VIEWBOX_WIDTH = 2500;
const VIEWBOX_HEIGHT = 2700;

const TOWER_HEIGHT = 80;
const TOWER_LAYERS = 6;
const TILT_DEG = 48;

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

/** Walk from element to the SVG root, collecting any `transform` attributes on ancestor `<g>` elements. */
function getAncestorTransform(el: Element, root: Element): string {
  const parts: string[] = [];
  let cur = el.parentElement;
  while (cur && cur !== root && cur !== document.documentElement) {
    const t = cur.getAttribute("transform");
    if (t) parts.unshift(t);
    cur = cur.parentElement;
  }
  return parts.join(" ");
}

type MapMode = "flat" | "cinematic" | "exiting";

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
  const [mapSelectedDistrict, setMapSelectedDistrict] = useState<string | null>(
    null,
  );
  const [manualZoomOut, setManualZoomOut] = useState(false);
  const [mapAspectRatio, setMapAspectRatio] = useState(
    VIEWBOX_WIDTH / VIEWBOX_HEIGHT,
  );
  const [markerPositions, setMarkerPositions] = useState<
    Record<string, { leftPct: number; topPct: number }>
  >({});

  const [towerData, setTowerData] = useState<{
    pathD: string;
    viewBox: string;
    ancestorTransform: string;
    pathTransform: string;
  } | null>(null);
  const [mapMode, setMapModeState] = useState<MapMode>("flat");
  const mapModeRef = useRef<MapMode>("flat");
  const fittedViewBoxRef = useRef(`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`);

  const setMapMode = useCallback((mode: MapMode) => {
    mapModeRef.current = mode;
    setMapModeState(mode);
  }, []);

  const showCinematic = mapMode === "cinematic";

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

  const activeDistrict = manualZoomOut
    ? null
    : (mapSelectedDistrict ?? selectedDistrict);

  const selectedDistrictInfo = useMemo(() => {
    if (!activeDistrict) return null;
    return (
      districtData.find(
        (d) =>
          d.district.trim().toLowerCase() ===
          activeDistrict.trim().toLowerCase(),
      ) ?? null
    );
  }, [activeDistrict, districtData]);

  /* ── Load SVG and use its intrinsic viewBox ── */
  useEffect(() => {
    fetch(`/up_map_plain.svg?v=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.text())
      .then((text) => {
        // Normalize so base SVG viewport is driven by container (like tower SVGs), not width/height
        const normalized = text.replace(
          /\s(width|height)=["'][^"']*["']/g,
          (m, attr) => (attr === "width" ? ' width="100%"' : ' height="100%"'),
        );
        setSvgContent(normalized);
        const vbMatch = text.match(/viewBox\s*=\s*["']([^"']+)["']/);
        if (vbMatch) {
          const parts = vbMatch[1].trim().split(/\s+/);
          if (parts.length >= 4) {
            const w = parseFloat(parts[2]);
            const h = parseFloat(parts[3]);
            if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
              setMapAspectRatio(w / h);
              fittedViewBoxRef.current = vbMatch[1].trim();
            }
          }
        }
      })
      .catch(() => setSvgContent(null));
  }, []);

  /* ── Path coloring ── */
  useEffect(() => {
    if (!svgContent || !containerRef.current) return;
    const svg = containerRef.current.querySelector("svg");
    if (!svg) return;

    const normalizedSelected = toSvgId(activeDistrict);
    svg.querySelectorAll<SVGPathElement>("path[id]").forEach((path) => {
      const id = path.getAttribute("id");
      if (!id || !isDistrictPath(id)) return;

      const isSelected = id === normalizedSelected;
      path.style.fill = isSelected ? SELECTED_FILL : DEFAULT_FILL;
      path.style.stroke = isSelected ? "#9a3412" : "#a5a7a9";
      path.style.strokeWidth = isSelected ? "4px" : "3px";
      path.style.opacity = normalizedSelected
        ? isSelected
          ? "1"
          : showCinematic
            ? "0.12"
            : "0.28"
        : "1";
      path.style.cursor = "pointer";
      path.style.transition =
        "fill 0.25s ease, opacity 0.5s ease, stroke 0.25s ease, stroke-width 0.25s ease";
    });
  }, [svgContent, activeDistrict, showCinematic]);

  /* ── Ensure SVG fits container (keep its intrinsic viewBox) ── */
  useEffect(() => {
    if (!svgContent || !containerRef.current) return;
    const svg = containerRef.current.querySelector("svg");
    if (svg) svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  }, [svgContent]);

  /* ── Extract selected path for tower ── */
  useEffect(() => {
    if (mapModeRef.current === "exiting") return;

    if (!activeDistrict || !containerRef.current || !svgContent) {
      setTowerData(null);
      if (mapModeRef.current === "cinematic") setMapMode("flat");
      return;
    }

    const svg = containerRef.current.querySelector(
      "svg",
    ) as SVGSVGElement | null;
    if (!svg) return;

    const activeId = toSvgId(activeDistrict);
    if (!activeId) return;

    const path = svg.querySelector(
      `path[id="${activeId}"]`,
    ) as SVGPathElement | null;
    if (!path) return;

    const pathD = path.getAttribute("d");
    if (!pathD) return;

    const viewBox = svg.getAttribute("viewBox") || fittedViewBoxRef.current;
    const ancestorTransform = getAncestorTransform(path, svg);
    const pathTransform = path.getAttribute("transform") || "";
    setTowerData({ pathD, viewBox, ancestorTransform, pathTransform });

    if (mapModeRef.current === "flat") {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setMapMode("cinematic"));
      });
    }
  }, [activeDistrict, svgContent, setMapMode]);

  /* ── Marker positions ── */
  useEffect(() => {
    if (!svgContent || !containerRef.current) return;
    const root = containerRef.current;
    const compute = () => {
      const svg = root.querySelector("svg");
      if (!svg) return;
      const cr = root.getBoundingClientRect();
      if (!cr.width || !cr.height) return;

      const next: Record<string, { leftPct: number; topPct: number }> = {};
      markerDistricts.forEach((d) => {
        const el = svg.querySelector(
          `path[id="${d.id}"]`,
        ) as SVGGraphicsElement | null;
        if (!el) return;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return;
        next[d.id] = {
          leftPct: ((r.left + r.width / 2 - cr.left) / cr.width) * 100,
          topPct: ((r.top + r.height / 2 - cr.top) / cr.height) * 100,
        };
      });
      setMarkerPositions(next);
    };

    const raf = requestAnimationFrame(compute);
    const ro = new ResizeObserver(compute);
    ro.observe(root);
    const svg = root.querySelector("svg");
    if (svg) ro.observe(svg);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [svgContent, markerDistricts]);

  /* ── Handlers ── */
  const handleMarkerClick = useCallback(
    (name: string) => {
      setManualZoomOut(false);
      setMapSelectedDistrict(name);
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
      const displayName =
        id === "Allahabad" && availableDistrictNames.has("prayagraj")
          ? "Prayagraj"
          : toDisplayName(id);
      setMapSelectedDistrict(displayName);
    },
    [availableDistrictNames],
  );

  const handleBackToMap = useCallback(() => {
    setMapMode("exiting");
    setTimeout(() => {
      setMapMode("flat");
      setTowerData(null);
      setManualZoomOut(true);
      setMapSelectedDistrict(null);
    }, 900);
  }, [setMapMode]);

  /* ── Loading ── */
  if (!svgContent) {
    return (
      <div className="flex min-h-[520px] w-full items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
        <p className="text-slate-500">Loading map…</p>
      </div>
    );
  }

  const severity = selectedDistrictInfo
    ? riskToSeverity(selectedDistrictInfo.risk_score)
    : "LOW";

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-2xl border border-slate-200"
      style={{
        minHeight: 520,
        aspectRatio: mapAspectRatio,
        perspective: "1200px",
        background: showCinematic
          ? "radial-gradient(ellipse at center 70%, #e2e8f0 0%, #cbd5e1 50%, #94a3b8 100%)"
          : "#f8fafc",
        transition: "background 0.8s ease",
      }}
    >
      {/* ── 3D Scene ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transformStyle: "preserve-3d",
          transform: showCinematic
            ? `rotateX(${TILT_DEG}deg) scale(0.65) translateY(-4%)`
            : "rotateX(0deg) scale(1) translateY(0%)",
          transition: "transform 0.9s cubic-bezier(0.16, 1, 0.3, 1)",
          transformOrigin: "center center",
        }}
      >
        {/* Base map at Z=0 */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: "translateZ(0px)",
            backfaceVisibility: "hidden",
          }}
          className="[&_svg]:h-full [&_svg]:w-full [&_svg]:object-contain [&_svg]:block"
          onClickCapture={handleSvgClick}
        >
          <div dangerouslySetInnerHTML={{ __html: svgContent }} />
        </div>

        {/* Shadow beneath tower */}
        {towerData && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              transform: "translateZ(3px)",
              opacity: showCinematic ? 0.5 : 0,
              transition: "opacity 0.6s ease 0.3s",
              filter: "blur(16px)",
              pointerEvents: "none",
            }}
          >
            <svg
              className="h-full w-full block"
              viewBox={towerData.viewBox}
              preserveAspectRatio="xMidYMid meet"
            >
              <g transform={towerData.ancestorTransform || undefined}>
                <g transform={towerData.pathTransform || undefined}>
                  <path d={towerData.pathD} fill="rgba(0,0,0,0.6)" />
                </g>
              </g>
            </svg>
          </div>
        )}

        {/* Tower extrusion (side layers) */}
        {towerData &&
          Array.from({ length: TOWER_LAYERS }).map((_, i) => {
            const t = (i + 1) / (TOWER_LAYERS + 1);
            const z = t * TOWER_HEIGHT;
            const r = Math.round(140 + t * 90);
            const g = Math.round(45 + t * 50);
            return (
              <div
                key={`side-${i}`}
                style={{
                  position: "absolute",
                  inset: 0,
                  transform: `translateZ(${showCinematic ? z : 0}px)`,
                  transition: `transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.1 + i * 0.04}s`,
                  pointerEvents: "none",
                  backfaceVisibility: "hidden",
                }}
              >
                <svg
                  className="h-full w-full block"
                  viewBox={towerData.viewBox}
                  preserveAspectRatio="xMidYMid meet"
                >
                  <g transform={towerData.ancestorTransform || undefined}>
                    <g transform={towerData.pathTransform || undefined}>
                      <path
                        d={towerData.pathD}
                        fill={`rgb(${r},${g},0)`}
                        stroke="#7c2d12"
                        strokeWidth="1.5"
                      />
                    </g>
                  </g>
                </svg>
              </div>
            );
          })}

        {/* Tower top face */}
        {towerData && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              transform: `translateZ(${showCinematic ? TOWER_HEIGHT : 0}px)`,
              transition:
                "transform 0.75s cubic-bezier(0.34, 1.56, 0.64, 1) 0.25s",
              pointerEvents: "none",
              backfaceVisibility: "hidden",
            }}
          >
            <svg
              className="h-full w-full block"
              viewBox={towerData.viewBox}
              preserveAspectRatio="xMidYMid meet"
            >
              <g transform={towerData.ancestorTransform || undefined}>
                <g transform={towerData.pathTransform || undefined}>
                  <path
                    d={towerData.pathD}
                    fill={SELECTED_FILL}
                    stroke="#7c2d12"
                    strokeWidth="3"
                  />
                </g>
              </g>
            </svg>
          </div>
        )}
      </div>

      {/* ── Markers ── */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: showCinematic ? 0 : 1,
          visibility: showCinematic
            ? ("hidden" as const)
            : ("visible" as const),
          transition: showCinematic
            ? "opacity 0.4s ease, visibility 0s linear 0.4s"
            : "opacity 0.4s ease 0.5s, visibility 0s",
          zIndex: 10,
        }}
      >
        {markerDistricts.map((d) => (
          <button
            key={d.id}
            type="button"
            aria-label={`${d.name} district`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleMarkerClick(d.name);
            }}
            className="pointer-events-auto absolute z-10 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white shadow-md transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
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

      {/* ── District info panel (slides from right) ── */}
      {selectedDistrictInfo && (
        <div
          className="absolute z-30 rounded-xl border border-slate-200/80 bg-white/95 shadow-2xl backdrop-blur-md"
          style={{
            right: 20,
            top: "50%",
            width: 210,
            padding: "20px 16px",
            transform: showCinematic
              ? "translateX(0) translateY(-50%)"
              : "translateX(150%) translateY(-50%)",
            opacity: showCinematic ? 1 : 0,
            transition: showCinematic
              ? "transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.55s, opacity 0.4s ease 0.55s"
              : "transform 0.4s ease, opacity 0.3s ease",
          }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            District
          </p>
          <h3 className="mt-0.5 text-lg font-bold leading-tight text-slate-900">
            {selectedDistrictInfo.district}
          </h3>
          {selectedDistrictInfo.district_hindi && (
            <p className="hindi-text text-sm text-slate-500">
              {selectedDistrictInfo.district_hindi}
            </p>
          )}

          <div className="mt-4 space-y-3">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                Risk Score
              </p>
              <div className="mt-0.5 flex items-center gap-2">
                <span
                  className="text-2xl font-black"
                  style={{ color: SEVERITY_FG[severity] }}
                >
                  {selectedDistrictInfo.risk_score}
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                  style={{
                    backgroundColor: SEVERITY_BG[severity],
                    color: SEVERITY_FG[severity],
                  }}
                >
                  {severity}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-slate-50 p-2 text-center">
                <p className="text-lg font-bold text-slate-800">
                  {selectedDistrictInfo.article_count}
                </p>
                <p className="text-[10px] text-slate-500">Articles</p>
              </div>
              <div className="rounded-lg bg-red-50 p-2 text-center">
                <p className="text-lg font-bold text-red-600">
                  {selectedDistrictInfo.critical_count}
                </p>
                <p className="text-[10px] text-slate-500">Critical</p>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                Sentiment
              </p>
              <p className="mt-0.5 text-sm font-medium capitalize text-slate-700">
                {selectedDistrictInfo.dominant_sentiment}
              </p>
            </div>

            {selectedDistrictInfo.top_topics?.length > 0 && (
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                  Topics
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {selectedDistrictInfo.top_topics.slice(0, 4).map((topic) => (
                    <span
                      key={topic}
                      className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Back to map ── */}
      {mapMode === "cinematic" && (
        <button
          type="button"
          onClick={handleBackToMap}
          className="absolute bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-full bg-white/95 px-4 py-2 text-sm font-medium text-slate-700 shadow-lg ring-1 ring-slate-200 backdrop-blur-sm transition hover:bg-white hover:shadow-xl"
        >
          ← Back to map
        </button>
      )}

      {/* Gradient vignette */}
      <div
        className="pointer-events-none absolute inset-0 bg-linear-to-b from-transparent via-transparent to-slate-100/30"
        style={{ zIndex: 5 }}
      />
    </div>
  );
}
