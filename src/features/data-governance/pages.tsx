import { useState } from "react";
import {
  Activity, ChevronRight, CircleAlert,
  Database, Layers3, Network, Play, Plus, RefreshCw, Search,
  Sparkles, Target, TrendingDown, TrendingUp,
} from "lucide-react";

import {
  ActionButton, InlineNotice, PageTitle, Panel, Pill, ProgressBar,
  WorkspacePage,
} from "@/components/data-platform/WorkspacePrimitives";
import { statusTone } from "@/components/data-platform/workspace-utils";
import { useSqliteState } from "@/lib/sqlite-client";
import { cn } from "@/lib/utils";

type MetadataObject = {
  id: string; name: string; objectType: string; system: string; lineage: string;
  domain: string; owner: string; status: string; updatedAt: string;
};

type QualityRule = {
  id: string; name: string; dimension: string; target: string; threshold: string;
  score: string; owner: string; status: string; updatedAt: string;
};

const metadataRecords: MetadataObject[] = [
  { id: "meta-001", name: "客户主数据表", objectType: "湖表", system: "CRM → 数据湖", lineage: "12 上游 / 8 下游", domain: "客户域", owner: "陈晨", status: "已同步", updatedAt: "2026-08-13 09:08" },
  { id: "meta-002", name: "月度交易额指标", objectType: "指标", system: "指标平台", lineage: "4 上游 / 6 下游", domain: "交易域", owner: "张敏", status: "已同步", updatedAt: "2026-08-13 08:30" },
  { id: "meta-003", name: "客户画像服务", objectType: "数据服务", system: "资产运营", lineage: "7 上游 / 3 下游", domain: "营销域", owner: "赵宁", status: "待确认", updatedAt: "2026-08-12 17:10" },
  { id: "meta-004", name: "订单实时同步任务", objectType: "任务", system: "调度引擎", lineage: "2 上游 / 5 下游", domain: "交易域", owner: "李浩", status: "已同步", updatedAt: "2026-08-13 09:16" },
  { id: "meta-005", name: "客户经营分析报告", objectType: "数据服务", system: "BI 平台", lineage: "9 上游 / 2 下游", domain: "经营分析", owner: "王芳", status: "待确认", updatedAt: "2026-08-12 16:45" },
];

const qualityRecords: QualityRule[] = [
  { id: "quality-001", name: "客户证件号完整性", dimension: "完整性", target: "dwd_customer_profile.id_no", threshold: "≥ 99.5%", score: "99.8", owner: "王雪", status: "通过", updatedAt: "2026-08-13 08:00" },
  { id: "quality-002", name: "订单金额准确性", dimension: "准确性", target: "dwd_trade_order.amount", threshold: "≥ 99.9%", score: "98.7", owner: "张敏", status: "失败", updatedAt: "2026-08-13 07:45" },
  { id: "quality-003", name: "事件入湖及时性", dimension: "及时性", target: "dwd_customer_event", threshold: "≤ 5 min", score: "97.2", owner: "李浩", status: "执行中", updatedAt: "刚刚" },
  { id: "quality-004", name: "客户主键唯一性", dimension: "唯一性", target: "dwd_customer_profile.customer_id", threshold: "= 100%", score: "100", owner: "王雪", status: "通过", updatedAt: "2026-08-13 08:00" },
  { id: "quality-005", name: "客户等级一致性", dimension: "一致性", target: "dws_customer_level", threshold: "≥ 99%", score: "96.4", owner: "陈晨", status: "整改中", updatedAt: "2026-08-13 06:30" },
];

const metadataIcons: Record<string, typeof Database> = { 湖表: Database, 指标: Target, 数据服务: Layers3, 任务: Activity, 数据源: Database };

