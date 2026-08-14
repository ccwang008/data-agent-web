import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  X,
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
type RoutedSecurityPageKey = Exclude<SecurityPageKey, "overview" | "classification" | "classification-rules" | "masking">;

const SEMANTIC_LAYOUTS: Record<RoutedSecurityPageKey, SemanticLayout> = {
  compliance: "matrix",
  "compliance-reviews": "approval",
  "personal-information": "matrix",
  "important-data": "approval",
  "cross-border": "flow",
  "classification-reviews": "approval",
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

  function createRecord(draft: SecurityRecord) {
    updateRecords(config.createLabel, (current) => [draft, ...current]);
    setSelectedId(draft.id);
    setStatusFilter("全部状态");
    setSearch("");
  }

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
    createRecord,
    patchSelected,
    execute,
    submitReview,
    addEvidence,
    archiveRecord,
  };

  if (pageKey === "classification") return <ClassificationWorkspace {...specializedProps} />;
  if (pageKey === "classification-rules") return <ClassificationRulesWorkspace {...specializedProps} />;
  if (pageKey === "masking") return <MaskingWorkspace {...specializedProps} />;
  const semanticLayout = SEMANTIC_LAYOUTS[pageKey];
  return <SemanticWorkspace layout={semanticLayout} {...specializedProps} />;

  /* istanbul ignore next -- all page keys are exhaustively dispatched above */
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
  createRecord?: (draft: SecurityRecord) => void;
  patchSelected?: (patch: Partial<SecurityRecord>, action: string) => void;
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
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [taskName, setTaskName] = useState("");
  const [scopeType, setScopeType] = useState<"dataSource" | "domain" | "asset">("dataSource");
  const [scopeTarget, setScopeTarget] = useState("");
  const [ruleVersion, setRuleVersion] = useState("CLS-v2.3");
  const [scanMode, setScanMode] = useState<"full" | "incremental">("incremental");
  const [triggerType, setTriggerType] = useState<"manual" | "scheduled">("manual");
  const [scheduleTime, setScheduleTime] = useState("02:00");
  const [ownerName, setOwnerName] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeLevel, setActiveLevel] = useState<string | null>(null);

  const categories = Array.from(new Set(props.records.flatMap((record) => {
    const value = record.fields.分类标签;
    return Array.isArray(value) ? value : [String(value ?? "待识别")];
  })));
  const levels = Array.from(new Set(props.records.map((record) => String(record.fields.监管等级 ?? "待识别"))));

  const successCount = props.records.filter((r) => /成功|生效|已完成/.test(r.status)).length;
  const pendingCount = props.records.filter((r) => /草稿|待|中/.test(r.status)).length;
  const totalFields = props.records.reduce((sum, r) => sum + Number(String(r.fields.覆盖范围 ?? "0").match(/\d+/)?.[0] ?? 0), 0);

  const filteredByCategory = useMemo(() => {
    if (!activeCategory && !activeLevel) return props.filtered;
    return props.filtered.filter((record) => {
      if (activeCategory) {
        const value = record.fields.分类标签;
        const tags = Array.isArray(value) ? value : [String(value ?? "")];
        if (!tags.includes(activeCategory)) return false;
      }
      if (activeLevel && String(record.fields.监管等级 ?? "待识别") !== activeLevel) return false;
      return true;
    });
  }, [props.filtered, activeCategory, activeLevel]);

  function toggleCategory(tag: string) {
    setActiveCategory((prev) => (prev === tag ? null : tag));
  }
  function toggleLevel(level: string) {
    setActiveLevel((prev) => (prev === level ? null : level));
  }

  function openCreate() {
    setTaskName(`分类识别任务 ${props.records.length + 1}`);
    setScopeType("dataSource");
    setScopeTarget("");
    setRuleVersion("CLS-v2.3");
    setScanMode("incremental");
    setTriggerType("manual");
    setScheduleTime("02:00");
    setOwnerName("");
    setCreateOpen(true);
  }

  function submitCreate() {
    if (!props.createRecord) return;
    const id = `classification-${Date.now()}`;
    const draft: SecurityRecord = {
      id,
      name: taskName || `分类识别任务 ${props.records.length + 1}`,
      summary: `${scopeType === "dataSource" ? "数据源" : scopeType === "domain" ? "业务域" : "资产"}扫描 · ${scanMode === "full" ? "全量" : "增量"}模式`,
      status: triggerType === "scheduled" ? "待调度" : "草稿",
      owner: ownerName || "待指定",
      updatedAt: "刚刚",
      version: 1,
      risk: "中",
      evidenceState: "缺失",
      evidenceRefs: [],
      fields: {
        分类标签: ["待识别"],
        监管等级: "待识别",
        置信度: "—",
        覆盖范围: "0 表 / 0 字段",
        规则版本: ruleVersion,
        扫描范围: scopeTarget || "待选择",
        范围类型: scopeType === "dataSource" ? "数据源" : scopeType === "domain" ? "业务域" : "资产",
        识别模式: scanMode === "full" ? "全量扫描" : "增量扫描",
        触发方式: triggerType === "scheduled" ? `定时 ${scheduleTime}` : "手动",
      },
      mock: true,
    };
    props.createRecord(draft);
    setCreateOpen(false);
    navigate(`/data-security/classification/${id}`);
  }

  return (
    <WorkspacePage>
      <PageTitle eyebrow={props.config.eyebrow} title={props.config.title} description={props.config.description} actions={<ActionButton primary icon={Plus} onClick={openCreate}>{props.config.createLabel}</ActionButton>} />
      <InlineNotice error={props.error} loading={props.loading} />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat label="识别任务总数" value={props.records.length} icon={ListChecks} />
        <MiniStat label="已识别成功" value={successCount} icon={CheckCircle2} tone="green" />
        <MiniStat label="待执行/草稿" value={pendingCount} icon={Clock3} tone="amber" />
        <MiniStat label="累计覆盖字段" value={totalFields} icon={ScanSearch} tone="blue" />
      </section>

      {(activeCategory || activeLevel) && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] text-amber-800">
          <span>当前筛选：</span>
          {activeCategory && <button type="button" onClick={() => setActiveCategory(null)}><Pill tone="blue">分类 = {activeCategory} ✕</Pill></button>}
          {activeLevel && <button type="button" onClick={() => setActiveLevel(null)}><Pill tone={/重要|核心/.test(activeLevel) ? "red" : "amber"}>等级 = {activeLevel} ✕</Pill></button>}
          <button type="button" className="ml-auto text-amber-700 underline" onClick={() => { setActiveCategory(null); setActiveLevel(null); }}>清除全部</button>
        </div>
      )}

      <div className="grid min-h-[650px] gap-4 xl:grid-cols-[245px_minmax(0,1fr)]">
        <Panel title="双轴分类体系" description="点击标签筛选任务列表">
          <div className="p-3">
            <div className="text-[10px] font-semibold text-muted-foreground">分类标签</div>
            <div className="mt-2 space-y-1">
              {categories.map((category) => {
                const count = props.records.filter((record) => {
                  const value = record.fields.分类标签;
                  return Array.isArray(value) ? value.includes(category) : String(value) === category;
                }).length;
                const isActive = activeCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[11px] transition",
                      isActive ? "bg-blue-50 text-primary ring-1 ring-primary/30" : "text-foreground hover:bg-muted/50",
                    )}
                  >
                    <Fingerprint className={cn("h-3.5 w-3.5", isActive ? "text-primary" : "text-muted-foreground")} />
                    <span className="min-w-0 flex-1 truncate">{category}</span>
                    <span className="text-[9px] tabular-nums text-muted-foreground">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="border-t border-border p-4">
            <div className="text-[10px] font-semibold text-muted-foreground">监管等级</div>
            <div className="mt-3 space-y-2">
              {levels.map((level) => {
                const count = props.records.filter((record) => String(record.fields.监管等级 ?? "待识别") === level).length;
                const percent = count / Math.max(props.records.length, 1) * 100;
                const isActive = activeLevel === level;
                return (
                  <button key={level} type="button" onClick={() => toggleLevel(level)} className={cn("block w-full rounded-md px-2 py-1.5 text-left transition", isActive && "bg-blue-50 ring-1 ring-primary/30")}>
                    <div className="mb-1 flex justify-between text-[9px]"><span className={cn("truncate", isActive && "font-semibold text-primary")}>{level}</span><span className="text-muted-foreground">{count}</span></div>
                    <ProgressBar value={percent} tone={/重要|核心/.test(level) ? "red" : "blue"} />
                  </button>
                );
              })}
            </div>
          </div>
        </Panel>

        <Panel
          title="识别任务列表"
          description={`${filteredByCategory.length} / ${props.records.length} 个任务`}
          actions={<WorkspaceFilters {...props} />}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-[11px]">
              <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">任务名称</th>
                  <th className="px-3 py-3 font-medium">扫描范围</th>
                  <th className="px-3 py-3 font-medium">识别模式</th>
                  <th className="px-3 py-3 font-medium">规则版本</th>
                  <th className="px-3 py-3 font-medium">责任人</th>
                  <th className="px-3 py-3 font-medium">进度</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredByCategory.map((record) => (
                  <tr
                    key={record.id}
                    onClick={() => navigate(`/data-security/classification/${record.id}`)}
                    className="cursor-pointer transition hover:bg-muted/30"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{record.name}</div>
                      <div className="mt-0.5 max-w-[260px] truncate text-[9px] text-muted-foreground">{record.summary}</div>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      <div className="text-[10px]">{formatField(record.fields.范围类型)}</div>
                      <div className="max-w-[120px] truncate text-[9px] text-muted-foreground">{formatField(record.fields.扫描范围)}</div>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{formatField(record.fields.识别模式)}</td>
                    <td className="px-3 py-3"><Pill tone="slate">{formatField(record.fields.规则版本)}</Pill></td>
                    <td className="px-3 py-3 text-muted-foreground">{record.owner}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <ProgressBar
                          value={/成功/.test(record.status) ? 100 : /执行中/.test(record.status) ? 45 : /待|草稿/.test(record.status) ? 0 : 100}
                          tone={/成功/.test(record.status) ? "green" : /执行中/.test(record.status) ? "blue" : "amber"}
                          className="w-16"
                        />
                        <span className="text-[9px] text-muted-foreground">
                          {/成功/.test(record.status) ? formatField(record.fields.覆盖范围) : /执行中/.test(record.status) ? "扫描中…" : "待执行"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Pill tone={statusTone(record.status)}>{record.status}</Pill></td>
                  </tr>
                ))}
                {!filteredByCategory.length && (
                  <tr><td colSpan={7} className="px-4 py-16 text-center text-muted-foreground">没有符合条件的识别任务</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-[520px] overflow-hidden rounded-lg border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <div>
                <div className="text-[13px] font-semibold text-foreground">新建识别任务</div>
                <div className="text-[10px] text-muted-foreground">配置扫描范围、规则版本和识别模式</div>
              </div>
              <button type="button" onClick={() => setCreateOpen(false)} className="rounded-md p-1 text-muted-foreground hover:bg-muted/50">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <label className="block text-[11px] text-muted-foreground">
                任务名称
                <input
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-[11px] text-foreground outline-none focus:border-primary"
                />
              </label>
              <div>
                <div className="mb-2 text-[11px] text-muted-foreground">扫描范围类型</div>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { key: "dataSource", label: "数据源" },
                    { key: "domain", label: "业务域" },
                    { key: "asset", label: "资产" },
                  ] as const).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setScopeType(opt.key)}
                      className={cn(
                        "h-9 rounded-md border text-[11px] transition",
                        scopeType === opt.key
                          ? "border-primary bg-blue-50 text-primary"
                          : "border-border bg-background text-muted-foreground hover:border-primary/40",
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="block text-[11px] text-muted-foreground">
                扫描目标
                <input
                  value={scopeTarget}
                  onChange={(e) => setScopeTarget(e.target.value)}
                  placeholder={scopeType === "dataSource" ? "如：客户域数据源" : scopeType === "domain" ? "如：风控域" : "如：客户画像表"}
                  className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-[11px] text-foreground outline-none focus:border-primary"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-[11px] text-muted-foreground">
                  规则版本
                  <select
                    value={ruleVersion}
                    onChange={(e) => setRuleVersion(e.target.value)}
                    className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-[11px] text-foreground outline-none focus:border-primary"
                  >
                    <option>CLS-v2.3</option>
                    <option>CLS-v2.1</option>
                    <option>AGG-v1.1</option>
                  </select>
                </label>
                <label className="block text-[11px] text-muted-foreground">
                  识别模式
                  <select
                    value={scanMode}
                    onChange={(e) => setScanMode(e.target.value as "full" | "incremental")}
                    className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-[11px] text-foreground outline-none focus:border-primary"
                  >
                    <option value="incremental">增量扫描</option>
                    <option value="full">全量扫描</option>
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-[11px] text-muted-foreground">
                  触发方式
                  <select
                    value={triggerType}
                    onChange={(e) => setTriggerType(e.target.value as "manual" | "scheduled")}
                    className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-[11px] text-foreground outline-none focus:border-primary"
                  >
                    <option value="manual">手动触发</option>
                    <option value="scheduled">定时调度</option>
                  </select>
                </label>
                {triggerType === "scheduled" && (
                  <label className="block text-[11px] text-muted-foreground">
                    调度时间
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-[11px] text-foreground outline-none focus:border-primary"
                    />
                  </label>
                )}
              </div>
              <label className="block text-[11px] text-muted-foreground">
                责任人
                <input
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="如：王雪"
                  className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-[11px] text-foreground outline-none focus:border-primary"
                />
              </label>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-5 py-3">
              <ActionButton onClick={() => setCreateOpen(false)}>取消</ActionButton>
              <ActionButton primary icon={Plus} onClick={submitCreate}>创建任务</ActionButton>
            </div>
          </div>
        </div>
      )}
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
  if (props.config.key === "access-control") return <AccessControlWorkspace {...props} />;
  if (props.config.key === "personal-information" || props.config.key === "encryption") {
    return <SecurityMasterDetailWorkspace {...props} />;
  }
  return <ControlMatrixWorkspace {...props} />;
}

