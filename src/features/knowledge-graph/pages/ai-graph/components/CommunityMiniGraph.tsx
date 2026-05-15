import { computeCommunityLayout } from "../utils/mockClustering";
import type { Community, ExtractedVertex, ExtractedEdge } from "@/features/knowledge-graph/api/mock";

interface Props {
  community: Community;
  vertices: ExtractedVertex[];
  edges: ExtractedEdge[];
  size?: number;
}

const LABEL_COLOR: Record<string, string> = {
  Person:  "#2849D8",
  Company: "#059669",
  Product: "#d97706",
  Fund:    "#7c3aed",
};

export function CommunityMiniGraph({ community, vertices, edges, size = 240 }: Props) {
  const layout = computeCommunityLayout(community, vertices, edges, size);
  if (layout.positions.length === 0) {
    return (
      <div className="rounded border border-dashed border-border bg-card flex items-center justify-center" style={{ height: size }}>
        <span className="text-[11px] text-muted-foreground">空社区</span>
      </div>
    );
  }
  const posMap = new Map(layout.positions.map(p => [p.vertex.id, p]));
  return (
    <svg width={layout.width} height={layout.height} viewBox={`0 0 ${layout.width} ${layout.height}`}
      className="rounded border border-border bg-card">
      {/* Edges */}
      {layout.internalEdges.map((e) => {
        const a = posMap.get(e.sourceVertexId), b = posMap.get(e.targetVertexId);
        if (!a || !b) return null;
        return (
          <line key={e.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            stroke="#2849D8" strokeOpacity={0.35} strokeWidth={1} />
        );
      })}
      {/* Nodes */}
      {layout.positions.map((p) => (
        <g key={p.vertex.id} transform={`translate(${p.x},${p.y})`}>
          <circle r={p.isCentral ? 11 : 7} fill={LABEL_COLOR[p.vertex.label] ?? "#64748b"} fillOpacity={0.85} />
          {p.isCentral && (
            <polygon points="0,-5 1.5,-1.5 5,-1.5 2.2,1 3.2,5 0,2.6 -3.2,5 -2.2,1 -5,-1.5 -1.5,-1.5" fill="white" />
          )}
          <text x={0} y={p.isCentral ? 22 : 18} textAnchor="middle" fontSize={9.5} fill="#334155">
            {p.vertex.name.length > 6 ? p.vertex.name.slice(0, 6) + "…" : p.vertex.name}
          </text>
        </g>
      ))}
    </svg>
  );
}