export function GovernanceMetadataPage() {
  const [objects, setObjects, meta] = useSqliteState<MetadataObject[]>("data-agent.data-governance.metadata", metadataRecords);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("全部");
  const [selectedId, setSelectedId] = useState(objects[0]?.id ?? "");
  const selected = objects.find((item) => item.id === selectedId) ?? objects[0];
  const filtered = objects.filter((item) => (type === "全部" || item.objectType === type) && `${item.name} ${item.domain} ${item.system}`.toLowerCase().includes(query.toLowerCase()));

  function refreshSelected() {
    if (!selected) return;
    setObjects((current) => current.map((item) => item.id === selected.id ? { ...item, status: "同步中", updatedAt: "刚刚" } : item));
    window.setTimeout(() => setObjects((current) => current.map((item) => item.id === selected.id ? { ...item, status: "已同步", updatedAt: "刚刚" } : item)), 650);
  }

  return (
    <WorkspacePage>
      <PageTitle eyebrow="Governance / Metadata Map" title="元数据与数据地图" description="先搜索对象，再从业务属性、技术属性和上下游依赖理解它，而不是从一张平铺清单开始。" actions={<ActionButton icon={RefreshCw} onClick={refreshSelected}>刷新当前元数据</ActionButton>} />
      <InlineNotice error={meta.error} loading={!meta.hydrated} />
      <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-slate-50 p-5"><div className="mx-auto max-w-3xl"><div className="mb-2 flex items-center gap-2 text-[11px] font-medium text-blue-700"><Sparkles className="h-3.5 w-3.5" />数据地图统一检索</div><label className="flex h-11 items-center gap-3 rounded-lg border border-blue-200 bg-white px-4 shadow-sm"><Search className="h-4 w-4 text-blue-500" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索表、指标、任务、数据服务或业务术语" className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-slate-400" /><span className="text-[10px] text-slate-400">{filtered.length} 个结果</span></label><div className="mt-3 flex flex-wrap justify-center gap-2">{["全部", "湖表", "指标", "任务", "数据服务"].map((item) => <button key={item} type="button" onClick={() => setType(item)} className={cn("rounded-full px-3 py-1 text-[10px] transition", type === item ? "bg-blue-600 text-white" : "bg-white text-slate-500 hover:text-blue-700")}>{item}</button>)}</div></div></div>
      <div className="grid min-h-[580px] gap-4 xl:grid-cols-[300px_minmax(0,1fr)_330px]">
        <Panel title="检索结果" description="技术与业务元数据统一入口"><div className="divide-y divide-border">{filtered.map((item) => { const Icon = metadataIcons[item.objectType] ?? Database; return <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={cn("flex w-full items-start gap-3 p-4 text-left hover:bg-muted/30", selected?.id === item.id && "bg-blue-50/70")}><span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-semibold text-foreground">{item.name}</span><span className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground"><span>{item.objectType}</span><span>·</span><span>{item.domain}</span></span></span><ChevronRight className="mt-2 h-3.5 w-3.5 text-slate-300" /></button>; })}</div></Panel>
        {selected && <Panel title="对象说明" description={`${selected.objectType} · ${selected.domain}`} actions={<Pill tone={statusTone(selected.status)}>{selected.status}</Pill>}><div className="p-5"><div className="flex items-start justify-between gap-4"><div><h2 className="text-[17px] font-semibold text-foreground">{selected.name}</h2><div className="mt-1 font-mono text-[10px] text-muted-foreground">URN: data-agent:{selected.objectType}:{selected.id}</div></div><Pill tone="blue">可信度 96%</Pill></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{[["来源系统", selected.system], ["业务域", selected.domain], ["数据负责人", selected.owner], ["最近同步", selected.updatedAt]].map(([label, value]) => <div key={label} className="rounded-md border border-border bg-muted/20 p-3"><div className="text-[10px] text-muted-foreground">{label}</div><div className="mt-1 text-[11px] font-medium text-foreground">{value}</div></div>)}</div><div className="mt-5"><div className="text-[11px] font-semibold text-foreground">业务定义</div><p className="mt-2 rounded-md border-l-2 border-blue-400 bg-blue-50/60 px-3 py-2 text-[11px] leading-5 text-slate-600">{selected.name} 是 {selected.domain} 的已登记治理对象，口径由 {selected.owner} 负责维护。当前血缘摘要为 {selected.lineage}。</p></div><div className="mt-5"><div className="mb-2 text-[11px] font-semibold text-foreground">治理关联</div><div className="grid grid-cols-3 gap-2 text-center text-[10px]">{[["质量规则", "5"], ["数据标准", "3"], ["资产引用", "8"]].map(([label, value]) => <div key={label} className="rounded-md border border-border p-3"><div className="text-[17px] font-semibold text-primary">{value}</div><div className="mt-1 text-muted-foreground">{label}</div></div>)}</div></div></div></Panel>}
        {selected && <Panel title="血缘影响" description={selected.lineage}><div className="p-4"><div className="space-y-3"><LineageNode label="上游数据源" value={selected.objectType === "指标" ? "dws_trade_summary" : "CRM Oracle"} tone="slate" /><div className="ml-4 h-5 border-l border-dashed border-blue-300" /><LineageNode label="当前对象" value={selected.name} tone="blue" /><div className="ml-4 h-5 border-l border-dashed border-blue-300" /><LineageNode label="下游消费" value={selected.objectType === "数据服务" ? "外部应用 / 分析报表" : "指标与数据服务"} tone="green" /></div><div className="mt-5 rounded-md bg-amber-50 p-3 text-[10px] leading-5 text-amber-800"><CircleAlert className="mr-1 inline h-3.5 w-3.5" />结构变更预计影响 8 个下游对象，其中 2 个为已发布数据服务。</div><ActionButton icon={Network}>打开完整血缘图</ActionButton></div></Panel>}
      </div>
    </WorkspacePage>
  );
}