function AccessControlWorkspace(props: SpecializedWorkspaceProps) {
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

function ControlMatrixWorkspace(props: SpecializedWorkspaceProps) {
  const copy = MATRIX_COPY[props.config.key] ?? { library: "控制目录", canvas: "控制矩阵", inspector: "检查结果" };
  const [detailOpen, setDetailOpen] = useState(false);

  function inspect(recordId: string) {
    props.setSelectedId(recordId);
    setDetailOpen(true);
  }

  return (
    <WorkspacePage>
      <PageTitle eyebrow={props.config.eyebrow} title={props.config.title} description={props.config.description} actions={<ActionButton primary icon={Plus} onClick={props.addRecord}>{props.config.createLabel}</ActionButton>} />
      <InlineNotice error={props.error} loading={props.loading} />

      <Panel
        title={copy.canvas}
        description={`${copy.library}以全宽矩阵展开；选择行后在详情抽屉处理证据和复核`}
        actions={<WorkspaceFilters {...props} />}
      >
        <div className="border-b border-border bg-muted/20 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            {props.filtered.map((record) => (
              <button
                key={record.id}
                type="button"
                onClick={() => inspect(record.id)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-[10px] transition",
                  props.selectedId === record.id ? "border-primary bg-blue-50 text-primary" : "border-border bg-card text-muted-foreground hover:border-primary/40",
                )}
              >
                {record.name} · v{record.version}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto p-4">
          <div className="min-w-[880px]">
            <div className="grid grid-cols-[minmax(220px,1.4fr)_repeat(2,minmax(150px,1fr))_130px_120px] rounded-md bg-slate-900 px-4 py-3 text-[9px] font-medium text-slate-300">
              <span>对象 / 控制</span>
              <span>{props.config.columns[0]?.label ?? "范围"}</span>
              <span>{props.config.columns[1]?.label ?? "策略"}</span>
              <span>责任人</span>
              <span>证据状态</span>
            </div>
            <div className="mt-2 space-y-2">
              {props.filtered.map((record) => (
                <button
                  key={record.id}
                  type="button"
                  onClick={() => inspect(record.id)}
                  className={cn(
                    "grid w-full grid-cols-[minmax(220px,1.4fr)_repeat(2,minmax(150px,1fr))_130px_120px] items-center rounded-md border px-4 py-3 text-left text-[10px] transition",
                    props.selectedId === record.id ? "border-primary bg-blue-50/60" : "border-border bg-card hover:border-primary/40",
                  )}
                >
                  <span className="pr-4"><span className="block font-medium text-foreground">{record.name}</span><span className="mt-1 block truncate text-[9px] text-muted-foreground">{record.summary}</span></span>
                  <span className="truncate pr-3 text-muted-foreground">{formatField(record.fields[props.config.columns[0]?.key])}</span>
                  <span className="truncate pr-3 text-muted-foreground">{formatField(record.fields[props.config.columns[1]?.key])}</span>
                  <span className="text-muted-foreground">{record.owner}</span>
                  <span><Pill tone={statusTone(record.evidenceState)}>{record.evidenceState}</Pill></span>
                </button>
              ))}
              {!props.filtered.length && <div className="py-16 text-center text-[11px] text-muted-foreground">没有符合条件的控制项</div>}
            </div>
          </div>
        </div>
        <div className="grid gap-3 border-t border-border bg-muted/10 p-4 sm:grid-cols-3">
          {[
            ["矩阵用途", "集中比较控制对象、适用范围与证据状态"],
            ["缺口原则", "证据不足保持未知，不以 0 或默认通过代替"],
            ["处理方式", "详情与操作进入抽屉，不长期占用主画布"],
          ].map(([title, description]) => (
            <div key={title} className="rounded-md border border-border bg-card p-3"><div className="text-[10px] font-semibold text-foreground">{title}</div><div className="mt-1 text-[9px] leading-5 text-muted-foreground">{description}</div></div>
          ))}
        </div>
      </Panel>

      <SecurityDrawer
        open={detailOpen}
        title={copy.inspector}
        description={props.selected?.name ?? "请选择矩阵项"}
        onClose={() => setDetailOpen(false)}
      >
        {props.selected ? <div className="space-y-4">
          <div className="flex items-center justify-between"><span className="text-[11px] font-semibold text-foreground">{props.selected.name}</span><Pill tone={statusTone(props.selected.status)}>{props.selected.status}</Pill></div>
          <RecordFacts record={props.selected} />
          <VariantDetail config={props.config} record={props.selected} />
          <EvidenceBlock record={props.selected} />
          <div className="flex flex-wrap gap-2 border-t border-border pt-4"><ActionButton primary icon={Play} onClick={props.execute}>{props.config.runLabel}</ActionButton><ActionButton icon={FilePlus2} onClick={props.addEvidence}>补充证据</ActionButton><ActionButton icon={Save} onClick={props.submitReview}>提交复核</ActionButton></div>
        </div> : <EmptySelection label="选择一个控制项查看映射关系" />}
      </SecurityDrawer>
    </WorkspacePage>
  );
}

