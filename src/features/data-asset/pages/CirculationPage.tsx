import { useMemo, useState } from "react";
import {
  Activity, AlertTriangle, ArrowRight, Boxes, CheckCircle2, Circle,
  Clock3, FileCheck2, KeyRound, Play, PlugZap, Plus, RefreshCw,
  Search, Send, ShieldCheck, Undo2, Users, XCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useDataAssetState } from "../store";
import {
  ASSET_TYPE_LABEL, CIRCULATION_STATUS_LABEL, MOCK_NOW, PURPOSE_OPTIONS, uid,
  type Asset, type AssetCirculationApplication, type AssetIntegrationTask,
  type AssetUsageRecord, type CirculationDelivery, type CirculationStage,
  type CirculationStatus,
} from "../api/types";
import {
  Badge, Field, Input, Modal, PageHeader, PrimaryButton, SecondaryButton,
  SectionCard, Select, TextArea, WarnNote, useToast, type BadgeTone,
} from "../components/common";

type WorkbenchView = "application" | "approval" | "integration" | "use";

const VIEW_META: Record<WorkbenchView, { label: string; description: string; stage: CirculationStage }> = {
  application: { label: "申请", description: "新建与退回修改", stage: "application" },
  approval: { label: "审批", description: "负责人及安全审批", stage: "approval" },
  integration: { label: "对接", description: "配置、联调与验收", stage: "integration" },
  use: { label: "使用", description: "授权范围与使用证据", stage: "use" },
};

const STATUS_TONE: Record<CirculationStatus, BadgeTone> = {
  draft: "slate",
  pendingOwner: "amber",
  pendingSecurity: "amber",
  pendingIntegration: "blue",
  integrating: "blue",
  inUse: "green",
  returned: "amber",
  rejected: "red",
  integrationFailed: "red",
  suspended: "slate",
};

const STAGE_ORDER: CirculationStage[] = ["application", "approval", "integration", "use"];
const STAGE_LABEL: Record<CirculationStage, string> = {
  application: "申请提交",
  approval: "审批授权",
  integration: "对接配置",
  use: "使用跟踪",
};

function isViewMatch(application: AssetCirculationApplication, view: WorkbenchView): boolean {
  if (view === "application") return application.status === "draft" || application.status === "returned";
  if (view === "approval") return ["pendingOwner", "pendingSecurity", "rejected"].includes(application.status);
  if (view === "integration") return ["pendingIntegration", "integrating", "integrationFailed"].includes(application.status);
  return ["inUse", "suspended"].includes(application.status);
}

function createIntegrationTask(application: AssetCirculationApplication, id: string): AssetIntegrationTask {
  const configSummary = application.delivery === "标准引用"
    ? `data-agent:standard:${application.asset.standardCode ?? application.asset.assetId}@${application.asset.standardVersion ?? `v${application.asset.assetVersion}`}`
    : application.delivery === "API"
      ? `HTTPS · /mock/assets/${application.asset.assetId} · 调用方 ${application.consumerSystem}`
      : application.delivery === "文件下载"
        ? `受控文件 · ${application.requestedScope} · 限时交付`
        : `只读查询空间 · ${application.requestedScope}`;
  const checklist = application.delivery === "标准引用"
    ? ["企业对象 ID 已映射", "标准版本已冻结", "消费引用关系已登记"]
    : ["申请范围与审批结论一致", "脱敏与权限策略已配置", "消费系统联调验收通过"];
  return {
    id,
    applicationId: application.id,
    assetId: application.asset.assetId,
    delivery: application.delivery,
    owner: "平台对接-待分派",
    dueAt: application.effectiveFrom,
    status: "pending",
    configSummary,
    checklist: checklist.map((label, index) => ({ id: `${id}-check-${index + 1}`, label, status: "pending" })),
    updatedAt: MOCK_NOW,
  };
}

