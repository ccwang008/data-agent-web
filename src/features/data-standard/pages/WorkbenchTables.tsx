import { useState } from "react";
import { Activity, BarChart3, Boxes, Database, Edit3, GitBranch, Plus, RefreshCw, Search, Sparkles, Trash2, X } from "lucide-react";

import { ActionButton, MiniStat, Panel, Pill } from "@/components/data-platform/WorkspacePrimitives";
import { cn } from "@/lib/utils";

import { formatNow, makeId } from "../state";
import type {
  DomainMetric, DomainMetricType, OntologyDomain, OntologyEntity,
  OntologyRelation, OntologySchema,
} from "../types";

const ENTITY_CONFIDENCE_TONE = (c: number) =>
  c >= 95 ? "green" : c >= 85 ? "amber" : "red";

const METRIC_TYPE_TONE: Record<DomainMetricType, string> = {
  计数: "blue", 平均值: "violet", 比率: "amber", 求和: "green",
};

// ---------- Schema Tab ----------
export function SchemaTab({
  schemas, domains, entities, onAdd, onEdit, onDelete, onGenerate,
}: {
  schemas: OntologySchema[];
  domains: { code: string; name: string }[];
  entities: OntologyEntity[];
  onAdd: () => void;
  onEdit: (s: OntologySchema) => void;
  onDelete: (id: string) => void;
  onGenerate: () => void;
}) {
  const [query, setQuery] = useState("");
  const [domainFilter, setDomainFilter] = useState("");

  const filtered = schemas.filter((s) => {
    const q = query.toLowerCase();
    const matchQ = !q || `${s.code} ${s.name} ${s.description}`.toLowerCase().includes(q);
    const matchD = !domainFilter || s.domainCode === domainFilter;
    return matchQ && matchD;
  });

  const domainOf = (code: string) => domains.find((d) => d.code === code)?.name ?? code;
  const parentOf = (id: string) => schemas.find((s) => s.id === id);

  return (
    <div>
      <TableToolbar
        search={query}
        onSearch={setQuery}
        domainFilter={domainFilter}
        onDomainFilter={setDomainFilter}
        domains={domains}
        right={<>
          <ActionButton icon={Sparkles} onClick={onGenerate}>Schema 生成</ActionButton>
          <ActionButton icon={Plus} primary onClick={onAdd}>新建类</ActionButton>
        </>}
      />
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="px-4 py-2 font-medium">类名</th>
              <th className="px-4 py-2 font-medium">中文名</th>
              <th className="px-4 py-2 font-medium">域</th>
              <th className="px-4 py-2 font-medium">描述</th>
              <th className="px-4 py-2 font-medium">父类</th>
              <th className="px-4 py-2 font-medium">实体数</th>
              <th className="px-4 py-2 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => {
              const p = s.parentSchemaId ? parentOf(s.parentSchemaId) : null;
              const entityCount = entities.filter((e) => e.schemaCode === s.code).length;
              return (
                <tr key={s.id} className="border-b border-border hover:bg-muted/20">
                  <td className="px-4 py-2.5 font-mono font-semibold text-foreground">{s.code}</td>
                  <td className="px-4 py-2.5 text-foreground">{s.name}</td>
                  <td className="px-4 py-2.5"><Pill tone="blue" size="sm">{domainOf(s.domainCode)}</Pill></td>
                  <td className="max-w-[200px] truncate px-4 py-2.5 text-muted-foreground">{s.description}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{p ? p.name : "-"}</td>
                  <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{entityCount}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1">
                      <button onClick={() => onEdit(s)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><Edit3 className="h-3.5 w-3.5" /></button>
                      <button onClick={() => onDelete(s.id)} className="rounded p-1 text-red-500 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">暂无数据</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- Entity Tab ----------
export function EntityTab({
  entities, schemas, domains, onAdd, onEdit, onDelete, onConfirm,
}: {
  entities: OntologyEntity[];
  schemas: OntologySchema[];
  domains: { code: string; name: string }[];
  onAdd: () => void;
  onEdit: (e: OntologyEntity) => void;
  onDelete: (id: string) => void;
  onConfirm: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [domainFilter, setDomainFilter] = useState("");
  const [schemaFilter, setSchemaFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = entities.filter((e) => {
    const q = query.toLowerCase();
    const matchQ = !q || `${e.name} ${e.schemaCode}`.toLowerCase().includes(q);
    const matchD = !domainFilter || e.domainCode === domainFilter;
    const matchS = !schemaFilter || e.schemaCode === schemaFilter;
    return matchQ && matchD && matchS;
  });

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const handleBatchConfirm = () => {
    if (selected.size > 0) {
      onConfirm(Array.from(selected));
      setSelected(new Set());
    }
  };

  return (
    <div>
      <TableToolbar
        search={query}
        onSearch={setQuery}
        domainFilter={domainFilter}
        onDomainFilter={setDomainFilter}
        domains={domains}
        schemaFilter={schemaFilter}
        onSchemaFilter={setSchemaFilter}
        schemas={schemas}
        right={<>
          <ActionButton icon={RefreshCw} onClick={handleBatchConfirm} disabled={selected.size === 0}>批量确认 {selected.size > 0 ? `(${selected.size})` : ""}</ActionButton>
          <ActionButton icon={Plus} primary onClick={onAdd}>新建实体</ActionButton>
        </>}
      />
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="w-8 px-3 py-2"><input type="checkbox" className="rounded" onChange={(e) => {
                setSelected(e.target.checked ? new Set(filtered.map((f) => f.id)) : new Set());
              }} /></th>
              <th className="px-4 py-2 font-medium">名称</th>
              <th className="px-4 py-2 font-medium">所属类</th>
              <th className="px-4 py-2 font-medium">置信度</th>
              <th className="px-4 py-2 font-medium">状态</th>
              <th className="px-4 py-2 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.id} className="border-b border-border hover:bg-muted/20">
                <td className="px-3 py-2.5">
                  <input type="checkbox" checked={selected.has(e.id)} onChange={() => toggleSelect(e.id)} className="rounded" />
                </td>
                <td className="px-4 py-2.5 font-medium text-foreground">{e.name}</td>
                <td className="px-4 py-2.5 font-mono text-muted-foreground">{e.schemaCode}</td>
                <td className="px-4 py-2.5">
                  <Pill tone={ENTITY_CONFIDENCE_TONE(e.confidence)} size="sm">{e.confidence}%</Pill>
                </td>
                <td className="px-4 py-2.5">
                  <Pill tone={e.status === "已确认" ? "green" : e.status === "候选" ? "amber" : "slate"} size="sm">{e.status}</Pill>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1">
                    {e.status === "候选" && (
                      <button onClick={() => onConfirm([e.id])} className="rounded p-1 text-green-600 hover:bg-green-50" title="确认">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M20 6L9 17l-5-5" /></svg>
                      </button>
                    )}
                    <button onClick={() => onEdit(e)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><Edit3 className="h-3.5 w-3.5" /></button>
                    <button onClick={() => onDelete(e.id)} className="rounded p-1 text-red-500 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">暂无数据</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- Relation Tab ----------
export function RelationTab({
  relations, domains, onAdd, onDelete,
}: {
  relations: OntologyRelation[];
  domains: { code: string; name: string }[];
  onAdd: () => void;
  onDelete: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [domainFilter, setDomainFilter] = useState("");

  const filtered = relations.filter((r) => {
    const q = query.toLowerCase();
    const matchQ = !q || `${r.subject} ${r.predicate} ${r.object}`.toLowerCase().includes(q);
    const matchD = !domainFilter || r.domainCode === domainFilter;
    return matchQ && matchD;
  });

  return (
    <div>
      <TableToolbar
        search={query}
        onSearch={setQuery}
        domainFilter={domainFilter}
        onDomainFilter={setDomainFilter}
        domains={domains}
        right={<ActionButton icon={Plus} primary onClick={onAdd}>新建关系</ActionButton>}
      />
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="px-4 py-2 font-medium">主体</th>
              <th className="px-4 py-2 font-medium">谓词</th>
              <th className="px-4 py-2 font-medium">客体</th>
              <th className="px-4 py-2 font-medium">置信度</th>
              <th className="px-4 py-2 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-border hover:bg-muted/20">
                <td className="px-4 py-2.5 font-medium text-foreground">{r.subject}</td>
                <td className="px-4 py-2.5 font-mono text-blue-600">{r.predicate}</td>
                <td className="px-4 py-2.5 font-medium text-foreground">{r.object}</td>
                <td className="px-4 py-2.5">
                  <Pill tone={ENTITY_CONFIDENCE_TONE(r.confidence)} size="sm">{r.confidence}%</Pill>
                </td>
                <td className="px-4 py-2.5">
                  <button onClick={() => onDelete(r.id)} className="rounded p-1 text-red-500 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">暂无数据</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- Metric Tab ----------
export function MetricTab({
  metrics, domains, onAdd, onDelete,
}: {
  metrics: DomainMetric[];
  domains: { code: string; name: string }[];
  onAdd: () => void;
  onDelete: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [domainFilter, setDomainFilter] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const filtered = metrics.filter((m) => {
    const q = query.toLowerCase();
    const matchQ = !q || `${m.name} ${m.code} ${m.definition}`.toLowerCase().includes(q);
    const matchD = !domainFilter || m.domainCode === domainFilter;
    return matchQ && matchD;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const pageData = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  return (
    <div>
      <TableToolbar
        search={query}
        onSearch={setQuery}
        domainFilter={domainFilter}
        onDomainFilter={setDomainFilter}
        domains={domains}
        right={<ActionButton icon={Plus} primary onClick={onAdd}>新建指标</ActionButton>}
      />
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="px-4 py-2 font-medium">指标名</th>
              <th className="px-4 py-2 font-medium">规范名</th>
              <th className="px-4 py-2 font-medium">类型</th>
              <th className="px-4 py-2 font-medium">域</th>
              <th className="px-4 py-2 font-medium">定义</th>
              <th className="px-4 py-2 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {pageData.map((m) => {
              const domain = domains.find((d) => d.code === m.domainCode);
              return (
                <tr key={m.id} className="border-b border-border hover:bg-muted/20">
                  <td className="px-4 py-2.5 font-medium text-foreground">{m.name}</td>
                  <td className="px-4 py-2.5 font-mono text-muted-foreground">{m.code}</td>
                  <td className="px-4 py-2.5"><Pill tone={METRIC_TYPE_TONE[m.type] as any} size="sm">{m.type}</Pill></td>
                  <td className="px-4 py-2.5">{domain?.name ?? m.domainCode}</td>
                  <td className="max-w-[240px] truncate px-4 py-2.5 text-muted-foreground">{m.definition}</td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => onDelete(m.id)} className="rounded p-1 text-red-500 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
                  </td>
                </tr>
              );
            })}
            {pageData.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">暂无数据</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between px-4 py-3 text-[11px] text-muted-foreground">
        <span>共 {filtered.length} 条 · 每页 {pageSize} 条</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setPage(Math.max(0, currentPage - 1))} disabled={currentPage === 0} className="rounded border border-input px-2 py-1 disabled:opacity-40">Prev</button>
          <span>{currentPage + 1} / {totalPages}</span>
          <button onClick={() => setPage(Math.min(totalPages - 1, currentPage + 1))} disabled={currentPage >= totalPages - 1} className="rounded border border-input px-2 py-1 disabled:opacity-40">Next</button>
        </div>
      </div>
    </div>
  );
}

// ---------- Shared Toolbar ----------
function TableToolbar({
  search, onSearch, domainFilter, onDomainFilter, domains,
  schemaFilter, onSchemaFilter, schemas, right,
}: {
  search: string;
  onSearch: (v: string) => void;
  domainFilter: string;
  onDomainFilter: (v: string) => void;
  domains: { code: string; name: string }[];
  schemaFilter?: string;
  onSchemaFilter?: (v: string) => void;
  schemas?: OntologySchema[];
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
      <label className="flex h-7 items-center gap-1.5 rounded-md border border-input bg-card px-2">
        <span className="text-[10px] text-muted-foreground">域</span>
        <select value={domainFilter} onChange={(e) => onDomainFilter(e.target.value)} className="bg-transparent text-[11px] outline-none">
          <option value="">全部</option>
          {domains.map((d) => <option key={d.code} value={d.code}>{d.name}</option>)}
        </select>
      </label>
      <label className="flex h-7 items-center gap-1.5 rounded-md border border-input bg-card px-2">
        <Search className="h-3 w-3 text-muted-foreground" />
        <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="搜索..." className="w-32 bg-transparent text-[11px] outline-none" />
      </label>
      {schemaFilter !== undefined && onSchemaFilter && schemas && (
        <label className="flex h-7 items-center gap-1.5 rounded-md border border-input bg-card px-2">
          <span className="text-[10px] text-muted-foreground">所属类</span>
          <select value={schemaFilter} onChange={(e) => onSchemaFilter(e.target.value)} className="bg-transparent text-[11px] outline-none">
            <option value="">全部</option>
            {schemas.map((s) => <option key={s.id} value={s.code}>{s.code}</option>)}
          </select>
        </label>
      )}
      <div className="ml-auto flex items-center gap-2">{right}</div>
    </div>
  );
}

// ---------- Drawer ----------
export function Drawer({
  open, onClose, title, children,
}: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={onClose}>
      <div className="h-full w-full max-w-md overflow-y-auto bg-card shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-5 py-3">
          <div className="text-[14px] font-semibold text-foreground">{title}</div>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3 p-5">{children}</div>
      </div>
    </div>
  );
}

export function DrawerField({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-foreground">{label}{required && <span className="text-red-500"> *</span>}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

export const inputCls = "mt-0 h-9 w-full rounded-md border border-input bg-card px-3 text-[11px] outline-none focus:border-primary";

export { makeId, formatNow, Panel };

// ---------- Domain Tab ----------
export function DomainTabContent({
  domains, onOpenSchema, onDelete, entityCount, relationCount, metricCount, schemaCount,
}: {
  domains: OntologyDomain[];
  onOpenSchema: (code: string) => void;
  onDelete: (code: string) => void;
  entityCount: (code: string) => number;
  relationCount: (code: string) => number;
  metricCount: (code: string) => number;
  schemaCount: (code: string) => number;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[13px] font-semibold text-foreground">共 {domains.length} 个域</div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {domains.map((d) => {
          const ec = entityCount(d.code);
          const rc = relationCount(d.code);
          const mc = metricCount(d.code);
          const sc = schemaCount(d.code);
          return (
            <div key={d.code} className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[13px] font-semibold text-foreground">{d.name}</div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">{d.code}</div>
                </div>
                <Pill tone="blue" size="sm">{sc} Schema</Pill>
              </div>
              {d.description && <p className="mt-2 text-[10px] leading-4 text-muted-foreground">{d.description}</p>}
              <div className="mt-3 flex gap-2">
                <StatChip icon={Boxes} value={ec} label="实体" />
                <StatChip icon={GitBranch} value={rc} label="关系" />
                <StatChip icon={BarChart3} value={mc} label="指标" />
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={() => onOpenSchema(d.code)} className="flex-1 rounded-md border border-input bg-card px-2 py-1.5 text-[10px] font-medium text-foreground hover:border-primary/40 hover:text-primary">
                  Schema
                </button>
                <button onClick={() => onDelete(d.code)} className="flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-[10px] font-medium text-red-700 hover:bg-red-100">
                  <Trash2 className="h-3 w-3" />删除
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatChip({ icon: Icon, value, label }: { icon: any; value: number; label: string }) {
  return (
    <div className="flex items-center gap-1 rounded-md bg-muted/30 px-2 py-1">
      <Icon className="h-3 w-3 text-muted-foreground" />
      <span className="text-[11px] font-semibold tabular-nums text-foreground">{value}</span>
      <span className="text-[9px] text-muted-foreground">{label}</span>
    </div>
  );
}

// ---------- Diagnostics Tab ----------
export interface DiagReport {
  totalSchemas: number; totalEntities: number; totalRelations: number;
  orphanEntities: number; coverageRate: number;
  suggestions: { level: "error" | "warning" | "ok" | "info"; text: string }[];
  score: number;
}

export function DiagnosticsTab({
  report, onRerun,
}: {
  report: DiagReport;
  onRerun: () => void;
}) {
  const scoreColor = report.score >= 80 ? "emerald" : report.score >= 60 ? "amber" : "red";
  const scoreColors: Record<string, string> = {
    emerald: "text-emerald-600 border-emerald-300 bg-emerald-50",
    amber: "text-amber-600 border-amber-300 bg-amber-50",
    red: "text-red-600 border-red-300 bg-red-50",
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MiniStat label="本体类数" value={report.totalSchemas} icon={Database} tone="blue" />
        <MiniStat label="实体数" value={report.totalEntities} icon={Boxes} tone="violet" />
        <MiniStat label="关系数" value={report.totalRelations} icon={GitBranch} tone="green" />
        <MiniStat label="孤立实体数" value={report.orphanEntities} icon={Activity} tone={report.orphanEntities > 0 ? "red" : "blue"} />
      </div>

      <Panel title="完整性诊断报告" description="基于当前本体结构自动生成的诊断建议与评分" actions={
        <ActionButton icon={RefreshCw} onClick={onRerun}>重跑诊断</ActionButton>
      }>
        <div className="p-4">
          <div className="flex items-start gap-6">
            <div className={cn("flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4", scoreColors[scoreColor])}>
              <div className="text-center">
                <div className="text-[24px] font-bold tabular-nums">{report.score}</div>
                <div className="text-[9px] text-muted-foreground">综合评分</div>
              </div>
            </div>
            <div className="flex-1">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-[12px] font-semibold text-foreground">诊断建议</span>
                <Pill tone={report.score >= 80 ? "green" : report.score >= 60 ? "amber" : "red"} size="sm">
                  {report.score >= 80 ? "良好" : report.score >= 60 ? "关注" : "异常"}
                </Pill>
              </div>
              <ul className="space-y-2">
                {report.suggestions.map((s, i) => {
                  const levelTone = s.level === "error" ? "red" : s.level === "warning" ? "amber" : s.level === "ok" ? "green" : "blue";
                  return (
                    <li key={i} className="flex items-start gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 text-[11px] leading-5">
                      <Pill tone={levelTone as any} size="sm">
                        {s.level === "error" ? "错误" : s.level === "warning" ? "警告" : s.level === "ok" ? "通过" : "信息"}
                      </Pill>
                      <span className="text-foreground">{s.text}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