function SecurityMasterDetailWorkspace(props: SpecializedWorkspaceProps) {
  const copy = MATRIX_COPY[props.config.key] ?? { library: "对象目录", canvas: "业务过程", inspector: "配置与证据" };
  const stages = props.config.key === "personal-information"
    ? ["收集", "存储", "使用", "共享", "删除"]
    : ["传输层", "存储层", "字段级", "密钥轮换"];

  return (
    <WorkspacePage>
      <PageTitle eyebrow={props.config.eyebrow} title={props.config.title} description={props.config.description} actions={<ActionButton primary icon={Plus} onClick={props.addRecord}>{props.config.createLabel}</ActionButton>} />
      <InlineNotice error={props.error} loading={props.loading} />
      <div className="grid min-h-[650px] gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Panel title={copy.library} description={`${props.records.length} 个业务对象`} actions={<WorkspaceFilters {...props} />}>
          <div className="divide-y divide-border">
            {props.filtered.map((record) => (
              <button key={record.id} type="button" onClick={() => props.setSelectedId(record.id)} className={cn("w-full p-4 text-left transition hover:bg-muted/30", props.selectedId === record.id && "border-l-2 border-primary bg-blue-50/60 pl-[14px]")}>
                <div className="flex items-start justify-between gap-3"><div><div className="text-[11px] font-semibold text-foreground">{record.name}</div><div className="mt-1 line-clamp-2 text-[9px] leading-4 text-muted-foreground">{record.summary}</div></div><Pill tone={statusTone(record.status)}>{record.status}</Pill></div>
                <div className="mt-3 flex items-center justify-between text-[9px] text-muted-foreground"><span>{record.owner}</span><span>{record.evidenceState}</span></div>
              </button>
            ))}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title={copy.canvas} description={props.selected?.name ?? "请选择业务对象"} actions={props.selected ? <Pill tone={statusTone(props.selected.status)}>{props.selected.status}</Pill> : undefined}>
            {props.selected ? <div className="p-5">
              <div className="flex items-center gap-2 overflow-x-auto rounded-lg border border-border bg-muted/20 p-4">
                {stages.map((stage, index) => <div key={stage} className="flex min-w-0 flex-1 items-center gap-2"><div className="min-w-[90px] rounded-md border border-blue-100 bg-blue-50 px-3 py-3 text-center"><div className="text-[9px] text-blue-600">0{index + 1}</div><div className="mt-1 text-[10px] font-medium text-blue-950">{stage}</div></div>{index < stages.length - 1 && <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />}</div>)}
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-2"><RecordFacts record={props.selected} /><VariantDetail config={props.config} record={props.selected} /></div>
            </div> : <EmptySelection label="选择左侧对象查看业务过程" />}
          </Panel>
          <Panel title={copy.inspector} description="配置、证据和复核动作位于主过程下方，不形成第三个固定栏">
            {props.selected ? <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_auto]"><EvidenceBlock record={props.selected} /><div className="flex flex-wrap content-start gap-2"><ActionButton primary icon={Play} onClick={props.execute}>{props.config.runLabel}</ActionButton><ActionButton icon={FilePlus2} onClick={props.addEvidence}>补充证据</ActionButton><ActionButton icon={Save} onClick={props.submitReview}>提交复核</ActionButton></div></div> : <EmptySelection label="暂无配置与证据" />}
          </Panel>
        </div>
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
  if (props.config.key === "cross-border") return <CrossBorderWorkspace {...props} />;
  if (props.config.key === "watermark") return <WatermarkWorkspace {...props} />;
  if (props.config.key === "incident-sop") return <IncidentSopWorkspace {...props} />;
  return <IncidentNotificationWorkspace {...props} />;
}

function FlowRecordPicker(props: SpecializedWorkspaceProps) {
  return (
    <select value={props.selectedId} onChange={(event) => props.setSelectedId(event.target.value)} className="h-8 min-w-[220px] rounded-md border border-input bg-background px-2 text-[10px] outline-none focus:border-primary">
      {props.filtered.map((record) => <option key={record.id} value={record.id}>{record.name} · v{record.version}</option>)}
    </select>
  );
}

function CrossBorderWorkspace(props: SpecializedWorkspaceProps) {
  const steps = FLOW_STEPS["cross-border"] ?? [];
  return (
    <WorkspacePage>
      <PageTitle eyebrow={props.config.eyebrow} title={props.config.title} description={props.config.description} actions={<ActionButton primary icon={Plus} onClick={props.addRecord}>{props.config.createLabel}</ActionButton>} />
      <InlineNotice error={props.error} loading={props.loading} />
      <Panel title="出境评估步骤" description="先确认场景事实，再给出路径建议并经过双重复核" actions={<FlowRecordPicker {...props} />}>
        <div className="flex items-center gap-2 overflow-x-auto p-4">
          {steps.map((step, index) => <div key={step} className="flex min-w-0 flex-1 items-center gap-2"><div className={cn("min-w-[128px] rounded-md border px-3 py-3", index < 2 ? "border-blue-200 bg-blue-50" : "border-border bg-card")}><div className="text-[9px] text-muted-foreground">步骤 {index + 1}</div><div className="mt-1 text-[10px] font-medium text-foreground">{step}</div></div>{index < steps.length - 1 && <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />}</div>)}
        </div>
      </Panel>
      <div className="grid min-h-[560px] gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel title="评估事实与路径判断" description="事实表单是主工作区，历史版本通过顶部选择器切换">
          {props.selected ? <div className="space-y-5 p-5"><div className="rounded-lg border border-border bg-slate-950 p-5 text-slate-200"><div className="flex items-center gap-2 text-[10px] font-semibold text-blue-300"><Route className="h-4 w-4" />CROSS-BORDER SCENARIO</div><div className="mt-2 text-[17px] font-semibold">{props.selected.name}</div><div className="mt-1 text-[10px] leading-5 text-slate-400">{props.selected.summary}</div></div><RecordFacts record={props.selected} /><VariantDetail config={props.config} record={props.selected} /></div> : <EmptySelection label="选择一个出境场景开始评估" />}
        </Panel>
        <Panel title="风险与材料摘要" description="路径建议、材料缺口和审批动作保持可举证">
          {props.selected ? <div className="space-y-4 p-4"><div className="rounded-lg border border-amber-200 bg-amber-50 p-4"><div className="text-[10px] font-semibold text-amber-900">当前建议路径</div><div className="mt-2 text-[15px] font-semibold text-amber-950">{formatField(props.selected.fields.建议路径)}</div><div className="mt-2 text-[9px] leading-5 text-amber-800">该结论仅用于内部合规准备，不代表监管批准或法律意见。</div></div><EvidenceBlock record={props.selected} /><div className="flex flex-wrap gap-2"><ActionButton primary icon={Sparkles} onClick={props.execute}>{props.config.runLabel}</ActionButton><ActionButton icon={Save} onClick={props.submitReview}>提交双重复核</ActionButton><ActionButton icon={FilePlus2} onClick={props.addEvidence}>补充材料</ActionButton></div></div> : <EmptySelection label="暂无风险与材料摘要" />}
        </Panel>
      </div>
    </WorkspacePage>
  );
}

function WatermarkWorkspace(props: SpecializedWorkspaceProps) {
  const steps = FLOW_STEPS.watermark ?? [];
  return (
    <WorkspacePage>
      <PageTitle eyebrow={props.config.eyebrow} title={props.config.title} description={props.config.description} actions={<ActionButton primary icon={Plus} onClick={props.addRecord}>{props.config.createLabel}</ActionButton>} />
      <InlineNotice error={props.error} loading={props.loading} />
      <div className="grid min-h-[640px] gap-4 xl:grid-cols-[minmax(0,1.2fr)_420px]">
        <Panel title="水印配置与效果预览" description="配置、嵌入和验证围绕同一份样例展开" actions={<FlowRecordPicker {...props} />}>
          {props.selected ? <div className="space-y-5 p-5"><div className="grid gap-4 md:grid-cols-2"><div className="rounded-lg border border-border bg-slate-950 p-5 text-slate-300"><div className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">受控原始样例</div><div className="mt-5 space-y-2 font-mono text-[10px]"><div>customer_id: CUST-***</div><div>export_batch: 2026-08</div><div>source_value: *** never stored ***</div></div></div><div className="relative overflow-hidden rounded-lg border border-blue-200 bg-blue-50 p-5"><Waves className="absolute -bottom-8 -right-4 h-32 w-32 text-blue-100" /><div className="relative text-[9px] font-semibold uppercase tracking-wider text-blue-600">嵌入后预览</div><div className="relative mt-5 text-[18px] font-semibold text-blue-950">{formatField(props.selected.fields.最近追踪号)}</div><div className="relative mt-2 text-[10px] text-blue-800">模板：{formatField(props.selected.fields.水印类型)}</div><Stamp className="relative mt-5 h-8 w-8 text-blue-600" /></div></div><div className="flex items-center gap-2 overflow-x-auto">{steps.map((step, index) => <div key={step} className="flex min-w-0 flex-1 items-center gap-2"><div className="min-w-[104px] rounded-md border border-border px-3 py-2 text-center text-[9px] text-foreground">{index + 1}. {step}</div>{index < steps.length - 1 && <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />}</div>)}</div><VariantDetail config={props.config} record={props.selected} /></div> : <EmptySelection label="选择一条水印策略进入预览" />}
        </Panel>
        <Panel title="验证与来源追踪" description="验证结果、追踪标识与证据引用独立记录">
          {props.selected ? <div className="space-y-4 p-4"><RecordFacts record={props.selected} /><EvidenceBlock record={props.selected} /><div className="rounded-md border border-blue-100 bg-blue-50 p-3 text-[9px] leading-5 text-blue-800">原型仅保存脱敏追踪标识，不保存真实文件内容或敏感样例。</div><div className="flex flex-wrap gap-2"><ActionButton primary icon={Stamp} onClick={props.execute}>{props.config.runLabel}</ActionButton><ActionButton icon={ScanSearch} onClick={props.execute}>验证提取</ActionButton><ActionButton icon={FilePlus2} onClick={props.addEvidence}>补充证据</ActionButton></div></div> : <EmptySelection label="暂无追踪信息" />}
        </Panel>
      </div>
    </WorkspacePage>
  );
}

function IncidentSopWorkspace(props: SpecializedWorkspaceProps) {
  const steps = FLOW_STEPS["incident-sop"] ?? [];
  return (
    <WorkspacePage>
      <PageTitle eyebrow={props.config.eyebrow} title={props.config.title} description={props.config.description} actions={<ActionButton primary icon={Plus} onClick={props.addRecord}>{props.config.createLabel}</ActionButton>} />
      <InlineNotice error={props.error} loading={props.loading} />
      <div className="grid min-h-[660px] gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <Panel title="版本与章节目录" description="SOP 版本和五阶段章节">
          <div className="border-b border-border p-3"><WorkspaceFilters {...props} /></div>
          <div className="divide-y divide-border">{props.filtered.map((record) => <button key={record.id} type="button" onClick={() => props.setSelectedId(record.id)} className={cn("w-full p-4 text-left hover:bg-muted/30", props.selectedId === record.id && "border-l-2 border-primary bg-blue-50/60 pl-[14px]")}><div className="text-[11px] font-semibold text-foreground">{record.name}</div><div className="mt-2 flex justify-between"><span className="text-[9px] text-muted-foreground">v{record.version}</span><Pill tone={statusTone(record.status)}>{record.status}</Pill></div></button>)}</div>
          <div className="border-t border-border bg-muted/20 p-4"><div className="text-[9px] font-semibold text-muted-foreground">章节</div><div className="mt-2 space-y-1">{steps.map((step, index) => <div key={step} className="flex items-center gap-2 rounded-md bg-card px-3 py-2 text-[10px]"><span className="font-mono text-primary">0{index + 1}</span><span>{step}</span></div>)}</div></div>
        </Panel>
        <div className="space-y-4">
          <Panel title="SOP 编辑器" description={props.selected?.name ?? "请选择 SOP 版本"} actions={props.selected ? <Pill tone={statusTone(props.selected.status)}>{props.selected.status}</Pill> : undefined}>
            {props.selected ? <div className="bg-slate-100 p-5"><article className="mx-auto min-h-[520px] max-w-[840px] border border-border bg-white p-8 shadow-sm"><div className="border-b border-slate-900 pb-5"><div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-primary">Incident Response SOP</div><h2 className="mt-2 text-[20px] font-semibold text-slate-950">{props.selected.name}</h2><div className="mt-2 text-[10px] text-slate-500">版本 v{props.selected.version} · 责任人 {props.selected.owner}</div></div><div className="mt-6 space-y-5">{steps.map((step, index) => <section key={step}><div className="text-[12px] font-semibold text-slate-900">{index + 1}. {step}</div><div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-[10px] leading-5 text-slate-600">明确触发条件、主责角色、输入证据、处置动作、退出标准和升级路径。</div></section>)}</div></article></div> : <EmptySelection label="选择 SOP 版本进入编辑器" />}
          </Panel>
          <Panel title="发布门禁" description="版本发布与停用需要留痕"><div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_auto]">{props.selected ? <EvidenceBlock record={props.selected} /> : <div className="text-[10px] text-muted-foreground">暂无证据</div>}<div className="flex flex-wrap content-start gap-2"><ActionButton primary icon={Save} onClick={props.submitReview}>提交发布复核</ActionButton><ActionButton icon={FilePlus2} onClick={props.addEvidence}>补充依据</ActionButton></div></div></Panel>
        </div>
      </div>
    </WorkspacePage>
  );
}

