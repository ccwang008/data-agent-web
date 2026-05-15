import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, Search, Server } from "lucide-react";

import { cn } from "@/lib/utils";
import { mockClient } from "@/lib/mock-client";
import { useKnowledgeGraphStore } from "../../store";
import type { GraphInstance } from "../../api/mock";

export function GraphsListPage() {
  const { t } = useTranslation("knowledge-graph");
  const navigate = useNavigate();
  const currentGraphId = useKnowledgeGraphStore((s) => s.currentGraphId);
  const setCurrentGraphId = useKnowledgeGraphStore((s) => s.setCurrentGraphId);

  const [graphs, setGraphs] = useState<GraphInstance[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    setLoading(true);
    void mockClient.get<GraphInstance[]>("/api/knowledge-graph/graphs/list")
      .then(setGraphs)
      .finally(() => setLoading(false));
  }, []);

  const filtered = graphs.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.host.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="page-shell animate-fade-in">
      <PageHeader
        title={t("graphs.title")}
        subtitle={t("graphs.subtitle")}
        action={
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex h-8 items-center gap-2 rounded border border-primary bg-primary px-3 text-[13px] font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("graphs.create")}
          </button>
        }
      />

      {/* Search */}
      <div className="mt-5 flex items-center gap-2 rounded border border-border bg-background px-3 py-1.5 text-sm">
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("graphs.search")}
          className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
        />
      </div>

      {/* Grid */}
      <div className="mt-5">
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded border border-border bg-card" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState label={t("graphs.empty")} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((g) => (
              <GraphCard
                key={g.id}
                graph={g}
                isActive={g.id === currentGraphId}
                onSelect={() => setCurrentGraphId(g.id)}
                onDetail={() => navigate(`/knowledge-graph/graphs/${g.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateGraphDialog
          onClose={() => setShowCreate(false)}
          onCreate={(g) => { setGraphs((prev) => [g, ...prev]); setCurrentGraphId(g.id); setShowCreate(false); }}
        />
      )}
    </div>
  );
}

function GraphCard({
  graph,
  isActive,
  onSelect,
  onDetail,
}: {
  graph: GraphInstance;
  isActive: boolean;
  onSelect: () => void;
  onDetail: () => void;
}) {
  const { t } = useTranslation("knowledge-graph");
  return (
    <article
      className={cn(
        "card-ticks rounded border bg-card p-5 transition-colors",
        isActive ? "border-primary" : "border-border hover:border-primary/40",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-[14px] text-foreground">{graph.name}</span>
        </div>
        <StatusBadge status={graph.status} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
        <KV label={t("graphs.card.host")} value={graph.host} />
        <KV label={t("graphs.card.port")} value={String(graph.port)} />
        <KV label={t("graphs.card.created")} value={graph.createdAt} />
        <KV label="ID" value={graph.id} />
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onSelect}
          className={cn(
            "flex h-7 flex-1 items-center justify-center rounded border text-[12px] transition-colors",
            isActive
              ? "border-primary bg-primary/10 text-primary font-medium"
              : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
          )}
        >
          {isActive ? "当前图实例" : "切换为当前"}
        </button>
        <button
          type="button"
          onClick={onDetail}
          className="flex h-7 items-center gap-1 rounded border border-border px-3 text-[12px] text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
        >
          详情 →
        </button>
      </div>
    </article>
  );
}

function CreateGraphDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (g: GraphInstance) => void;
}) {
  const { t } = useTranslation("knowledge-graph");
  const [name, setName] = useState("");
  const [host, setHost] = useState("localhost");
  const [port, setPort] = useState("8080");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "名称不能为空";
    if (!host.trim()) e.host = "主机不能为空";
    if (!port || isNaN(Number(port))) e.port = "端口需为数字";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const g = await mockClient.post<GraphInstance>("/api/knowledge-graph/graphs", { name: name.trim(), host: host.trim(), port: Number(port) });
      onCreate(g);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm">
      <div className="card-ticks w-full max-w-md rounded border border-border bg-background p-6 shadow-sm animate-fade-in">
        <h2 className="text-[15px] font-semibold">{t("graphs.create")}</h2>
        <div className="mt-5 space-y-4">
          <Field label={t("graphs.form.name")} error={errors.name}>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls(errors.name)} placeholder="供应链知识图谱" />
          </Field>
          <Field label={t("graphs.form.host")} error={errors.host}>
            <input value={host} onChange={(e) => setHost(e.target.value)} className={inputCls(errors.host)} placeholder="localhost" />
          </Field>
          <Field label={t("graphs.form.port")} error={errors.port}>
            <input value={port} onChange={(e) => setPort(e.target.value)} className={inputCls(errors.port)} placeholder="8080" />
          </Field>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-8 rounded border border-border px-4 text-[13px] text-muted-foreground hover:text-foreground transition-colors">取消</button>
          <button type="button" onClick={submit} disabled={submitting} className="h-8 rounded border border-primary bg-primary px-4 text-[13px] font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60">
            {submitting ? "创建中…" : "创建"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[12px] font-medium text-foreground">{label}</label>
      {children}
      {error && <p className="mt-1 text-[11px] text-destructive">{error}</p>}
    </div>
  );
}

function inputCls(error?: string) {
  return cn(
    "h-8 w-full rounded border bg-background px-3 text-[13px] outline-none transition-colors focus:border-primary",
    error ? "border-destructive" : "border-border",
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "healthy" ? "badge-healthy" :
    status === "warning" ? "badge-warning" :
    "badge-offline";
  return (
    <span className={cn("rounded border px-2 py-0.5 font-mono text-[10px] uppercase", cls)}>
      {status}
    </span>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="eyebrow">{label}</div>
      <div className="mt-0.5 truncate font-mono text-[12px]">{value}</div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="grid min-h-[200px] place-items-center rounded border border-dashed border-border text-center text-[13px] text-muted-foreground">
      {label}
    </div>
  );
}

function PageHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) {
  return (
    <header className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-[20px] font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">{subtitle}</p>
      </div>
      {action}
    </header>
  );
}
