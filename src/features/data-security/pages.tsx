import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Archive,
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  ClipboardCheck,
  Clock3,
  Eye,
  FileCheck2,
  FilePlus2,
  Fingerprint,
  Gauge,
  GitCompareArrows,
  LayoutGrid,
  ListChecks,
  LockKeyhole,
  Network,
  Play,
  Plus,
  RefreshCcw,
  Route,
  Save,
  ScanSearch,
  ScrollText,
  Search,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Sparkles,
  Stamp,
  Target,
  UserCheck,
  Users,
  Waves,
} from "lucide-react";

import {
  ActionButton,
  InlineNotice,
  MiniStat,
  PageTitle,
  Panel,
  Pill,
  ProgressBar,
  WorkspacePage,
} from "@/components/data-platform/WorkspacePrimitives";
import { statusTone } from "@/components/data-platform/workspace-utils";
import { cn } from "@/lib/utils";

import { createDraftRecord, SECURITY_PAGE_CONFIGS } from "./catalog";
import {
  calculateEvidenceCompleteness,
  deterministicEvidenceRef,
  nextIncidentPhase,
  stableHash,
  suggestCrossBorderPath,
} from "./rules";
import { useSecurityDomainState } from "./store";
import type {
  SecurityFieldValue,
  SecurityPageConfig,
  SecurityPageKey,
  SecurityRecord,
} from "./types";

function formatField(value: SecurityFieldValue | undefined) {
  if (Array.isArray(value)) return value.join("、");
  if (typeof value === "boolean") return value ? "是" : "否";
  return value === null || value === undefined || value === "" ? "—" : String(value);
}

type SemanticLayout = "matrix" | "approval" | "flow" | "report" | "execution" | "incident";

const SEMANTIC_LAYOUTS: Partial<Record<Exclude<SecurityPageKey, "overview">, SemanticLayout>> = {
  compliance: "matrix",
  "compliance-reviews": "approval",
  "personal-information": "matrix",
  "important-data": "approval",
  "cross-border": "flow",
  "classification-reviews": "approval",
  "classification-rules": "matrix",
  "classification-reports": "report",
  protection: "matrix",
  "access-control": "matrix",
  encryption: "matrix",
  watermark: "flow",
  risk: "approval",
  audit: "execution",
  "audit-executions": "execution",
  "audit-evidence": "matrix",
  "audit-reports": "report",
  "audit-findings": "approval",
  incidents: "incident",
  "incident-sop": "flow",
  "incident-notifications": "flow",
  "incident-drills": "execution",
};

