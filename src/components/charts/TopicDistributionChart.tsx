"use client";

import * as d3 from "d3";
import { interpolate } from "flubber";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { animated, config, to, useSpring } from "@react-spring/web";
import type { TopicDistributionItem } from "@/types";

function useDimensions(targetRef: React.RefObject<HTMLDivElement | null>) {
  const getDimensions = useCallback(
    () => ({
      width: targetRef.current ? targetRef.current.offsetWidth : 0,
      height: targetRef.current ? targetRef.current.offsetHeight : 0,
    }),
    [targetRef],
  );

  const [dimensions, setDimensions] = useState(getDimensions);
  const handleResize = useCallback(
    () => setDimensions(getDimensions()),
    [getDimensions],
  );

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

const COLORS = [
  "#3b82f6",
  "#22c55e",
  "#eab308",
  "#f97316",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#6366f1",
];

const MARGIN = { top: 10, right: 10, bottom: 30, left: 30 };
const BAR_PADDING = 0.3;
const MARGIN_PIE = 10;

type ChartDatum = {
  name: string;
  value: number;
  color: string;
  percentage: number;
};

type ChartMode = "pie" | "bar";

type MorphingChartProps = {
  width: number;
  height: number;
  data: ChartDatum[];
  mode: ChartMode;
};

type ShapeRendererProps = {
  path: string;
  color: string;
};

const ShapeRenderer = ({ path, color }: ShapeRendererProps) => {
  const currD = useRef(path);

  const pathInterpolator = useMemo(
    () => interpolate(currD.current, path),
    [path],
  );

  const springProps = useSpring({
    from: { t: 0 },
    to: { t: 1 },
    reset: currD.current !== path,
    onChange: ({ value }) => {
      const t = (value as any)?.t ?? 1;
      currD.current = pathInterpolator(t);
    },
    config: config.molasses,
  });

  return (
    <animated.path
      d={to(springProps.t, pathInterpolator)}
      stroke="white"
      fill={color}
      fillOpacity={0.9}
      strokeWidth={1}
    />
  );
};

const MorphingTopicChart = ({
  width,
  height,
  data,
  mode,
}: MorphingChartProps) => {
  const sortedData = useMemo(
    () => [...data].sort((a, b) => b.value - a.value),
    [data],
  );
  const groups = useMemo(() => sortedData.map((d) => d.name), [sortedData]);

  const radius = Math.min(width, height) / 2 - MARGIN_PIE;

  const pie = useMemo(() => {
    const pieGenerator = d3
      .pie<ChartDatum>()
      .value((d: ChartDatum) => d.value)
      .sort(null);
    return pieGenerator(sortedData);
  }, [sortedData]);

  const boundsWidth = width - MARGIN.right - MARGIN.left;
  const boundsHeight = height - MARGIN.top - MARGIN.bottom;

  const yScale = useMemo(
    () =>
      d3
        .scaleBand()
        .domain(groups)
        .range([0, boundsHeight])
        .padding(BAR_PADDING),
    [groups, boundsHeight],
  );

  const xScale = useMemo(() => {
    const max = d3.max(sortedData, (d) => d.value) ?? 1;
    return d3.scaleLinear().domain([0, max]).range([0, boundsWidth]);
  }, [sortedData, boundsWidth]);

  const allPaths = pie.map((slice, i) => {
    const arcPathGenerator = d3.arc();

    const arcPath = arcPathGenerator({
      innerRadius: radius * 0.5,
      outerRadius: radius,
      startAngle: slice.startAngle,
      endAngle: slice.endAngle,
    }) as string;

    const y = (yScale(slice.data.name) ?? 0) - height / 2;
    const x = xScale(slice.value ?? slice.data.value) - width / 2;
    const x0 = xScale(0) - width / 2;
    const bw = yScale.bandwidth();

    const rectPath = `M ${x0} ${y} L ${x} ${y} L ${x} ${y + bw} L ${x0} ${
      y + bw
    } Z`;

    return (
      <ShapeRenderer
        key={slice.data.name}
        path={mode === "pie" ? arcPath : rectPath}
        color={slice.data.color || COLORS[i % COLORS.length]}
      />
    );
  });

  const barLabels =
    mode === "bar"
      ? pie.map((slice) => {
          const y = (yScale(slice.data.name) ?? 0) - height / 2;
          const x = xScale(slice.value ?? slice.data.value) - width / 2;
          const bw = yScale.bandwidth();
          return (
            <text
              key={`label-${slice.data.name}`}
              x={x + 6}
              y={y + bw / 2}
              textAnchor="start"
              dominantBaseline="middle"
              className="fill-slate-600 text-[11px] font-medium tabular-nums"
            >
              {slice.data.value}
            </text>
          );
        })
      : null;

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
    >
      <g transform={`translate(${width / 2}, ${height / 2})`}>
        {allPaths}
        {barLabels}
      </g>
    </svg>
  );
};

export function TopicDistributionChart({
  data,
  isLoading,
}: {
  data: TopicDistributionItem[];
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="h-[300px] w-full animate-pulse rounded-lg bg-slate-200" />
    );
  }
  if (!data?.length) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-lg border border-slate-200 text-slate-500">
        No topic data
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.count, 0);

  const chartData: ChartDatum[] = data.slice(0, 10).map((d, i) => {
    const value = d.count;
    const percentage = total ? (value / total) * 100 : 0;
    return {
      name: d.topic,
      value,
      color: COLORS[i % COLORS.length],
      percentage,
    };
  });

  const [mode, setMode] = useState<ChartMode>("pie");
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const { width: chartWidth, height: chartHeight } =
    useDimensions(chartContainerRef);
  const w = chartWidth > 0 ? chartWidth : 360;
  const h = chartHeight > 0 ? chartHeight : 260;

  return (
    <div className="flex min-h-[280px] max-h-[min(480px,85vh)] w-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Topic distribution
          </h2>
          <p className="text-xs text-slate-500">
            Top {chartData.length} topics · {total} articles
          </p>
        </div>
        <div className="inline-flex rounded-full bg-slate-100 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setMode("pie")}
            className={`rounded-full px-3 py-1 font-medium transition ${
              mode === "pie"
                ? "bg-slate-900 text-slate-50 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Pie
          </button>
          <button
            type="button"
            onClick={() => setMode("bar")}
            className={`rounded-full px-3 py-1 font-medium transition ${
              mode === "bar"
                ? "bg-slate-900 text-slate-50 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Bars
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-4">
        <div ref={chartContainerRef} className="relative min-w-0 flex-1">
          <div className="absolute inset-0">
            <MorphingTopicChart
              width={w}
              height={h}
              data={chartData}
              mode={mode}
            />
          </div>
        </div>

        <div className="flex w-44 shrink-0 flex-col gap-1 overflow-y-auto pr-1 text-xs">
          {chartData.map((d) => (
            <div
              key={d.name}
              className="flex shrink-0 items-center justify-between rounded-md px-2 py-1 hover:bg-slate-50"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-sm"
                  style={{ backgroundColor: d.color }}
                />
                <span className="truncate max-w-[120px] text-slate-700">
                  {d.name}
                </span>
              </div>
              <span className="tabular-nums shrink-0 text-slate-500">
                {d.percentage.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
