"use client";

import * as d3 from "d3";
import { useEffect, useMemo, useState } from "react";
import type { SourceVolumeItem, SourceType } from "@/types";

const BAR_ANIMATION_DURATION_MS = 450;
const BAR_ANIMATION_STAGGER_MS = 35;

const TYPE_COLOR: Record<SourceType, string> = {
  tv: "#8b5cf6",
  print: "#3b82f6",
  online: "#14b8a6",
  youtube: "#ef4444",
  upload: "#94a3b8",
};

const WIDTH = 640;
const HEIGHT = 360;
const MARGIN = { top: 0, right: 24, bottom: 32, left: 120 };

type ChartRow = SourceVolumeItem & {
  name: string;
  fill: string;
};

export function SourceVolumeChart({
  data,
  isLoading,
}: {
  data: SourceVolumeItem[];
  isLoading?: boolean;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [barScale, setBarScale] = useState(0);

  useEffect(() => {
    const id = requestAnimationFrame(() => setBarScale(1));
    return () => cancelAnimationFrame(id);
  }, []);

  if (isLoading) {
    return (
      <div className="h-[400px] w-full animate-pulse rounded-lg bg-slate-200" />
    );
  }
  if (!data?.length) {
    return (
      <div className="flex h-[400px] items-center justify-center rounded-lg border border-slate-200 text-slate-500">
        No source volume data
      </div>
    );
  }

  const chartData: ChartRow[] = useMemo(
    () =>
      data.slice(0, 15).map((d) => ({
        ...d,
        name:
          d.source_name.length > 24
            ? d.source_name.slice(0, 24) + "…"
            : d.source_name,
        fill: TYPE_COLOR[d.source_type] ?? "#94a3b8",
      })),
    [data],
  );

  const names = useMemo(() => chartData.map((d) => d.name), [chartData]);
  const maxCount = useMemo(
    () => d3.max(chartData, (d) => d.count) ?? 1,
    [chartData],
  );

  const yScale = useMemo(
    () =>
      d3
        .scaleBand()
        .domain(names)
        .range([MARGIN.top, HEIGHT - MARGIN.bottom])
        .padding(0.25),
    [names],
  );

  const xScale = useMemo(
    () =>
      d3
        .scaleLinear()
        .domain([0, maxCount])
        .nice()
        .range([MARGIN.left, WIDTH - MARGIN.right]),
    [maxCount],
  );

  const xTicks = xScale.ticks(4);

  return (
    <div className="h-[400px] w-full">
      <svg
        className="h-full w-full"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label="Source volume by article count"
      >
        {/* X grid and axis */}
        <g>
          {xTicks.map((t) => (
            <g key={t} transform={`translate(${xScale(t)},0)`}>
              <line
                x1={0}
                x2={0}
                y1={MARGIN.top}
                y2={HEIGHT - MARGIN.bottom}
                className="stroke-slate-200"
              />
              <text
                y={HEIGHT - MARGIN.bottom + 16}
                textAnchor="middle"
                className="fill-slate-500 text-[10px]"
              >
                {t}
              </text>
            </g>
          ))}
        </g>

        {/* Y labels (wrap to max 2 lines) */}
        <g>
          {chartData.map((d) => {
            const y = yScale(d.name);
            if (y === undefined) return null;

            const maxCharsPerLine = 18;
            const maxLines = 2;

            const words = d.name.split(" ");
            const lines: string[] = [];
            let currentLine = "";

            for (const word of words) {
              const testLine = currentLine ? `${currentLine} ${word}` : word;
              if (testLine.length <= maxCharsPerLine) {
                currentLine = testLine;
              } else {
                if (currentLine) lines.push(currentLine);
                currentLine = word;
              }
            }
            if (currentLine) {
              lines.push(currentLine);
            }

            if (lines.length > maxLines) {
              const first = lines[0];
              const rest = lines.slice(1).join(" ");
              lines.length = 0;
              lines.push(first, rest);
            }

            const lineHeight = 11;

            return (
              <text
                key={d.source_name}
                x={MARGIN.left - 8}
                textAnchor="end"
                className="fill-slate-700 text-[11px]"
              >
                {lines.map((line, index) => {
                  const offset =
                    y +
                    yScale.bandwidth() / 2 +
                    (index - (lines.length - 1) / 2) * lineHeight;
                  return (
                    <tspan
                      key={index}
                      x={MARGIN.left - 8}
                      y={offset}
                      dominantBaseline="middle"
                    >
                      {line}
                    </tspan>
                  );
                })}
              </text>
            );
          })}
        </g>

        {/* Bars */}
        <g>
          {chartData.map((d, i) => {
            const y = yScale(d.name);
            if (y === undefined) return null;
            const x0 = MARGIN.left;
            const x1 = xScale(d.count);
            const barWidth = Math.max(x1 - x0, 1);
            const isActive = hovered === null || hovered === d.source_name;
            const isHovered = hovered === d.source_name;
            const staggerMs = i * BAR_ANIMATION_STAGGER_MS;

            return (
              <g
                key={d.source_name}
                onMouseEnter={() => setHovered(d.source_name)}
                onMouseLeave={() => setHovered(null)}
                className="cursor-pointer"
              >
                <rect
                  x={x0}
                  y={y}
                  width={barWidth * barScale}
                  height={yScale.bandwidth()}
                  fill={d.fill}
                  opacity={isActive ? 1 : 0.25}
                  className={
                    isHovered
                      ? "drop-shadow-sm transition-all"
                      : "transition-all"
                  }
                  style={{
                    transition: `width ${BAR_ANIMATION_DURATION_MS}ms ease-out`,
                    transitionDelay: `${staggerMs}ms`,
                  }}
                  rx={4}
                  ry={4}
                />
                <text
                  x={x1 + 6}
                  y={y + yScale.bandwidth() / 2}
                  dominantBaseline="middle"
                  className="fill-slate-600 text-[11px]"
                  style={{
                    opacity: barScale,
                    transition: `opacity ${BAR_ANIMATION_DURATION_MS * 0.5}ms ease-out`,
                    transitionDelay: `${staggerMs + BAR_ANIMATION_DURATION_MS * 0.3}ms`,
                  }}
                >
                  {d.count}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
