import { useMemo, useState } from "react";
import { AlertTriangle, ClipboardCheck, Eye, FileClock, Filter, Search, ShieldCheck, Trash2 } from "lucide-react";

import { useDataAssetState } from "../store";
import {
  ANOMALY_STATUS_LABEL,
  MOCK_NOW,
  uid,
  type AccessChannel,
  type AccessResult,
  type Anomaly,
  type Rectification,
} from "../api/types";
import {
  Badge,
  EmptyState,
  Field,
  Input,
  KpiCard,
  Modal,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  SectionCard,
  Select,
  TabBar,
  TextArea,
  useToast,
  WarnNote,
  type BadgeTone,
} from "../components/common";

const CHANNEL_TONE: Record<AccessChannel, BadgeTone> = { API: "blue", 下载: "violet", 在线查询: "green", 预览: "slate" };
const RESULT_TONE: Record<AccessResult, BadgeTone> = { 成功: "green", 失败: "red", 拒绝: "amber", 超时: "red" };
const ANOMALY_TONE: Record<Anomaly["status"], BadgeTone> = {
  待研判: "slate", 已确认异常: "red", 已排除: "green", 整改中: "amber", 待复核: "blue", 已关闭: "slate",
};

export default function AuditPage() {
  const { state, update, meta } = useDataAssetState();
  const showToast = useToast();
  const [tab, setTab] = useState("events");
  const [channel, setChannel] = useState<"all" | AccessChannel>("all");
  const [result, setResult] = useState<"all" | AccessResult>("all");
  const [keyword, setKeyword] = useState("");
  const [detailEvent, setDetailEvent] = useState<typeof state.audit.events[number] | null>(null);
  const [judgeAnomaly, setJudgeAnomaly] = useState<Anomaly | null>(null);
  const [judgeBasis, setJudgeBasis] = useState("");
  const [rectifyAnomaly, setRectifyAnomaly] = useState<Anomaly | null>(null);
  const [rectifyOwner, setRectifyOwner] = useState("");
  const [rectifyMeasure, setRectifyMeasure] = useState("");
  const [rectifyDue, setRectifyDue] = useState("2026-08-25");
  const [reviewRect, setReviewRect] = useState<Rectification | null>(null);
  const [reviewBasis, setReviewBasis] = useState("");
  const [cleanupOpen, setCleanupOpen] = useState(false);

  const events = [...state.audit.events].sort((a, b) => (a.at < b.at ? 1 : -1));

  const filteredEvents = useMemo(() => {
    const keywordLower = keyword.trim().toLowerCase();
    return events.filter((event) => {
      const matchesKeyword = !keywordLower || `${event.principal} ${event.productName ?? ""} ${event.appNameMasked} ${event.traceId} ${event.rejectedReason ?? ""}`.toLowerCase().includes(keywordLower);
      return matchesKeyword && (channel === "all" || event.channel === channel) && (result === "all" || event.result === result);
    });
  }, [channel, events, keyword, result]);

  const todayCount = events.filter((event) => event.at.slice(0, 10) === "2026-08-13").length;
  const openAnomalies = state.audit.anomalies.filter((anomaly) => anomaly.status !== "已关闭" && anomaly.status !== "已排除");
  const pendingJudge = state.audit.anomalies.filter((anomaly) => anomaly.status === "待研判").length;
  const rectifying = state.audit.rectifications.filter((rectification) => rectification.status === "整改中" || rectification.status === "待复核").length;

  const confirmAnomaly = (anomaly: Anomaly, assign: boolean) => {
    if (!judgeBasis.trim()) return;
    update((current) => {
      let rectifications = current.audit.rectifications;
      let rectificationId: string | undefined;
      if (assign) {
        const rectification: Rectification = {
          id: uid("rect"),
          anomalyId: anomaly.id,
          owner: rectifyOwner || "风控运营-王强",
          measure: rectifyMeasure || "复核并调整相关授权范围",
          dueAt: rectifyDue,
          status: "整改中",
          createdAt: MOCK_NOW,
        };
        rectifications = [rectification, ...current.audit.rectifications];
        rectificationId = rectification.id;
      }
      return {
        ...current,
        audit: {
          ...current.audit,
          anomalies: current.audit.anomalies.map((item) =>
            item.id === anomaly.id
              ? {
                  ...item,
                  status: assign ? "整改中" : "已确认异常",
                  owner: assign ? rectifyOwner || "风控运营-王强" : undefined,
                  judgeBasis,
                  judgedBy: "审计人员-钱审计",
                  judgedAt: MOCK_NOW,
                  rectificationId,
                }
              : item,
          ),
          rectifications,
        },
      };
    });
    setJudgeAnomaly(null);
    setJudgeBasis("");
    setRectifyAnomaly(null);
    showToast(assign ? "success" : "info", assign ? "异常已确认并指派整改" : "异常已确认，待指派整改");
  };

  const excludeAnomaly = (anomaly: Anomaly) => {
    if (!judgeBasis.trim()) return;
    update((current) => ({
      ...current,
      audit: {
        ...current.audit,
        anomalies: current.audit.anomalies.map((item) =>
          item.id === anomaly.id ? { ...item, status: "已排除", judgeBasis, judgedBy: "审计人员-钱审计", judgedAt: MOCK_NOW } : item,
        ),
      },
    }));
    setJudgeAnomaly(null);
    setJudgeBasis("");
    showToast("info", "异常已标记排除（依据与原始审计记录均保留）");
  };

  const closeRectification = (rectification: Rectification) => {
    if (!reviewBasis.trim()) return;
    update((current) => ({
      ...current,
      audit: {
        ...current.audit,
        rectifications: current.audit.rectifications.map((item) =>
          item.id === rectification.id ? { ...item, status: "已关闭", reviewBasis, reviewedBy: "复核人-郑复核", reviewedAt: MOCK_NOW } : item,
        ),
        anomalies: current.audit.anomalies.map((item) =>
          item.id === rectification.anomalyId ? { ...item, status: "已关闭" } : item,
        ),
      },
    }));
    setReviewRect(null);
    setReviewBasis("");
    showToast("success", "整改复核通过，异常已关闭");
  };

  const runCleanup = () => {
    const hasOpen = state.audit.anomalies.some((anomaly) => anomaly.status !== "已关闭" && anomaly.status !== "已排除");
    if (hasOpen || state.service.retention.frozen) {
      showToast("error", `清理被阻止：${state.service.retention.frozen ? `存在冻结范围（${state.service.retention.frozen.reason}）` : "存在未关闭异常、调查或证据保全标记"}`);
      return;
    }
    update((current) => ({
      ...current,
      service: {
        ...current.service,
        retention: {
          ...current.service.retention,
          lastCleanup: { at: MOCK_NOW, by: "审计人员-钱审计", rule: "保留 3 年后归档清理（组织策略）", count: events.length, summary: "模拟清理完成，SQLite 原型不执行真实物理删除" },
        },
      },
    }));
    setCleanupOpen(false);
    showToast("info", "已模拟执行归档清理（仅记录操作证据，不对 SQLite 审计记录执行真实物理删除）");
  };

  return (
    <div className="page-shell animate-fade-in">
      <div className="space-y-4">
        <PageHeader
          title="使用审计"
          description="记录每次数据访问的来源、目的与结果；原始审计事件不可编辑或删除，异常按待研判 → 确认/排除 → 整改 → 待复核 → 关闭闭环"
        />

        {meta.error && <WarnNote text={`SQLite 状态读写异常：${meta.error.message}`} />}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard label="今日访问" value={todayCount} icon={Eye} color="text-primary" bg="bg-primary/10" />
          <KpiCard label="未关闭异常" value={openAnomalies.length} icon={AlertTriangle} color="text-red-600" bg="bg-red-50" />
          <KpiCard label="待研判" value={pendingJudge} icon={Filter} color="text-amber-600" bg="bg-amber-50" />
          <KpiCard label="整改中 / 待复核" value={rectifying} icon={ClipboardCheck} color="text-blue-600" bg="bg-blue-50" />
        </section>

        <SectionCard>
          <TabBar
            tabs={[
              { key: "events", label: "访问明细", count: events.length },
              { key: "anomalies", label: "异常分析", count: openAnomalies.length },
              { key: "rectifications", label: "整改跟踪", count: rectifying },
              { key: "retention", label: "保留与清理" },
            ]}
            active={tab}
            onChange={setTab}
          />

          {tab === "events" && (
            <div className="px-5 py-3">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <div className="flex h-8 w-full min-w-0 items-center gap-2 rounded-md border border-input bg-surface-raised px-3 text-[12px] text-muted-foreground sm:w-[260px]">
                  <Search className="h-3.5 w-3.5 shrink-0" />
                  <input value={keyword} onChange={(event) => setKeyword(event.target.value)} className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground/70" placeholder="搜索主体 / 产品 / 追踪 ID / 原因" />
                </div>
                <Select value={channel} onChange={(value) => setChannel(value as "all" | AccessChannel)} options={[{ value: "all", label: "全部渠道" }, { value: "API", label: "API" }, { value: "下载", label: "下载" }, { value: "在线查询", label: "在线查询" }, { value: "预览", label: "预览" }]} />
                <Select value={result} onChange={(value) => setResult(value as "all" | AccessResult)} options={[{ value: "all", label: "全部结果" }, { value: "成功", label: "成功" }, { value: "失败", label: "失败" }, { value: "拒绝", label: "拒绝" }, { value: "超时", label: "超时" }]} />
                <span className="text-[11px] text-muted-foreground">共 {filteredEvents.length} 条（明细仅展示最新部分）</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1180px] border-separate border-spacing-0 text-left">
                  <thead>
                    <tr className="text-[12px] font-medium text-slate-600">
                      {["时间", "使用方 / 来源", "渠道", "产品 / 服务版本", "结果", "响应", "授权目的 / 声明目的", "追踪 ID", "操作"].map((label) => <th key={label} className="border-b border-border py-3 pr-4">{label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvents.slice(0, 60).map((event) => (
                      <tr key={event.id} className="text-[12px] text-foreground">
                        <td className="border-b border-border py-3 pr-4 whitespace-nowrap tabular-nums text-muted-foreground">{event.at}</td>
                        <td className="border-b border-border py-3 pr-4">
                          <div>{event.principal}</div>
                          <div className="mt-0.5 text-[11px] text-muted-foreground">{event.appNameMasked} · {event.ipRegion} · {event.accountMasked}</div>
                        </td>
                        <td className="border-b border-border py-3 pr-4"><Badge tone={CHANNEL_TONE[event.channel]}>{event.channel}</Badge></td>
                        <td className="border-b border-border py-3 pr-4">
                          <div>{event.productName ?? "—"}</div>
                          <div className="mt-0.5 text-[11px] text-muted-foreground">v{event.serviceVersion ?? "—"}{event.assetId ? ` · ${event.assetId}#v${event.assetVersion}` : ""}</div>
                        </td>
                        <td className="border-b border-border py-3 pr-4"><Badge tone={RESULT_TONE[event.result]}>{event.result}</Badge>{event.statusCode && <span className="ml-1 font-mono text-[10px] text-muted-foreground">{event.statusCode}</span>}</td>
                        <td className="border-b border-border py-3 pr-4 text-[11px] text-muted-foreground">
                          {event.recordCount !== undefined ? `${event.recordCount} 条` : event.fileSizeKB !== undefined ? `${event.fileSizeKB}KB` : event.durationMs !== undefined ? `${event.durationMs}ms` : "—"}
                          {event.rejectedReason && <div className="max-w-[180px] text-amber-700">{event.rejectedReason}</div>}
                          {event.errorMasked && <div className="max-w-[180px] text-red-600">{event.errorMasked}</div>}
                        </td>
                        <td className="border-b border-border py-3 pr-4 text-[11px] text-muted-foreground">{event.authorizedPurpose ?? "—"}<div className="text-muted-foreground/70">声明：{event.declaredPurpose ?? "—"}</div></td>
                        <td className="border-b border-border py-3 pr-4 font-mono text-[10px] text-muted-foreground">{event.traceId}</td>
                        <td className="border-b border-border py-3">
                          <button type="button" onClick={() => setDetailEvent(event)} className="inline-flex h-7 items-center rounded-md border border-input px-2 text-[11px] text-foreground hover:border-primary/30 hover:text-primary">详情</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredEvents.length === 0 && <EmptyState title="暂无匹配的访问记录" />}
              </div>
              <div className="mt-2 rounded-md border border-border bg-surface-raised p-3 text-[11px] leading-relaxed text-muted-foreground">
                搜索目录、查看资产详情和查看审批单不属于数据访问，记录为普通操作日志而非资产使用审计；API 调用或下载即使失败、被拒绝或超时，也要保留访问尝试及其结果。审计记录不保存 API 原始响应、下载文件内容、密码、令牌或真实敏感数据。
              </div>
            </div>
          )}

          {tab === "anomalies" && (
            <div className="space-y-3 px-5 py-4">
              {state.audit.anomalies.length === 0 ? <EmptyState title="暂无异常记录" /> : state.audit.anomalies.map((anomaly) => (
                <div key={anomaly.id} className="rounded-md border border-border p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={ANOMALY_TONE[anomaly.status]}>{ANOMALY_STATUS_LABEL[anomaly.status]}</Badge>
                    <Badge tone={anomaly.severity === "高" ? "red" : anomaly.severity === "中" ? "amber" : "slate"}>{anomaly.severity}风险</Badge>
                    <span className="text-[13px] font-medium text-foreground">{anomaly.ruleLabel}</span>
                    <span className="text-[12px] text-muted-foreground">规则：{anomaly.rule}</span>
                    <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">发现：{anomaly.createdAt}</span>
                  </div>
                  <div className="mt-2 text-[12px] text-muted-foreground">
                    主体：{anomaly.principal}{anomaly.productName ? ` · 产品：${anomaly.productName}` : ""}{anomaly.channel ? ` · 渠道：${anomaly.channel}` : ""} · 关联原始审计 {anomaly.eventIds.length} 条
                  </div>
                  {anomaly.judgeBasis && (
                    <div className="mt-2 rounded-md border border-border bg-surface-raised px-3 py-2 text-[11px] text-muted-foreground">
                      研判依据：{anomaly.judgeBasis}（{anomaly.judgedBy} · {anomaly.judgedAt}）
                    </div>
                  )}
                  {anomaly.status === "待研判" && (
                    <div className="mt-3 flex items-center gap-2">
                      <PrimaryButton className="h-7 px-2.5" onClick={() => { setJudgeAnomaly(anomaly); setJudgeBasis(""); }}>确认异常</PrimaryButton>
                      <SecondaryButton className="h-7 px-2.5" onClick={() => { setJudgeAnomaly(anomaly); setJudgeBasis(""); }}>标记排除</SecondaryButton>
                      <span className="text-[11px] text-muted-foreground">确认后指派整改，排除需记录判断依据；被排除的异常保留记录但不进入待整改数量</span>
                    </div>
                  )}
                  {anomaly.status === "已确认异常" && (
                    <div className="mt-3 flex items-center gap-2">
                      <PrimaryButton className="h-7 px-2.5" onClick={() => setRectifyAnomaly(anomaly)}>指派整改</PrimaryButton>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === "rectifications" && (
            <div className="space-y-3 px-5 py-4">
              {state.audit.rectifications.length === 0 ? <EmptyState title="暂无整改记录" /> : state.audit.rectifications.map((rectification) => {
                const anomaly = state.audit.anomalies.find((item) => item.id === rectification.anomalyId);
                return (
                  <div key={rectification.id} className="rounded-md border border-border p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-medium text-foreground">{anomaly?.ruleLabel ?? "异常整改"}</span>
                      <Badge tone={rectification.status === "已关闭" ? "green" : rectification.status === "待复核" ? "blue" : "amber"}>{rectification.status}</Badge>
                      <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">责任人：{rectification.owner} · 截止：{rectification.dueAt}</span>
                    </div>
                    <div className="mt-2 text-[12px] text-muted-foreground">整改措施：{rectification.measure}</div>
                    {rectification.reviewBasis && (
                      <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800">
                        复核结果：{rectification.reviewBasis}（{rectification.reviewedBy} · {rectification.reviewedAt}）
                      </div>
                    )}
                    {rectification.status === "待复核" && (
                      <div className="mt-3 flex items-center gap-2">
                        <PrimaryButton className="h-7 px-2.5" onClick={() => setReviewRect(rectification)}>复核关闭</PrimaryButton>
                        <span className="text-[11px] text-muted-foreground">已确认异常只有通过复核才能关闭</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {tab === "retention" && (
            <div className="space-y-4 px-5 py-4">
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-md border border-border p-4">
                  <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground"><FileClock className="h-4 w-4 text-primary" />保留策略</div>
                  <div className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
                    资产使用审计默认保留 <span className="font-semibold text-foreground">{state.service.retention.policyYears} 年</span>，并允许组织按资产安全等级、产品类型及监管要求配置更长周期。该默认值是<b>组织策略</b>，不是 GB/T 36073—2025 规定的国标统一期限。保留期内不得修改或业务删除原始审计事件；到期记录先归档。
                  </div>
                </div>
                <div className="rounded-md border border-border p-4">
                  <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground"><ShieldCheck className="h-4 w-4 text-primary" />归档冻结与清理</div>
                  {state.service.retention.frozen ? (
                    <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                      冻结范围：{state.service.retention.frozen.scope}。原因：{state.service.retention.frozen.reason}。存在未关闭异常、调查或证据保全标记时禁止清理。
                    </div>
                  ) : (
                    <div className="mt-2 text-[12px] text-muted-foreground">无冻结范围</div>
                  )}
                  {state.service.retention.lastCleanup && (
                    <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800">
                      最近清理：{state.service.retention.lastCleanup.at} · {state.service.retention.lastCleanup.by} · 规则「{state.service.retention.lastCleanup.rule}」 · {state.service.retention.lastCleanup.count} 条 · {state.service.retention.lastCleanup.summary}
                    </div>
                  )}
                  <div className="mt-3">
                    <SecondaryButton className="h-7" onClick={() => setCleanupOpen(true)}><Trash2 className="h-3 w-3" />模拟归档清理</SecondaryButton>
                  </div>
                </div>
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      {detailEvent && (
        <Modal title="访问审计详情" description={`追踪 ID：${detailEvent.traceId} · 不可编辑或删除`} onClose={() => setDetailEvent(null)} width="max-w-2xl">
          <div className="grid gap-3 text-[12px] sm:grid-cols-2">
            {[
              ["访问时间", detailEvent.at], ["使用方主体", `${detailEvent.principal}（${detailEvent.principalKind}）`],
              ["来源应用", `${detailEvent.appId} · ${detailEvent.appNameMasked}`], ["访问渠道", detailEvent.channel],
              ["来源位置", detailEvent.ipRegion], ["账号（脱敏）", detailEvent.accountMasked],
              ["产品", detailEvent.productName ?? "—"], ["服务版本", `v${detailEvent.serviceVersion ?? "—"}`],
              ["资产 / 版本", detailEvent.assetId ? `${detailEvent.assetId}#v${detailEvent.assetVersion}` : "—"], ["关联授权", detailEvent.authorizationId ?? "—"],
              ["结果", detailEvent.result], ["状态码", detailEvent.statusCode ?? "—"],
              ["返回记录数", detailEvent.recordCount !== undefined ? `${detailEvent.recordCount} 条` : "—"], ["文件大小", detailEvent.fileSizeKB !== undefined ? `${detailEvent.fileSizeKB} KB` : "—"],
              ["响应时间", detailEvent.durationMs !== undefined ? `${detailEvent.durationMs} ms` : "—"], ["授权目的", detailEvent.authorizedPurpose ?? "—"],
              ["声明目的", detailEvent.declaredPurpose ?? "—"], ["拒绝 / 失败原因", detailEvent.rejectedReason ?? detailEvent.errorMasked ?? "—"],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="text-[11px] text-muted-foreground">{label}</div>
                <div className="mt-0.5 break-words text-foreground">{value}</div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {judgeAnomaly && (
        <Modal
          title={`研判异常 · ${judgeAnomaly.ruleLabel}`}
          description={`主体：${judgeAnomaly.principal} · 关联原始审计 ${judgeAnomaly.eventIds.length} 条；原始审计记录不得修改，排除需记录依据`}
          onClose={() => { setJudgeAnomaly(null); setJudgeBasis(""); }}
          footer={
            <>
              <SecondaryButton onClick={() => { setJudgeAnomaly(null); setJudgeBasis(""); }}>取消</SecondaryButton>
              <SecondaryButton className="text-emerald-700 hover:border-emerald-200" onClick={() => excludeAnomaly(judgeAnomaly)} disabled={!judgeBasis.trim()}>标记排除</SecondaryButton>
              <PrimaryButton onClick={() => { confirmAnomaly(judgeAnomaly, true); }} disabled={!judgeBasis.trim()}>确认异常并指派整改</PrimaryButton>
            </>
          }
        >
          <Field label="研判依据" required hint="填写判断依据与证据引用（必填）">
            <TextArea value={judgeBasis} onChange={setJudgeBasis} placeholder="例如：一小时内 50 次越权字段请求，排除压测声明，确认为越权访问" />
          </Field>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="整改责任人"><Input value={rectifyOwner} onChange={setRectifyOwner} placeholder="默认：风控运营-王强" /></Field>
            <Field label="整改截止时间"><Input type="date" value={rectifyDue} onChange={setRectifyDue} /></Field>
          </div>
          <div className="mt-3">
            <Field label="整改措施"><TextArea value={rectifyMeasure} onChange={setRectifyMeasure} placeholder="默认：复核并调整相关授权范围" rows={2} /></Field>
          </div>
        </Modal>
      )}

      {rectifyAnomaly && (
        <Modal
          title={`指派整改 · ${rectifyAnomaly.ruleLabel}`}
          description="整改必须关联原始审计记录、责任人、整改措施、截止时间与复核结果"
          onClose={() => setRectifyAnomaly(null)}
          footer={
            <>
              <SecondaryButton onClick={() => setRectifyAnomaly(null)}>取消</SecondaryButton>
              <PrimaryButton onClick={() => { confirmAnomaly(rectifyAnomaly, true); }} disabled={!rectifyMeasure.trim()}>指派整改</PrimaryButton>
            </>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="整改责任人" required><Input value={rectifyOwner} onChange={setRectifyOwner} placeholder="例如：风控运营-王强" /></Field>
            <Field label="整改截止时间" required><Input type="date" value={rectifyDue} onChange={setRectifyDue} /></Field>
          </div>
          <div className="mt-3">
            <Field label="整改措施" required>
              <TextArea value={rectifyMeasure} onChange={setRectifyMeasure} placeholder="例如：撤销相关授权并复核字段授权范围" />
            </Field>
          </div>
        </Modal>
      )}

      {reviewRect && (
        <Modal
          title={`整改复核 · ${state.audit.anomalies.find((item) => item.id === reviewRect.anomalyId)?.ruleLabel ?? "异常整改"}`}
          description={`措施：${reviewRect.measure} · 责任人：${reviewRect.owner} · 截止：${reviewRect.dueAt}`}
          onClose={() => { setReviewRect(null); setReviewBasis(""); }}
          footer={
            <>
              <SecondaryButton onClick={() => { setReviewRect(null); setReviewBasis(""); }}>取消</SecondaryButton>
              <PrimaryButton onClick={() => closeRectification(reviewRect)} disabled={!reviewBasis.trim()}>复核通过并关闭</PrimaryButton>
            </>
          }
        >
          <Field label="复核结果与依据" required hint="确认风险已消除后才能关闭异常">
            <TextArea value={reviewBasis} onChange={setReviewBasis} placeholder="例如：旧系统已下线，连续失败率归零，风险消除" />
          </Field>
        </Modal>
      )}

      {cleanupOpen && (
        <Modal
          title="模拟归档清理"
          description="到期事件先归档；存在未关闭异常、调查或证据保全标记时冻结清理。当前原型只模拟归档、冻结和清理结果，不对 SQLite 中的审计记录执行真实物理删除"
          onClose={() => setCleanupOpen(false)}
          footer={
            <>
              <SecondaryButton onClick={() => setCleanupOpen(false)}>取消</SecondaryButton>
              <PrimaryButton onClick={runCleanup}>执行模拟清理</PrimaryButton>
            </>
          }
        >
          <div className="rounded-md border border-border bg-surface-raised p-3 text-[12px] text-muted-foreground">
            待清理记录范围：保留满 {state.service.retention.policyYears} 年且无冻结标记的到期审计事件。清理将保留执行人、规则、时间、记录数量和结果等操作证据及汇总统计。
          </div>
        </Modal>
      )}
    </div>
  );
}
