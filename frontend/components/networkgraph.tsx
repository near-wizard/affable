import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

export type NetNode = {
  id: string;
  label?: string;
  group?: string;
  warmth?: number; // 0..1 = how warm the connection is (used for color)
  radius?: number; // visual radius
};

export type NetLink = {
  source: string;
  target: string;
  value?: number; // thickness
};

type NetworkMapProps = {
  nodes: NetNode[];
  links: NetLink[];
  width?: number;
  height?: number;
  onNodeClick?: (node: NetNode) => void;
};

export default function NetworkMap({
  nodes,
  links,
  width = 800,
  height = 600,
  onNodeClick
}: NetworkMapProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const initGraph = async () => {
      const { drag } = await import("d3-drag");

      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove(); // clear previous renders

      const colorScale = d3
        .scaleLinear<string>()
        .domain([0, 1])
        .range(["#d1eaff", "#007BFF"]);

      const linkThickness = d3
        .scaleLinear()
        .domain([0, d3.max(links, (d) => d.value || 1) || 1])
        .range([1, 6]);

      const simulation = d3
        .forceSimulation(nodes as any)
        .force("link", d3.forceLink(links).id((d: any) => d.id))
        .force("charge", d3.forceManyBody().strength(-300))
        .force("center", d3.forceCenter(width / 2, height / 2));

      const link = svg
        .append("g")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)
        .selectAll("line")
        .data(links)
        .join("line")
        .attr("stroke-width", (d: NetLink) => linkThickness(d.value || 1));

      const node = svg
        .append("g")
        .selectAll("circle")
        .data(nodes)
        .join("circle")
        .attr("r", (d: NetNode) => d.radius || 10)
        .attr("fill", (d: NetNode) => colorScale(d.warmth ?? 0.5))
        .style("cursor", onNodeClick ? "pointer" : "default")
        .on("click", (event, d) => {
          event.stopPropagation();
          onNodeClick?.(d);
        })
        .call(
          drag()
            .on("start", (event: any, d: any) => {
              if (!event.active) simulation.alphaTarget(0.3).restart();
              d.fx = d.x;
              d.fy = d.y;
            })
            .on("drag", (event: any, d: any) => {
              d.fx = event.x;
              d.fy = event.y;
            })
            .on("end", (event: any, d: any) => {
              if (!event.active) simulation.alphaTarget(0);
              d.fx = null;
              d.fy = null;
            })
        );

      const label = svg
        .append("g")
        .selectAll("text")
        .data(nodes)
        .join("text")
        .text((d: NetNode) => d.label || d.id)
        .attr("font-size", 12)
        .attr("dx", 12)
        .attr("dy", 4)
        .attr("fill", "#333");

      simulation.on("tick", () => {
        link
          .attr("x1", (d: any) => (d.source as any).x)
          .attr("y1", (d: any) => (d.source as any).y)
          .attr("x2", (d: any) => (d.target as any).x)
          .attr("y2", (d: any) => (d.target as any).y);

        node.attr("cx", (d: any) => d.x).attr("cy", (d: any) => d.y);

        label.attr("x", (d: any) => d.x).attr("y", (d: any) => d.y);
      });
    };

    initGraph();
  }, [nodes, links, width, height, onNodeClick]);

  return (
    <div className="flex justify-center items-center">
      <svg ref={svgRef} width={width} height={height} className="border rounded-lg shadow-md bg-white" />
    </div>
  );
}

// Example usage:

export const exampleNodes: NetNode[] = [
    { id: "vendor", label: "Your Company", warmth: 0.9, radius: 18 },
    { id: "partner-a", label: "Partner A", warmth: 0.75 },
    { id: "partner-b", label: "Partner B", warmth: 0.55 },
    { id: "partner-c", label: "Partner C", warmth: 0.4 },
    { id: "user-1", label: "Alice", warmth: 0.95, group: "Users", radius: 8 },
    { id: "user-2", label: "Bob", warmth: 0.6, group: "Users", radius: 8 },
    { id: "user-3", label: "Charlie", warmth: 0.35, group: "Users", radius: 8 },
    { id: "user-4", label: "Diana", warmth: 0.8, group: "Users", radius: 8 },
    { id: "user-5", label: "Eve", warmth: 0.5, group: "Users", radius: 8 },
    { id: "user-6", label: "Frank", warmth: 0.7, group: "Users", radius: 8 },
    ];
    
    
    export const exampleLinks: NetLink[] = [
    { source: "vendor", target: "partner-a", value: 2 },
    { source: "vendor", target: "partner-b", value: 1 },
    { source: "vendor", target: "partner-c", value: 1 },
    { source: "partner-a", target: "user-1", value: 3 },
    { source: "partner-a", target: "user-2", value: 2 },
    { source: "partner-b", target: "user-2", value: 1 },
    { source: "partner-b", target: "user-3", value: 2 },
    { source: "partner-b", target: "user-4", value: 1 },
    { source: "partner-c", target: "user-4", value: 2 },
    { source: "partner-c", target: "user-5", value: 1 },
    { source: "partner-c", target: "user-6", value: 2 },
    ];


export function DemoNetwork() {
    return(
      <div className="p-6">
        <NetworkMap nodes={exampleNodes} links={exampleLinks} width={1000} height={600} onNodeClick={(n)=>console.log('clicked', n)} />
      </div>
    )
  }

// If you'd like a small demo component that mounts this map with example data, copy this into a page:

/*
import NetworkMap, { exampleNodes, exampleLinks } from './NetworkMap';

export default function DemoPage() {
  return (
    <div className="p-6">
      <NetworkMap nodes={exampleNodes} links={exampleLinks} width={1000} height={600} onNodeClick={(n)=>console.log('clicked', n)} />
    </div>
  )
}
*/
