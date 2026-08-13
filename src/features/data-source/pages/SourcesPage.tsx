import { useMemo, useState } from "react";
import {
  Activity, AlertTriangle, CheckCircle2, Database, Eye, Gauge,
  Loader2, Pencil, Play, Plus, Search, SlidersHorizontal, Trash2, X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Field, Modal, Select } from "@/features/data-asset/components/common";

import { useSources } from "../store";
import {
  SOURCE_CATEGORY_LABEL, SOURCE_SUBTYPE_LABEL, SOURCE_STATUS_LABEL,
  type SourceCategory, type SourceSubtype, type SourceStatus,
  type DataSource, type SourceConfig,
} from "../api/types";

const CATEGORY_SUBTYPES: Record<SourceCategory, SourceSubtype[]> = {
  database: ["postgresql", "mysql", "oracle", "sqlserver", "dameng"],
  file: ["csv", "excel", "json", "parquet", "sftp"],
  message: ["kafka", "rocketmq", "pulsar"],
  api: ["rest", "grpc", "soap"],
  "object-store": ["s3", "minio", "oss"],
};

const STATUS_TONE: Record<SourceStatus, string> = {
  available: "border-emerald-200 bg-emerald-50 text-emerald-700",
  testing: "border-blue-200 bg-blue-50 text-blue-700",
  degraded: "border-amber-200 bg-amber-50 text-amber-700",
  abnormal: "border-red-200 bg-red-50 text-red-700",
  offline: "border-slate-200 bg-slate-100 text-slate-600",
};

