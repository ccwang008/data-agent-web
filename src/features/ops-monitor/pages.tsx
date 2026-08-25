import { useState } from "react";
import {
  Activity, AlertTriangle, ArrowRight, CheckCircle2, CircleStop,
  Cpu, Database, GitBranch, Gauge, Layers3, Network, Play, RefreshCw,
  RotateCcw, Server, ShieldAlert, TimerReset, TrendingDown, TrendingUp, Zap,
} from "lucide-react";

import {
  ActionButton, InlineNotice, MiniStat, PageTitle, Panel, Pill, ProgressBar,
  WorkspacePage,
} from "@/components/data-platform/WorkspacePrimitives";
import { statusTone } from "@/components/data-platform/workspace-utils";
import { DataAgentContextLink } from "@/components/data-platform/DataAgentContextLink";
import { useSqliteState } from "@/lib/sqlite-client";
import { cn } from "@/lib/utils";

type TaskMonitor = { id: string; name: string; domain: string; successRate: string; latency: string; alert: string; owner: string; status: string; updatedAt: string };
type LineageMonitor = { id: string; name: string; source: string; target: string; hops: string; impact: string; owner: string; status: string; updatedAt: string };
type QualityMonitor = { id: string; name: string; dimension: string; score: string; trend: string; issues: string; owner: string; status: string; updatedAt: string };
type ResourceMonitor = { id: string; name: string; resourceType: string; usage: string; quota: string; queue: string; owner: string; status: string; updatedAt: string };

const taskRecords: TaskMonitor[] = [
  { id: "ops-task-001", name: "交易订单 CDC 入湖", domain: "数据集成", successRate: "99.8%", latency: "42 秒", alert: "无", owner: "张敏", status: "正常", updatedAt: "刚刚" },
  { id: "ops-task-002", name: "客户标签小时计算", domain: "数据开发", successRate: "96.4%", latency: "18 分钟", alert: "连续失败 2 次", owner: "李浩", status: "异常", updatedAt: "2026-08-13 09:04" },
  { id: "ops-task-003", name: "客户证件号质量校验", domain: "数据质量", successRate: "98.9%", latency: "3 分钟", alert: "评分下降", owner: "王雪", status: "关注", updatedAt: "2026-08-13 08:58" },
  { id: "ops-task-004", name: "经营日报服务刷新", domain: "数据服务", successRate: "100%", latency: "76 秒", alert: "无", owner: "王芳", status: "正常", updatedAt: "刚刚" },
  { id: "ops-task-005", name: "风险指标日终汇总", domain: "调度引擎", successRate: "97.1%", latency: "24 分钟", alert: "等待上游", owner: "周凯", status: "阻塞", updatedAt: "2026-08-13 08:41" },
];

const lineageRecords: LineageMonitor[] = [
  { id: "ops-lineage-001", name: "客户主数据链路", source: "CRM Oracle", target: "客户画像 API", hops: "7 跳", impact: "12 表 / 3 服务", owner: "陈晨", status: "正常", updatedAt: "2026-08-13 09:00" },
  { id: "ops-lineage-002", name: "交易指标链路", source: "核心交易库", target: "月度经营报表", hops: "5 跳", impact: "8 表 / 14 指标", owner: "张敏", status: "检测中", updatedAt: "刚刚" },
  { id: "ops-lineage-003", name: "营销事件链路", source: "客户事件 Kafka", target: "实时标签服务", hops: "9 跳", impact: "6 表 / 2 服务", owner: "李浩", status: "异常", updatedAt: "2026-08-13 08:46" },
];

