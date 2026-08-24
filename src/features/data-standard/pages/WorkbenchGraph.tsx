import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Minus, RotateCcw, Search } from "lucide-react";

import type { OntologyEntity, OntologyRelation, OntologySchema } from "../types";

const SCHEMA_COLORS: Record<string, string> = {
  AIModel: "#3b82f6", FoundationModel: "#60a5fa", LargeLanguageModel: "#93c5fd",
  Dataset: "#10b981", DatasetSplit: "#6ee7b7", ModelTask: "#f59e0b",
  TrainingRun: "#fbbf24", EvaluationMetric: "#fb923c",
  Customer: "#10b981", Member: "#34d399",
  Order: "#f59e0b", Contract: "#fbbf24",
  Product: "#8b5cf6", SKU: "#a78bfa",
  Amount: "#ef4444", Cost: "#f87171",
  Department: "#06b6d4", Employee: "#22d3ee",
  Entity: "#6b7280",
};

interface Node {
  id: string;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  schemaCode: string;
}

interface Edge {
  source: string;
  target: string;
  label: string;
}

export function ForceGraph({
  entities, schemas, relations, domainFilter,
}: {
  entities: OntologyEntity[];
  schemas: OntologySchema[];
  relations: OntologyRelation[];
  domainFilter: string;
}) {
  const [search, setSearch] = useState("");
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  const [, setRenderTick] = useState(0);
  const draggingRef = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const animRef = useRef<number>(0);

  const filteredEntities = entities.filter(
    (e) => !domainFilter || e.domainCode === domainFilter,
  );
  const filteredRelations = relations.filter(
    (r) => !domainFilter || r.domainCode === domainFilter,
  );

  const schemaColorOf = useCallback((schemaCode: string) => {
    return SCHEMA_COLORS[schemaCode] || "#94a3b8";
  }, []);

  // Build nodes and edges
  useEffect(() => {
    const nodeMap = new Map<string, Node>();
    filteredEntities.forEach((e, i) => {
      const angle = (i / Math.max(filteredEntities.length, 1)) * Math.PI * 2;
      const r = 180;
      nodeMap.set(e.name, {
        id: e.name,
        name: e.name,
        x: Math.cos(angle) * r + 400,
        y: Math.sin(angle) * r + 250,
        vx: 0, vy: 0,
        color: schemaColorOf(e.schemaCode),
        schemaCode: e.schemaCode,
      });
    });
    nodesRef.current = Array.from(nodeMap.values());

    edgesRef.current = filteredRelations
      .filter((r) => nodeMap.has(r.subject) && nodeMap.has(r.object))
      .map((r) => ({ source: r.subject, target: r.object, label: r.predicate }));
  }, [filteredEntities, filteredRelations, schemaColorOf]);

  // Physics simulation
  useEffect(() => {
    const width = 800, height = 500;
    const cx = width / 2, cy = height / 2;

    let running = true;
    const tick = () => {
      if (!running) return;
      const nodes = nodesRef.current;
      const edges = edgesRef.current;

      for (const n of nodes) {
        n.vx = 0; n.vy = 0;
      }

      // Repulsion
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 8000 / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx += fx; a.vy += fy;
          b.vx -= fx; b.vy -= fy;
        }
      }

      // Attraction (edges)
      for (const e of edges) {
        const a = nodes.find((n) => n.id === e.source);
        const b = nodes.find((n) => n.id === e.target);
        if (!a || !b) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - 120) * 0.05;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx += fx; a.vy += fy;
        b.vx -= fx; b.vy -= fy;
      }

      // Center gravity
      for (const n of nodes) {
        n.vx += (cx - n.x) * 0.002;
        n.vy += (cy - n.y) * 0.002;
      }

      // Apply velocities with damping
      for (const n of nodes) {
        if (draggingRef.current && draggingRef.current.id === n.id) continue;
        n.vx *= 0.85;
        n.vy *= 0.85;
        n.x += n.vx;
        n.y += n.vy;
        n.x = Math.max(30, Math.min(width - 30, n.x));
        n.y = Math.max(30, Math.min(height - 30, n.y));
      }

      setRenderTick((t) => t + 1);
      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [filteredEntities.length, filteredRelations.length]);

  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const svg = svgRef.current;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const svgP = pt.matrixTransform(ctm.inverse());
    const node = nodesRef.current.find((n) => n.id === nodeId);
    if (node) {
      draggingRef.current = { id: nodeId, dx: svgP.x - node.x, dy: svgP.y - node.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingRef.current) return;
    const svg = svgRef.current;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const svgP = pt.matrixTransform(ctm.inverse());
    const drag = draggingRef.current;
    const node = nodesRef.current.find((n) => n.id === drag.id);
    if (node) {
      node.x = svgP.x - drag.dx;
      node.y = svgP.y - drag.dy;
    }
  };

  const handleMouseUp = () => { draggingRef.current = null; };

  const reset = () => { setZoom(1); setOffset({ x: 0, y: 0 }); };

  const matchedNodeIds = search
    ? new Set(filteredEntities.filter((e) => e.name.toLowerCase().includes(search.toLowerCase())).map((e) => e.name))
    : new Set<string>();

  // Group schemas by domain for legend
  const schemaGroups = schemas.reduce<Record<string, OntologySchema[]>>((acc, s) => {
    const d = filteredEntities.some((e) => e.schemaCode === s.code) ? s.domainCode : null;
    if (d) { (acc[d] ||= []).push(s); }
    return acc;
  }, {});

  return (
    <div className="relative">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <label className="flex h-7 items-center gap-1.5 rounded-md border border-input bg-card px-2">
          <Search className="h-3 w-3 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索节点..." className="w-32 bg-transparent text-[11px] outline-none" />
        </label>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => setZoom((z) => Math.min(3, z + 0.2))} className="rounded border border-input p-1.5 hover:bg-muted"><Plus className="h-3.5 w-3.5" /></button>
          <button onClick={() => setZoom((z) => Math.max(0.3, z - 0.2))} className="rounded border border-input p-1.5 hover:bg-muted"><Minus className="h-3.5 w-3.5" /></button>
          <button onClick={reset} className="rounded border border-input p-1.5 hover:bg-muted"><RotateCcw className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox="0 0 800 500"
        className="h-[480px] w-full"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
          </marker>
        </defs>
        <g transform={`translate(${offset.x},${offset.y}) scale(${zoom})`}>
          {/* Edges */}
          {edgesRef.current.map((e, i) => {
            const s = nodesRef.current.find((n) => n.id === e.source);
            const t = nodesRef.current.find((n) => n.id === e.target);
            if (!s || !t) return null;
            const mx = (s.x + t.x) / 2;
            const my = (s.y + t.y) / 2;
            return (
              <g key={`e-${i}`}>
                <line x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke="#cbd5e1" strokeWidth={1} markerEnd="url(#arrow)" />
                <text x={mx} y={my - 4} textAnchor="middle" className="fill-slate-500" style={{ fontSize: 9 }}>{e.label}</text>
              </g>
            );
          })}
          {/* Nodes */}
          {nodesRef.current.map((n) => {
            const matched = matchedNodeIds.size === 0 || matchedNodeIds.has(n.id);
            return (
              <g key={n.id} transform={`translate(${n.x},${n.y})`} style={{ cursor: "grab" }}
                onMouseDown={(e) => handleMouseDown(e, n.id)}>
                <circle r={22} fill={n.color} opacity={matched ? 0.85 : 0.25} stroke={matched ? "#1e293b" : "transparent"} strokeWidth={matched ? 2 : 0} />
                <text y={4} textAnchor="middle" style={{ fontSize: 9, fontWeight: 600 }} fill={matched ? "white" : "#64748b"}>{n.name}</text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Legend */}
      <div className="absolute right-3 top-3 max-w-[200px] rounded-md border border-slate-200 bg-white/90 px-3 py-2 text-[10px] backdrop-blur">
        <div className="mb-1 font-semibold text-slate-600">图例</div>
        <div className="space-y-1">
          {Object.entries(schemaGroups).flatMap(([domainCode, schemas]) => {
            const domainName = { ai: "AI", customer: "客户", transaction: "交易", product: "产品", finance: "财务", organization: "组织", core: "通用" }[domainCode] || domainCode;
            return schemas.map((s) => (
              <div key={s.code} className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: schemaColorOf(s.code) }} />
                <span className="font-mono text-slate-600">{s.code}</span>
                <span className="text-slate-400">({domainName})</span>
              </div>
            ));
          })}
        </div>
      </div>

      <div className="absolute bottom-3 left-3 text-[10px] text-muted-foreground">
        拖拽节点调整布局 · 滚轮缩放 · 搜索高亮匹配节点
      </div>
    </div>
  );
}