export function SourcesPage() {
  const [sources, setSources] = useSources();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<SourceCategory | "all">("all");
  const [status, setStatus] = useState<SourceStatus | "all">("all");
  const [selected, setSelected] = useState<DataSource | null>(null);
  const [editing, setEditing] = useState<DataSource | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sources.filter((s) => {
      if (category !== "all" && s.category !== category) return false;
      if (status !== "all" && s.status !== status) return false;
      if (q && !(
        s.name.toLowerCase().includes(q) ||
        s.subtype.toLowerCase().includes(q) ||
        s.owner.toLowerCase().includes(q) ||
        (s.description ?? "").toLowerCase().includes(q)
      )) return false;
      return true;
    });
  }, [sources, category, status, query]);

  const kpis = [
    { label: "数据源总数", value: sources.length, icon: Database, hint: "已登记连接" },
    { label: "可用", value: sources.filter((s) => s.status === "available").length, icon: CheckCircle2, hint: "连接正常" },
    { label: "异常/离线", value: sources.filter((s) => s.status === "abnormal" || s.status === "offline").length, icon: AlertTriangle, hint: "需关注" },
    { label: "平均延迟", value: Math.round(avgLatency(sources)) + "ms", icon: Gauge, hint: "排除离线" },
  ];

  function runTest(src: DataSource) {
    setSources((cur) => cur.map((s) => s.id === src.id ? { ...s, status: "testing", lastTestAt: "刚刚", latencyMs: undefined } : s));
    window.setTimeout(() => {
      const r = Math.random();
      setSources((cur) => cur.map((s) => {
        if (s.id !== src.id) return s;
        if (r < 0.15) return { ...s, status: "abnormal", latencyMs: undefined, updatedAt: "刚刚" };
        if (r < 0.25) return { ...s, status: "degraded", latencyMs: 120 + Math.floor(Math.random() * 200), updatedAt: "刚刚" };
        return { ...s, status: "available", latencyMs: 8 + Math.floor(Math.random() * 40), updatedAt: "刚刚" };
      }));
    }, 1400);
  }

  function remove(src: DataSource) {
    if (!window.confirm(`确认删除数据源"${src.name}"？关联的同步任务将失去源端。`)) return;
    setSources((cur) => cur.filter((s) => s.id !== src.id));
  }

  return (
    <div className="h-full overflow-y-auto bg-background p-5">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4">
        <Header onCreate={() => setEditing(newDataSource())} />

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((k) => <Kpi key={k.label} {...k} />)}
        </section>

        <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
            <Search className="ml-1 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索名称、类型、负责人或描述"
              className="h-8 min-w-[240px] flex-1 rounded-md border border-input bg-background px-2 text-[12px] outline-none focus:border-primary"
            />
            <div className="flex items-center gap-1">
              <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
              <Select value={category} onChange={(v) => setCategory(v as SourceCategory | "all")} options={[
                { value: "all", label: "全部类型" },
                { value: "database", label: "数据库" },
                { value: "file", label: "文件源" },
                { value: "message", label: "消息队列" },
                { value: "api", label: "API" },
                { value: "object-store", label: "对象存储" },
              ]} className="w-36" />
              <Select value={status} onChange={(v) => setStatus(v as SourceStatus | "all")} options={[
                { value: "all", label: "全部状态" },
                { value: "available", label: "可用" },
                { value: "testing", label: "测试中" },
                { value: "degraded", label: "性能降级" },
                { value: "abnormal", label: "异常" },
                { value: "offline", label: "离线" },
              ]} className="w-32" />
            </div>
            <span className="ml-auto text-[11px] text-muted-foreground">{filtered.length} 条</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-[12px]">
              <thead className="bg-muted/60 text-[11px] font-medium text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5">数据源</th>
                  <th className="px-3 py-2.5">类型</th>
                  <th className="px-3 py-2.5">脱敏连接信息</th>
                  <th className="px-3 py-2.5">延迟</th>
                  <th className="px-3 py-2.5">表/主题数</th>
                  <th className="px-3 py-2.5">状态</th>
                  <th className="px-3 py-2.5">负责人</th>
                  <th className="px-3 py-2.5">最近检测</th>
                  <th className="px-4 py-2.5 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-14 text-center text-muted-foreground">无匹配数据源</td></tr>
                )}
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/35">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{s.name}</div>
                      {s.tags && s.tags.length > 0 && (
                        <div className="mt-0.5 flex flex-wrap gap-1">
                          {s.tags.map((t) => (
                            <span key={t} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{t}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      <div>{SOURCE_CATEGORY_LABEL[s.category]}</div>
                      <div className="text-[11px] text-muted-foreground/80">{SOURCE_SUBTYPE_LABEL[s.subtype]}</div>
                    </td>
                    <td className="px-3 py-3 font-mono text-[11px] text-muted-foreground">{s.endpoint}</td>
                    <td className="px-3 py-3 tabular-nums text-muted-foreground">
                      {s.status === "offline" ? "—" : (s.latencyMs ?? "—") + " ms"}
                    </td>
                    <td className="px-3 py-3 tabular-nums text-muted-foreground">{s.tableCount ?? "—"}</td>
                    <td className="px-3 py-3">
                      <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium", STATUS_TONE[s.status])}>
                        {SOURCE_STATUS_LABEL[s.status]}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{s.owner}</td>
                    <td className="px-3 py-3 text-muted-foreground">{s.lastTestAt}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => runTest(s)} disabled={s.status === "testing"}
                          className="inline-flex h-7 items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 text-[11px] font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50">
                          {s.status === "testing" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                          连接测试
                        </button>
                        <button onClick={() => setSelected(s)} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-primary" aria-label="详情">
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setEditing(s)} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-primary" aria-label="编辑">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => remove(s)} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-600" aria-label="删除">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {selected && <SourceDetailDrawer source={selected} onClose={() => setSelected(null)} onTest={runTest} />}
      {editing && <SourceEditModal source={editing} onChange={setEditing} onSave={(s) => {
        setSources((cur) => {
          const idx = cur.findIndex((x) => x.id === s.id);
          if (idx >= 0) { const c = [...cur]; c[idx] = s; return c; }
          return [{ ...s, updatedAt: "刚刚" }, ...cur];
        });
        setEditing(null);
      }} onCancel={() => setEditing(null)} />}
    </div>
  );
}

// ------------------ Helpers ------------------

function avgLatency(sources: DataSource[]) {
  const vals = sources.filter((s) => s.latencyMs != null).map((s) => s.latencyMs!);
  if (!vals.length) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function newDataSource(): DataSource {
  const now = new Date().toLocaleString("zh-CN", { hour12: false });
  return {
    id: "src-new-" + Date.now(),
    name: "新建数据源",
    category: "database",
    subtype: "postgresql",
    status: "testing",
    endpoint: "",
    owner: "平台团队",
    config: {},
    lastTestAt: now,
    description: "",
    tags: [],
    updatedAt: now,
  };
}

// ------------------ Header ------------------

function Header({ onCreate }: { onCreate: () => void }) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-card px-5 py-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-[17px] font-semibold text-foreground">数据源管理</h1>
        <p className="mt-1 text-[12px] text-muted-foreground">
          统一登记数据库、文件、消息队列、API 和对象存储数据源。连接信息仅展示脱敏 mock 值；密码、密钥、完整连接串不在此页面明文保存。
        </p>
      </div>
      <button onClick={onCreate} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-[12px] font-medium text-primary-foreground hover:opacity-90">
        <Plus className="h-3.5 w-3.5" /> 新增数据源
      </button>
    </section>
  );
}

// ------------------ KPI ------------------

function Kpi({ label, value, hint, icon: Icon }: { label: string; value: string | number; hint: string; icon: typeof Database }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-muted-foreground">{label}</span>
        <span className="grid h-7 w-7 place-items-center rounded-md bg-primary/10 text-primary"><Icon className="h-3.5 w-3.5" /></span>
      </div>
      <div className="mt-2 text-[22px] font-semibold tabular-nums text-foreground">{value}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>
    </div>
  );
}