export default function CirculationPage() {
  const { state, update, meta } = useDataAssetState();
  const toast = useToast();
  const [view, setView] = useState<WorkbenchView>("approval");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(state.circulation.applications[0]?.id ?? "");
  const [createOpen, setCreateOpen] = useState(false);
  const [decisionOpinion, setDecisionOpinion] = useState("");

  const counts = useMemo(() => Object.fromEntries(
    (Object.keys(VIEW_META) as WorkbenchView[]).map((key) => [key, state.circulation.applications.filter((item) => isViewMatch(item, key)).length]),
  ) as Record<WorkbenchView, number>, [state.circulation.applications]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return state.circulation.applications.filter((application) => {
      const matchesView = isViewMatch(application, view);
      const matchesSearch = !keyword || `${application.title} ${application.asset.assetName} ${application.applicant} ${application.applicantOrg} ${application.consumerSystem}`.toLowerCase().includes(keyword);
      return matchesView && matchesSearch;
    });
  }, [search, state.circulation.applications, view]);

  const selected = state.circulation.applications.find((item) => item.id === selectedId && filtered.some((candidate) => candidate.id === item.id)) ?? filtered[0] ?? state.circulation.applications[0];
  const integrationTask = selected?.integrationTaskId
    ? state.circulation.integrationTasks.find((task) => task.id === selected.integrationTaskId)
    : undefined;
  const usageRecords = selected
    ? state.circulation.usageRecords.filter((record) => record.applicationId === selected.id)
    : [];

  const changeView = (next: WorkbenchView) => {
    setView(next);
    setSearch("");
    setDecisionOpinion("");
    const first = state.circulation.applications.find((item) => isViewMatch(item, next));
    if (first) setSelectedId(first.id);
  };

  const approve = (application: AssetCirculationApplication) => {
    const opinion = decisionOpinion.trim() || "范围、用途和期限符合要求，同意进入下一节点。";
    const integrationId = uid("integration");
    update((current) => {
      const target = current.circulation.applications.find((item) => item.id === application.id);
      if (!target) return current;
      const role = target.status === "pendingSecurity" ? "安全审批人" : "资产负责人";
      target.approvals = target.approvals.map((step) => step.role === role
        ? { ...step, status: "approved", opinion, processedBy: role === "安全审批人" ? "林安全" : target.asset.assetName === "企业风险评分模型" ? "赵强" : "当前审批人", processedAt: MOCK_NOW }
        : step);
      if (target.status === "pendingOwner" && target.requiresSecurity) {
        target.status = "pendingSecurity";
        target.stage = "approval";
      } else {
        target.status = "pendingIntegration";
        target.stage = "integration";
        target.integrationTaskId = integrationId;
        target.grantNo = `GRANT-${target.asset.assetType === "standard" ? "STD" : "ASSET"}-${Date.now().toString(36).toUpperCase()}`;
        current.circulation.integrationTasks.unshift(createIntegrationTask(target, integrationId));
      }
      target.updatedAt = MOCK_NOW;
      return current;
    });
    setDecisionOpinion("");
    toast("success", application.requiresSecurity && application.status === "pendingOwner" ? "负责人审批已通过，已转安全审批。" : "审批已通过，已生成资产对接任务。" );
  };

  const decide = (application: AssetCirculationApplication, action: "returned" | "rejected") => {
    const opinion = decisionOpinion.trim();
    if (!opinion) {
      toast("error", action === "returned" ? "请填写退回修改意见。" : "请填写驳回原因。");
      return;
    }
    update((current) => ({
      ...current,
      circulation: {
        ...current.circulation,
        applications: current.circulation.applications.map((item) => item.id !== application.id ? item : {
          ...item,
          status: action,
          stage: action === "returned" ? "application" : "approval",
          lastDecisionReason: opinion,
          updatedAt: MOCK_NOW,
          approvals: item.approvals.map((step) => step.status === "pending" ? { ...step, status: action, opinion, processedBy: "当前审批人", processedAt: MOCK_NOW } : step),
        }),
      },
    }));
    setDecisionOpinion("");
    toast("info", action === "returned" ? "申请已退回修改，历史审批意见已保留。" : "申请已驳回，流程证据已保留。" );
  };

  const resubmit = (application: AssetCirculationApplication) => {
    update((current) => ({
      ...current,
      circulation: {
        ...current.circulation,
        applications: current.circulation.applications.map((item) => item.id !== application.id ? item : {
          ...item,
          status: "pendingOwner",
          stage: "approval",
          lastDecisionReason: undefined,
          updatedAt: MOCK_NOW,
          approvals: item.approvals.map((step) => ({ ...step, status: step.role === "安全审批人" && !item.requiresSecurity ? "skipped" : "pending", opinion: undefined, processedBy: undefined, processedAt: undefined })),
        }),
      },
    }));
    toast("success", "申请已重新提交资产负责人审批。" );
  };

  const advanceIntegration = (application: AssetCirculationApplication, task: AssetIntegrationTask) => {
    const nextStatus = task.status === "pending" ? "configuring" : task.status === "configuring" ? "testing" : task.status === "testing" || task.status === "failed" ? "completed" : "completed";
    update((current) => ({
      ...current,
      circulation: {
        ...current.circulation,
        integrationTasks: current.circulation.integrationTasks.map((item) => item.id !== task.id ? item : {
          ...item,
          status: nextStatus,
          owner: item.owner === "平台对接-待分派" ? "平台对接-李浩" : item.owner,
          checklist: item.checklist.map((check, index) => nextStatus === "configuring"
            ? (index === 0 ? { ...check, status: "passed" } : check)
            : nextStatus === "testing"
              ? (index <= 1 ? { ...check, status: "passed" } : check)
              : { ...check, status: "passed", note: undefined }),
          lastResult: nextStatus === "configuring" ? "已生成脱敏配置，等待联调。" : nextStatus === "testing" ? "配置校验通过，正在执行消费端联调。" : "全部检查通过，对接验收完成。",
          ...(nextStatus === "completed" ? { completedAt: MOCK_NOW } : {}),
          updatedAt: MOCK_NOW,
        }),
        applications: current.circulation.applications.map((item) => item.id !== application.id ? item : {
          ...item,
          status: nextStatus === "completed" ? "inUse" : "integrating",
          stage: nextStatus === "completed" ? "use" : "integration",
          updatedAt: MOCK_NOW,
        }),
      },
    }));
    toast("success", nextStatus === "completed" ? "对接已验收，申请进入使用跟踪。" : nextStatus === "testing" ? "已进入联调验证。" : "已开始配置资产交付方式。" );
  };

  const simulateUse = (application: AssetCirculationApplication) => {
    const record: AssetUsageRecord = {
      id: uid("usage"),
      applicationId: application.id,
      assetId: application.asset.assetId,
      assetName: application.asset.assetName,
      assetVersion: application.asset.assetVersion,
      consumerSystem: application.consumerSystem,
      purpose: application.purpose,
      delivery: application.delivery,
      at: MOCK_NOW,
      result: "成功",
      action: application.delivery === "标准引用" ? "解析并引用标准定义" : application.delivery === "文件下载" ? "生成并下载受控文件" : application.delivery === "在线查询" ? "执行只读查询" : "调用资产 API",
      volume: application.delivery === "标准引用" ? "1 次引用校验" : application.delivery === "文件下载" ? "1 个脱敏文件" : "128 条记录",
      evidenceNo: `EVD-CIRC-${Date.now().toString(36).toUpperCase()}`,
    };
    update((current) => ({ ...current, circulation: { ...current.circulation, usageRecords: [record, ...current.circulation.usageRecords] } }));
    toast("success", "已生成一次 mock 使用证据，未调用真实系统。" );
  };

  return (
    <div className="page-shell animate-fade-in">
      <div className="space-y-4">
        <PageHeader
          title="资产流通"
          description="以一张申请贯通直接资产的申请、审批、对接和使用证据；数据产品授权仍由资产运营管理"
          actions={<PrimaryButton icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setCreateOpen(true)}>新建资产申请</PrimaryButton>}
        />
        {meta.error && <WarnNote text={`SQLite 状态读写异常：${meta.error.message}，当前操作可能仅保存在浏览器临时状态`} />}
        {!meta.hydrated && <WarnNote text="正在从 SQLite 恢复资产流通状态..." />}

        <section className="grid gap-2 rounded-lg border border-border bg-card p-3 shadow-sm md:grid-cols-4">
          {STAGE_ORDER.map((stage, index) => {
            const metaItem = Object.values(VIEW_META).find((item) => item.stage === stage)!;
            const Icon = stage === "application" ? Send : stage === "approval" ? ShieldCheck : stage === "integration" ? PlugZap : Activity;
            return (
              <div key={stage} className="relative flex items-start gap-3 rounded-md border border-border bg-slate-50/60 p-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
                <div><div className="text-[12px] font-semibold text-foreground">{index + 1}. {STAGE_LABEL[stage]}</div><div className="mt-0.5 text-[10px] text-muted-foreground">{metaItem.description}</div></div>
                {index < STAGE_ORDER.length - 1 && <ArrowRight className="absolute -right-3 top-5 z-10 hidden h-4 w-4 text-slate-300 md:block" />}
              </div>
            );
          })}
        </section>

        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-card p-1 shadow-sm">
          {(Object.keys(VIEW_META) as WorkbenchView[]).map((key) => (
            <button key={key} type="button" onClick={() => changeView(key)} className={cn("flex min-w-[120px] flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-[12px] transition", view === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-slate-50 hover:text-foreground")}>
              <span>{VIEW_META[key].label}</span><span className={cn("rounded-full px-1.5 py-0.5 text-[10px] tabular-nums", view === key ? "bg-white/20" : "bg-muted")}>{counts[key]}</span>
            </button>
          ))}
        </div>

        <div className="grid min-h-[620px] gap-4 xl:grid-cols-[310px_minmax(0,1fr)_330px]">
          <SectionCard title={`${VIEW_META[view].label}队列`} description={VIEW_META[view].description}>
            <div className="border-b border-border p-3">
              <label className="flex h-8 items-center gap-2 rounded-md border border-input bg-surface-raised px-2.5 text-muted-foreground">
                <Search className="h-3.5 w-3.5" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent text-[11px] outline-none" placeholder="搜索资产、申请方或消费系统" />
              </label>
            </div>
            <div className="max-h-[570px] divide-y divide-border overflow-y-auto">
              {filtered.length === 0 ? <div className="px-4 py-10 text-center text-[11px] text-muted-foreground">当前视图暂无申请</div> : filtered.map((application) => (
                <button key={application.id} type="button" onClick={() => { setSelectedId(application.id); setDecisionOpinion(""); }} className={cn("block w-full p-4 text-left transition hover:bg-slate-50", selected?.id === application.id && "bg-blue-50/70")}>
                  <div className="flex items-start justify-between gap-2"><Badge tone="blue">{ASSET_TYPE_LABEL[application.asset.assetType]}</Badge><Badge tone={STATUS_TONE[application.status]}>{CIRCULATION_STATUS_LABEL[application.status]}</Badge></div>
                  <div className="mt-2 text-[12px] font-semibold leading-5 text-foreground">{application.title}</div>
                  <div className="mt-1 text-[10px] text-muted-foreground">{application.applicantOrg} · {application.consumerSystem}</div>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground"><span>{application.delivery}</span><span className="font-mono">v{application.asset.assetVersion}</span></div>
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard title={selected?.title ?? "选择申请"} description={selected ? `${selected.id} · ${selected.updatedAt}` : "从左侧选择一条申请查看"} actions={selected && <Badge tone={STATUS_TONE[selected.status]}>{CIRCULATION_STATUS_LABEL[selected.status]}</Badge>}>
            {selected ? (
              <div className="space-y-5 p-5">
                <StageTimeline application={selected} />
                <section>
                  <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-foreground"><Boxes className="h-3.5 w-3.5 text-primary" />资产版本快照</div>
                  <div className="grid gap-3 rounded-md border border-border bg-slate-50/50 p-4 sm:grid-cols-2">
                    <Info label="资产" value={selected.asset.assetName} />
                    <Info label="类型 / 版本" value={`${ASSET_TYPE_LABEL[selected.asset.assetType]} / v${selected.asset.assetVersion}`} mono />
                    <Info label="资产 ID" value={selected.asset.assetId} mono />
                    <Info label="安全分类" value={selected.asset.securityLevel} />
                    {selected.asset.standardCode && <Info label="标准编码" value={selected.asset.standardCode} mono />}
                    {selected.asset.standardVersion && <Info label="标准版本" value={selected.asset.standardVersion} mono />}
                  </div>
                </section>
                <section>
                  <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-foreground"><Users className="h-3.5 w-3.5 text-primary" />申请与使用边界</div>
                  <div className="grid gap-x-5 gap-y-3 rounded-md border border-border p-4 sm:grid-cols-2">
                    <Info label="申请方" value={`${selected.applicant} · ${selected.applicantOrg}（${selected.applicantKind}）`} />
                    <Info label="消费系统" value={selected.consumerSystem} />
                    <Info label="使用目的" value={`${selected.purpose} · ${selected.purposeNote}`} />
                    <Info label="交付方式" value={selected.delivery} />
                    <div className="sm:col-span-2"><Info label="申请范围" value={selected.requestedScope} /></div>
                    <Info label="有效期" value={`${selected.effectiveFrom} ~ ${selected.effectiveTo}`} />
                    <Info label="授权凭证" value={selected.grantNo ?? "审批完成后生成"} mono />
                  </div>
                </section>
                <ApprovalTimeline application={selected} />
                {integrationTask && <IntegrationDetail task={integrationTask} />}
                {usageRecords.length > 0 && <UsageEvidence records={usageRecords} />}
              </div>
            ) : <div className="grid min-h-[500px] place-items-center text-[12px] text-muted-foreground">暂无申请</div>}
          </SectionCard>

          <SectionCard title="当前决策" description={selected ? currentOwnerHint(selected, integrationTask) : "选择申请后显示下一步"}>
            {selected ? (
              <div className="space-y-4 p-4">
                <DecisionSummary application={selected} task={integrationTask} />
                {(selected.status === "pendingOwner" || selected.status === "pendingSecurity") && (
                  <>
                    <Field label="审批意见" hint="通过可使用默认意见；退回或驳回必须填写原因"><TextArea value={decisionOpinion} onChange={setDecisionOpinion} rows={4} placeholder="说明用途、范围、期限或安全条件的判断依据" /></Field>
                    <div className="grid grid-cols-2 gap-2">
                      <PrimaryButton onClick={() => approve(selected)} icon={<CheckCircle2 className="h-3.5 w-3.5" />}>通过</PrimaryButton>
                      <SecondaryButton onClick={() => decide(selected, "returned")}><Undo2 className="h-3.5 w-3.5" />退回修改</SecondaryButton>
                      <button type="button" onClick={() => decide(selected, "rejected")} className="col-span-2 inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 text-[12px] font-medium text-red-700 hover:bg-red-100"><XCircle className="h-3.5 w-3.5" />驳回申请</button>
                    </div>
                  </>
                )}
                {selected.status === "returned" && <PrimaryButton onClick={() => resubmit(selected)} icon={<Send className="h-3.5 w-3.5" />}>修改完成并重新提交</PrimaryButton>}
                {integrationTask && ["pending", "configuring", "testing", "failed"].includes(integrationTask.status) && (
                  <PrimaryButton onClick={() => advanceIntegration(selected, integrationTask)} icon={integrationTask.status === "failed" ? <RefreshCw className="h-3.5 w-3.5" /> : <PlugZap className="h-3.5 w-3.5" />}>
                    {integrationTask.status === "pending" ? "开始配置" : integrationTask.status === "configuring" ? "进入联调" : integrationTask.status === "failed" ? "重新联调并验收" : "完成验收"}
                  </PrimaryButton>
                )}
                {selected.status === "inUse" && <PrimaryButton onClick={() => simulateUse(selected)} icon={<Play className="h-3.5 w-3.5" />}>模拟一次使用</PrimaryButton>}
                <div className="rounded-md border border-dashed border-border p-3 text-[10px] leading-5 text-muted-foreground">当前页面只生成 SQLite 持久化的 mock 审批、对接和使用证据，不签发真实 token，不连接 API 网关或消费系统。</div>
              </div>
            ) : <div className="px-4 py-10 text-center text-[11px] text-muted-foreground">暂无下一步动作</div>}
          </SectionCard>
        </div>
      </div>

      {createOpen && <NewApplicationModal assets={state.catalog.assets} onClose={() => setCreateOpen(false)} onSubmit={(application) => {
        update((current) => ({ ...current, circulation: { ...current.circulation, applications: [application, ...current.circulation.applications] } }));
        setCreateOpen(false);
        setView("approval");
        setSelectedId(application.id);
        toast("success", "资产流通申请已提交负责人审批。" );
      }} />}
    </div>
  );
}

function StageTimeline({ application }: { application: AssetCirculationApplication }) {
  const currentIndex = STAGE_ORDER.indexOf(application.stage);
  return (
    <div className="grid grid-cols-4 gap-1 rounded-md border border-border bg-slate-50 p-2">
      {STAGE_ORDER.map((stage, index) => {
        const completed = index < currentIndex || application.status === "inUse";
        const active = index === currentIndex && application.status !== "rejected";
        return <div key={stage} className="flex min-w-0 items-center gap-1.5 rounded px-2 py-1.5"><span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full border", completed ? "border-emerald-200 bg-emerald-50 text-emerald-600" : active ? "border-blue-200 bg-blue-50 text-blue-600" : "border-slate-200 bg-white text-slate-400")}>{completed ? <CheckCircle2 className="h-3 w-3" /> : active ? <Clock3 className="h-3 w-3" /> : <Circle className="h-2.5 w-2.5" />}</span><span className={cn("truncate text-[10px]", active ? "font-semibold text-foreground" : "text-muted-foreground")}>{STAGE_LABEL[stage]}</span></div>;
      })}
    </div>
  );
}

function ApprovalTimeline({ application }: { application: AssetCirculationApplication }) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-foreground"><ShieldCheck className="h-3.5 w-3.5 text-primary" />审批时间线</div>
      <div className="space-y-2">
        {application.approvals.map((step) => (
          <div key={step.id} className="flex items-start gap-3 rounded-md border border-border p-3">
            <span className={cn("mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full", step.status === "approved" ? "bg-emerald-50 text-emerald-600" : step.status === "pending" ? "bg-amber-50 text-amber-600" : step.status === "rejected" ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-500")}>{step.status === "approved" ? <CheckCircle2 className="h-3.5 w-3.5" /> : step.status === "pending" ? <Clock3 className="h-3.5 w-3.5" /> : step.status === "rejected" ? <XCircle className="h-3.5 w-3.5" /> : <Circle className="h-3 w-3" />}</span>
            <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className="text-[11px] font-semibold text-foreground">{step.role}</span><span className="text-[10px] text-muted-foreground">{step.assignee}</span></div><div className="mt-1 text-[10px] leading-5 text-muted-foreground">{step.opinion ?? (step.status === "pending" ? "等待处理" : step.status === "skipped" ? "本申请无需该节点" : "—")}</div>{step.processedAt && <div className="mt-1 font-mono text-[9px] text-slate-400">{step.processedBy} · {step.processedAt}</div>}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function IntegrationDetail({ task }: { task: AssetIntegrationTask }) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-foreground"><PlugZap className="h-3.5 w-3.5 text-primary" />资产对接任务 <Badge tone={task.status === "completed" ? "green" : task.status === "failed" ? "red" : "blue"}>{task.status === "pending" ? "待配置" : task.status === "configuring" ? "配置中" : task.status === "testing" ? "联调中" : task.status === "completed" ? "已完成" : "失败"}</Badge></div>
      <div className="rounded-md border border-border p-4">
        <div className="grid gap-3 sm:grid-cols-2"><Info label="对接负责人" value={task.owner} /><Info label="完成期限" value={task.dueAt} /><div className="sm:col-span-2"><Info label="脱敏配置摘要" value={task.configSummary} mono /></div></div>
        <div className="mt-4 space-y-2">{task.checklist.map((check) => <div key={check.id} className="flex items-start gap-2 rounded bg-slate-50 px-3 py-2 text-[11px]"><span className={cn("mt-0.5", check.status === "passed" ? "text-emerald-600" : check.status === "failed" ? "text-red-600" : "text-slate-400")}>{check.status === "passed" ? <CheckCircle2 className="h-3.5 w-3.5" /> : check.status === "failed" ? <XCircle className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}</span><span><span className="text-foreground">{check.label}</span>{check.note && <span className="ml-1 text-red-600">· {check.note}</span>}</span></div>)}</div>
        {task.lastResult && <div className={cn("mt-3 rounded-md px-3 py-2 text-[10px] leading-5", task.status === "failed" ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700")}>{task.lastResult}</div>}
      </div>
    </section>
  );
}

function UsageEvidence({ records }: { records: AssetUsageRecord[] }) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-foreground"><FileCheck2 className="h-3.5 w-3.5 text-primary" />使用证据</div>
      <div className="space-y-2">{records.map((record) => <div key={record.id} className="grid gap-2 rounded-md border border-border p-3 text-[11px] sm:grid-cols-[1fr_auto]"><div><div className="font-medium text-foreground">{record.action} <Badge tone={record.result === "成功" ? "green" : record.result === "失败" ? "red" : "amber"}>{record.result}</Badge></div><div className="mt-1 text-muted-foreground">{record.consumerSystem} · {record.purpose} · {record.volume}</div></div><div className="text-right"><div className="font-mono text-[9px] text-primary">{record.evidenceNo}</div><div className="mt-1 font-mono text-[9px] text-muted-foreground">{record.at}</div></div></div>)}</div>
    </section>
  );
}

function DecisionSummary({ application, task }: { application: AssetCirculationApplication; task?: AssetIntegrationTask }) {
  const rows = application.status === "pendingOwner" ? [
    ["当前责任人", application.approvals.find((step) => step.role === "资产负责人")?.assignee ?? application.asset.assetName],
    ["重点核对", "用途、申请范围、版本和有效期"],
    ["后续节点", application.requiresSecurity ? "安全审批" : "资产对接"],
  ] : application.status === "pendingSecurity" ? [
    ["当前责任人", application.approvals.find((step) => step.role === "安全审批人")?.assignee ?? "安全审批人"],
    ["触发原因", `${application.applicantKind === "外部" ? "外部主体" : "内部主体"} · ${application.asset.securityLevel}`],
    ["重点核对", "脱敏、最小范围、期限和交付方式"],
  ] : task ? [
    ["当前责任人", task.owner],
    ["交付方式", task.delivery],
    ["完成期限", task.dueAt],
  ] : [
    ["当前状态", CIRCULATION_STATUS_LABEL[application.status]],
    ["资产版本", `v${application.asset.assetVersion}`],
    ["有效期", `${application.effectiveFrom} ~ ${application.effectiveTo}`],
  ];
  return <div className="space-y-2 rounded-md border border-blue-200 bg-blue-50/60 p-3">{rows.map(([label, value]) => <div key={label} className="flex items-start justify-between gap-3 text-[10px]"><span className="text-blue-600">{label}</span><span className="text-right font-medium text-blue-900">{value}</span></div>)}</div>;
}

function currentOwnerHint(application: AssetCirculationApplication, task?: AssetIntegrationTask): string {
  if (application.status === "pendingOwner") return "等待资产负责人判断用途与范围";
  if (application.status === "pendingSecurity") return "等待安全审批人确认最小授权";
  if (application.status === "returned") return "申请方需按意见修改并重新提交";
  if (application.status === "rejected") return "申请已结束，审批证据保留";
  if (task && task.status !== "completed") return "由对接负责人推进配置与联调";
  return "在授权边界内记录实际使用证据";
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return <div><div className="text-[10px] text-muted-foreground">{label}</div><div className={cn("mt-1 break-words text-[11px] font-medium text-foreground", mono && "font-mono text-[10px]")}>{value}</div></div>;
}

function NewApplicationModal({ assets, onClose, onSubmit }: { assets: Asset[]; onClose: () => void; onSubmit: (application: AssetCirculationApplication) => void }) {
  const eligibleAssets = assets.filter((asset) => asset.catalogStatus === "normal" && !asset.voided && (asset.type !== "standard" || asset.ext.standardStatus === "已发布"));
  const [step, setStep] = useState(1);
  const [assetId, setAssetId] = useState(eligibleAssets[0]?.id ?? "");
  const [applicant, setApplicant] = useState("");
  const [applicantOrg, setApplicantOrg] = useState("");
  const [applicantKind, setApplicantKind] = useState<"内部" | "外部">("内部");
  const [consumerSystem, setConsumerSystem] = useState("");
  const [purpose, setPurpose] = useState(PURPOSE_OPTIONS[0]);
  const [purposeNote, setPurposeNote] = useState("");
  const [requestedScope, setRequestedScope] = useState("");
  const [delivery, setDelivery] = useState<CirculationDelivery>("API");
  const [effectiveFrom, setEffectiveFrom] = useState(MOCK_NOW.slice(0, 10));
  const [effectiveTo, setEffectiveTo] = useState("2027-02-13");
  const selectedAsset = eligibleAssets.find((asset) => asset.id === assetId);
  const effectiveDelivery: CirculationDelivery = selectedAsset?.type === "standard" ? "标准引用" : delivery;
  const requiresSecurity = applicantKind === "外部" || /L3|敏感|高度/.test(selectedAsset?.securityLevel ?? "");
  const canContinue = step === 1 ? Boolean(selectedAsset) : step === 2 ? Boolean(applicant.trim() && applicantOrg.trim() && consumerSystem.trim()) : Boolean(purpose && requestedScope.trim() && effectiveFrom && effectiveTo && effectiveFrom <= effectiveTo);

  const submit = () => {
    if (!selectedAsset || !canContinue) return;
    const id = uid("circulation");
    onSubmit({
      id,
      title: `${applicantOrg.trim()}申请${selectedAsset.name}`,
      asset: {
        assetId: selectedAsset.id,
        assetName: selectedAsset.name,
        assetType: selectedAsset.type,
        assetVersion: selectedAsset.version,
        securityLevel: selectedAsset.securityLevel,
        ...(selectedAsset.type === "standard" ? { standardCode: selectedAsset.ext.standardCode, standardVersion: selectedAsset.ext.standardVersion } : {}),
      },
      applicant: applicant.trim(),
      applicantOrg: applicantOrg.trim(),
      applicantKind,
      consumerSystem: consumerSystem.trim(),
      purpose,
      purposeNote: purposeNote.trim(),
      requestedScope: requestedScope.trim(),
      delivery: effectiveDelivery,
      effectiveFrom,
      effectiveTo,
      status: "pendingOwner",
      stage: "approval",
      requiresSecurity,
      submittedAt: MOCK_NOW,
      updatedAt: MOCK_NOW,
      approvals: [
        { id: `${id}-owner`, role: "资产负责人", assignee: selectedAsset.owner, status: "pending" },
        { id: `${id}-security`, role: "安全审批人", assignee: "林安全", status: requiresSecurity ? "pending" : "skipped", ...(!requiresSecurity ? { opinion: "内部非敏感申请，无需安全加签。" } : {}) },
      ],
    });
  };

  return (
    <Modal title="新建资产流通申请" description="固定关联一个资产版本；提交后依次进入负责人审批、条件性安全审批、对接与使用跟踪。" onClose={onClose} width="max-w-3xl" footer={<>
      <SecondaryButton onClick={onClose}>取消</SecondaryButton>
      {step > 1 && <SecondaryButton onClick={() => setStep((current) => current - 1)}>上一步</SecondaryButton>}
      {step < 3 ? <PrimaryButton disabled={!canContinue} onClick={() => setStep((current) => current + 1)}>下一步</PrimaryButton> : <PrimaryButton disabled={!canContinue} onClick={submit} icon={<Send className="h-3.5 w-3.5" />}>提交申请</PrimaryButton>}
    </>}>
      <div className="mb-5 grid grid-cols-3 gap-2">{["选择资产", "填写申请方", "确认使用边界"].map((label, index) => <div key={label} className={cn("rounded-md border px-3 py-2 text-center text-[11px]", step === index + 1 ? "border-blue-200 bg-blue-50 font-semibold text-blue-700" : index + 1 < step ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-border text-muted-foreground")}>{index + 1}. {label}</div>)}</div>
      {step === 1 && <div className="space-y-4"><Field label="目录资产" required hint="数据标准只有治理状态为“已发布”时可申请"><Select value={assetId} onChange={(value) => { setAssetId(value); const asset = eligibleAssets.find((item) => item.id === value); if (asset?.type === "standard") setDelivery("标准引用"); }} options={eligibleAssets.map((asset) => ({ value: asset.id, label: `${ASSET_TYPE_LABEL[asset.type]} · ${asset.name} · v${asset.version}` }))} className="w-full" /></Field>{selectedAsset && <div className="grid gap-3 rounded-md border border-border bg-slate-50 p-4 sm:grid-cols-2"><Info label="资产 ID" value={selectedAsset.id} mono /><Info label="负责人" value={selectedAsset.owner} /><Info label="安全分类" value={selectedAsset.securityLevel} /><Info label="目录 / 类型状态" value={selectedAsset.type === "standard" ? `正常 / ${selectedAsset.ext.standardStatus}` : "正常"} />{selectedAsset.type === "standard" && <><Info label="标准编码" value={selectedAsset.ext.standardCode ?? "—"} mono /><Info label="标准版本" value={selectedAsset.ext.standardVersion ?? `v${selectedAsset.version}`} mono /></>}</div>}</div>}
      {step === 2 && <div className="grid gap-4 sm:grid-cols-2"><Field label="申请人" required><Input value={applicant} onChange={setApplicant} placeholder="姓名或机构联系人" className="w-full" /></Field><Field label="申请组织" required><Input value={applicantOrg} onChange={setApplicantOrg} placeholder="经营分析部" className="w-full" /></Field><Field label="主体类型" required><Select value={applicantKind} onChange={(value) => setApplicantKind(value as "内部" | "外部")} options={[{ value: "内部", label: "内部" }, { value: "外部", label: "外部" }]} className="w-full" /></Field><Field label="消费系统" required><Input value={consumerSystem} onChange={setConsumerSystem} placeholder="经营分析指标平台" className="w-full" /></Field></div>}
      {step === 3 && <div className="grid gap-4 sm:grid-cols-2"><Field label="使用目的" required><Select value={purpose} onChange={setPurpose} options={PURPOSE_OPTIONS.map((item) => ({ value: item, label: item }))} className="w-full" /></Field><Field label="交付方式" required hint={selectedAsset?.type === "standard" ? "数据标准资产固定使用标准引用" : undefined}><Select value={effectiveDelivery} onChange={(value) => setDelivery(value as CirculationDelivery)} options={(selectedAsset?.type === "standard" ? ["标准引用"] : ["API", "文件下载", "在线查询"]).map((item) => ({ value: item, label: item }))} className="w-full" /></Field><div className="sm:col-span-2"><Field label="用途说明"><TextArea value={purposeNote} onChange={setPurposeNote} rows={2} placeholder="说明业务场景和预期结果" /></Field></div><div className="sm:col-span-2"><Field label="申请范围" required><TextArea value={requestedScope} onChange={setRequestedScope} rows={3} placeholder="字段、区域、时间范围，或标准定义/计算逻辑/值域等引用范围" /></Field></div><Field label="生效日期" required><Input type="date" value={effectiveFrom} onChange={setEffectiveFrom} className="w-full" /></Field><Field label="失效日期" required><Input type="date" value={effectiveTo} onChange={setEffectiveTo} className="w-full" /></Field><div className="sm:col-span-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-[11px] leading-5 text-blue-700"><KeyRound className="mr-1 inline h-3.5 w-3.5" />审批路径：资产负责人 {selectedAsset?.owner ?? "待指定"}{requiresSecurity ? " → 安全审批人（外部主体或敏感资产）" : " → 无需安全加签"} → 资产对接。</div></div>}
      {eligibleAssets.length === 0 && <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800"><AlertTriangle className="mt-0.5 h-3.5 w-3.5" />暂无可申请资产；目录资产需处于正常状态，数据标准还必须处于已发布状态。</div>}
    </Modal>
  );
}
