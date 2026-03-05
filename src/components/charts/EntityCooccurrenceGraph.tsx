"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { EntityCooccurrenceData } from "@/types";

const NODE_COLORS: Record<string, string> = {
  politicians: "#3b82f6",
  districts: "#22c55e",
  schemes: "#f59e0b",
};

export function EntityCooccurrenceGraph({
  data,
  isLoading,
  onNodeClick,
}: {
  data: EntityCooccurrenceData | undefined;
  isLoading?: boolean;
  onNodeClick?: (id: string) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!data?.nodes?.length || !svgRef.current || !containerRef.current)
      return;

    const width = containerRef.current.clientWidth;
    const height = 450;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const simulation = d3
      .forceSimulation(data.nodes as d3.SimulationNodeDatum[])
      .force(
        "link",
        d3
          .forceLink(data.links)
          .id((d: unknown) => (d as { id: string }).id)
          .distance(80),
      )
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const g = svg.append("g");

    const link = g
      .append("g")
      .selectAll("line")
      .data(data.links)
      .join("line")
      .attr("stroke", "#cbd5e1")
      .attr("stroke-width", (d: { weight?: number }) =>
        Math.max(1, (d.weight ?? 1) / 2),
      );

    const node = g
      .append("g")
      .selectAll("circle")
      .data(data.nodes)
      .join("circle")
      .attr("r", (d: { count?: number }) => {
        const c = (d as { count?: number }).count ?? 1;
        return Math.min(30, Math.max(8, Math.sqrt(c) * 3));
      })
      .attr(
        "fill",
        (d: { type?: string }) =>
          NODE_COLORS[(d as { type?: string }).type ?? ""] ?? "#94a3b8",
      )
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .style("cursor", "pointer")
      .call(
        d3
          .drag<SVGCircleElement, unknown>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            (d as d3.SimulationNodeDatum).fx = (d as d3.SimulationNodeDatum).x;
            (d as d3.SimulationNodeDatum).fy = (d as d3.SimulationNodeDatum).y;
          })
          .on("drag", (event, d) => {
            (d as d3.SimulationNodeDatum).fx = event.x;
            (d as d3.SimulationNodeDatum).fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            (d as d3.SimulationNodeDatum).fx = null;
            (d as d3.SimulationNodeDatum).fy = null;
          }),
      )
      .on("click", (_, d) => {
        onNodeClick?.((d as { id: string }).id);
      });

    const label = g
      .append("g")
      .selectAll("text")
      .data(data.nodes)
      .join("text")
      .text((d: { label?: string }) => (d as { label?: string }).label ?? "")
      .attr("font-size", 10)
      .attr("dx", 0)
      .attr("dy", 20)
      .attr("text-anchor", "middle");

    simulation.on("tick", () => {
      link
        .attr(
          "x1",
          (d: { source?: { x?: number } }) => (d.source as { x?: number }).x,
        )
        .attr(
          "y1",
          (d: { source?: { y?: number } }) => (d.source as { y?: number }).y,
        )
        .attr(
          "x2",
          (d: { target?: { x?: number } }) => (d.target as { x?: number }).x,
        )
        .attr(
          "y2",
          (d: { target?: { y?: number } }) => (d.target as { y?: number }).y,
        );
      node
        .attr("cx", (d: { x?: number }) => (d as d3.SimulationNodeDatum).x)
        .attr("cy", (d: { y?: number }) => (d as d3.SimulationNodeDatum).y);
      label
        .attr("x", (d: { x?: number }) => (d as d3.SimulationNodeDatum).x)
        .attr("y", (d: { y?: number }) => (d as d3.SimulationNodeDatum).y);
    });

    const zoom = d3.zoom<SVGSVGElement, unknown>().on("zoom", (event) => {
      g.attr("transform", event.transform);
    });
    svg.call(zoom);

    return () => {
      simulation.stop();
    };
  }, [data, onNodeClick]);

  if (isLoading) {
    return (
      <div className="flex h-[450px] items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        Building network graph...
      </div>
    );
  }
  if (!data?.nodes?.length) {
    return (
      <div className="flex h-[450px] items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        Not enough data yet to show entity relationships
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative h-[450px] w-full overflow-hidden rounded-lg bg-slate-100"
    >
      <svg ref={svgRef} width="100%" height={450} />
    </div>
  );
}