// ------------------ Detail Drawer ------------------

function SourceDetailDrawer({ source, onClose, onTest }: { source: DataSource; onClose: () => void; onTest: (s: DataSource) => void }) {
  return (
    <div className="fixed inset-0 z-40 bg-slate-900/20" onClick={onClose}>
      <aside className="absolute right-0 top-0 flex h-full w-[560px] flex-col border-l border-border bg-card shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-foreground">{source.name}</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {SOURCE_CATEGORY_LABEL[source.category]} · {SOURCE_SUBTYPE_LABEL[source.subtype]} · {SOURCE_STATUS_LABEL[source.status]}
            </p>
          </div>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 text-[12px]">
          <DetailSection title="连接概览">
            <KV label="脱敏连接" value={source.endpoint || "未填写"} mono />
            <KV label="延迟" value={source.status === "offline" ? "离线" : (source.latencyMs != null ? `${source.latencyMs} ms` : "—")} />
            <KV label="表/主题数" value={source.tableCount != null ? String(source.tableCount) : "—"} />
            <KV label="最近检测" value={source.lastTestAt} />
            <KV label="负责人" value={source.owner} />
          </DetailSection>

          <DetailSection title="连接配置（脱敏展示）">
            {Object.entries(source.config).map(([k, v]) => (
              <KV key={k} label={k} value={String(v ?? "")} mono />
            ))}
          </DetailSection>

          <DetailSection title="描述">
            <p className="text-muted-foreground">{source.description || "（无描述）"}</p>
          </DetailSection>

          {source.tags && source.tags.length > 0 && (
            <DetailSection title="标签">
              <div className="flex flex-wrap gap-1.5">
                {source.tags.map((t) => <span key={t} className="rounded bg-muted px-2 py-0.5 text-[11px]">{t}</span>)}
              </div>
            </DetailSection>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button onClick={() => onTest(source)} disabled={source.status === "testing"}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 text-[12px] font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50">
            <Activity className="h-3.5 w-3.5" /> 再次连接测试
          </button>
          <button onClick={onClose} className="h-8 rounded-md border border-input px-3 text-[12px] font-medium">关闭</button>
        </div>
      </aside>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="mb-2 border-b border-border/70 pb-1 text-[12px] font-semibold text-foreground">{title}</h3>
      <div className="grid gap-1.5">{children}</div>
    </div>
  );
}

function KV({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-3">
      <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
      <span className={cn("flex-1 text-foreground", mono && "font-mono text-[11px]")}>{value || "—"}</span>
    </div>
  );
}

// ------------------ Edit Modal ------------------

function SourceEditModal({
  source, onChange, onSave, onCancel,
}: {
  source: DataSource;
  onChange: (s: DataSource) => void;
  onSave: (s: DataSource) => void;
  onCancel: () => void;
}) {
  const editing = source;
  const isNew = source.id.startsWith("src-new-");

  function update<K extends keyof DataSource>(key: K, v: DataSource[K]) {
    onChange({ ...editing, [key]: v });
  }
  function updateConfig(key: string, v: unknown) {
    onChange({ ...editing, config: { ...editing.config, [key]: v } });
  }

  const subtypes = CATEGORY_SUBTYPES[editing.category];

  return (
    <Modal
      title={isNew ? "新增数据源" : "编辑数据源"}
      description="密码、密钥、完整连接串不在此处明文保存，仅填写脱敏连接信息。"
      onClose={onCancel}
      footer={
        <>
          <button onClick={onCancel} className="h-8 rounded-md border border-input px-3 text-[12px] font-medium">取消</button>
          <button
            disabled={!editing.name || !editing.endpoint}
            onClick={() => onSave({ ...editing, updatedAt: "刚刚" })}
            className="h-8 rounded-md bg-primary px-3 text-[12px] font-medium text-primary-foreground disabled:opacity-50">
            保存
          </button>
        </>
      }
    >
      <div className="space-y-5 text-[12px]">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="数据源名称" required>
            <input value={editing.name} onChange={(e) => update("name", e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-[12px] outline-none focus:border-primary" />
          </Field>
          <Field label="负责人">
            <input value={editing.owner} onChange={(e) => update("owner", e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-[12px] outline-none focus:border-primary" />
          </Field>
          <Field label="数据源类型" required>
            <Select value={editing.category} onChange={(v) => update("category", v as SourceCategory)} options={Object.entries(SOURCE_CATEGORY_LABEL).map(([v, l]) => ({ value: v, label: l }))} />
          </Field>
          <Field label="子类型" required>
            <Select value={editing.subtype} onChange={(v) => update("subtype", v as SourceSubtype)} options={subtypes.map((s) => ({ value: s, label: SOURCE_SUBTYPE_LABEL[s] }))} />
          </Field>
        </div>

        <div className="rounded-md border border-dashed border-border bg-muted/20 p-4">
          <h3 className="mb-3 text-[12px] font-semibold">连接配置（脱敏）</h3>
          <ConnectionForm category={editing.category} config={editing.config} onChange={updateConfig} />
        </div>

        <Field label="脱敏连接信息">
          <input value={editing.endpoint} onChange={(e) => update("endpoint", e.target.value)}
            placeholder="如：10.24.*.*:5432 / core"
            className="h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-[11px] outline-none focus:border-primary" />
        </Field>

        <Field label="描述">
          <textarea value={editing.description ?? ""} onChange={(e) => update("description", e.target.value)} rows={2}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-[12px] outline-none focus:border-primary" />
        </Field>

        <Field label="标签（逗号分隔）">
          <input value={editing.tags?.join(", ") ?? ""} onChange={(e) => update("tags", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-[12px] outline-none focus:border-primary" />
        </Field>
      </div>
    </Modal>
  );
}

function ConnectionForm({ category, config, onChange }: {
  category: SourceCategory; config: SourceConfig; onChange: (k: string, v: unknown) => void;
}) {
  if (category === "database") return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="主机">
        <input value={config.host ?? ""} onChange={(e) => onChange("host", e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-[11px] outline-none focus:border-primary" placeholder="10.24.*.*" />
      </Field>
      <Field label="端口">
        <input type="number" value={config.port ?? ""} onChange={(e) => onChange("port", e.target.value ? Number(e.target.value) : undefined)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-[12px] outline-none focus:border-primary" />
      </Field>
      <Field label="数据库">
        <input value={config.database ?? ""} onChange={(e) => onChange("database", e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-[12px] outline-none focus:border-primary" />
      </Field>
      <Field label="Schema">
        <input value={config.schema ?? ""} onChange={(e) => onChange("schema", e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-[12px] outline-none focus:border-primary" />
      </Field>
      <Field label="认证方式">
        <Select value={config.authType ?? "basic"} onChange={(v) => onChange("authType", v)} options={[
          { value: "basic", label: "用户名密码" }, { value: "kerberos", label: "Kerberos" }, { value: "aksk", label: "AK/SK" }, { value: "none", label: "无" },
        ]} />
      </Field>
      <Field label="SSL">
        <label className="flex h-9 items-center gap-2 text-[12px]">
          <input type="checkbox" checked={!!config.ssl} onChange={(e) => onChange("ssl", e.target.checked)} /> 启用 SSL 加密
        </label>
      </Field>
    </div>
  );
  if (category === "message") return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Broker">
        <input value={config.host ?? ""} onChange={(e) => onChange("host", e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-[11px] outline-none focus:border-primary" placeholder="broker-***" />
      </Field>
      <Field label="端口">
        <input type="number" value={config.port ?? ""} onChange={(e) => onChange("port", e.target.value ? Number(e.target.value) : undefined)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-[12px] outline-none focus:border-primary" />
      </Field>
      <Field label="Topic">
        <input value={config.topic ?? ""} onChange={(e) => onChange("topic", e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-[11px] outline-none focus:border-primary" />
      </Field>
      <Field label="消费组">
        <input value={config.group ?? ""} onChange={(e) => onChange("group", e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-[12px] outline-none focus:border-primary" />
      </Field>
    </div>
  );
  if (category === "api") return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Base URL">
        <input value={config.baseUrl ?? ""} onChange={(e) => onChange("baseUrl", e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-[11px] outline-none focus:border-primary" placeholder="https://..." />
      </Field>
      <Field label="认证方式">
        <Select value={config.authType ?? "bearer"} onChange={(v) => onChange("authType", v)} options={[
          { value: "bearer", label: "Bearer Token" }, { value: "basic", label: "Basic" }, { value: "api-key", label: "API Key" }, { value: "none", label: "无" },
        ]} />
      </Field>
    </div>
  );
  if (category === "object-store") return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Bucket">
        <input value={config.bucket ?? ""} onChange={(e) => onChange("bucket", e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-[11px] outline-none focus:border-primary" />
      </Field>
      <Field label="Path / Prefix">
        <input value={config.path ?? ""} onChange={(e) => onChange("path", e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-[11px] outline-none focus:border-primary" />
      </Field>
      <Field label="认证方式">
        <Select value={config.authType ?? "aksk"} onChange={(v) => onChange("authType", v)} options={[
          { value: "aksk", label: "AK/SK" }, { value: "none", label: "公共读" },
        ]} />
      </Field>
    </div>
  );
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="主机">
        <input value={config.host ?? ""} onChange={(e) => onChange("host", e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-[11px] outline-none focus:border-primary" />
      </Field>
      <Field label="路径">
        <input value={config.path ?? ""} onChange={(e) => onChange("path", e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-[11px] outline-none focus:border-primary" />
      </Field>
    </div>
  );
}
