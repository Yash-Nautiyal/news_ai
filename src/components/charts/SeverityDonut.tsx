"use client";

import * as d3 from "d3";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Severity } from "@/types";

const SEVERITY_ORDER: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

const SEVERITY_COLORS: Record<Severity, string> = {
  CRITICAL: "#dc2626",
  HIGH: "#ea580c",
  MEDIUM: "#eab308",
  LOW: "#64748b",
};

const PAD_ANGLE = 0.018;
const LEGEND_HEIGHT_RATIO = 0.28;
const PIE_PADDING_RATIO = 0.08;
const LEGEND_WIDTH_RATIO = 0.62;

type SliceDatum = {
  name: Severity;
  value: number;
  fill: string;
};

const FALLBACK_WIDTH = 550;
const FALLBACK_HEIGHT = 350;

function useDimensions(targetRef: React.RefObject<HTMLDivElement | null>) {
  const getDimensions = useCallback(
    () => ({
      width: targetRef.current ? targetRef.current.offsetWidth : 0,
      height: targetRef.current ? targetRef.current.offsetHeight : 0,
    }),
    [targetRef],
  );

  const [dimensions, setDimensions] = useState(getDimensions);

  const handleResize = useCallback(() => {
    setDimensions(getDimensions());
  }, [getDimensions]);

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [handleResize]);

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;
    const ro = new ResizeObserver(handleResize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [handleResize, targetRef]);

  useLayoutEffect(() => {
    handleResize();
  }, [handleResize]);

  return dimensions;
}

export function SeverityDonut({
  data,
  isLoading,
}: {
  data: Record<string, number>;
  isLoading?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dimensions = useDimensions(containerRef);
  const [hovered, setHovered] = useState<Severity | null>(null);

  const chartData = useMemo<SliceDatum[]>(
    () =>
      SEVERITY_ORDER.map((key) => ({
        name: key,
        value: Math.max(0, data?.[key] ?? 0),
        fill: SEVERITY_COLORS[key] ?? "#94a3b8",
      })),
    [data],
  );

  const total = useMemo(
    () => chartData.reduce((s, d) => s + d.value, 0),
    [chartData],
  );

  const { width: rawWidth, height: rawHeight } = dimensions;
  const width = rawWidth > 0 ? rawWidth : FALLBACK_WIDTH;
  const height = rawHeight > 0 ? rawHeight : FALLBACK_HEIGHT;
  const legendHeight = height * LEGEND_HEIGHT_RATIO;
  const pieHeight = height - legendHeight;
  const padding = Math.min(width, pieHeight) * PIE_PADDING_RATIO;
  const radius = (Math.min(width, pieHeight) - padding * 2) / 2;
  const innerRadius = radius * 0.5;
  const pieCenterX = width / 2;
  const pieCenterY = pieHeight / 2;
  const legendY = pieHeight + legendHeight / 2;

  const pieSlices = useMemo(() => {
    const gen = d3
      .pie<SliceDatum>()
      .value((d) => d.value)
      .sort(null);
    return gen(chartData);
  }, [chartData]);

  const arc = useMemo(
    () =>
      d3
        .arc<d3.PieArcDatum<SliceDatum>>()
        .innerRadius(innerRadius)
        .outerRadius(radius)
        .padAngle(PAD_ANGLE)
        .cornerRadius(3),
    [innerRadius, radius],
  );

  if (isLoading) {
    return (
      <div className="h-[300px] w-full animate-pulse rounded-lg bg-slate-200" />
    );
  }

  if (!chartData.length || total === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-lg border border-slate-200 text-slate-500">
        No severity data
      </div>
    );
  }

  const legendBandWidth = width * LEGEND_WIDTH_RATIO;
  const legendStartX = (width - legendBandWidth) / 2;
  const legendItemWidth = legendBandWidth / chartData.length;
  const fontSize = Math.max(9, Math.min(12, width / 32));
  const dotRadius = Math.max(4, Math.min(7, radius * 0.08));

  return (
    <div
      ref={containerRef}
      className="h-[350px] w-full min-h-0 overflow-hidden rounded-lg"
    >
      <svg
        width={width}
        height={height}
        className="block"
        role="img"
        aria-label="Severity distribution"
      >
        <defs>
          <filter
            id="severity-donut-shadow"
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
          >
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
          </filter>
        </defs>

        <g transform={`translate(${pieCenterX}, ${pieCenterY})`}>
          {pieSlices.map((slice) => {
            const pathD = arc(slice);
            if (!pathD) return null;

            const isActive = hovered === null || hovered === slice.data.name;
            const isHovered = hovered === slice.data.name;

            return (
              <g
                key={slice.data.name}
                onMouseEnter={() => setHovered(slice.data.name)}
                onMouseLeave={() => setHovered(null)}
                className="cursor-pointer"
                style={{
                  filter: isHovered ? "url(#severity-donut-shadow)" : undefined,
                }}
              >
                <path
                  d={pathD}
                  fill={slice.data.fill}
                  stroke="white"
                  strokeWidth={1.5}
                  opacity={isActive ? 1 : 0.25}
                  className="transition-opacity duration-150"
                />
              </g>
            );
          })}
        </g>

        <g className="legend">
          {chartData.map((d, i) => {
            const x = legendStartX + legendItemWidth * (i + 0.5);
            const isActive = hovered === null || hovered === d.name;

            return (
              <g
                key={d.name}
                transform={`translate(${x}, ${legendY})`}
                textAnchor="middle"
                onMouseEnter={() => setHovered(d.name)}
                onMouseLeave={() => setHovered(null)}
                className="cursor-pointer"
              >
                <circle
                  r={dotRadius}
                  fill={d.fill}
                  stroke="white"
                  strokeWidth={1.5}
                  opacity={isActive ? 1 : 0.4}
                  className="transition-opacity duration-150"
                />
                <text
                  y={fontSize * 1.8}
                  className="fill-slate-700 font-medium"
                  style={{ fontSize }}
                >
                  {d.name}
                </text>
                <text
                  y={fontSize * 3.2}
                  className="fill-slate-500"
                  style={{ fontSize: fontSize * 0.9 }}
                >
                  {total > 0
                    ? `${((d.value / total) * 100).toFixed(0)}%`
                    : "0%"}
                  {" · "}
                  {d.value}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