function IncidentNotificationWorkspace(props: SpecializedWorkspaceProps) {
  const steps = FLOW_STEPS["incident-notifications"] ?? [];
  return (
    <WorkspacePage>
      <PageTitle eyebrow={props.config.eyebrow} title={props.config.title} description={props.config.description} actions={<ActionButton primary icon={Plus} onClick={props.addRecord}>{props.config.createLabel}</ActionButton>} />
      <InlineNotice error={props.error} loading={props.loading} />
      <Panel title="通知义务时间轴" description="法源、时限、审批和实际记录按先后关系展开">
        <div className="flex items-start overflow-x-auto p-5">{steps.map((step, index) => <div key={step} className="flex min-w-0 flex-1 items-center"><div className="min-w-[140px]"><div className={cn("grid h-8 w-8 place-items-center rounded-full text-[10px] font-semibold", index < 2 ? "bg-primary text-white" : "border border-border bg-card text-muted-foreground")}>{index + 1}</div><div className="mt-2 text-[10px] font-medium text-foreground">{step}</div><div className="mt-1 text-[9px] text-muted-foreground">{index < 2 ? "已形成 mock 记录" : "等待法务判断"}</div></div>{index < steps.length - 1 && <div className="mx-3 mt-4 h-px min-w-[48px] flex-1 bg-border" />}</div>)}</div>
      </Panel>
      <div className="grid min-h-[470px] gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Panel title="通知义务清单" description="选择义务规则或实际记录" actions={<WorkspaceFilters {...props} />}>
          <div className="divide-y divide-border">{props.filtered.map((record) => <button key={record.id} type="button" onClick={() => props.setSelectedId(record.id)} className={cn("w-full p-4 text-left hover:bg-muted/30", props.selectedId === record.id && "bg-blue-50/70")}><div className="flex justify-between gap-3"><span className="text-[11px] font-semibold text-foreground">{record.name}</span><Pill tone={statusTone(record.status)}>{record.status}</Pill></div><div className="mt-2 text-[9px] text-muted-foreground">{record.owner} · {record.updatedAt}</div></button>)}</div>
        </Panel>
        <Panel title="通知判断与实际记录" description="系统只提供义务提示，最终判断由法务与安全人员确认">
          {props.selected ? <div className="grid gap-5 p-5 lg:grid-cols-2"><div className="space-y-4"><RecordFacts record={props.selected} /><VariantDetail config={props.config} record={props.selected} /></div><div className="space-y-4"><EvidenceBlock record={props.selected} /><div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-[9px] leading-5 text-amber-800">通知渠道、对象、时限和实际发送结果必须分别记录；mock 通知不代表真实外发。</div><div className="flex flex-wrap gap-2"><ActionButton primary icon={Sparkles} onClick={props.execute}>{props.config.runLabel}</ActionButton><ActionButton icon={Save} onClick={props.submitReview}>提交法务确认</ActionButton><ActionButton icon={FilePlus2} onClick={props.addEvidence}>补充记录</ActionButton></div></div></div> : <EmptySelection label="选择一项通知义务" />}
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
      <div className="grid min-h-[680px] gap-4 xl:grid-cols-[270px_minmax(0,1fr)]">
        <Panel title="报告版本" description="批准版本冻结，修订形成新版本">
          <div className="divide-y divide-border">{props.filtered.map((record) => <button key={record.id} type="button" onClick={() => props.setSelectedId(record.id)} className={cn("w-full p-4 text-left hover:bg-muted/30", props.selectedId === record.id && "border-l-2 border-primary bg-blue-50/60 pl-[14px]")}><div className="flex items-start gap-2"><ScrollText className="mt-0.5 h-4 w-4 text-primary" /><div><div className="text-[11px] font-semibold text-foreground">{record.name}</div><div className="mt-1 text-[9px] text-muted-foreground">版本 v{record.version}</div></div></div><div className="mt-3 flex justify-between"><Pill tone={statusTone(record.status)}>{record.status}</Pill><span className="text-[9px] text-muted-foreground">{record.updatedAt}</span></div></button>)}</div>
        </Panel>

        <div className="space-y-4">
        <Panel title="报告编制区" description="以报告章节组织事实，不以普通记录表替代报告">
          {props.selected ? <div className="bg-slate-100 p-5"><article className="mx-auto min-h-[590px] max-w-[760px] border border-border bg-white p-8 shadow-sm"><div className="border-b border-slate-900 pb-5"><div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-primary">Security Evidence Report</div><h2 className="mt-2 text-[20px] font-semibold text-slate-950">{props.selected.name}</h2><div className="mt-2 text-[10px] text-slate-500">版本 v{props.selected.version} · 责任人 {props.selected.owner} · {props.selected.updatedAt}</div></div><div className="mt-6 space-y-6">{sections.map((section, index) => <section key={section}><div className="flex items-center gap-2 text-[12px] font-semibold text-slate-900"><span className="font-mono text-[10px] text-primary">0{index + 1}</span>{section}</div><div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-[10px] leading-5 text-slate-600">{index === 0 ? props.selected!.summary : index === 2 ? Object.entries(props.selected!.fields).slice(0, 2).map(([key, value]) => `${key}：${formatField(value)}`).join("；") : "该章节从冻结范围、规则版本和证据引用生成 mock 草稿，需人工复核。"}</div></section>)}</div></article></div> : <EmptySelection label="选择一个报告版本进入编制区" />}
        </Panel>

        <Panel title="生成与复核门禁" description="一键生成只能产生草稿">
          {props.selected ? <div className="space-y-4 p-4"><VariantDetail config={props.config} record={props.selected} /><EvidenceBlock record={props.selected} /><div className="space-y-2">{["范围与期间已冻结", "规则版本已引用", "证据缺口已披露", "审计/业务人员已复核"].map((item, index) => <div key={item} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-[9px]"><span>{item}</span>{index < 2 ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}</div>)}</div><ActionButton primary icon={BookOpenCheck} onClick={props.execute}>{props.config.runLabel}</ActionButton><ActionButton icon={Save} onClick={props.submitReview}>提交复核</ActionButton></div> : <EmptySelection label="暂无报告门禁信息" />}
        </Panel>
        </div>
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
  if (props.config.key === "audit") return <AuditPlanWorkspace {...props} />;
  if (props.config.key === "audit-executions") return <AuditExecutionWorkspace {...props} />;
  return <IncidentDrillWorkspace {...props} />;
}

function AuditPlanWorkspace(props: SpecializedWorkspaceProps) {
  const steps = EXECUTION_STEPS.audit ?? [];
  return (
    <WorkspacePage>
      <PageTitle eyebrow={props.config.eyebrow} title={props.config.title} description={props.config.description} actions={<ActionButton primary icon={Plus} onClick={props.addRecord}>{props.config.createLabel}</ActionButton>} />
      <InlineNotice error={props.error} loading={props.loading} />
      <Panel title="审计排期" description="按执行窗口查看计划，不把计划压缩成左侧列表" actions={<WorkspaceFilters {...props} />}>
        <div className="border-b border-border p-4"><div className="flex items-center gap-3 rounded-lg bg-blue-50 p-3"><CalendarDays className="h-7 w-7 text-primary" /><div><div className="text-[10px] font-semibold text-blue-950">2026 年 8 月审计窗口</div><div className="mt-0.5 text-[9px] text-blue-700">范围、团队、抽样与内外部评估统一排期</div></div></div></div>
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">{props.filtered.map((record, index) => <button key={record.id} type="button" onClick={() => props.setSelectedId(record.id)} className={cn("rounded-lg border p-4 text-left transition hover:border-primary/40", props.selectedId === record.id ? "border-primary bg-blue-50/60" : "border-border bg-card")}><div className="flex items-center justify-between"><span className="font-mono text-[10px] text-primary">08/{String(5 + index * 6).padStart(2, "0")}</span><Pill tone={statusTone(record.status)}>{record.status}</Pill></div><div className="mt-3 text-[11px] font-semibold text-foreground">{record.name}</div><div className="mt-2 text-[9px] leading-4 text-muted-foreground">{record.owner} · {record.summary}</div></button>)}</div>
      </Panel>
      <Panel title="计划编制与启动门禁" description={props.selected?.name ?? "请选择审计计划"}>
        {props.selected ? <div className="grid gap-6 p-5 lg:grid-cols-2"><div className="space-y-4"><div className="flex items-center justify-between"><div className="text-[15px] font-semibold text-foreground">{props.selected.name}</div><Pill tone={statusTone(props.selected.status)}>{props.selected.status}</Pill></div><RecordFacts record={props.selected} /><EvidenceBlock record={props.selected} /></div><div><div className="text-[10px] font-semibold text-foreground">启动检查</div><div className="mt-4 space-y-3">{steps.map((step, index) => <div key={step} className="flex items-center gap-3 rounded-md border border-border p-3"><span className={cn("grid h-6 w-6 place-items-center rounded-full text-[9px]", index < 2 ? "bg-emerald-50 text-emerald-600" : "bg-muted text-muted-foreground")}>{index < 2 ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}</span><span className="text-[10px] text-foreground">{step}</span></div>)}</div><div className="mt-5 flex gap-2"><ActionButton primary icon={Play} onClick={props.execute}>{props.config.runLabel}</ActionButton><ActionButton icon={Save} onClick={props.submitReview}>提交计划复核</ActionButton></div></div></div> : <EmptySelection label="选择排期卡片编制计划" />}
      </Panel>
    </WorkspacePage>
  );
}

function AuditExecutionWorkspace(props: SpecializedWorkspaceProps) {
  const steps = EXECUTION_STEPS["audit-executions"] ?? [];
  return (
    <WorkspacePage>
      <PageTitle eyebrow={props.config.eyebrow} title={props.config.title} description={props.config.description} actions={<ActionButton primary icon={Plus} onClick={props.addRecord}>{props.config.createLabel}</ActionButton>} />
      <InlineNotice error={props.error} loading={props.loading} />
      <div className="grid min-h-[640px] gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Panel title="执行检查表" description="在主工作区逐项留下结果、责任人和证据" actions={<FlowRecordPicker {...props} />}>
          {props.selected ? <div className="p-5"><div className="flex items-start justify-between"><div><div className="text-[15px] font-semibold text-foreground">{props.selected.name}</div><div className="mt-1 text-[10px] text-muted-foreground">{props.selected.summary}</div></div><Pill tone={statusTone(props.selected.status)}>{props.selected.status}</Pill></div><div className="mt-6 space-y-3">{steps.map((step, index) => <div key={step} className="flex gap-3"><span className={cn("mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border", index < 2 ? "border-emerald-200 bg-emerald-50 text-emerald-600" : "border-slate-200 bg-white text-slate-400")}>{index < 2 ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}</span><div className="flex-1 rounded-md border border-border p-4"><div className="text-[10px] font-medium text-foreground">{step}</div><div className="mt-1 text-[9px] text-muted-foreground">{index < 2 ? "已记录 mock 结果和证据引用" : "等待执行"}</div></div></div>)}</div><div className="mt-5 flex gap-2"><ActionButton primary icon={Play} onClick={props.execute}>{props.config.runLabel}</ActionButton><ActionButton icon={FilePlus2} onClick={props.addEvidence}>记录工作结果</ActionButton></div></div> : <EmptySelection label="选择一个执行任务" />}
        </Panel>
        <Panel title="工作底稿与发现" description="执行记录和结论分开保存">
          {props.selected ? <div className="space-y-4 p-4"><RecordFacts record={props.selected} /><EvidenceBlock record={props.selected} /><div className="rounded-lg border border-amber-200 bg-amber-50 p-3"><div className="flex items-center gap-2 text-[10px] font-semibold text-amber-900"><Target className="h-4 w-4" />发现与改进</div><div className="mt-2 text-[9px] leading-5 text-amber-800">执行结果可以形成发现候选，但关闭或批准必须经过独立复核。</div></div><ActionButton icon={Save} onClick={props.submitReview}>提交结果复核</ActionButton></div> : <EmptySelection label="暂无工作底稿" />}
        </Panel>
      </div>
    </WorkspacePage>
  );
}

function IncidentDrillWorkspace(props: SpecializedWorkspaceProps) {
  const steps = EXECUTION_STEPS["incident-drills"] ?? [];
  return (
    <WorkspacePage>
      <PageTitle eyebrow={props.config.eyebrow} title={props.config.title} description={props.config.description} actions={<ActionButton primary icon={Plus} onClick={props.addRecord}>{props.config.createLabel}</ActionButton>} />
      <InlineNotice error={props.error} loading={props.loading} />
      <Panel title="演练运行时间线" description="场景注入、响应记录和复盘按时间推进" actions={<FlowRecordPicker {...props} />}>
        {props.selected ? <div className="p-5"><div className="flex items-center overflow-x-auto">{steps.map((step, index) => <div key={step} className="flex min-w-0 flex-1 items-center"><div className="min-w-[150px] rounded-lg border border-border bg-card p-4"><div className="flex items-center justify-between"><span className="font-mono text-[9px] text-primary">T+{index * 15}m</span>{index < 2 && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}</div><div className="mt-2 text-[10px] font-medium text-foreground">{step}</div><div className="mt-1 text-[9px] text-muted-foreground">{index < 2 ? "已记录响应结果" : "等待演练推进"}</div></div>{index < steps.length - 1 && <ArrowRight className="mx-3 h-4 w-4 shrink-0 text-slate-300" />}</div>)}</div></div> : <EmptySelection label="选择一个演练计划" />}
      </Panel>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="场景与执行记录" description={props.selected?.name ?? "暂无场景"}>{props.selected ? <div className="space-y-4 p-4"><RecordFacts record={props.selected} /><div className="flex gap-2"><ActionButton primary icon={Play} onClick={props.execute}>{props.config.runLabel}</ActionButton><ActionButton icon={FilePlus2} onClick={props.addEvidence}>记录结果</ActionButton></div></div> : <EmptySelection label="暂无执行记录" />}</Panel>
        <Panel title="复盘与改进" description="问题、改进项和知识沉淀独立记录">{props.selected ? <div className="space-y-4 p-4"><EvidenceBlock record={props.selected} /><div className="rounded-lg border border-amber-200 bg-amber-50 p-4"><div className="flex items-center gap-2 text-[10px] font-semibold text-amber-900"><Target className="h-4 w-4" />改进候选</div><div className="mt-2 text-[9px] leading-5 text-amber-800">补充通知升级路径，缩短跨团队确认耗时，并在下次演练验证。</div></div><ActionButton icon={Save} onClick={props.submitReview}>提交复盘</ActionButton></div> : <EmptySelection label="暂无复盘信息" />}</Panel>
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

function SecurityDrawer({
  open,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/25 backdrop-blur-[1px]" role="dialog" aria-modal="true">
      <button type="button" className="min-w-0 flex-1 cursor-default" onClick={onClose} aria-label="关闭详情抽屉" />
      <aside className="flex h-full w-full max-w-[460px] flex-col border-l border-border bg-card shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div><div className="text-[14px] font-semibold text-foreground">{title}</div>{description && <div className="mt-1 text-[10px] text-muted-foreground">{description}</div>}</div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
      </aside>
    </div>
  );
}

// ---------- data-security feature 内自包含 Modal 与表单原语 ----------

function SecurityModal({
  title,
  description,
  onClose,
  children,
  footer,
  width = "max-w-2xl",
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/30 p-4 backdrop-blur-[1px]" role="dialog" aria-modal="true">
      <div className={cn("flex max-h-[min(760px,92vh)] w-full flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xl", width)}>
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
            {description && <p className="mt-1 text-[11px] text-muted-foreground">{description}</p>}
          </div>
          <button type="button" onClick={onClose} className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-slate-100 hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

function SField({ label, required, children, hint }: { label: string; required?: boolean; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[10px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

function SInput({
  value,
  onChange,
  placeholder,
  type = "text",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={cn(
        "h-8 w-full rounded-md border border-input bg-background px-2.5 text-[11px] text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-primary",
        className,
      )}
    />
  );
}

function SSelect({
  value,
  onChange,
  options,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        "h-8 w-full rounded-md border border-input bg-background px-2.5 text-[11px] text-foreground outline-none focus:border-primary",
        className,
      )}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  );
}

function STextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full resize-y rounded-md border border-input bg-background px-2.5 py-2 text-[11px] text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-primary"
    />
  );
}

// ---------- Classification Rules Workspace ----------

const RULE_TYPE_OPTIONS = [
  { value: "语义识别", label: "语义识别" },
  { value: "确定性规则", label: "确定性规则" },
  { value: "等级聚合", label: "等级聚合" },
  { value: "分类目录", label: "分类目录" },
  { value: "模型识别", label: "模型识别" },
  { value: "语义 + 确定性", label: "语义 + 确定性" },
];

interface RuleCreateFormState {
  name: string;
  ruleType: string;
  version: string;
  threshold: string;
  effectiveDate: string;
  owner: string;
  summary: string;
  ruleLogic: string;
  applicableScope: string;
}

const emptyRuleForm: RuleCreateFormState = {
  name: "",
  ruleType: "语义识别",
  version: "CLS-v2.4",
  threshold: "高置信 0.92",
  effectiveDate: "",
  owner: "",
  summary: "",
  ruleLogic: "",
  applicableScope: "",
};

function ClassificationRulesWorkspace(props: SpecializedWorkspaceProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<RuleCreateFormState>(emptyRuleForm);
  const [categoryFilter, setCategoryFilter] = useState("全部");

  const ruleTypes = Array.from(new Set(props.records.map((r) => String(r.fields.规则类型 ?? "未知"))));
  const categories = ["全部", ...ruleTypes];

  const filteredByCategory = categoryFilter === "全部"
    ? props.filtered
    : props.filtered.filter((r) => String(r.fields.规则类型 ?? "") === categoryFilter);

  function openCreate() {
    const prevMax = props.records.reduce((max, r) => {
      const v = String(r.fields.规则版本 ?? "");
      const match = v.match(/v(\d+)/);
      return match ? Math.max(max, Number.parseInt(match[1], 10)) : max;
    }, 2);
    setForm({
      ...emptyRuleForm,
      name: "",
      version: `CLS-v${prevMax + 1}`,
      effectiveDate: new Date().toISOString().slice(0, 10),
    });
    setCreateOpen(true);
  }

  function handleCreate() {
    if (!form.name.trim() || !form.version.trim()) return;
    const draft: SecurityRecord = {
      id: `class-rule-${Date.now()}`,
      name: form.name.trim(),
      summary: form.summary.trim() || "待补充规则描述和适用范围。",
      status: "草稿",
      owner: form.owner.trim() || "待指定",
      updatedAt: "刚刚",
      version: 1,
      risk: "中",
      evidenceState: "缺失",
      evidenceRefs: [],
      fields: {
        规则类型: form.ruleType,
        规则版本: form.version.trim(),
        阈值: form.threshold,
        生效日期: form.effectiveDate || "未生效",
        规则逻辑: form.ruleLogic,
        适用范围: form.applicableScope,
      },
      mock: true,
    };
    setCreateOpen(false);
    if (props.createRecord) {
      props.createRecord(draft);
    } else {
      props.addRecord();
    }
  }

  const updateSelected = (patch: Partial<SecurityRecord>, label: string) => {
    if (props.patchSelected) {
      props.patchSelected(patch, label);
    }
  };

  const ruleTreeData = props.records.map((record) => {
    const type = String(record.fields.规则类型 ?? "未知");
    const version = String(record.fields.规则版本 ?? "");
    return { record, type, version };
  });

  return (
    <WorkspacePage>
      <PageTitle
        eyebrow={props.config.eyebrow}
        title={props.config.title}
        description={props.config.description}
        actions={<ActionButton primary icon={Plus} onClick={openCreate}>新建规则版本</ActionButton>}
      />
      <InlineNotice error={props.error} loading={props.loading} />

      <div className="grid min-h-[680px] gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        {/* Left: Rule version library with category filter */}
        <Panel
          title="规则版本库"
          description={`${props.records.length} 个版本化规则`}
          actions={
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-7 rounded-md border border-input bg-background px-2 text-[10px] outline-none focus:border-primary"
            >
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
          }
        >
          <div className="divide-y divide-border">
            {filteredByCategory.map((record) => (
              <button
                key={record.id}
                type="button"
                onClick={() => props.setSelectedId(record.id)}
                className={cn(
                  "w-full p-4 text-left transition hover:bg-muted/30",
                  props.selectedId === record.id && "border-l-2 border-primary bg-blue-50/60 pl-[14px]",
                )}
              >
                <div className="flex items-start gap-2">
                  <GitCompareArrows className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold text-foreground">{record.name}</div>
                    <div className="mt-1 line-clamp-2 text-[9px] leading-4 text-muted-foreground">{record.summary}</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[9px] text-muted-foreground">
                    {String(record.fields.规则版本 ?? "")} · {record.owner}
                  </span>
                  <Pill tone={statusTone(record.status)}>{record.status}</Pill>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Pill tone="blue">{String(record.fields.规则类型 ?? "")}</Pill>
                  <Pill tone="slate">v{record.version}</Pill>
                </div>
              </button>
            ))}
            {!filteredByCategory.length && (
              <div className="p-10 text-center text-[10px] text-muted-foreground">没有符合条件的规则</div>
            )}
          </div>
        </Panel>

        <div className="space-y-4">
        {/* Center: Rule tree & hit logic */}
        <Panel
          title="规则树与命中逻辑"
          description="分类目录 → 识别规则 → 等级聚合"
          actions={<WorkspaceFilters {...props} />}
        >
          <div className="p-4">
            {/* Rule tree visualization */}
            <div className="mb-4 rounded-lg border border-border bg-slate-950 p-4 text-slate-200">
              <div className="flex items-center gap-2 text-[10px] font-semibold text-blue-300">
                <GitCompareArrows className="h-4 w-4" />分类规则版本树
              </div>
              <div className="mt-3 space-y-1 font-mono text-[10px] leading-6 text-slate-300">
                {ruleTreeData.map(({ record, version }) => (
                  <div key={record.id} className={cn(
                    "flex items-center gap-2 rounded px-2 py-1",
                    props.selectedId === record.id ? "bg-blue-600/30 text-white" : "hover:bg-slate-800",
                  )}>
                    <span className="text-slate-500">├──</span>
                    <span className="text-amber-300">{version}</span>
                    <span className="text-slate-500">|</span>
                    <span className="flex-1 truncate">{record.name}</span>
                    {/已发布/.test(record.status) && <span className="text-emerald-400">[生效]</span>}
                    {/草稿/.test(record.status) && <span className="text-amber-400">[草稿]</span>}
                    {/待发布/.test(record.status) && <span className="text-blue-400">[待发布]</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Hit logic detail for selected rule */}
            {props.selected ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-border p-4">
                  <div className="text-[10px] font-semibold text-foreground">命中逻辑</div>
                  <div className="mt-3 space-y-2">
                    <div className="grid grid-cols-[80px_minmax(0,1fr)] gap-2 text-[10px]">
                      <span className="text-muted-foreground">规则类型</span>
                      <span className="text-foreground">{String(props.selected.fields.规则类型 ?? "—")}</span>
                    </div>
                    <div className="grid grid-cols-[80px_minmax(0,1fr)] gap-2 text-[10px]">
                      <span className="text-muted-foreground">阈值配置</span>
                      <span className="text-foreground">{String(props.selected.fields.阈值 ?? "—")}</span>
                    </div>
                    <div className="grid grid-cols-[80px_minmax(0,1fr)] gap-2 text-[10px]">
                      <span className="text-muted-foreground">适用范围</span>
                      <span className="text-foreground">{String(props.selected.fields.适用范围 ?? "全域数据资产")}</span>
                    </div>
                    <div className="grid grid-cols-[80px_minmax(0,1fr)] gap-2 text-[10px]">
                      <span className="text-muted-foreground">规则逻辑</span>
                      <span className="break-words text-foreground">{String(props.selected.fields.规则逻辑 ?? "基于字段名、注释、血缘场景与词典组合匹配。")}</span>
                    </div>
                  </div>
                </div>

                {/* Simulated match preview */}
                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <div className="flex items-center gap-2 text-[10px] font-semibold text-foreground">
                    <ScanSearch className="h-3.5 w-3.5 text-primary" />模拟命中预览
                  </div>
                  <div className="mt-3 grid gap-2">
                    {[
                      ["customer_info.phone", "个人信息 · 高置信 0.96"],
                      ["risk.score.overall", "经营数据 · 中置信 0.78"],
                      ["order.amount.total", "经营数据 · 高置信 0.94"],
                      ["employee.id_card", "敏感个人信息 · 高置信 0.99"],
                    ].slice(0, 3 + (props.selected.version % 2)).map(([field, result]) => (
                      <div key={field} className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-1.5 text-[10px]">
                        <span className="font-mono text-foreground">{field}</span>
                        <span className="text-muted-foreground">{result}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 text-[9px] text-muted-foreground">同输入、同版本重复执行应得到同一结论。</div>
                </div>
              </div>
            ) : (
              <div className="py-10 text-center text-[11px] text-muted-foreground">选择左侧规则查看命中逻辑</div>
            )}
          </div>
        </Panel>

        {/* Right: Publish inspector / Detail editor */}
        <Panel
          title="发布检查与详情"
          description={props.selected?.name ?? "请选择规则版本"}
          actions={props.selected ? <Pill tone={statusTone(props.selected.status)}>{props.selected.status}</Pill> : undefined}
        >
          {props.selected ? (
            <div className="space-y-4 p-4">
              {/* Editable fields */}
              <div className="space-y-3">
                <div className="text-[10px] font-semibold text-foreground">基本信息</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="text-[10px] text-muted-foreground">
                    规则名称
                    <input
                      value={props.selected.name}
                      onChange={(event) => updateSelected({ name: event.target.value }, "编辑规则名称")}
                      className="mt-1 h-7 w-full rounded-md border border-input bg-background px-2 text-[10px] text-foreground outline-none focus:border-primary"
                    />
                  </label>
                  <label className="text-[10px] text-muted-foreground">
                    责任人
                    <input
                      value={props.selected.owner}
                      onChange={(event) => updateSelected({ owner: event.target.value }, "编辑责任人")}
                      className="mt-1 h-7 w-full rounded-md border border-input bg-background px-2 text-[10px] text-foreground outline-none focus:border-primary"
                    />
                  </label>
                </div>
                <label className="text-[10px] text-muted-foreground">
                  规则描述
                  <textarea
                    value={props.selected.summary}
                    onChange={(event) => updateSelected({ summary: event.target.value }, "编辑规则描述")}
                    rows={2}
                    className="mt-1 w-full resize-y rounded-md border border-input bg-background px-2 py-1.5 text-[10px] text-foreground outline-none focus:border-primary"
                  />
                </label>
              </div>

              <div className="rounded-md border border-border bg-muted/20 p-3">
                <div className="text-[10px] font-semibold text-foreground">配置字段</div>
                <dl className="mt-2 grid gap-2">
                  {Object.entries(props.selected.fields).map(([key, value]) => (
                    <div key={key} className="grid grid-cols-[80px_minmax(0,1fr)] gap-2 text-[10px] leading-5">
                      <dt className="text-muted-foreground">{key}</dt>
                      <dd className="break-words text-foreground">{formatField(value)}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* Publish gate */}
              <div className="rounded-lg border border-border p-3">
                <div className="text-[10px] font-semibold text-foreground">发布门禁</div>
                <div className="mt-3 space-y-2">
                  {([
                    ["规则名称与版本已填写", props.selected.name.trim().length > 0 && String(props.selected.fields.规则版本 ?? "").trim().length > 0],
                    ["阈值与范围已配置", String(props.selected.fields.阈值 ?? "").trim().length > 0],
                    ["规则逻辑已描述", String(props.selected.fields.规则逻辑 ?? "").trim().length > 0],
                    ["证据引用已关联", props.selected.evidenceRefs.length > 0],
                    ["已分配责任人", Boolean(props.selected.owner && props.selected.owner !== "待指定")],
                  ] as [string, boolean][]).map(([label, ok]) => (
                    <div key={label} className="flex items-center justify-between rounded-md border border-border px-3 py-1.5 text-[9px]">
                      <span>{label}</span>
                      {ok ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                    </div>
                  ))}
                </div>
              </div>

              <EvidenceBlock record={props.selected} />

              <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                <ActionButton primary icon={Play} onClick={props.execute} disabled={props.selected.status === props.config.runningStatus}>
                  {props.selected.status === props.config.runningStatus ? `${props.config.runningStatus}…` : props.config.runLabel}
                </ActionButton>
                <ActionButton icon={Save} onClick={props.submitReview}>提交复核</ActionButton>
                <ActionButton icon={FilePlus2} onClick={props.addEvidence}>补充证据</ActionButton>
              </div>
            </div>
          ) : (
            <div className="p-10 text-center text-[11px] text-muted-foreground">选择或新建一条规则版本</div>
          )}
        </Panel>
        </div>
      </div>

      {/* Create Modal */}
      {createOpen && (
        <SecurityModal
          title="新建分类分级规则"
          description="定义规则的类型、版本、阈值和适用范围。保存后进入草稿状态，可在右侧面板继续完善。"
          onClose={() => setCreateOpen(false)}
          width="max-w-2xl"
          footer={
            <>
              <ActionButton onClick={() => setCreateOpen(false)}>取消</ActionButton>
              <ActionButton primary icon={Plus} onClick={handleCreate} disabled={!form.name.trim() || !form.version.trim()}>
                保存为草稿
              </ActionButton>
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <SField label="规则名称" required hint="如：个人信息语义识别规则">
                <SInput value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="请输入规则名称" />
              </SField>
              <SField label="规则责任人" required>
                <SInput value={form.owner} onChange={(v) => setForm((f) => ({ ...f, owner: v }))} placeholder="如：王雪" />
              </SField>
            </div>

            <SField label="规则描述" required hint="简述规则用途、依据和预期效果">
              <STextArea value={form.summary} onChange={(v) => setForm((f) => ({ ...f, summary: v }))} placeholder="如：字段名、注释、血缘场景与词典组合匹配，用于识别个人信息和敏感个人信息。" rows={2} />
            </SField>

            <div className="grid gap-3 sm:grid-cols-2">
              <SField label="规则类型" required>
                <SSelect
                  value={form.ruleType}
                  onChange={(v) => setForm((f) => ({ ...f, ruleType: v }))}
                  options={RULE_TYPE_OPTIONS}
                />
              </SField>
              <SField label="规则版本" required hint="格式如 CLS-v2.4">
                <SInput value={form.version} onChange={(v) => setForm((f) => ({ ...f, version: v }))} placeholder="CLS-v2.4" />
              </SField>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <SField label="阈值配置" hint="如：高置信 0.92（版本配置）">
                <SInput value={form.threshold} onChange={(v) => setForm((f) => ({ ...f, threshold: v }))} placeholder="如：高置信 0.92（版本配置）" />
              </SField>
              <SField label="生效日期" hint="发布时生效，草稿中默认为未生效">
                <SInput type="date" value={form.effectiveDate} onChange={(v) => setForm((f) => ({ ...f, effectiveDate: v }))} />
              </SField>
            </div>

            <SField label="适用范围" hint="描述规则覆盖的数据域和对象">
              <SInput value={form.applicableScope} onChange={(v) => setForm((f) => ({ ...f, applicableScope: v }))} placeholder="如：全域数据资产 / 客户与风险域" />
            </SField>

            <SField label="规则逻辑" hint="描述命中条件与聚合逻辑，保存后用于确定性 mock 执行">
              <STextArea
                value={form.ruleLogic}
                onChange={(v) => setForm((f) => ({ ...f, ruleLogic: v }))}
                placeholder="如：1) 字段名/注释命中词典；2) 血缘场景辅助判断；3) 多信号置信度加权；4) 重要/核心数据升级需双人审批。"
                rows={4}
              />
            </SField>

            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-[10px] leading-5 text-amber-800">
              规则创建后进入草稿状态。发布前需完成：阈值与范围配置、规则逻辑描述、证据关联和责任人分配。
            </div>
          </div>
        </SecurityModal>
      )}
    </WorkspacePage>
  );
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
export function ClassificationTaskDetailPage() {
  const navigate = useNavigate();
  const { taskId } = useParams<{ taskId: string }>();
  const config = SECURITY_PAGE_CONFIGS.classification;
  const [state, setState, meta] = useSecurityDomainState("classification");
  const classificationRecords = state.collections.classification ?? [];
  const record = classificationRecords.find((r) => r.id === taskId);

  function patchRecord(patch: Partial<SecurityRecord>, action: string) {
    if (!record) return;
    setState((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      collections: {
        ...current.collections,
        classification: (current.collections.classification ?? []).map((r) => (
          r.id === record.id ? { ...r, ...patch, updatedAt: "刚刚" } : r
        )),
      },
      activity: [
        { id: `class-detail-${Date.now()}`, pageKey: "classification" as const, action, actor: "当前用户（mock）", result: "已写入 SQLite mock 状态", occurredAt: new Date().toISOString() },
        ...current.activity,
      ].slice(0, 50),
    }));
  }

  function updateField(field: string, value: string) {
    if (!record) return;
    patchRecord({ fields: { ...record.fields, [field]: value } }, `更新${field}`);
  }

  function updateArrayField(field: string, value: string) {
    if (!record) return;
    const current = Array.isArray(record.fields[field]) ? (record.fields[field] as string[]) : [String(record.fields[field] ?? "")];
    const exists = current.includes(value);
    const next = exists ? current.filter((v) => v !== value) : [...current.filter(Boolean), value];
    patchRecord({ fields: { ...record.fields, [field]: next } }, `更新${field}`);
  }

  function runExecute() {
    if (!record || record.status === config.runningStatus) return;
    const recordId = record.id;
    patchRecord({ status: config.runningStatus }, config.runLabel);
    window.setTimeout(() => {
      setState((current) => ({
        ...current,
        updatedAt: new Date().toISOString(),
        collections: {
          ...current.collections,
          classification: (current.collections.classification ?? []).map((r) => {
            if (r.id !== recordId) return r;
            const fields = { ...r.fields };
            fields.置信度 = `${90 + (Number.parseInt(stableHash(r.id).slice(-2), 16) % 9)}%`;
            fields.覆盖范围 = fields.覆盖范围 === "0 表 / 0 字段" ? "12 表 / 86 字段" : fields.覆盖范围;
            if (Array.isArray(fields.分类标签) && fields.分类标签.includes("待识别")) {
              fields.分类标签 = ["个人信息", "敏感个人信息"];
            }
            if (fields.监管等级 === "待识别") fields.监管等级 = "一般敏感";
            return {
              ...r,
              status: config.completedStatus,
              fields,
              evidenceState: r.evidenceState === "缺失" ? "待核验" : r.evidenceState,
              evidenceRefs: [...r.evidenceRefs, deterministicEvidenceRef("classification", r.id, r.version + 1)],
              updatedAt: "刚刚",
            };
          }),
        },
        activity: [
          { id: `class-run-${Date.now()}`, pageKey: "classification" as const, action: `${config.runLabel}完成`, actor: "系统（mock）", result: "确定性 mock 执行完成，已生成证据引用", occurredAt: new Date().toISOString() },
          ...current.activity,
        ].slice(0, 50),
      }));
    }, 600);
  }

  function submitReview() { patchRecord({ status: "待复核" }, "提交复核"); }
  function addEvidence() {
    if (!record) return;
    const evidenceRef = deterministicEvidenceRef("classification", record.id, record.version + record.evidenceRefs.length + 1);
    patchRecord({ evidenceRefs: [...record.evidenceRefs, evidenceRef], evidenceState: "待核验" }, "补充证据引用");
  }

  if (!record) {
    return (
      <WorkspacePage>
        <PageTitle eyebrow={config.eyebrow} title="任务不存在" description={`未找到 ID 为 ${taskId} 的识别任务`} actions={<ActionButton icon={ArrowRight} onClick={() => navigate("/data-security/classification")}>返回列表</ActionButton>} />
      </WorkspacePage>
    );
  }

  const labels = Array.isArray(record.fields.分类标签) ? record.fields.分类标签 : [String(record.fields.分类标签 ?? "待识别")];
  const level = String(record.fields.监管等级 ?? "待识别");
  const requiresDualApproval = /重要|核心/.test(level);

  return (
    <WorkspacePage>
      <div className="mb-3 flex items-center gap-2 text-[11px]">
        <button type="button" onClick={() => navigate("/data-security/classification")} className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary">
          <ArrowRight className="h-3 w-3 rotate-180" /> 返回任务列表
        </button>
        <span className="text-muted-foreground">/</span>
        <span className="text-foreground">{record.name}</span>
      </div>

      <PageTitle
        eyebrow={config.eyebrow}
        title={record.name}
        description={record.summary}
        actions={
          <div className="flex items-center gap-2">
            <Pill tone={statusTone(record.status)}>{record.status}</Pill>
            <ActionButton primary icon={Play} onClick={runExecute} disabled={record.status === config.runningStatus}>
              {record.status === config.runningStatus ? `${config.runningStatus}…` : config.runLabel}
            </ActionButton>
            <ActionButton icon={Save} onClick={submitReview}>提交复核</ActionButton>
          </div>
        }
      />
      <InlineNotice error={meta.error} loading={!meta.hydrated} />

      <div className="grid min-h-[600px] gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Panel title="扫描范围配置" description="任务的识别边界与执行策略">
            <div className="grid gap-4 p-4 md:grid-cols-2">
              <label className="block text-[11px] text-muted-foreground">
                任务名称
                <input value={record.name} onChange={(e) => patchRecord({ name: e.target.value }, "编辑名称")} className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-[11px] text-foreground outline-none focus:border-primary" />
              </label>
              <label className="block text-[11px] text-muted-foreground">
                责任人
                <input value={record.owner} onChange={(e) => patchRecord({ owner: e.target.value }, "编辑责任人")} className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-[11px] text-foreground outline-none focus:border-primary" />
              </label>
              <label className="block text-[11px] text-muted-foreground">
                范围类型
                <select value={formatField(record.fields.范围类型)} onChange={(e) => updateField("范围类型", e.target.value)} className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-[11px] text-foreground outline-none focus:border-primary">
                  <option>数据源</option><option>业务域</option><option>资产</option>
                </select>
              </label>
              <label className="block text-[11px] text-muted-foreground">
                扫描目标
                <input value={formatField(record.fields.扫描范围)} onChange={(e) => updateField("扫描范围", e.target.value)} className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-[11px] text-foreground outline-none focus:border-primary" />
              </label>
              <label className="block text-[11px] text-muted-foreground">
                识别模式
                <select value={formatField(record.fields.识别模式)} onChange={(e) => updateField("识别模式", e.target.value)} className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-[11px] text-foreground outline-none focus:border-primary">
                  <option>增量扫描</option><option>全量扫描</option>
                </select>
              </label>
              <label className="block text-[11px] text-muted-foreground">
                规则版本
                <select value={formatField(record.fields.规则版本)} onChange={(e) => updateField("规则版本", e.target.value)} className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-[11px] text-foreground outline-none focus:border-primary">
                  <option>CLS-v2.3</option><option>CLS-v2.1</option><option>AGG-v1.1</option>
                </select>
              </label>
              <label className="block text-[11px] text-muted-foreground">
                触发方式
                <select value={formatField(record.fields.触发方式)} onChange={(e) => updateField("触发方式", e.target.value)} className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-[11px] text-foreground outline-none focus:border-primary">
                  <option>手动</option><option>定时 02:00</option><option>每日 00:00</option><option>每周一 01:00</option>
                </select>
              </label>
            </div>
          </Panel>

          <Panel title="预期分类标签" description="识别引擎的匹配目标，执行后根据实际命中调整">
            <div className="flex flex-wrap gap-2 p-4">
              {(["个人信息", "敏感个人信息", "经营数据", "商业秘密", "研发数据", "财务数据"] as const).map((tag) => {
                const isActive = labels.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => updateArrayField("分类标签", tag)}
                    className={cn("rounded-full border px-3 py-1 text-[11px] font-medium transition", isActive ? "border-blue-200 bg-blue-50 text-blue-700" : "border-border bg-background text-muted-foreground hover:border-primary/40")}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel title="分类识别结果" description="执行后的规则命中与等级建议">
            <div className="space-y-4 p-4">
              <div className="rounded-lg bg-slate-950 p-4 text-slate-200">
                <div className="flex items-center gap-2 text-[10px] text-blue-300"><ShieldCheck className="h-4 w-4" />识别结果摘要</div>
                <div className="mt-3 text-[20px] font-semibold">{level}</div>
                <div className="mt-2 font-mono text-[9px] leading-5 text-slate-400">
                  confidence = {formatField(record.fields.置信度)}<br />
                  rule = {formatField(record.fields.规则版本)}<br />
                  scope = {formatField(record.fields.扫描范围)}
                </div>
              </div>
              <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-4">
                <div className="flex items-center gap-2 text-[10px] font-semibold text-blue-900"><Fingerprint className="h-4 w-4" />双轴分类结果</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {labels.map((label) => <Pill key={label} tone="blue">{label}</Pill>)}
                  <Pill tone={requiresDualApproval ? "red" : "amber"}>{level}</Pill>
                </div>
                <div className="mt-3 text-[9px] leading-5 text-blue-800">
                  {requiresDualApproval ? "重要/核心数据仅为候选：数据负责人确认 → 数据安全负责人批准后方可生效。" : "普通分类的高置信无冲突结果可自动生效，并进入抽样复核。"}
                </div>
              </div>
              <div className="rounded-md border border-border p-3">
                <div className="text-[10px] font-semibold text-foreground">覆盖范围与置信度</div>
                <dl className="mt-2 grid gap-2 text-[10px]">
                  <div className="flex gap-2"><dt className="w-20 text-muted-foreground">覆盖范围</dt><dd className="text-foreground">{formatField(record.fields.覆盖范围)}</dd></div>
                  <div className="flex gap-2"><dt className="w-20 text-muted-foreground">置信度</dt><dd className="text-foreground">{formatField(record.fields.置信度)}</dd></div>
                  <div className="flex gap-2"><dt className="w-20 text-muted-foreground">风险等级</dt><dd className="text-foreground">{record.risk}</dd></div>
                  <div className="flex gap-2"><dt className="w-20 text-muted-foreground">版本</dt><dd className="text-foreground">v{record.version}</dd></div>
                </dl>
              </div>
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="审批证据链">
            <div className="space-y-3 p-4">
              {[
                ["规则识别", "已记录"],
                ["数据负责人复核", /待|旧版|草稿/.test(record.status) ? "待处理" : "已完成"],
                ["安全负责人批准", requiresDualApproval ? "必需" : "抽样"],
              ].map(([step, state], index) => (
                <div key={step} className="flex items-center gap-3">
                  <span className={cn("grid h-6 w-6 place-items-center rounded-full border text-[9px]", state === "已完成" || state === "已记录" ? "border-emerald-200 bg-emerald-50 text-emerald-600" : "border-amber-200 bg-amber-50 text-amber-600")}>{index + 1}</span>
                  <div><div className="text-[10px] font-medium text-foreground">{step}</div><div className="text-[9px] text-muted-foreground">{state}</div></div>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="证据引用" actions={<Pill tone={statusTone(record.evidenceState)}>{record.evidenceState}</Pill>}>
            <div className="space-y-2 p-4">
              {record.evidenceRefs.length ? record.evidenceRefs.map((reference) => (
                <div key={reference} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 font-mono text-[9px] text-muted-foreground">
                  <FileCheck2 className="h-3.5 w-3.5 text-primary" />{reference}<span className="ml-auto">masked ref</span>
                </div>
              )) : <div className="rounded-md border border-dashed border-amber-200 bg-amber-50 p-3 text-[10px] text-amber-700">尚无证据引用，不能按 0 处理</div>}
              <ActionButton icon={FilePlus2} onClick={addEvidence}>补充证据</ActionButton>
            </div>
          </Panel>
          <Panel title="活动记录">
            <div className="max-h-[260px] space-y-2 overflow-y-auto p-4">
              {state.activity.filter((a) => a.pageKey === "classification").slice(0, 10).map((item) => (
                <div key={item.id} className="text-[10px] leading-5 text-muted-foreground">
                  <div className="flex justify-between"><span className="text-foreground">{item.action}</span><span className="text-[9px]">{new Date(item.occurredAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</span></div>
                  <div className="text-[9px]">{item.actor} · {item.result}</div>
                </div>
              ))}
              {!state.activity.filter((a) => a.pageKey === "classification").length && <div className="text-[10px] text-muted-foreground">暂无活动记录</div>}
            </div>
          </Panel>
        </div>
      </div>
    </WorkspacePage>
  );
}
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