function LineageNode({ label, value, tone }: { label: string; value: string; tone: "slate" | "blue" | "green" }) {
  return <div className={cn("rounded-lg border p-3", tone === "blue" ? "border-blue-200 bg-blue-50" : tone === "green" ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50")}><div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div><div className="mt-1 text-[11px] font-semibold text-foreground">{value}</div></div>;
}

export function DataQualityPage() {
  const [rules, setRules, meta] = useSqliteState<QualityRule[]>("data-agent.data-governance.quality", qualityRecords);
  const scores = rules.map((rule) => Number(rule.score)).filter(Number.isFinite);
  const overall = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
  const dimensions = ["完整性", "准确性", "及时性", "一致性", "唯一性"];
  const trend = [96.1, 96.8, 97.4, 96.9, 97.8, overall];

  function runRule(id: string) {
    setRules((current) => current.map((rule) => rule.id === id ? { ...rule, status: "执行中", updatedAt: "刚刚" } : rule));
    window.setTimeout(() => setRules((current) => current.map((rule) => rule.id === id ? { ...rule, status: "通过", score: "99.3", updatedAt: "刚刚" } : rule)), 650);
  }

  function addRule() {
    setRules((current) => [{ id: `quality-${Date.now()}`, name: `新质量规则 ${current.length + 1}`, dimension: "完整性", target: "待选择数据对象", threshold: "≥ 99%", score: "—", owner: "待指定", status: "未执行", updatedAt: "刚刚" }, ...current]);
  }

  return (
    <WorkspacePage>
      <PageTitle eyebrow="Governance / Data Quality" title="数据质量控制台" description="围绕质量得分、维度趋势、失败规则和整改责任组织页面，让问题先于规则清单被看见。" actions={<ActionButton primary icon={Plus} onClick={addRule}>新建质量规则</ActionButton>} />
      <InlineNotice error={meta.error} loading={!meta.hydrated} />
      <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <Panel><div className="flex h-full min-h-[280px] flex-col items-center justify-center p-6"><div className="relative grid h-40 w-40 place-items-center rounded-full" style={{ background: `conic-gradient(rgb(16 185 129) ${overall}%, rgb(226 232 240) 0)` }}><div className="grid h-32 w-32 place-items-center rounded-full bg-card text-center"><div><div className="text-[33px] font-semibold tabular-nums text-foreground">{overall.toFixed(1)}</div><div className="text-[10px] text-muted-foreground">综合质量分</div></div></div></div><Pill tone={overall >= 98 ? "green" : "amber"} className="mt-4">{overall >= 98 ? "达到质量目标" : "低于 98 分目标"}</Pill><div className="mt-3 text-center text-[10px] text-muted-foreground">基于 {rules.length} 条启用规则的最近执行结果</div></div></Panel>
        <Panel title="近 6 次质量趋势" description="按最近批次聚合"><div className="flex h-[220px] items-end gap-5 px-7 pb-5 pt-8">{trend.map((score, index) => <div key={index} className="flex h-full flex-1 flex-col justify-end"><div className="mb-2 text-center text-[9px] font-medium text-slate-500">{score.toFixed(1)}</div><div className={cn("w-full rounded-t", score >= 98 ? "bg-emerald-400" : score >= 97 ? "bg-blue-400" : "bg-amber-400")} style={{ height: `${Math.max(12, (score - 92) * 12)}%` }} /><div className="mt-2 text-center text-[9px] text-muted-foreground">批次 {index + 1}</div></div>)}</div></Panel>
      </div>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{dimensions.map((dimension) => { const related = rules.filter((rule) => rule.dimension === dimension); const value = related.length ? related.reduce((sum, rule) => sum + (Number(rule.score) || 0), 0) / related.length : 0; return <div key={dimension} className="rounded-lg border border-border bg-card p-4 shadow-sm"><div className="flex items-center justify-between"><span className="text-[11px] font-medium text-foreground">{dimension}</span>{value >= 98 ? <TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> : <TrendingDown className="h-3.5 w-3.5 text-amber-500" />}</div><div className="mt-2 text-[21px] font-semibold tabular-nums text-foreground">{value ? value.toFixed(1) : "—"}</div><ProgressBar value={value} tone={value >= 98 ? "green" : "amber"} className="mt-2" /><div className="mt-2 text-[9px] text-muted-foreground">{related.length} 条规则</div></div>; })}</section>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_340px]">
        <Panel title="规则运行面板" description="失败和整改规则置顶"><div className="divide-y divide-border">{[...rules].sort((a, b) => (/失败|整改/.test(a.status) ? -1 : 1) - (/失败|整改/.test(b.status) ? -1 : 1)).map((rule) => <div key={rule.id} className="grid gap-3 px-4 py-3 md:grid-cols-[1.2fr_.9fr_.55fr_.55fr_auto] md:items-center"><div><div className="text-[11px] font-semibold text-foreground">{rule.name}</div><div className="mt-0.5 font-mono text-[9px] text-muted-foreground">{rule.target}</div></div><div className="text-[10px] text-muted-foreground"><span className="text-foreground">{rule.dimension}</span> · {rule.threshold}</div><div className="text-[16px] font-semibold tabular-nums text-foreground">{rule.score}</div><Pill tone={statusTone(rule.status)}>{rule.status}</Pill><ActionButton icon={Play} onClick={() => runRule(rule.id)} disabled={rule.status === "执行中"}>执行</ActionButton></div>)}</div></Panel>
        <Panel title="问题与整改" description="按责任闭环而非仅展示失败数"><div className="space-y-3 p-4">{rules.filter((rule) => /失败|整改/.test(rule.status)).map((rule) => <div key={rule.id} className="rounded-lg border border-amber-200 bg-amber-50/70 p-3"><div className="flex items-center justify-between"><span className="text-[11px] font-semibold text-amber-900">{rule.name}</span><Pill tone="amber">{rule.status}</Pill></div><div className="mt-2 text-[10px] leading-5 text-amber-800">负责人：{rule.owner}<br />目标：{rule.threshold}，当前得分 {rule.score}<br />复检截止：2026-08-15</div></div>)}<div className="rounded-lg border border-dashed border-border p-3 text-[10px] leading-5 text-muted-foreground">质量结论来自本地 mock 执行结果，不替代生产质量引擎或正式审计结论。</div></div></Panel>
      </div>
    </WorkspacePage>
  );
}
