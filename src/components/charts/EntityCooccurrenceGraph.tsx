"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { EntityCooccurrenceData } from "@/types";

const NODE_COLORS: Record<string, string> = {
  politicians: "#3b82f6",
  districts: "#22c55e",
  schemes: "#f59e0b",
};

type GraphNode = d3.SimulationNodeDatum & {
  id: string;
  label: string;
  type: "politicians" | "districts" | "schemes";
  count: number;
};

type GraphLink = d3.SimulationLinkDatum<GraphNode> & {
  source: string | GraphNode;
  target: string | GraphNode;
  weight: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

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
    const centerX = 0;
    const centerY = 0;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `${-width / 2} ${-height / 2} ${width} ${height}`);

    // Clone input data so d3 can safely mutate simulation coordinates.
    const nodes: GraphNode[] = data.nodes.map((n) => ({ ...n }));
    const links: GraphLink[] = data.links.map((l) => ({ ...l }));
    const nodeCount = nodes.length;
    const maxNodeCount = Math.max(1, d3.max(nodes, (d) => d.count) ?? 1);
    const maxWeight = Math.max(1, d3.max(links, (d) => d.weight) ?? 1);
    const nodeById = new Map(nodes.map((n) => [n.id, n] as const));
    const radiusScale = d3
      .scaleSqrt()
      .domain([1, maxNodeCount])
      .range([4, nodeCount > 120 ? 6 : 9]);

    const getNodeRadius = (n: GraphNode) =>
      clamp(radiusScale(Math.max(1, n.count ?? 1)), 6, 30);

    const getNode = (endpoint: string | GraphNode): GraphNode | undefined =>
      typeof endpoint === "string" ? nodeById.get(endpoint) : endpoint;

    const getLabelMinZoom = (label: string) => {
      const length = label.trim().length;
      if (length <= 10) return 0.9;
      if (length <= 18) return 1.35;
      if (length <= 26) return 1.9;
      return 2.4;
    };

    const simulation = d3
      .forceSimulation<GraphNode>(nodes)
      .force(
        "link",
        d3
          .forceLink<GraphNode, GraphLink>(links)
          .id((d) => d.id)
          .distance((d) => {
            const sourceCount = getNode(d.source)?.count ?? 1;
            const targetCount = getNode(d.target)?.count ?? 1;
            const weightFactor = clamp((d.weight ?? 1) / maxWeight, 0, 1);
            const countFactor = clamp(
              (sourceCount + targetCount) / (2 * maxNodeCount),
              0,
              1,
            );
            const distance = 72 - weightFactor * 28 - countFactor * 12;
            return clamp(distance, 24, 84);
          }),
      )
      .force(
        "charge",
        d3.forceManyBody().strength(() => {
          if (nodeCount > 150) return -40;
          if (nodeCount > 80) return -55;
          return -70;
        }),
      )
      .force(
        "collide",
        d3
          .forceCollide<GraphNode>((d) => getNodeRadius(d) + 1.5)
          .strength(0.35),
      )
      // Disjoint setup: positioning forces keep detached subgraphs in view.
      .force("x", d3.forceX(centerX).strength(0.03))
      .force("y", d3.forceY(centerY).strength(0.03))
      .alphaDecay(nodeCount > 120 ? 0.045 : 0.03)
      .velocityDecay(0.3);

    const g = svg.append("g");

    const link = g
      .append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "#9ca3af")
      .attr("stroke-opacity", (d: GraphLink) => {
        const weightFactor = clamp((d.weight ?? 1) / maxWeight, 0, 1);
        return nodeCount > 120
          ? 0.45 + weightFactor * 0.25
          : 0.5 + weightFactor * 0.35;
      })
      .attr("stroke-width", (d: GraphLink) => {
        const weightFactor = clamp((d.weight ?? 1) / maxWeight, 0, 1);
        return nodeCount > 120
          ? 0.9 + weightFactor * 1.4
          : 1 + weightFactor * 1.8;
      });

    const node = g
      .append("g")
      .selectAll<SVGCircleElement, GraphNode>("circle")
      .data(nodes)
      .join("circle")
      .attr("r", (d: GraphNode) => getNodeRadius(d))
      .attr("fill", (d: GraphNode) => NODE_COLORS[d.type] ?? "#94a3b8")
      .attr("stroke", "#fff")
      .attr("stroke-width", nodeCount > 120 ? 0.9 : 1.2)
      .style("cursor", "pointer")
      .call(
        d3
          .drag<SVGCircleElement, GraphNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }),
      )
      .on("click", (_, d: GraphNode) => {
        onNodeClick?.(d.id);
      });

    node.append("title").text((d: GraphNode) => `${d.label} (${d.count})`);

    const label = g
      .append("g")
      .selectAll("text")
      .data(nodes)
      .join("text")
      .text((d: GraphNode) => d.label ?? "")
      .attr("font-size", 9)
      .attr("font-weight", 500)
      .attr("fill", "#334155")
      .attr("dx", 0)
      .attr("dy", (d: GraphNode) => getNodeRadius(d) + 12)
      .attr("text-anchor", "middle")
      .style("pointer-events", "none");

    const updateLabelVisibility = (zoomK: number) => {
      const densityPenalty = nodeCount > 120 ? 0.45 : nodeCount > 70 ? 0.25 : 0;
      label.style("display", (d: GraphNode) =>
        zoomK >= getLabelMinZoom(d.label) + densityPenalty ? "block" : "none",
      );
    };
    updateLabelVisibility(1);

    simulation.on("tick", () => {
      link
        .attr("x1", (d: GraphLink) => (d.source as GraphNode).x ?? 0)
        .attr("y1", (d: GraphLink) => (d.source as GraphNode).y ?? 0)
        .attr("x2", (d: GraphLink) => (d.target as GraphNode).x ?? 0)
        .attr("y2", (d: GraphLink) => (d.target as GraphNode).y ?? 0);
      node
        .attr("cx", (d: GraphNode) => d.x ?? 0)
        .attr("cy", (d: GraphNode) => d.y ?? 0);
      label
        .attr("x", (d: GraphNode) => d.x ?? 0)
        .attr("y", (d: GraphNode) => d.y ?? 0);
    });

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 4.5])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        updateLabelVisibility(event.transform.k);
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
      <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-md border border-slate-200 bg-white/90 px-3 py-2 text-xs text-slate-700 shadow-sm backdrop-blur-sm">
        <div className="mb-1 font-medium text-slate-800">Entity types</div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#3b82f6]" />
          <span>Politicians</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#22c55e]" />
          <span>Districts</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]" />
          <span>Schemes</span>
        </div>
      </div>
      <svg ref={svgRef} width="100%" height={450} />
    </div>
  );
}
