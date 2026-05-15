import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import { mockClient } from "@/lib/mock-client";
import type { GraphInstance, GraphOverviewStats } from "../../api/mock";

export function GraphDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation("knowledge-graph");
  const tab = (searchParams.get("tab") ?? "overview") as "overview" | "detail";

  const [graph, setGraph] = useState<GraphInstance | null>(null);
  const [stats, setStats] = useState<GraphOverviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    void Promise.all([
      mockClient.get<GraphInstance>(`/api/knowledge-graph/graphs/${id}/detail`),
      mockClient.get<GraphOverviewStats>(`/api/knowledge-graph/graphs/${id}/overview-stats`),
    ]).then(([g, s]) => { setGraph(g); setStats(s); }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSkeleton />;
  if (!graph) return <div className="page-shell text-muted-foreground">图实例未找到</div>;

  return (
    <div className="page-shell animate-fade-in">
      <div className="flex items-center gap-2 mb-5">
        <Link to="/knowledge-graph/graphs" className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          图实例列表
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-[12px] font-medium">{graph.name}</span>
      </div>

      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-[20px] font-semibold">{graph.name}</h1>
          <p className="mt-0.5 font-mono text-[12px] text-muted-foreground">{graph.host}:{graph.port}</p>
        </div>
        <StatusBadge status={graph.status} />
      </div>

      {/* Tabs */}
      <div className="flex gap-0 rounded border border-border bg-surface w-fit mb-6">
        {(["overview", "detail"] as const).map((t_) => (
          <button
            key={t_}
            type="button"
            onClick={() => setSearchParams({ tab: t_ })}
            className={cn(
              "px-5 py-2 text-[13px] transition-colors",
              tab === t_ ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t_ === "overview" ? t("graphs.detail.overview") : t("graphs.detail.detail")}
          </button>
        ))}
      </div>

      {tab === "overview" && stats && <OverviewTab stats={stats} />}
      {tab === "detail" && <DetailTab graph={graph} />}
    </div>
  );
}

function OverviewTab({ stats }: { graph?: GraphInstance; stats: GraphOverviewStats }) {
  const { t } = useTranslation("knowledge-graph");
  return (
    <div className="space-y-6">
      {/* Big metrics */}
      <div className="grid grid-cols-2 gap-px bg-border rounded border border-border overflow-hidden md:grid-cols-4">
        {[
          { label: t("graphs.stats.vertices"), value: stats.vertexCount.toLocaleString() },
          { label: t("graphs.stats.edges"),    value: stats.edgeCount.toLocaleString() },
          { label: "索引就绪",  value: `${stats.indexHealth.ready} / ${stats.indexHealth.ready + stats.indexHealth.building + stats.indexHealth.failed}` },
          { label: "索引构建中", value: String(stats.indexHealth.building) },
        ].map((item) => (
          <div key={item.label} className="bg-background px-5 py-4">
            <div className="eyebrow">{item.label}</div>
            <div className="mt-2 font-mono text-[22px] font-semibold tabular-nums">{item.value}</div>
          </div>
        ))}
      </div>

      {/* Label distribution */}
      <SectionCard title={t("graphs.stats.labels")}>
        <div className="space-y-2">
          {stats.vertexLabelDistribution.map((item) => {
            const pct = Math.round((item.count / stats.vertexCount) * 100);
            return (
              <div key={item.label}>
                <div className="mb-1 flex items-center justify-between text-[12px]">
                  <span className="font-medium">{item.label}</span>
                  <span className="font-mono text-muted-foreground">{item.count.toLocaleString()}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Recent tasks */}
        <SectionCard title={t("graphs.stats.recentTasks")}>
          <div className="space-y-2">
            {stats.recentTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between gap-3 text-[12px]">
                <span className="font-mono text-muted-foreground truncate">{task.id}</span>
                <span className="text-muted-foreground">{task.type}</span>
                <StatusBadge status={task.status} small />
              </div>
            ))}
            {stats.recentTasks.length === 0 && <p className="text-[12px] text-muted-foreground">暂无任务</p>}
          </div>
        </SectionCard>

        {/* Recent imports */}
        <SectionCard title={t("graphs.stats.recentImports")}>
          <div className="space-y-2">
            {stats.recentImports.map((imp) => (
              <div key={imp.id} className="flex items-center justify-between gap-3 text-[12px]">
                <span className="font-mono text-muted-foreground truncate">{imp.id}</span>
                <span className="text-muted-foreground">{imp.sourceKind}</span>
                <span className="font-mono">{imp.rows.toLocaleString()} 行</span>
              </div>
            ))}
            {stats.recentImports.length === 0 && <p className="text-[12px] text-muted-foreground">暂无导入记录</p>}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function DetailTab({ graph }: { graph: GraphInstance }) {
  return (
    <div className="space-y-4">
      <SectionCard title="图实例信息">
        <div className="grid grid-cols-2 gap-4 text-[13px] md:grid-cols-3">
          {[
            ["ID", graph.id],
            ["名称", graph.name],
            ["主机", graph.host],
            ["端口", String(graph.port)],
            ["状态", graph.status],
            ["创建时间", graph.createdAt],
            ["更新时间", graph.updatedAt],
          ].map(([k, v]) => (
            <div key={k}>
              <div className="eyebrow">{k}</div>
              <div className="mt-0.5 font-mono text-[12px]">{v}</div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded border border-border bg-card">
      <div className="border-b border-border px-5 py-3 text-[13px] font-medium">{title}</div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function StatusBadge({ status, small }: { status: string; small?: boolean }) {
  const cls =
    status === "healthy" || status === "success" || status === "ready" ? "badge-healthy" :
    status === "warning" || status === "running" || status === "building" ? "badge-warning" :
    "badge-offline";
  return (
    <span className={cn("rounded border px-2 py-0.5 font-mono uppercase", small ? "text-[10px]" : "text-[11px]", cls)}>
      {status}
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="page-shell">
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded border border-border bg-card" />
        ))}
      </div>
    </div>
  );
}