function SecurityCollectionPage({ pageKey }: { pageKey: Exclude<SecurityPageKey, "overview"> }) {
  const config = SECURITY_PAGE_CONFIGS[pageKey];
  const [state, setState, meta] = useSecurityDomainState(config.domain);
  const records = useMemo(() => state.collections[pageKey] ?? [], [pageKey, state.collections]);
  const [selectedId, setSelectedId] = useState(records[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("全部状态");
  const selected = records.find((record) => record.id === selectedId) ?? records[0];
  const statuses = useMemo(
    () => ["全部状态", ...Array.from(new Set(records.map((record) => record.status)))],
    [records],
  );
  const filtered = records.filter((record) => {
    const matchesSearch = !search || `${record.name}${record.summary}${record.owner}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (statusFilter === "全部状态" || record.status === statusFilter);
  });

  function updateRecords(
    action: string,
    updater: (current: SecurityRecord[]) => SecurityRecord[],
    result = "已写入 SQLite mock 状态",
  ) {
    setState((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      collections: { ...current.collections, [pageKey]: updater(current.collections[pageKey] ?? []) },
      activity: [
        {
          id: `${pageKey}-${Date.now()}`,
          pageKey,
          action,
          actor: "当前用户（mock）",
          result,
          occurredAt: new Date().toISOString(),
        },
        ...current.activity,
      ].slice(0, 50),
    }));
  }

  function patchSelected(patch: Partial<SecurityRecord>, action: string) {
    if (!selected) return;
    updateRecords(action, (current) => current.map((record) => (
      record.id === selected.id ? { ...record, ...patch, updatedAt: "刚刚" } : record
    )));
  }

  function addRecord() {
    const draft = createDraftRecord(config, records.length + 1);
    updateRecords(config.createLabel, (current) => [draft, ...current]);
    setSelectedId(draft.id);
    setStatusFilter("全部状态");
    setSearch("");
  }

  function execute() {
    if (!selected || selected.status === config.runningStatus) return;
    const recordId = selected.id;
    patchSelected({ status: config.runningStatus }, config.runLabel);

    window.setTimeout(() => {
      updateRecords(`${config.runLabel}完成`, (current) => current.map((record) => {
        if (record.id !== recordId) return record;
        const fields = { ...record.fields };
        const evidenceRef = deterministicEvidenceRef(pageKey, record.id, record.version);

        if (config.variant === "cross-border") fields.建议路径 = suggestCrossBorderPath(record);
        if (config.variant === "incident") fields.当前阶段 = nextIncidentPhase(String(record.fields.当前阶段 ?? "研判"));
        if (config.variant === "watermark") fields.最近追踪号 = `WM-${stableHash(`${record.id}:${record.version}`).slice(0, 8).toUpperCase()}`;
        if (config.variant === "classification") fields.置信度 = `${90 + (Number.parseInt(stableHash(record.id).slice(-2), 16) % 9)}%`;
        if (config.variant === "audit-report") {
          const completeness = calculateEvidenceCompleteness(record);
          fields.证据完整度 = completeness === null ? "未知 / 证据不足" : `${completeness}%`;
        }

        return {
          ...record,
          status: config.completedStatus,
          fields,
          evidenceState: record.evidenceState === "缺失" ? "待核验" : record.evidenceState,
          evidenceRefs: record.evidenceRefs.includes(evidenceRef)
            ? record.evidenceRefs
            : [...record.evidenceRefs, evidenceRef],
          updatedAt: "刚刚",
        };
      }), "确定性 mock 执行完成，已生成证据引用");
    }, 550);
  }

  function submitReview() {
    patchSelected({ status: "待复核" }, "提交复核");
  }

  function addEvidence() {
    if (!selected) return;
    const evidenceRef = deterministicEvidenceRef(pageKey, selected.id, selected.version + selected.evidenceRefs.length + 1);
    patchSelected(
      {
        evidenceRefs: [...selected.evidenceRefs, evidenceRef],
        evidenceState: "待核验",
      },
      "补充证据引用",
    );
  }

  function archiveRecord() {
    patchSelected({ status: "已归档" }, "归档记录");
  }

  const activeCount = records.filter((record) => /生效|成功|完成|批准|发布|通过|复盘|核验/.test(record.status)).length;
  const pendingCount = records.filter((record) => /待|草稿|中|不足|预警/.test(record.status)).length;
  const gapCount = records.filter((record) => /缺失|失败/.test(record.evidenceState)).length;

  const specializedProps: SpecializedWorkspaceProps = {
    config,
    records,
    filtered,
    selected,
    selectedId,
    statuses,
    search,
    statusFilter,
    error: meta.error,
    loading: !meta.hydrated,
    setSelectedId,
    setSearch,
    setStatusFilter,
    addRecord,
    execute,
    submitReview,
    addEvidence,
    archiveRecord,
  };

  if (pageKey === "classification") return <ClassificationWorkspace {...specializedProps} />;
  if (pageKey === "masking") return <MaskingWorkspace {...specializedProps} />;
  const semanticLayout = SEMANTIC_LAYOUTS[pageKey];
  if (semanticLayout) return <SemanticWorkspace layout={semanticLayout} {...specializedProps} />;

  return (
    <WorkspacePage>
      <PageTitle
        eyebrow={config.eyebrow}
        title={config.title}
        description={config.description}
        actions={<ActionButton primary icon={Plus} onClick={addRecord}>{config.createLabel}</ActionButton>}
      />
      <InlineNotice error={meta.error} loading={!meta.hydrated} />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat label="记录总数" value={records.length} icon={ListChecks} />
        <MiniStat label="已完成/生效" value={activeCount} icon={CheckCircle2} tone="green" />
        <MiniStat label="待处理" value={pendingCount} icon={ClipboardCheck} tone="amber" />
        <MiniStat label="证据缺口" value={gapCount} icon={AlertTriangle} tone={gapCount ? "red" : "green"} />
      </section>

      <div className="grid min-h-[620px] gap-4 xl:grid-cols-[minmax(0,1.45fr)_390px]">
        <Panel
          title={`${config.title}台账`}
          description="列表、详情、执行与证据记录统一持久化"
          actions={(
            <div className="flex flex-wrap gap-2">
              <label className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="搜索名称或责任人"
                  className="h-8 w-44 rounded-md border border-input bg-background pl-8 pr-2 text-[11px] outline-none focus:border-primary"
                />
              </label>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-[11px] outline-none focus:border-primary"
              >
                {statuses.map((status) => <option key={status}>{status}</option>)}
              </select>
            </div>
          )}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[11px]">
              <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">名称</th>
                  {config.columns.map((column) => <th key={column.key} className="px-3 py-3 font-medium">{column.label}</th>)}
                  <th className="px-3 py-3 font-medium">责任人</th>
                  <th className="px-3 py-3 font-medium">证据</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((record) => (
                  <tr
                    key={record.id}
                    onClick={() => setSelectedId(record.id)}
                    className={cn(
                      "cursor-pointer transition hover:bg-muted/30",
                      selected?.id === record.id && "bg-blue-50/70",
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{record.name}</div>
                      <div className="mt-1 max-w-[320px] truncate text-[9px] text-muted-foreground">v{record.version} · {record.summary}</div>
                    </td>
                    {config.columns.map((column) => (
                      <td key={column.key} className="max-w-[180px] px-3 py-3 text-muted-foreground">
                        <span className="line-clamp-2">{formatField(record.fields[column.key])}</span>
                      </td>
                    ))}
                    <td className="px-3 py-3 text-muted-foreground">{record.owner}</td>
                    <td className="px-3 py-3"><Pill tone={statusTone(record.evidenceState)}>{record.evidenceState}</Pill></td>
                    <td className="px-4 py-3"><Pill tone={statusTone(record.status)}>{record.status}</Pill></td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr><td colSpan={config.columns.length + 4} className="px-4 py-16 text-center text-muted-foreground">没有符合条件的记录</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        {selected ? (
          <Panel
            title="记录详情与举证"
            description={`${selected.id} · 更新于 ${selected.updatedAt}`}
            actions={<Pill tone={statusTone(selected.status)}>{selected.status}</Pill>}
          >
            <div className="space-y-4 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-[10px] text-muted-foreground">
                  名称
                  <input
                    value={selected.name}
                    onChange={(event) => patchSelected({ name: event.target.value }, "编辑名称")}
                    className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-[11px] text-foreground outline-none focus:border-primary"
                  />
                </label>
                <label className="text-[10px] text-muted-foreground">
                  责任人
                  <input
                    value={selected.owner}
                    onChange={(event) => patchSelected({ owner: event.target.value }, "编辑责任人")}
                    className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-[11px] text-foreground outline-none focus:border-primary"
                  />
                </label>
              </div>

              <div className="rounded-md border border-border bg-muted/20 p-3">
                <div className="text-[10px] font-semibold text-foreground">范围与判断事实</div>
                <dl className="mt-2 grid gap-2">
                  {Object.entries(selected.fields).map(([key, value]) => (
                    <div key={key} className="grid grid-cols-[108px_minmax(0,1fr)] gap-2 text-[10px] leading-5">
                      <dt className="text-muted-foreground">{key}</dt>
                      <dd className="break-words text-foreground">{formatField(value)}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <VariantDetail config={config} record={selected} />

              <div>
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-semibold text-foreground">证据引用</div>
                  <Pill tone={statusTone(selected.evidenceState)}>{selected.evidenceState}</Pill>
                </div>
                <div className="mt-2 space-y-2">
                  {selected.evidenceRefs.map((reference) => (
                    <div key={reference} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 font-mono text-[9px] text-muted-foreground">
                      <FileCheck2 className="h-3.5 w-3.5 text-primary" />{reference}<span className="ml-auto">masked ref</span>
                    </div>
                  ))}
                  {!selected.evidenceRefs.length && <div className="rounded-md border border-dashed border-amber-200 bg-amber-50 p-3 text-[10px] text-amber-700">尚无证据引用，指标应显示未知或证据不足，不按 0 处理。</div>}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                <ActionButton primary icon={Play} onClick={execute} disabled={selected.status === config.runningStatus}>
                  {selected.status === config.runningStatus ? `${config.runningStatus}…` : config.runLabel}
                </ActionButton>
                <ActionButton icon={Save} onClick={submitReview}>提交复核</ActionButton>
                <ActionButton icon={FilePlus2} onClick={addEvidence}>补充证据</ActionButton>
                <ActionButton icon={Archive} onClick={archiveRecord}>归档</ActionButton>
              </div>

              <div className="rounded-md border border-blue-100 bg-blue-50/70 px-3 py-2 text-[9px] leading-5 text-blue-800">
                原型结论用于 DCMM4 就绪度和证据结构演示，不代表认证结果、法律意见或监管批准；所有执行均为确定性 mock。
              </div>
            </div>
          </Panel>
        ) : (
          <Panel title="记录详情"><div className="p-10 text-center text-[11px] text-muted-foreground">选择或新建一条记录</div></Panel>
        )}
      </div>
    </WorkspacePage>
  );
}

type SpecializedWorkspaceProps = {
  config: SecurityPageConfig;
  records: SecurityRecord[];
  filtered: SecurityRecord[];
  selected?: SecurityRecord;
  selectedId: string;
  statuses: string[];
  search: string;
  statusFilter: string;
  error?: Error | null;
  loading: boolean;
  setSelectedId: (value: string) => void;
  setSearch: (value: string) => void;
  setStatusFilter: (value: string) => void;
  addRecord: () => void;
  execute: () => void;
  submitReview: () => void;
  addEvidence: () => void;
  archiveRecord: () => void;
};

function WorkspaceFilters({ search, statusFilter, statuses, setSearch, setStatusFilter }: Pick<SpecializedWorkspaceProps, "search" | "statusFilter" | "statuses" | "setSearch" | "setStatusFilter">) {
  return (
    <div className="flex flex-wrap gap-2">
      <label className="relative">
        <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索名称或责任人" className="h-8 w-44 rounded-md border border-input bg-background pl-8 pr-2 text-[11px] outline-none focus:border-primary" />
      </label>
      <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-[11px] outline-none focus:border-primary">
        {statuses.map((status) => <option key={status}>{status}</option>)}
      </select>
    </div>
  );
}

function ClassificationWorkspace(props: SpecializedWorkspaceProps) {
  const categories = Array.from(new Set(props.records.flatMap((record) => {
    const value = record.fields.分类标签;
    return Array.isArray(value) ? value : [String(value ?? "待识别")];
  })));
  const levels = Array.from(new Set(props.records.map((record) => String(record.fields.监管等级 ?? "待识别"))));

  return (
    <WorkspacePage>
      <PageTitle eyebrow={props.config.eyebrow} title={props.config.title} description={props.config.description} actions={<ActionButton primary icon={Plus} onClick={props.addRecord}>{props.config.createLabel}</ActionButton>} />
      <InlineNotice error={props.error} loading={props.loading} />
      <div className="grid min-h-[650px] gap-4 xl:grid-cols-[245px_minmax(0,1fr)_370px]">
        <Panel title="双轴分类体系" description="业务分类 × 监管等级">
          <div className="p-3">
            <div className="text-[10px] font-semibold text-muted-foreground">分类标签</div>
            <div className="mt-2 space-y-1">
              {categories.map((category) => {
                const count = props.records.filter((record) => {
                  const value = record.fields.分类标签;
                  return Array.isArray(value) ? value.includes(category) : String(value) === category;
                }).length;
                return <div key={category} className="flex items-center gap-2 rounded-md px-3 py-2 text-[11px] text-foreground hover:bg-muted/50"><Fingerprint className="h-3.5 w-3.5 text-primary" /><span className="min-w-0 flex-1 truncate">{category}</span><span className="text-[9px] tabular-nums text-muted-foreground">{count}</span></div>;
              })}
            </div>
          </div>
          <div className="border-t border-border p-4">
            <div className="text-[10px] font-semibold text-muted-foreground">等级候选分布</div>
            <div className="mt-3 space-y-3">
              {levels.map((level) => {
                const count = props.records.filter((record) => String(record.fields.监管等级 ?? "待识别") === level).length;
                const percent = count / Math.max(props.records.length, 1) * 100;
                return <div key={level}><div className="mb-1 flex justify-between text-[9px]"><span className="truncate text-foreground">{level}</span><span className="text-muted-foreground">{count}</span></div><ProgressBar value={percent} tone={/重要|核心/.test(level) ? "red" : "blue"} /></div>;
              })}
            </div>
          </div>
        </Panel>

        <Panel title="识别候选对象" description="以候选卡片呈现规则判断与证据缺口" actions={<WorkspaceFilters {...props} />}>
          <div className="grid gap-3 p-4 md:grid-cols-2">
            {props.filtered.map((record) => {
              const labels = Array.isArray(record.fields.分类标签) ? record.fields.分类标签 : [String(record.fields.分类标签 ?? "待识别")];
              return (
                <button key={record.id} type="button" onClick={() => props.setSelectedId(record.id)} className={cn("rounded-lg border p-4 text-left transition hover:border-primary/40", props.selectedId === record.id ? "border-primary bg-blue-50/60 ring-2 ring-primary/10" : "border-border bg-card")}>
                  <div className="flex items-start justify-between gap-2"><span className="text-[12px] font-semibold text-foreground">{record.name}</span><Pill tone={statusTone(record.status)}>{record.status}</Pill></div>
                  <p className="mt-2 line-clamp-2 text-[10px] leading-5 text-muted-foreground">{record.summary}</p>
                  <div className="mt-3 flex flex-wrap gap-1">{labels.map((label) => <Pill key={label} tone="blue">{label}</Pill>)}<Pill tone={/重要|核心/.test(String(record.fields.监管等级)) ? "red" : "amber"}>{formatField(record.fields.监管等级)}</Pill></div>
                  <div className="mt-4 flex items-center justify-between text-[9px] text-muted-foreground"><span>{record.owner}</span><span>{formatField(record.fields.置信度)} · {record.evidenceState}</span></div>
                </button>
              );
            })}
            {!props.filtered.length && <div className="col-span-full py-16 text-center text-[11px] text-muted-foreground">没有符合条件的识别对象</div>}
          </div>
        </Panel>

        <Panel title="判断与证据链" description={props.selected?.name ?? "请选择识别对象"} actions={props.selected ? <Pill tone={statusTone(props.selected.status)}>{props.selected.status}</Pill> : undefined}>
          {props.selected ? <div className="space-y-4 p-4">
            <div className="rounded-lg bg-slate-950 p-4 text-slate-200"><div className="flex items-center gap-2 text-[10px] text-blue-300"><ShieldCheck className="h-4 w-4" />识别结果摘要</div><div className="mt-3 text-[18px] font-semibold">{formatField(props.selected.fields.监管等级)}</div><div className="mt-2 font-mono text-[9px] leading-5 text-slate-400">confidence = {formatField(props.selected.fields.置信度)}<br />rule = {formatField(props.selected.fields.规则版本)}<br />secret_value = *** never stored ***</div></div>
            <VariantDetail config={props.config} record={props.selected} />
            <div><div className="text-[10px] font-semibold text-foreground">审批证据链</div><div className="mt-3 space-y-3">{[["规则识别", "已记录"], ["数据负责人复核", /待|旧版/.test(props.selected.status) ? "待处理" : "已完成"], ["安全负责人批准", /重要|核心/.test(String(props.selected.fields.监管等级)) ? "必需" : "抽样"]].map(([step, state], index) => <div key={step} className="flex items-center gap-3"><span className={cn("grid h-6 w-6 place-items-center rounded-full border text-[9px]", state === "已完成" || state === "已记录" ? "border-emerald-200 bg-emerald-50 text-emerald-600" : "border-amber-200 bg-amber-50 text-amber-600")}>{index + 1}</span><div><div className="text-[10px] font-medium text-foreground">{step}</div><div className="text-[9px] text-muted-foreground">{state}</div></div></div>)}</div></div>
            <div className="rounded-md border border-border p-3"><div className="flex justify-between text-[10px]"><span className="font-semibold text-foreground">证据引用</span><Pill tone={statusTone(props.selected.evidenceState)}>{props.selected.evidenceState}</Pill></div><div className="mt-2 text-[9px] leading-5 text-muted-foreground">{props.selected.evidenceRefs.length ? props.selected.evidenceRefs.join(" · ") : "暂无证据引用，不能按 0 处理"}</div></div>
            <div className="flex flex-wrap gap-2"><ActionButton primary icon={Play} onClick={props.execute}>{props.config.runLabel}</ActionButton><ActionButton icon={Save} onClick={props.submitReview}>提交复核</ActionButton><ActionButton icon={FilePlus2} onClick={props.addEvidence}>补充证据</ActionButton></div>
          </div> : <div className="p-10 text-center text-[11px] text-muted-foreground">选择或新建一条识别任务</div>}
        </Panel>
      </div>
    </WorkspacePage>
  );
}

function MaskingWorkspace(props: SpecializedWorkspaceProps) {
  return (
    <WorkspacePage>
      <PageTitle eyebrow={props.config.eyebrow} title="脱敏策略设计台" description={props.config.description} actions={<ActionButton primary icon={Plus} onClick={props.addRecord}>{props.config.createLabel}</ActionButton>} />
      <InlineNotice error={props.error} loading={props.loading} />
      <div className="grid min-h-[620px] gap-4 xl:grid-cols-[350px_minmax(0,1fr)]">
        <Panel title="策略库" description={`${props.records.length} 条静态/动态脱敏策略`} actions={<WorkspaceFilters {...props} />}>
          <div className="divide-y divide-border">
            {props.filtered.map((record) => <button key={record.id} type="button" onClick={() => props.setSelectedId(record.id)} className={cn("w-full p-4 text-left hover:bg-muted/30", props.selectedId === record.id && "border-l-2 border-primary bg-blue-50/60 pl-[14px]")}><div className="flex items-start justify-between gap-2"><span className="text-[11px] font-semibold text-foreground">{record.name}</span><Pill tone={statusTone(record.status)}>{record.status}</Pill></div><div className="mt-2 flex items-center gap-2 text-[9px] text-muted-foreground"><Fingerprint className="h-3 w-3" />{formatField(record.fields.脱敏方式)}</div><div className="mt-2 flex items-center justify-between text-[9px] text-muted-foreground"><span className="truncate">{formatField(record.fields.适用范围)}</span><span>{formatField(record.fields.覆盖字段)} 字段</span></div></button>)}
          </div>
        </Panel>
        {props.selected ? <div className="space-y-4">
          <Panel title={props.selected.name} description={`${formatField(props.selected.fields.脱敏方式)} · ${formatField(props.selected.fields.适用范围)}`} actions={<div className="flex gap-2"><ActionButton icon={Save} onClick={props.submitReview}>提交复核</ActionButton><ActionButton primary icon={ShieldCheck} onClick={props.execute}>{props.config.runLabel}</ActionButton></div>}>
            <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div><div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Masking preview</div><VariantDetail config={props.config} record={props.selected} /><div className="mt-5 rounded-lg border border-border p-4"><div className="text-[10px] font-semibold text-foreground">处理流水线</div><div className="mt-4 grid grid-cols-3 gap-2">{[["字段匹配", ScanSearch], [formatField(props.selected.fields.脱敏方式), Fingerprint], ["受控输出", ShieldCheck]].map(([label, Icon]) => { const Component = Icon as typeof Fingerprint; return <div key={label as string} className="rounded-md bg-muted/50 p-3 text-center"><Component className="mx-auto h-4 w-4 text-primary" /><div className="mt-2 truncate text-[9px] text-foreground">{label as string}</div></div>; })}</div></div></div>
              <div className="space-y-3"><div className="rounded-lg border border-border bg-slate-950 p-4 text-slate-200"><div className="flex items-center gap-2 text-[10px] text-blue-300"><LockKeyhole className="h-4 w-4" />安全边界</div><div className="mt-3 font-mono text-[9px] leading-5 text-slate-400">source_value = ***<br />key_material = ***<br />preview = deterministic mock</div></div><div className="rounded-lg border border-blue-100 bg-blue-50/70 p-4"><div className="text-[10px] font-semibold text-blue-900">策略适用范围</div><div className="mt-2 text-[10px] leading-5 text-blue-800">{formatField(props.selected.fields.适用范围)}<br />覆盖 {formatField(props.selected.fields.覆盖字段)} 个字段<br />责任人 {props.selected.owner}</div></div><Pill tone={statusTone(props.selected.status)}>{props.selected.status}</Pill></div>
            </div>
          </Panel>
          <div className="grid gap-4 lg:grid-cols-2"><Panel title="覆盖与证据"><div className="p-4"><div className="flex items-end justify-between"><span className="text-[10px] text-muted-foreground">证据完整度</span><span className="text-[24px] font-semibold text-foreground">{props.selected.evidenceRefs.length ? "87%" : "未知"}</span></div><ProgressBar value={props.selected.evidenceRefs.length ? 87 : 0} tone={props.selected.evidenceRefs.length ? "green" : "amber"} className="mt-2" /><div className="mt-3 text-[9px] leading-5 text-muted-foreground">{props.selected.evidenceRefs.length ? props.selected.evidenceRefs.join(" · ") : "暂无证据引用，发布门禁保持未通过"}</div><ActionButton icon={FilePlus2} onClick={props.addEvidence}>补充证据</ActionButton></div></Panel><Panel title="发布门禁"><div className="space-y-2 p-4">{[["范围已选择", true], ["原始样例不保存", true], ["证据引用有效", props.selected.evidenceRefs.length > 0], ["审批状态完成", /生效|通过/.test(props.selected.status)]].map(([label, ok]) => <div key={label as string} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-[9px]"><span>{label as string}</span>{ok ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}</div>)}</div></Panel></div>
        </div> : <Panel title="策略详情"><div className="p-10 text-center text-[11px] text-muted-foreground">选择或新建一条脱敏策略</div></Panel>}
      </div>
    </WorkspacePage>
  );
}

function SemanticWorkspace(props: SpecializedWorkspaceProps & { layout: SemanticLayout }) {
  if (props.layout === "matrix") return <MatrixWorkspace {...props} />;
  if (props.layout === "approval") return <ApprovalWorkspace {...props} />;
  if (props.layout === "flow") return <FlowWorkspace {...props} />;
  if (props.layout === "report") return <ReportWorkspace {...props} />;
  if (props.layout === "execution") return <ExecutionWorkspace {...props} />;
  return <IncidentWorkspace {...props} />;
}

const MATRIX_COPY: Partial<Record<SecurityPageKey, { library: string; canvas: string; inspector: string }>> = {
  compliance: { library: "规则包与清单", canvas: "适用性控制矩阵", inspector: "证据映射" },
  "personal-information": { library: "处理活动目录", canvas: "个人信息处理生命周期", inspector: "影响评估与接收方" },
  "classification-rules": { library: "规则版本库", canvas: "规则树与命中逻辑", inspector: "发布检查" },
  protection: { library: "等级控制基线", canvas: "分类等级 × 防护控制矩阵", inspector: "覆盖与例外" },
  "access-control": { library: "授权策略", canvas: "主体 × 对象 × 目的矩阵", inspector: "模拟校验" },
  encryption: { library: "加密策略", canvas: "加密层级与算法矩阵", inspector: "密钥轮换证据" },
  "audit-evidence": { library: "证据来源目录", canvas: "期间 × 行为 × 来源矩阵", inspector: "完整性校验" },
};

function MatrixWorkspace(props: SpecializedWorkspaceProps) {
  const copy = MATRIX_COPY[props.config.key] ?? { library: "控制目录", canvas: "控制矩阵", inspector: "检查结果" };
  return (
    <WorkspacePage>
      <PageTitle eyebrow={props.config.eyebrow} title={props.config.title} description={props.config.description} actions={<ActionButton primary icon={Plus} onClick={props.addRecord}>{props.config.createLabel}</ActionButton>} />
      <InlineNotice error={props.error} loading={props.loading} />
      <div className="grid min-h-[650px] gap-4 xl:grid-cols-[270px_minmax(0,1fr)_360px]">
        <Panel title={copy.library} description={`${props.records.length} 个版本化对象`} actions={<WorkspaceFilters {...props} />}>
          <div className="divide-y divide-border">
            {props.filtered.map((record) => (
              <button key={record.id} type="button" onClick={() => props.setSelectedId(record.id)} className={cn("w-full p-4 text-left transition hover:bg-muted/30", props.selectedId === record.id && "border-l-2 border-primary bg-blue-50/60 pl-[14px]")}>
                <div className="flex items-start gap-2"><LayoutGrid className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><div className="min-w-0 flex-1"><div className="text-[11px] font-semibold text-foreground">{record.name}</div><div className="mt-1 line-clamp-2 text-[9px] leading-4 text-muted-foreground">{record.summary}</div></div></div>
                <div className="mt-3 flex items-center justify-between"><span className="text-[9px] text-muted-foreground">v{record.version} · {record.owner}</span><Pill tone={statusTone(record.status)}>{record.status}</Pill></div>
              </button>
            ))}
          </div>
        </Panel>

        <Panel title={copy.canvas} description="控制关系和覆盖状态按业务维度展开，不折叠成普通台账">
          <div className="p-4">
            <div className="grid grid-cols-[minmax(170px,1.2fr)_repeat(3,minmax(90px,1fr))] rounded-md bg-slate-900 px-3 py-2 text-[9px] font-medium text-slate-300">
              <span>对象 / 控制</span><span>{props.config.columns[0]?.label ?? "范围"}</span><span>{props.config.columns[1]?.label ?? "策略"}</span><span>证据状态</span>
            </div>
            <div className="mt-2 space-y-2">
              {props.records.map((record) => (
                <button key={record.id} type="button" onClick={() => props.setSelectedId(record.id)} className={cn("grid w-full grid-cols-[minmax(170px,1.2fr)_repeat(3,minmax(90px,1fr))] items-center rounded-md border px-3 py-3 text-left text-[10px] transition", props.selectedId === record.id ? "border-primary bg-blue-50/60" : "border-border hover:border-primary/30")}>
                  <span className="pr-3 font-medium text-foreground">{record.name}</span>
                  <span className="truncate pr-2 text-muted-foreground">{formatField(record.fields[props.config.columns[0]?.key])}</span>
                  <span className="truncate pr-2 text-muted-foreground">{formatField(record.fields[props.config.columns[1]?.key])}</span>
                  <span><Pill tone={statusTone(record.evidenceState)}>{record.evidenceState}</Pill></span>
                </button>
              ))}
            </div>
            <div className="mt-5 rounded-lg border border-dashed border-border bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-[10px] font-semibold text-foreground"><Network className="h-4 w-4 text-primary" />矩阵解释</div>
              <div className="mt-2 text-[9px] leading-5 text-muted-foreground">行表示受控对象或规则版本，列表示业务控制维度。证据不足保持未知，不以“0”替代。</div>
            </div>
          </div>
        </Panel>

        <Panel title={copy.inspector} description={props.selected?.name ?? "请选择矩阵项"} actions={props.selected ? <Pill tone={statusTone(props.selected.status)}>{props.selected.status}</Pill> : undefined}>
          {props.selected ? <div className="space-y-4 p-4">
            <RecordFacts record={props.selected} />
            <VariantDetail config={props.config} record={props.selected} />
            <EvidenceBlock record={props.selected} />
            <div className="flex flex-wrap gap-2"><ActionButton primary icon={Play} onClick={props.execute}>{props.config.runLabel}</ActionButton><ActionButton icon={FilePlus2} onClick={props.addEvidence}>补充证据</ActionButton><ActionButton icon={Save} onClick={props.submitReview}>提交复核</ActionButton></div>
          </div> : <EmptySelection label="选择一个控制项查看映射关系" />}
        </Panel>
      </div>
    </WorkspacePage>
  );
}

const APPROVAL_COPY: Partial<Record<SecurityPageKey, { lanes: [string, string, string]; dossier: string }>> = {
  "compliance-reviews": { lanes: ["待审查", "整改与复核", "已形成结论"], dossier: "审查工作底稿" },
  "important-data": { lanes: ["数据负责人确认", "安全负责人审批", "已形成版本"], dossier: "重要数据候选依据" },
  "classification-reviews": { lanes: ["低置信与冲突", "双人审批", "抽样已完成"], dossier: "分类判断与审批链" },
  risk: { lanes: ["新风险", "处置中", "已接受或关闭"], dossier: "风险处置档案" },
  "audit-findings": { lanes: ["待整改", "待独立复核", "已关闭"], dossier: "整改与验证档案" },
};

function approvalLane(record: SecurityRecord) {
  if (/完成|批准|关闭|生效|已复核|已评估|已记录/.test(record.status)) return 2;
  if (/中|安全负责人|整改|复核/.test(record.status)) return 1;
  return 0;
}

function ApprovalWorkspace(props: SpecializedWorkspaceProps) {
  const copy = APPROVAL_COPY[props.config.key] ?? { lanes: ["待处理", "处理中", "已完成"], dossier: "审批档案" };
  return (
    <WorkspacePage>
      <PageTitle eyebrow={props.config.eyebrow} title={props.config.title} description={props.config.description} actions={<ActionButton primary icon={Plus} onClick={props.addRecord}>{props.config.createLabel}</ActionButton>} />
      <InlineNotice error={props.error} loading={props.loading} />
      <div className="grid gap-4 lg:grid-cols-3">
        {copy.lanes.map((lane, laneIndex) => {
          const laneRecords = props.filtered.filter((record) => approvalLane(record) === laneIndex);
          return <Panel key={lane} title={lane} description={`${laneRecords.length} 个对象`} actions={<span className={cn("h-2 w-2 rounded-full", laneIndex === 0 ? "bg-amber-500" : laneIndex === 1 ? "bg-blue-500" : "bg-emerald-500")} />}>
            <div className="min-h-[250px] space-y-3 bg-muted/20 p-3">
              {laneRecords.map((record) => <button key={record.id} type="button" onClick={() => props.setSelectedId(record.id)} className={cn("w-full rounded-lg border bg-card p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40", props.selectedId === record.id && "border-primary ring-2 ring-primary/10")}><div className="flex items-start justify-between gap-2"><span className="text-[11px] font-semibold text-foreground">{record.name}</span><Pill tone={statusTone(record.evidenceState)}>{record.evidenceState}</Pill></div><p className="mt-2 line-clamp-2 text-[9px] leading-4 text-muted-foreground">{record.summary}</p><div className="mt-3 flex items-center justify-between text-[9px] text-muted-foreground"><span>{record.owner}</span><span>{record.updatedAt}</span></div></button>)}
              {!laneRecords.length && <div className="grid min-h-[160px] place-items-center rounded-md border border-dashed border-border text-[10px] text-muted-foreground">当前泳道为空</div>}
            </div>
          </Panel>;
        })}
      </div>

      <Panel title={copy.dossier} description="卡片在职责分离泳道中流转，详情区保留判断依据和证据">
        {props.selected ? <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1.2fr)_360px]">
          <div className="space-y-4"><div className="flex items-center justify-between"><div><div className="text-[15px] font-semibold text-foreground">{props.selected.name}</div><div className="mt-1 text-[10px] text-muted-foreground">{props.selected.summary}</div></div><Pill tone={statusTone(props.selected.status)}>{props.selected.status}</Pill></div><RecordFacts record={props.selected} /><div className="rounded-lg border border-border p-4"><div className="text-[10px] font-semibold text-foreground">职责分离记录</div><div className="mt-4 grid grid-cols-3 gap-2">{copy.lanes.map((lane, index) => <div key={lane} className={cn("rounded-md p-3 text-center text-[9px]", index <= approvalLane(props.selected!) ? "bg-blue-50 text-blue-800" : "bg-muted/40 text-muted-foreground")}><UserCheck className="mx-auto h-4 w-4" /><div className="mt-2">{lane}</div></div>)}</div></div></div>
          <div className="space-y-4"><EvidenceBlock record={props.selected} /><VariantDetail config={props.config} record={props.selected} /><div className="flex flex-wrap gap-2"><ActionButton primary icon={UserCheck} onClick={props.submitReview}>推进审批</ActionButton><ActionButton icon={FilePlus2} onClick={props.addEvidence}>补充依据</ActionButton><ActionButton icon={Archive} onClick={props.archiveRecord}>归档</ActionButton></div></div>
        </div> : <EmptySelection label="从审批泳道中选择一个对象" />}
      </Panel>
    </WorkspacePage>
  );
}

const FLOW_STEPS: Partial<Record<SecurityPageKey, string[]>> = {
  "cross-border": ["关键事实", "规则包匹配", "路径建议", "法务与安全复核", "冻结评估版本"],
  watermark: ["选择数据对象", "配置水印模板", "模拟嵌入", "验证提取", "关联追踪记录"],
  "incident-sop": ["信号研判", "控制影响", "恢复验证", "通知判断", "复盘改进"],
  "incident-notifications": ["识别通知义务", "匹配法源时限", "法务确认", "模拟通知", "固化实际记录"],
};

function FlowWorkspace(props: SpecializedWorkspaceProps) {
  const steps = FLOW_STEPS[props.config.key] ?? ["输入事实", "规则判断", "内部复核", "形成版本"];
  return (
    <WorkspacePage>
      <PageTitle eyebrow={props.config.eyebrow} title={props.config.title} description={props.config.description} actions={<ActionButton primary icon={Plus} onClick={props.addRecord}>{props.config.createLabel}</ActionButton>} />
      <InlineNotice error={props.error} loading={props.loading} />
      <div className="grid min-h-[640px] gap-4 xl:grid-cols-[285px_minmax(0,1fr)_380px]">
        <Panel title="场景与版本" description="切换场景不会覆盖历史评估">
          <div className="p-3"><WorkspaceFilters {...props} /></div>
          <div className="divide-y divide-border">{props.filtered.map((record) => <button key={record.id} type="button" onClick={() => props.setSelectedId(record.id)} className={cn("w-full p-4 text-left transition hover:bg-muted/30", props.selectedId === record.id && "bg-blue-50/70")}><div className="flex items-start gap-2"><Route className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><div><div className="text-[11px] font-semibold text-foreground">{record.name}</div><div className="mt-1 text-[9px] text-muted-foreground">v{record.version} · {record.owner}</div></div></div><div className="mt-3"><Pill tone={statusTone(record.status)}>{record.status}</Pill></div></button>)}</div>
        </Panel>

        <Panel title="判断流程" description="固定业务步骤，不建设通用工作流引擎">
          {props.selected ? <div className="p-5">
            <div className="rounded-lg border border-border bg-slate-950 p-5 text-slate-200"><div className="text-[10px] font-semibold text-blue-300">CURRENT SCENARIO</div><div className="mt-2 text-[17px] font-semibold">{props.selected.name}</div><div className="mt-1 text-[10px] leading-5 text-slate-400">{props.selected.summary}</div></div>
            <div className="mt-5 space-y-2">{steps.map((step, index) => <div key={step} className="flex items-center gap-3"><span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-semibold", index < 2 ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground")}>{index + 1}</span><div className={cn("flex flex-1 items-center rounded-md border px-4 py-3", index < 2 ? "border-blue-200 bg-blue-50" : "border-border")}><span className="text-[10px] font-medium text-foreground">{step}</span>{index < steps.length - 1 && <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />}</div></div>)}</div>
            <div className="mt-5"><VariantDetail config={props.config} record={props.selected} /></div>
          </div> : <EmptySelection label="选择一个场景开始评估" />}
        </Panel>

        <Panel title="材料与内部决定" description="建议、缺口、审批和证据分别记录">
          {props.selected ? <div className="space-y-4 p-4"><RecordFacts record={props.selected} /><EvidenceBlock record={props.selected} /><div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-[9px] leading-5 text-amber-800">系统输出内部管理建议，不输出监管批准、法律保证或自动归责结论。</div><div className="flex flex-wrap gap-2"><ActionButton primary icon={Sparkles} onClick={props.execute}>{props.config.runLabel}</ActionButton><ActionButton icon={Save} onClick={props.submitReview}>提交双重复核</ActionButton><ActionButton icon={FilePlus2} onClick={props.addEvidence}>补充材料</ActionButton></div></div> : <EmptySelection label="暂无材料清单" />}
        </Panel>
      </div>
    </WorkspacePage>
  );
}

const REPORT_SECTIONS: Partial<Record<SecurityPageKey, string[]>> = {
  "classification-reports": ["范围与排除项", "规则及模型版本", "分类分级结果", "版本差异与影响", "审批记录"],
  "audit-reports": ["执行摘要", "访问/流转/交换行为", "证据完整性与限制", "发现与根因", "整改建议"],
};

function ReportWorkspace(props: SpecializedWorkspaceProps) {
  const sections = REPORT_SECTIONS[props.config.key] ?? ["摘要", "范围", "结果", "限制", "审批"];
  return (
    <WorkspacePage>
      <PageTitle eyebrow={props.config.eyebrow} title={props.config.title} description={props.config.description} actions={<ActionButton primary icon={Plus} onClick={props.addRecord}>{props.config.createLabel}</ActionButton>} />
      <InlineNotice error={props.error} loading={props.loading} />
      <div className="grid min-h-[680px] gap-4 xl:grid-cols-[270px_minmax(0,1fr)_350px]">
        <Panel title="报告版本" description="批准版本冻结，修订形成新版本">
          <div className="divide-y divide-border">{props.filtered.map((record) => <button key={record.id} type="button" onClick={() => props.setSelectedId(record.id)} className={cn("w-full p-4 text-left hover:bg-muted/30", props.selectedId === record.id && "border-l-2 border-primary bg-blue-50/60 pl-[14px]")}><div className="flex items-start gap-2"><ScrollText className="mt-0.5 h-4 w-4 text-primary" /><div><div className="text-[11px] font-semibold text-foreground">{record.name}</div><div className="mt-1 text-[9px] text-muted-foreground">版本 v{record.version}</div></div></div><div className="mt-3 flex justify-between"><Pill tone={statusTone(record.status)}>{record.status}</Pill><span className="text-[9px] text-muted-foreground">{record.updatedAt}</span></div></button>)}</div>
        </Panel>

        <Panel title="报告编制区" description="以报告章节组织事实，不以普通记录表替代报告">
          {props.selected ? <div className="bg-slate-100 p-5"><article className="mx-auto min-h-[590px] max-w-[760px] border border-border bg-white p-8 shadow-sm"><div className="border-b border-slate-900 pb-5"><div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-primary">Security Evidence Report</div><h2 className="mt-2 text-[20px] font-semibold text-slate-950">{props.selected.name}</h2><div className="mt-2 text-[10px] text-slate-500">版本 v{props.selected.version} · 责任人 {props.selected.owner} · {props.selected.updatedAt}</div></div><div className="mt-6 space-y-6">{sections.map((section, index) => <section key={section}><div className="flex items-center gap-2 text-[12px] font-semibold text-slate-900"><span className="font-mono text-[10px] text-primary">0{index + 1}</span>{section}</div><div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-[10px] leading-5 text-slate-600">{index === 0 ? props.selected!.summary : index === 2 ? Object.entries(props.selected!.fields).slice(0, 2).map(([key, value]) => `${key}：${formatField(value)}`).join("；") : "该章节从冻结范围、规则版本和证据引用生成 mock 草稿，需人工复核。"}</div></section>)}</div></article></div> : <EmptySelection label="选择一个报告版本进入编制区" />}
        </Panel>

        <Panel title="生成与复核门禁" description="一键生成只能产生草稿">
          {props.selected ? <div className="space-y-4 p-4"><VariantDetail config={props.config} record={props.selected} /><EvidenceBlock record={props.selected} /><div className="space-y-2">{["范围与期间已冻结", "规则版本已引用", "证据缺口已披露", "审计/业务人员已复核"].map((item, index) => <div key={item} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-[9px]"><span>{item}</span>{index < 2 ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}</div>)}</div><ActionButton primary icon={BookOpenCheck} onClick={props.execute}>{props.config.runLabel}</ActionButton><ActionButton icon={Save} onClick={props.submitReview}>提交复核</ActionButton></div> : <EmptySelection label="暂无报告门禁信息" />}
        </Panel>
      </div>
    </WorkspacePage>
  );
}

const EXECUTION_STEPS: Partial<Record<SecurityPageKey, string[]>> = {
  audit: ["冻结审计范围与期间", "确定团队与抽样", "关联内外部评估", "排期并启动"],
  "audit-executions": ["执行检查表", "记录工作底稿", "采集证据引用", "形成发现与建议"],
  "incident-drills": ["确认演练场景", "发布事件注入", "记录响应结果", "形成改进与复盘"],
};

function ExecutionWorkspace(props: SpecializedWorkspaceProps) {
  const steps = EXECUTION_STEPS[props.config.key] ?? ["准备", "执行", "验证", "归档"];
  return (
    <WorkspacePage>
      <PageTitle eyebrow={props.config.eyebrow} title={props.config.title} description={props.config.description} actions={<ActionButton primary icon={Plus} onClick={props.addRecord}>{props.config.createLabel}</ActionButton>} />
      <InlineNotice error={props.error} loading={props.loading} />
      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
        <Panel title="计划与日程" description="范围、团队和执行窗口">
          <div className="border-b border-border p-4"><div className="flex items-center gap-3 rounded-lg bg-blue-50 p-3"><CalendarDays className="h-7 w-7 text-primary" /><div><div className="text-[10px] font-semibold text-blue-950">当前执行窗口</div><div className="mt-0.5 text-[9px] text-blue-700">2026-08 · 本地 mock 日程</div></div></div></div>
          <div className="divide-y divide-border">{props.filtered.map((record) => <button key={record.id} type="button" onClick={() => props.setSelectedId(record.id)} className={cn("w-full p-4 text-left hover:bg-muted/30", props.selectedId === record.id && "bg-blue-50/70")}><div className="text-[11px] font-semibold text-foreground">{record.name}</div><div className="mt-2 flex items-center gap-2 text-[9px] text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />{record.updatedAt} · {record.owner}</div><div className="mt-3"><Pill tone={statusTone(record.status)}>{record.status}</Pill></div></button>)}</div>
        </Panel>

        <Panel title="执行检查表" description="逐项留下结果、责任人和证据">
          {props.selected ? <div className="p-5"><div className="flex items-start justify-between"><div><div className="text-[15px] font-semibold text-foreground">{props.selected.name}</div><div className="mt-1 text-[10px] text-muted-foreground">{props.selected.summary}</div></div><Pill tone={statusTone(props.selected.status)}>{props.selected.status}</Pill></div><div className="mt-6 space-y-3">{steps.map((step, index) => <div key={step} className="flex gap-3"><span className={cn("mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border", index < 2 ? "border-emerald-200 bg-emerald-50 text-emerald-600" : "border-slate-200 bg-white text-slate-400")}>{index < 2 ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}</span><div className="flex-1 rounded-md border border-border p-3"><div className="text-[10px] font-medium text-foreground">{step}</div><div className="mt-1 text-[9px] text-muted-foreground">{index < 2 ? "已记录 mock 结果和证据引用" : "等待执行"}</div></div></div>)}</div><div className="mt-5 flex gap-2"><ActionButton primary icon={Play} onClick={props.execute}>{props.config.runLabel}</ActionButton><ActionButton icon={FilePlus2} onClick={props.addEvidence}>记录工作结果</ActionButton></div></div> : <EmptySelection label="选择一个计划进入执行检查表" />}
        </Panel>

        <Panel title="工作底稿与发现" description="执行记录和结论分开保存">
          {props.selected ? <div className="space-y-4 p-4"><RecordFacts record={props.selected} /><EvidenceBlock record={props.selected} /><div className="rounded-lg border border-amber-200 bg-amber-50 p-3"><div className="flex items-center gap-2 text-[10px] font-semibold text-amber-900"><Target className="h-4 w-4" />发现与改进</div><div className="mt-2 text-[9px] leading-5 text-amber-800">执行结果可以形成发现候选，但关闭或批准必须经过独立复核。</div></div><ActionButton icon={Save} onClick={props.submitReview}>提交结果复核</ActionButton></div> : <EmptySelection label="暂无工作底稿" />}
        </Panel>
      </div>
    </WorkspacePage>
  );
}

function IncidentWorkspace(props: SpecializedWorkspaceProps) {
  const phases = ["研判", "处置", "恢复", "通知", "复盘"];
  const selectedPhase = String(props.selected?.fields.当前阶段 ?? "研判");
  const phaseIndex = Math.max(phases.indexOf(selectedPhase), 0);
  return (
    <WorkspacePage>
      <PageTitle eyebrow={props.config.eyebrow} title={props.config.title} description={props.config.description} actions={<ActionButton primary icon={Plus} onClick={props.addRecord}>{props.config.createLabel}</ActionButton>} />
      <InlineNotice error={props.error} loading={props.loading} />
      <div className="grid min-h-[660px] gap-4 xl:grid-cols-[300px_minmax(0,1fr)_360px]">
        <Panel title="信号与事件队列" description="先保留信号，再确认是否升级为事件">
          <div className="divide-y divide-border">{props.filtered.map((record) => <button key={record.id} type="button" onClick={() => props.setSelectedId(record.id)} className={cn("w-full p-4 text-left hover:bg-muted/30", props.selectedId === record.id && "border-l-2 border-red-500 bg-red-50/50 pl-[14px]")}><div className="flex items-start gap-2"><Siren className="mt-0.5 h-4 w-4 shrink-0 text-red-500" /><div><div className="text-[11px] font-semibold text-foreground">{record.name}</div><div className="mt-1 text-[9px] leading-4 text-muted-foreground">{record.summary}</div></div></div><div className="mt-3 flex justify-between"><Pill tone="red">{formatField(record.fields.严重性)}</Pill><Pill tone={statusTone(record.status)}>{record.status}</Pill></div></button>)}</div>
        </Panel>

        <Panel title="事件时间线" description="五阶段状态和关键事实按时间推进">
          {props.selected ? <div className="p-5"><div className="rounded-lg border border-red-100 bg-red-50/60 p-5"><div className="flex items-center justify-between"><div><div className="text-[10px] font-semibold text-red-700">INCIDENT COMMAND</div><div className="mt-1 text-[17px] font-semibold text-red-950">{props.selected.name}</div></div><Pill tone="red">{formatField(props.selected.fields.严重性)}</Pill></div><div className="mt-3 text-[10px] leading-5 text-red-800">{props.selected.summary}</div></div><div className="mt-6">{phases.map((phase, index) => <div key={phase} className="relative flex gap-4 pb-7 last:pb-0"><span className={cn("relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border text-[10px]", index <= phaseIndex ? "border-red-600 bg-red-600 text-white" : "border-border bg-card text-muted-foreground")}>{index <= phaseIndex ? <CheckCircle2 className="h-4 w-4" /> : index + 1}</span>{index < phases.length - 1 && <span className="absolute left-4 top-8 h-full w-px bg-border" />}<div className="flex-1 rounded-md border border-border p-3"><div className="flex justify-between"><span className="text-[10px] font-semibold text-foreground">{phase}</span><span className="text-[9px] text-muted-foreground">{index < phaseIndex ? "已完成" : index === phaseIndex ? "当前阶段" : "未开始"}</span></div><div className="mt-1 text-[9px] text-muted-foreground">责任人 {props.selected!.owner} · 证据 {props.selected!.evidenceRefs.length} 项</div></div></div>)}</div></div> : <EmptySelection label="选择一个事件查看完整时间线" />}
        </Panel>

        <Panel title="事件指挥与关闭门禁" description="严重事件关闭需要独立验证">
          {props.selected ? <div className="space-y-4 p-4"><RecordFacts record={props.selected} /><EvidenceBlock record={props.selected} /><div className="space-y-2">{["影响范围已确认", "处置动作已记录", "恢复结果已验证", "通知义务已判断", "复盘由非处置人完成"].map((item, index) => <div key={item} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-[9px]"><span>{item}</span>{index <= phaseIndex ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <CircleDot className="h-3.5 w-3.5 text-slate-300" />}</div>)}</div><div className="flex flex-wrap gap-2"><ActionButton primary icon={ArrowRight} onClick={props.execute}>推进事件阶段</ActionButton><ActionButton icon={FilePlus2} onClick={props.addEvidence}>补录证据</ActionButton><ActionButton icon={Save} onClick={props.submitReview}>提交关闭复核</ActionButton></div></div> : <EmptySelection label="暂无事件指挥信息" />}
        </Panel>
      </div>
    </WorkspacePage>
  );
}

function RecordFacts({ record }: { record: SecurityRecord }) {
  return <div className="rounded-md border border-border bg-muted/20 p-3"><div className="text-[10px] font-semibold text-foreground">事实与配置</div><dl className="mt-2 grid gap-2">{Object.entries(record.fields).map(([key, value]) => <div key={key} className="grid grid-cols-[105px_minmax(0,1fr)] gap-2 text-[9px] leading-5"><dt className="text-muted-foreground">{key}</dt><dd className="break-words text-foreground">{formatField(value)}</dd></div>)}</dl></div>;
}

function EvidenceBlock({ record }: { record: SecurityRecord }) {
  return <div className="rounded-md border border-border p-3"><div className="flex items-center justify-between"><span className="text-[10px] font-semibold text-foreground">证据引用</span><Pill tone={statusTone(record.evidenceState)}>{record.evidenceState}</Pill></div><div className="mt-2 text-[9px] leading-5 text-muted-foreground">{record.evidenceRefs.length ? record.evidenceRefs.join(" · ") : "暂无证据引用，结论保持未知或待核验"}</div></div>;
}

function EmptySelection({ label }: { label: string }) {
  return <div className="grid min-h-[240px] place-items-center p-8 text-center"><div><GitCompareArrows className="mx-auto h-8 w-8 text-slate-300" /><div className="mt-3 text-[10px] text-muted-foreground">{label}</div></div></div>;
}

function VariantDetail({ config, record }: { config: SecurityPageConfig; record: SecurityRecord }) {
  if (config.variant === "classification") {
    const categories = Array.isArray(record.fields.分类标签) ? record.fields.分类标签 : [String(record.fields.分类标签 ?? "待识别")];
    const level = String(record.fields.监管等级 ?? "待识别");
    const requiresDualApproval = /重要|核心/.test(level);
    return (
      <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-4">
        <div className="flex items-center gap-2 text-[10px] font-semibold text-blue-900"><Fingerprint className="h-4 w-4" />双轴分类结果</div>
        <div className="mt-3 flex flex-wrap gap-2">{categories.map((category) => <Pill key={category} tone="blue">{category}</Pill>)}<Pill tone={requiresDualApproval ? "red" : "amber"}>{level}</Pill></div>
        <div className="mt-3 text-[9px] leading-5 text-blue-800">
          {requiresDualApproval ? "重要/核心数据仅为候选：数据负责人确认 → 数据安全负责人批准后方可生效。" : "普通分类的高置信无冲突结果可自动生效，并进入抽样复核。"}
        </div>
      </div>
    );
  }

  if (config.variant === "cross-border") {
    const suggestion = suggestCrossBorderPath(record);
    const gaps = String(record.fields.材料缺口 ?? "待补充关键事实");
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-4">
        <div className="flex items-center gap-2 text-[10px] font-semibold text-amber-900"><Waves className="h-4 w-4" />路径建议：{suggestion}</div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[9px]">
          {["关键事实完整", "规则版本已冻结", "法务复核", "安全复核"].map((item, index) => (
            <div key={item} className="flex items-center gap-2 rounded-md bg-white/80 p-2 text-amber-900">
              {index < 1 && !/信息不足/.test(suggestion) ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}{item}
            </div>
          ))}
        </div>
        <div className="mt-3 text-[9px] leading-5 text-amber-800">材料缺口：{gaps}。内部批准只表示内部流程完成。</div>
      </div>
    );
  }

  if (config.variant === "masking") {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-red-100 bg-red-50/60 p-4">
          <div className="flex items-center gap-2 text-[10px] text-red-700"><Eye className="h-3.5 w-3.5" />原始示例不保存</div>
          <div className="mt-3 font-mono text-[16px] font-semibold text-red-900">••••••••••••••••</div>
        </div>
        <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 p-4">
          <div className="flex items-center gap-2 text-[10px] text-emerald-700"><ShieldCheck className="h-3.5 w-3.5" />脱敏效果</div>
          <div className="mt-3 font-mono text-[16px] font-semibold text-emerald-900">{String(record.fields.脱敏样例 ?? "138****8000")}</div>
        </div>
      </div>
    );
  }

  if (config.variant === "encryption") {
    return (
      <div className="rounded-lg border border-border bg-slate-950 p-4 text-slate-200">
        <div className="flex items-center gap-2 text-[10px] text-blue-300"><LockKeyhole className="h-4 w-4" />加密与轮换检查</div>
        <div className="mt-3 font-mono text-[10px] leading-6 text-slate-400">
          algorithm = {String(record.fields.算法 ?? "待配置")}<br />
          key_reference = {String(record.fields.密钥引用 ?? "key://kms/mock/***")}<br />
          key_material = *** never stored ***<br />
          rotation = {String(record.fields.轮换状态 ?? "待检查")}
        </div>
      </div>
    );
  }

  if (config.variant === "watermark") {
    return (
      <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-4">
        <div className="flex items-center gap-2 text-[10px] font-semibold text-blue-900"><Stamp className="h-4 w-4" />水印验证与追踪</div>
        <div className="mt-3 rounded-md border border-dashed border-blue-200 bg-white p-4 text-center">
          <div className="text-[9px] text-muted-foreground">MOCK WATERMARK TRACE</div>
          <div className="mt-1 font-mono text-[16px] font-semibold text-foreground">{String(record.fields.最近追踪号 ?? "未生成")}</div>
        </div>
        <div className="mt-2 text-[9px] leading-5 text-blue-800">追踪号可与事件台账关联；它是调查线索，不单独作为归责结论。</div>
      </div>
    );
  }

  if (config.variant === "audit-report") {
    const completeness = calculateEvidenceCompleteness(record);
    return (
      <div className="rounded-lg border border-border p-4">
        <div className="flex items-center justify-between text-[10px] font-semibold text-foreground"><span className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" />报告生成门禁</span><span>{completeness === null ? "未知" : `${completeness}%`}</span></div>
        <ProgressBar value={completeness ?? 0} tone={completeness === null || completeness < 80 ? "amber" : "green"} className="mt-3" />
        <div className="mt-3 text-[9px] leading-5 text-muted-foreground">限制说明：{String(record.fields.限制说明 ?? "待生成")}。一键生成只形成草稿，不绕过审计人员复核与批准。</div>
      </div>
    );
  }

  if (config.variant === "incident") {
    const current = String(record.fields.当前阶段 ?? "研判");
    const phases = ["研判", "处置", "恢复", "通知", "复盘"];
    const currentIndex = Math.max(phases.indexOf(current), 0);
    return (
      <div className="rounded-lg border border-red-100 bg-red-50/50 p-4">
        <div className="flex items-center gap-2 text-[10px] font-semibold text-red-900"><ShieldAlert className="h-4 w-4" />五阶段响应记录</div>
        <div className="mt-3 flex items-center gap-1">
          {phases.map((phase, index) => (
            <div key={phase} className={cn("min-w-0 flex-1 rounded-md px-1 py-2 text-center text-[9px]", index <= currentIndex ? "bg-red-600 text-white" : "bg-white text-muted-foreground")}>{phase}</div>
          ))}
        </div>
        <div className="mt-3 text-[9px] leading-5 text-red-800">S1/S2 关闭前必须完成复盘，并由非处置人复核；通知结论由法务合规确认。</div>
      </div>
    );
  }

  return null;
}

export function SecurityOverviewPage() {
  const [state, setState, meta] = useSecurityDomainState("overview");
  const controls = state.collections.overview ?? [];
  const [refreshing, setRefreshing] = useState(false);
  const readiness = Math.round(controls.reduce((sum, record) => {
    const match = String(record.fields.证据覆盖率 ?? "0").match(/\d+/);
    return sum + Number(match?.[0] ?? 0);
  }, 0) / Math.max(controls.length, 1));
  const gaps = controls.reduce((sum, record) => sum + Number.parseInt(String(record.fields.缺口 ?? 0), 10), 0);

  function refreshReadiness() {
    setRefreshing(true);
    window.setTimeout(() => {
      setState((current) => ({
        ...current,
        updatedAt: new Date().toISOString(),
        activity: [{ id: `overview-${Date.now()}`, pageKey: "overview" as const, action: "重新计算就绪度", actor: "当前用户（mock）", result: "按现有证据引用重新计算", occurredAt: new Date().toISOString() }, ...current.activity].slice(0, 50),
      }));
      setRefreshing(false);
    }, 450);
  }

  function addOrganizationEvidence() {
    setState((current) => {
      const currentControls = current.collections.overview ?? [];
      const next = currentControls.map((record, index) => index === 2 ? {
        ...record,
        evidenceRefs: [...record.evidenceRefs, `EV-ORG-${stableHash(String(Date.now())).slice(0, 6).toUpperCase()}`],
        evidenceState: "待核验" as const,
        updatedAt: "刚刚",
      } : record);
      return { ...current, updatedAt: new Date().toISOString(), collections: { ...current.collections, overview: next } };
    });
  }

  return (
    <WorkspacePage>
      <PageTitle
        eyebrow="Security / DCMM4 Evidence Readiness"
        title="数据安全合规总览"
        description="把安全能力从“有防护”升级为“能举证”：统一查看 DCMM4 就绪度、量化指标、证据缺口和待办。"
        actions={<><ActionButton icon={FilePlus2} onClick={addOrganizationEvidence}>登记组织证据</ActionButton><ActionButton primary icon={RefreshCcw} onClick={refreshReadiness} disabled={refreshing}>{refreshing ? "计算中…" : "重新计算"}</ActionButton></>}
      />
      <InlineNotice error={meta.error} loading={!meta.hydrated} />
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat label="综合证据就绪度" value={`${readiness}%`} hint="非 DCMM 认证分数" icon={Gauge} tone={readiness >= 80 ? "green" : "amber"} />
        <MiniStat label="证据缺口" value={gaps} hint="含缺失与采集失败" icon={AlertTriangle} tone="red" />
        <MiniStat label="待复核队列" value="7" hint="分类、出境、审计、事件" icon={Users} tone="amber" />
        <MiniStat label="组织证据" value="12" hint="制度、培训、演练、外评" icon={FileCheck2} />
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_420px]">
        <Panel title="DCMM4 数据安全就绪矩阵" description="就绪状态必须由证据引用支撑，未知不按 0 处理">
          <div className="divide-y divide-border">
            {controls.map((control) => {
              const coverage = Number(String(control.fields.证据覆盖率 ?? "0").match(/\d+/)?.[0] ?? 0);
              return (
                <div key={control.id} className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_160px_100px] md:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2"><span className="text-[11px] font-semibold text-foreground">{control.name}</span><Pill tone={statusTone(control.status)}>{control.status}</Pill></div>
                    <div className="mt-1 text-[9px] leading-5 text-muted-foreground">{control.summary} · 责任人 {control.owner}</div>
                  </div>
                  <div><div className="mb-1 flex justify-between text-[9px] text-muted-foreground"><span>证据覆盖</span><span>{coverage}%</span></div><ProgressBar value={coverage} tone={coverage >= 85 ? "green" : coverage >= 70 ? "amber" : "red"} /></div>
                  <div className="text-right text-[10px] text-muted-foreground">缺口 {String(control.fields.缺口)} 项</div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="量化指标" description="目标、实际、趋势与证据状态">
          <div className="space-y-3 p-4">
            {[
              ["分类分级覆盖率", "92.4%", "目标 ≥ 95%", 92.4],
              ["高风险整改按期率", "83%", "目标 ≥ 90%", 83],
              ["出境重评及时率", "未知", "证据分母不足", null],
              ["S1/S2 复盘完成率", "100%", "目标 100%", 100],
            ].map(([label, value, hint, progress]) => (
              <div key={String(label)} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between"><span className="text-[10px] font-medium text-foreground">{label}</span><span className="text-[13px] font-semibold text-foreground">{value}</span></div>
                <div className="mt-1 text-[9px] text-muted-foreground">{hint}</div>
                {typeof progress === "number" ? <ProgressBar value={progress} tone={progress >= 90 ? "green" : "amber"} className="mt-2" /> : <div className="mt-2 rounded bg-amber-50 px-2 py-1 text-[9px] text-amber-700">未知 / 证据不足</div>}
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="证据缺口" description="优先处理影响就绪度和报告可信度的缺口">
          <div className="divide-y divide-border">
            {["跨境接收方再转移说明缺失", "重要数据候选双人审批未完成", "审计交换行为样本采集失败"].map((item, index) => (
              <div key={item} className="flex items-center gap-3 px-4 py-3"><span className="grid h-7 w-7 place-items-center rounded-md bg-red-50 text-red-600"><AlertTriangle className="h-3.5 w-3.5" /></span><div className="min-w-0 flex-1"><div className="text-[10px] font-medium text-foreground">{item}</div><div className="mt-0.5 text-[9px] text-muted-foreground">责任人 {index === 0 ? "刘妍" : index === 1 ? "周凯" : "张敏"} · 截止 2026-08-{18 + index}</div></div><Pill tone="red">高优先级</Pill></div>
            ))}
          </div>
        </Panel>
        <Panel title="统一待办" description="分类复核、出境重评、审计整改和事件响应">
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            {[
              ["分类候选复核", "3", "important-data"],
              ["出境重新评估", "1", "cross-border"],
              ["审计问题整改", "2", "audit-findings"],
              ["S2 事件处置", "1", "incidents"],
            ].map(([label, count, source]) => (
              <div key={label} className="rounded-md border border-border bg-muted/20 p-3"><div className="flex items-center justify-between"><span className="text-[10px] font-medium text-foreground">{label}</span><span className="text-[18px] font-semibold text-primary">{count}</span></div><div className="mt-2 text-[9px] text-muted-foreground">来源 {source}</div></div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="rounded-md border border-blue-100 bg-blue-50/70 px-3 py-2 text-[9px] leading-5 text-blue-800">当前为本地 SQLite 持久化 mock。页面呈现 DCMM4 就绪度与证据链，不宣称通过认证，也不连接真实日志、密钥、数据源或监管系统。</div>
    </WorkspacePage>
  );
}

export function ComplianceChecklistPage() { return <SecurityCollectionPage pageKey="compliance" />; }
export function ComplianceReviewsPage() { return <SecurityCollectionPage pageKey="compliance-reviews" />; }
export function PersonalInformationPage() { return <SecurityCollectionPage pageKey="personal-information" />; }
export function ImportantDataPage() { return <SecurityCollectionPage pageKey="important-data" />; }
export function CrossBorderAssessmentPage() { return <SecurityCollectionPage pageKey="cross-border" />; }
export function ClassificationPage() { return <SecurityCollectionPage pageKey="classification" />; }
export function ClassificationReviewsPage() { return <SecurityCollectionPage pageKey="classification-reviews" />; }
export function ClassificationRulesPage() { return <SecurityCollectionPage pageKey="classification-rules" />; }
export function ClassificationReportsPage() { return <SecurityCollectionPage pageKey="classification-reports" />; }
export function ProtectionPoliciesPage() { return <SecurityCollectionPage pageKey="protection" />; }
export function AccessControlPage() { return <SecurityCollectionPage pageKey="access-control" />; }
export function MaskingPage() { return <SecurityCollectionPage pageKey="masking" />; }
export function EncryptionPage() { return <SecurityCollectionPage pageKey="encryption" />; }
export function WatermarkPage() { return <SecurityCollectionPage pageKey="watermark" />; }
export function SecurityRiskPage() { return <SecurityCollectionPage pageKey="risk" />; }
export function AuditPlansPage() { return <SecurityCollectionPage pageKey="audit" />; }
export function AuditExecutionsPage() { return <SecurityCollectionPage pageKey="audit-executions" />; }
export function AuditEvidencePage() { return <SecurityCollectionPage pageKey="audit-evidence" />; }
export function AuditReportsPage() { return <SecurityCollectionPage pageKey="audit-reports" />; }
export function AuditFindingsPage() { return <SecurityCollectionPage pageKey="audit-findings" />; }
export function IncidentsPage() { return <SecurityCollectionPage pageKey="incidents" />; }
export function IncidentSopPage() { return <SecurityCollectionPage pageKey="incident-sop" />; }
export function IncidentNotificationsPage() { return <SecurityCollectionPage pageKey="incident-notifications" />; }
export function IncidentDrillsPage() { return <SecurityCollectionPage pageKey="incident-drills" />; }