const qualityRecords: QualityMonitor[] = [
  { id: "ops-quality-001", name: "客户域质量总览", dimension: "完整性 / 准确性", score: "98.6", trend: "+0.4", issues: "3", owner: "王雪", status: "正常", updatedAt: "2026-08-13 08:00" },
  { id: "ops-quality-002", name: "交易域质量总览", dimension: "准确性 / 一致性", score: "94.2", trend: "-2.1", issues: "11", owner: "张敏", status: "异常", updatedAt: "2026-08-13 08:00" },
  { id: "ops-quality-003", name: "营销域质量总览", dimension: "及时性 / 唯一性", score: "97.8", trend: "+0.8", issues: "5", owner: "赵宁", status: "整改中", updatedAt: "2026-08-13 08:00" },
  { id: "ops-quality-004", name: "风险域质量总览", dimension: "完整性 / 及时性", score: "99.1", trend: "+0.2", issues: "2", owner: "周凯", status: "正常", updatedAt: "2026-08-13 08:00" },
];

const resourceRecords: ResourceMonitor[] = [
  { id: "ops-resource-001", name: "批处理资源池", resourceType: "计算集群", usage: "68%", quota: "480 vCPU", queue: "12 作业", owner: "平台运维", status: "正常", updatedAt: "刚刚" },
  { id: "ops-resource-002", name: "实时计算资源池", resourceType: "流计算集群", usage: "82%", quota: "320 vCPU", queue: "4 作业", owner: "平台运维", status: "关注", updatedAt: "刚刚" },
  { id: "ops-resource-003", name: "Notebook GPU 池", resourceType: "GPU 集群", usage: "94%", quota: "16 GPU", queue: "7 作业", owner: "AI 平台团队", status: "过载", updatedAt: "刚刚" },
  { id: "ops-resource-004", name: "交互查询资源池", resourceType: "SQL 集群", usage: "54%", quota: "240 vCPU", queue: "2 作业", owner: "平台运维", status: "正常", updatedAt: "刚刚" },
];

function numeric(value: string) { return Number.parseFloat(value) || 0; }

export function OpsTasksPage() {
  const [tasks, setTasks, meta] = useSqliteState<TaskMonitor[]>("data-agent.ops-monitor.tasks", taskRecords);
  const abnormal = tasks.filter((task) => /异常|阻塞|关注/.test(task.status));
  const running = tasks.filter((task) => task.status === "执行中").length;

  function rerun(id: string) {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, status: "执行中", alert: "重跑已提交", updatedAt: "刚刚" } : task));
    window.setTimeout(() => setTasks((current) => current.map((task) => task.id === id ? { ...task, status: "正常", alert: "无", successRate: "99.9%", updatedAt: "刚刚" } : task)), 700);
  }

  return (
    <WorkspacePage>
      <PageTitle eyebrow="Operations / Task Command Center" title="任务运行指挥台" description="统一观察跨域任务的健康、延迟、依赖与重试；任务监控本身适合指标与运行列表，但异常被提升为处置流。" actions={<><DataAgentContextLink agent="operations" contextType="运行任务" contextId={abnormal[0]?.id ?? "ops-task-stream"} intent={abnormal[0] ? `诊断${abnormal[0].name}异常并生成恢复方案` : "检查当前任务运行风险"} /><ActionButton icon={RefreshCw} onClick={() => setTasks((current) => [...current])}>刷新运行态</ActionButton></>} />
      <InlineNotice error={meta.error} loading={!meta.hydrated} />
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4"><MiniStat label="运行对象" value={tasks.length} hint="集成 / 开发 / 质量 / 服务" icon={Activity} /><MiniStat label="健康任务" value={tasks.filter((task) => task.status === "正常").length} hint="最近批次成功" icon={CheckCircle2} tone="green" /><MiniStat label="运行中" value={running} hint="正在执行或重跑" icon={Play} tone="violet" /><MiniStat label="待处置" value={abnormal.length} hint="异常、阻塞或关注" icon={ShieldAlert} tone="red" /></section>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_360px]">
        <Panel title="实时任务流" description="按最近状态变化排序"><div className="divide-y divide-border">{tasks.map((task) => <div key={task.id} className="grid gap-3 px-4 py-3 md:grid-cols-[1.25fr_.55fr_.55fr_.65fr_auto] md:items-center"><div className="flex items-start gap-3"><span className={cn("mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md", task.status === "正常" ? "bg-emerald-50 text-emerald-600" : task.status === "执行中" ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-600")}>{task.status === "执行中" ? <RefreshCw className="h-4 w-4 animate-spin" /> : task.status === "正常" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}</span><div><div className="text-[11px] font-semibold text-foreground">{task.name}</div><div className="mt-0.5 text-[9px] text-muted-foreground">{task.domain} · {task.owner} · {task.updatedAt}</div></div></div><div><div className="text-[9px] text-muted-foreground">成功率</div><div className="mt-1 text-[11px] font-medium text-foreground">{task.successRate}</div></div><div><div className="text-[9px] text-muted-foreground">耗时</div><div className="mt-1 text-[11px] text-foreground">{task.latency}</div></div><div><Pill tone={statusTone(task.status)}>{task.status}</Pill><div className="mt-1 truncate text-[9px] text-muted-foreground">{task.alert}</div></div><ActionButton icon={RotateCcw} onClick={() => rerun(task.id)} disabled={task.status === "执行中"}>重跑</ActionButton></div>)}</div></Panel>
        <Panel title="异常处置流" description="当前需要人工关注的运行事件"><div className="space-y-3 p-4">{abnormal.map((task, index) => <div key={task.id} className="relative rounded-lg border border-red-200 bg-red-50/60 p-3"><div className="flex items-center justify-between"><span className="text-[11px] font-semibold text-red-900">{task.alert}</span><span className="text-[9px] text-red-600">P{index + 1}</span></div><div className="mt-1 text-[10px] text-red-800">{task.name}</div><div className="mt-3 flex items-center justify-between text-[9px] text-red-700"><span>负责人 {task.owner}</span><button type="button" onClick={() => rerun(task.id)} className="font-medium underline">立即处置</button></div></div>)}{abnormal.length === 0 && <div className="py-10 text-center text-[11px] text-muted-foreground">当前没有待处置异常</div>}<div className="border-t border-border pt-3"><div className="mb-2 text-[10px] font-medium text-muted-foreground">最近活动</div>{["09:18 订单入湖检查点完成", "09:11 GPU 队列告警升级", "09:04 标签任务连续失败"].map((item) => <div key={item} className="mb-2 flex gap-2 text-[9px] text-muted-foreground"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />{item}</div>)}</div></div></Panel>
      </div>
    </WorkspacePage>
  );
}

export function OpsLineagePage() {
  const [lineages, setLineages, meta] = useSqliteState<LineageMonitor[]>("data-agent.ops-monitor.lineage", lineageRecords);
  const [selectedId, setSelectedId] = useState(lineages[0]?.id ?? "");
  const selected = lineages.find((lineage) => lineage.id === selectedId) ?? lineages[0];

  function probe() {
    if (!selected) return;
    setLineages((current) => current.map((lineage) => lineage.id === selected.id ? { ...lineage, status: "检测中", updatedAt: "刚刚" } : lineage));
    window.setTimeout(() => setLineages((current) => current.map((lineage) => lineage.id === selected.id ? { ...lineage, status: "正常", updatedAt: "刚刚" } : lineage)), 650);
  }

  return (
    <WorkspacePage>
      <PageTitle eyebrow="Operations / Lineage Probe" title="数据链路监控" description="以端到端链路为中心观察源端、处理节点、目标端和影响半径；链路异常在拓扑上直接定位。" actions={<ActionButton primary icon={Network} onClick={probe}>探测当前链路</ActionButton>} />
      <InlineNotice error={meta.error} loading={!meta.hydrated} />
      <div className="grid min-h-[650px] gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <Panel title="监控链路" description={`${lineages.length} 条关键数据路径`}><div className="divide-y divide-border">{lineages.map((lineage) => <button key={lineage.id} type="button" onClick={() => setSelectedId(lineage.id)} className={cn("w-full p-4 text-left hover:bg-muted/30", selected?.id === lineage.id && "border-l-2 border-primary bg-blue-50/70 pl-[14px]")}><div className="flex items-start justify-between gap-2"><span className="text-[11px] font-semibold text-foreground">{lineage.name}</span><Pill tone={statusTone(lineage.status)}>{lineage.status}</Pill></div><div className="mt-3 flex items-center gap-1 text-[9px] text-muted-foreground"><span className="truncate">{lineage.source}</span><ArrowRight className="h-3 w-3 shrink-0" /><span className="truncate">{lineage.target}</span></div><div className="mt-2 text-[9px] text-muted-foreground">{lineage.hops} · {lineage.impact}</div></button>)}</div></Panel>
        {selected && <div className="space-y-4"><Panel title={selected.name} description={`${selected.source} → ${selected.target}`} actions={<Pill tone={statusTone(selected.status)}>{selected.status}</Pill>}><div className="min-h-[330px] overflow-x-auto p-6"><div className="flex min-w-[760px] items-center justify-between gap-2 pt-16"><FlowNode icon={Database} label="源端" value={selected.source} tone="slate" /><FlowEdge label="采集" ok /><FlowNode icon={Zap} label="同步任务" value="增量 CDC" tone={selected.status === "异常" ? "red" : "blue"} /><FlowEdge label="写入" ok={selected.status !== "异常"} /><FlowNode icon={Layers3} label="湖表" value="dwd_customer_profile" tone="blue" /><FlowEdge label="计算" ok /><FlowNode icon={GitBranch} label="指标/标签" value="客户画像" tone="violet" /><FlowEdge label="服务" ok /><FlowNode icon={Network} label="目标端" value={selected.target} tone="green" /></div><div className="mt-14 grid grid-cols-4 gap-3">{[["端到端延迟", "76 秒"], ["最近探测", selected.updatedAt], ["链路深度", selected.hops], ["责任人", selected.owner]].map(([label, value]) => <div key={label} className="rounded-md border border-border bg-muted/20 p-3 text-center"><div className="text-[9px] text-muted-foreground">{label}</div><div className="mt-1 text-[11px] font-semibold text-foreground">{value}</div></div>)}</div></div></Panel><div className="grid gap-4 lg:grid-cols-2"><Panel title="影响范围"><div className="p-4"><div className="flex items-center gap-3 rounded-lg bg-amber-50 p-4"><AlertTriangle className="h-8 w-8 text-amber-500" /><div><div className="text-[20px] font-semibold text-amber-900">{selected.impact}</div><div className="text-[10px] text-amber-700">上游变更的潜在影响范围</div></div></div><div className="mt-3 grid grid-cols-3 gap-2 text-center">{[["数据表", "12"], ["指标", "14"], ["服务", "3"]].map(([label, value]) => <div key={label} className="rounded-md border border-border p-2"><div className="text-[15px] font-semibold text-foreground">{value}</div><div className="text-[9px] text-muted-foreground">{label}</div></div>)}</div></div></Panel><Panel title="探测日志"><div className="space-y-2 p-4 font-mono text-[9px] text-muted-foreground">{["09:20:01 source endpoint reachable", "09:20:02 checkpoint validated", "09:20:04 lake table snapshot found", "09:20:06 downstream service healthy"].map((line, index) => <div key={line} className="flex gap-2"><span className={index === 1 && selected.status === "异常" ? "text-red-500" : "text-emerald-500"}>●</span>{line}</div>)}</div></Panel></div></div>}
      </div>
    </WorkspacePage>
  );
}

function FlowNode({ icon: Icon, label, value, tone }: { icon: typeof Database; label: string; value: string; tone: "slate" | "blue" | "green" | "violet" | "red" }) {
  const colors = { slate: "border-slate-200 bg-slate-50 text-slate-600", blue: "border-blue-200 bg-blue-50 text-blue-600", green: "border-emerald-200 bg-emerald-50 text-emerald-600", violet: "border-violet-200 bg-violet-50 text-violet-600", red: "border-red-200 bg-red-50 text-red-600" };
  return <div className={cn("w-28 shrink-0 rounded-lg border p-3 text-center shadow-sm", colors[tone])}><Icon className="mx-auto h-5 w-5" /><div className="mt-2 text-[9px] opacity-70">{label}</div><div className="mt-1 truncate text-[10px] font-semibold" title={value}>{value}</div></div>;
}

function FlowEdge({ label, ok }: { label: string; ok: boolean }) {
  return <div className="min-w-[42px] flex-1"><div className={cn("h-0.5 w-full", ok ? "bg-emerald-300" : "bg-red-300")} /><div className={cn("mt-2 text-center text-[8px]", ok ? "text-emerald-600" : "text-red-600")}>{ok ? label : "阻断"}</div></div>;
}

export function OpsQualityPage() {
  const [domains, setDomains, meta] = useSqliteState<QualityMonitor[]>("data-agent.ops-monitor.quality", qualityRecords);
  const trend = [97.8, 97.1, 96.6, 97.3, 97.7, 97.4];

  function recheck(id: string) {
    setDomains((current) => current.map((domain) => domain.id === id ? { ...domain, status: "检测中", updatedAt: "刚刚" } : domain));
    window.setTimeout(() => setDomains((current) => current.map((domain) => domain.id === id ? { ...domain, status: "正常", score: "98.8", trend: "+0.6", issues: "2", updatedAt: "刚刚" } : domain)), 650);
  }

  return (
    <WorkspacePage>
      <PageTitle eyebrow="Operations / Quality Pulse" title="质量运行态势" description="从跨域趋势、问题分布和整改阶段观察质量运行，不重复质量规则配置页面。" actions={<ActionButton icon={RefreshCw} onClick={() => setDomains((current) => [...current])}>刷新态势</ActionButton>} />
      <InlineNotice error={meta.error} loading={!meta.hydrated} />
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{domains.map((domain) => { const score = numeric(domain.score); return <div key={domain.id} className={cn("rounded-lg border bg-card p-4 shadow-sm", domain.status === "异常" ? "border-red-200" : "border-border")}><div className="flex items-start justify-between"><div><div className="text-[11px] font-semibold text-foreground">{domain.name}</div><div className="mt-1 text-[9px] text-muted-foreground">{domain.dimension}</div></div><Pill tone={statusTone(domain.status)}>{domain.status}</Pill></div><div className="mt-4 flex items-end justify-between"><div className="text-[28px] font-semibold tabular-nums text-foreground">{domain.score}</div><div className={cn("flex items-center text-[10px]", domain.trend.startsWith("+") ? "text-emerald-600" : "text-red-600")}>{domain.trend.startsWith("+") ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}{domain.trend}</div></div><ProgressBar value={score} tone={score >= 98 ? "green" : score >= 96 ? "amber" : "red"} className="mt-2" /><div className="mt-3 flex items-center justify-between text-[9px] text-muted-foreground"><span>{domain.issues} 个问题</span><button type="button" onClick={() => recheck(domain.id)} className="font-medium text-primary">复检</button></div></div>; })}</section>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_360px]">
        <Panel title="质量得分趋势" description="最近 6 个检测周期"><div className="relative h-[260px] p-6"><div className="absolute inset-x-6 bottom-10 top-6 flex flex-col justify-between">{[100, 98, 96, 94].map((line) => <div key={line} className="flex items-center gap-2"><span className="w-6 text-[8px] text-muted-foreground">{line}</span><div className="h-px flex-1 bg-border" /></div>)}</div><div className="absolute inset-x-12 bottom-10 top-6 flex items-end gap-5">{trend.map((value, index) => <div key={index} className="group flex h-full flex-1 flex-col justify-end"><div className="mb-1 text-center text-[8px] text-slate-500 opacity-0 group-hover:opacity-100">{value}</div><div className="rounded-t bg-blue-400/80" style={{ height: `${(value - 92) * 12}%` }} /><div className="mt-2 text-center text-[8px] text-muted-foreground">T{index + 1}</div></div>)}</div></div></Panel>
        <Panel title="问题阶段分布" description="本周期共 21 个质量问题"><div className="grid grid-cols-2 gap-3 p-4">{[["待确认", "6", "bg-slate-100 text-slate-700"], ["整改中", "8", "bg-amber-100 text-amber-700"], ["待复检", "4", "bg-blue-100 text-blue-700"], ["已关闭", "3", "bg-emerald-100 text-emerald-700"]].map(([label, value, color]) => <div key={label} className={cn("rounded-lg p-4 text-center", color)}><div className="text-[24px] font-semibold tabular-nums">{value}</div><div className="mt-1 text-[10px]">{label}</div></div>)}</div><div className="border-t border-border p-4"><div className="text-[10px] font-medium text-foreground">最需关注</div><div className="mt-2 rounded-md border border-red-200 bg-red-50 p-3 text-[10px] text-red-800">交易域准确性连续两个周期下降，11 个问题中有 4 个已超过整改截止时间。</div></div></Panel>
      </div>
      <Panel title="责任与复检队列" description="按异常数量排序"><div className="grid gap-3 p-4 lg:grid-cols-3">{domains.filter((domain) => numeric(domain.issues) > 2).map((domain) => <div key={domain.id} className="rounded-lg border border-border p-3"><div className="flex items-center justify-between"><span className="text-[11px] font-semibold text-foreground">{domain.name}</span><span className="text-[16px] font-semibold text-primary">{domain.issues}</span></div><div className="mt-2 text-[9px] text-muted-foreground">责任人 {domain.owner} · 更新 {domain.updatedAt}</div><div className="mt-3 flex items-center justify-between"><Pill tone={statusTone(domain.status)}>{domain.status}</Pill><ActionButton icon={TimerReset} onClick={() => recheck(domain.id)}>复检</ActionButton></div></div>)}</div></Panel>
    </WorkspacePage>
  );
}

export function OpsResourcePage() {
  const [resources, setResources, meta] = useSqliteState<ResourceMonitor[]>("data-agent.ops-monitor.resource", resourceRecords);
  const [selectedId, setSelectedId] = useState(resources[0]?.id ?? "");
  const selected = resources.find((resource) => resource.id === selectedId) ?? resources[0];
  const loadTrend = [52, 58, 61, 69, 73, 68, 76, 82, 79, selected ? numeric(selected.usage) : 0];

  function refresh() {
    if (!selected) return;
    setResources((current) => current.map((resource) => resource.id === selected.id ? { ...resource, status: "检测中", updatedAt: "刚刚" } : resource));
    window.setTimeout(() => setResources((current) => current.map((resource) => resource.id === selected.id ? { ...resource, status: numeric(resource.usage) >= 90 ? "过载" : numeric(resource.usage) >= 80 ? "关注" : "正常", updatedAt: "刚刚" } : resource)), 600);
  }

  return (
    <WorkspacePage>
      <PageTitle eyebrow="Operations / Resource Pools" title="计算资源态势" description="资源池、负载曲线和排队作业组成同一个调度视图，用于判断扩容、限流和队列优先级。" actions={<ActionButton icon={RefreshCw} onClick={refresh}>刷新当前资源池</ActionButton>} />
      <InlineNotice error={meta.error} loading={!meta.hydrated} />
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{resources.map((resource) => { const usage = numeric(resource.usage); return <button key={resource.id} type="button" onClick={() => setSelectedId(resource.id)} className={cn("rounded-lg border bg-card p-4 text-left shadow-sm transition", selected?.id === resource.id ? "border-primary ring-2 ring-primary/10" : "border-border hover:border-primary/30")}><div className="flex items-center justify-between"><span className={cn("grid h-8 w-8 place-items-center rounded-md", usage >= 90 ? "bg-red-50 text-red-600" : usage >= 80 ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600")}>{resource.resourceType.includes("GPU") ? <Zap className="h-4 w-4" /> : <Cpu className="h-4 w-4" />}</span><Pill tone={statusTone(resource.status)}>{resource.status}</Pill></div><div className="mt-3 text-[11px] font-semibold text-foreground">{resource.name}</div><div className="mt-3 flex items-end justify-between"><span className="text-[27px] font-semibold tabular-nums text-foreground">{resource.usage}</span><span className="text-[9px] text-muted-foreground">{resource.quota}</span></div><ProgressBar value={usage} tone={usage >= 90 ? "red" : usage >= 80 ? "amber" : "blue"} className="mt-2" /><div className="mt-2 text-[9px] text-muted-foreground">队列：{resource.queue}</div></button>; })}</section>
      {selected && <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_360px]">
        <Panel title={`${selected.name} · 负载曲线`} description={`最近 10 个采样点 · ${selected.updatedAt}`} actions={<Pill tone={statusTone(selected.status)}>{selected.status}</Pill>}><div className="flex h-[280px] items-end gap-3 px-6 pb-5 pt-8">{loadTrend.map((value, index) => <div key={index} className="flex h-full flex-1 flex-col justify-end"><div className={cn("w-full rounded-t transition", value >= 90 ? "bg-red-400" : value >= 80 ? "bg-amber-400" : "bg-blue-400")} style={{ height: `${value}%` }} /><div className="mt-2 text-center text-[8px] text-muted-foreground">-{(loadTrend.length - index) * 5}m</div></div>)}</div></Panel>
        <Panel title="资源池详情" description={selected.resourceType}><div className="p-4"><div className="grid grid-cols-2 gap-3">{[["当前负载", selected.usage], ["资源配额", selected.quota], ["排队作业", selected.queue], ["责任团队", selected.owner]].map(([label, value]) => <div key={label} className="rounded-md border border-border bg-muted/20 p-3"><div className="text-[9px] text-muted-foreground">{label}</div><div className="mt-1 text-[11px] font-semibold text-foreground">{value}</div></div>)}</div><div className="mt-4 rounded-lg bg-slate-950 p-3 font-mono text-[9px] leading-5 text-slate-300"><div className="text-emerald-400">resource.mock / healthy</div><div>scheduler queue: {selected.queue}</div><div>quota limit: {selected.quota}</div><div>sample age: &lt; 10s</div></div><div className="mt-4 flex gap-2"><ActionButton icon={Gauge}>调整配额</ActionButton><ActionButton icon={CircleStop}>暂停接单</ActionButton></div></div></Panel>
      </div>}
      <Panel title="队列调度" description="等待资源的作业与优先级"><div className="grid gap-3 p-4 md:grid-cols-3">{[["P0 · 实时", "客户事件流计算", "等待 12s", "blue"], ["P1 · 生产", "风险指标日终汇总", "等待 4m", "amber"], ["P2 · 交互", "Notebook 模型训练", "等待 18m", "red"]].map(([priority, name, wait, tone]) => <div key={name} className="rounded-lg border border-border p-3"><div className="flex items-center justify-between"><Pill tone={tone as "blue" | "amber" | "red"}>{priority}</Pill><span className="text-[9px] text-muted-foreground">{wait}</span></div><div className="mt-3 text-[11px] font-semibold text-foreground">{name}</div><div className="mt-2 flex items-center gap-2 text-[9px] text-muted-foreground"><Server className="h-3 w-3" />{selected?.name}</div></div>)}</div></Panel>
    </WorkspacePage>
  );
}
