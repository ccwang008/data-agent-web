import { useMemo, useState } from "react";
import {
  Activity,
  CheckCircle2,
  FileDown,
  PauseCircle,
  Play,
  Plus,
  Rocket,
  Send,
  ShieldAlert,
  TestTube2,
  XCircle,
} from "lucide-react";

import { useDataAssetState } from "../store";
import {
  AUTHORIZATION_STATUS_LABEL,
  MOCK_NOW,
  PRODUCT_STATUS_LABEL,
  uid,
  type AccessResult,
  type Authorization,
  type DataProduct,
  type DownloadTask,
  type ProductApproval,
  type ProductStatus,
} from "../api/types";
import { buildAuditEvent, evaluatePublishGate, validateApiCall, validateDownload } from "../api/logic";
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
  TabBar,
  useToast,
  WarnNote,
  type BadgeTone,
} from "../components/common";
import {
  ApiCallModal,
  ApprovalModal,
  ApproveAuthorizationModal,
  AuthorizationModal,
  GateResultModal,
  ProductModal,
} from "./ServiceModals";

const PRODUCT_TONE: Record<ProductStatus, BadgeTone> = {
  草稿: "slate",
  待审批: "blue",
  已发布: "green",
  已驳回: "red",
  已暂停: "amber",
  已下线: "slate",
};

export default function ServicePage() {
  const { state, update, meta } = useDataAssetState();
  const showToast = useToast();
  const [tab, setTab] = useState("products");
  const [productModal, setProductModal] = useState<{ product?: DataProduct } | null>(null);
  const [gateProduct, setGateProduct] = useState<DataProduct | null>(null);
  const [approvalModal, setApprovalModal] = useState<{ product: DataProduct } | null>(null);
  const [authorizationModal, setAuthorizationModal] = useState(false);
  const [approveAuth, setApproveAuth] = useState<Authorization | null>(null);
  const [revokeAuth, setRevokeAuth] = useState<Authorization | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [pauseProduct, setPauseProduct] = useState<DataProduct | null>(null);
  const [pauseReason, setPauseReason] = useState("");
  const [apiCallAuth, setApiCallAuth] = useState<Authorization | null>(null);
  const [simulating, setSimulating] = useState(false);

  const products = state.service.products;
  const approvals = state.service.productApprovals;
  const authorizations = state.service.authorizations;

  const published = products.filter((product) => product.status === "已发布").length;
  const drafts = products.filter((product) => product.status === "草稿" || product.status === "已驳回").length;
  const pendingApproval = approvals.filter((approval) => approval.status === "待负责人确认" || approval.status === "待安全审批").length;
  const validAuths = authorizations.filter((authorization) => authorization.status === "已授权").length;

  // ---- 产品操作 ----
  const submitPublish = (product: DataProduct) => {
    const gate = evaluatePublishGate(state, product);
    if (!gate.passed) {
      update((current) => ({
        ...current,
        service: {
          ...current.service,
          products: current.service.products.map((item) =>
            item.id === product.id
              ? { ...item, gate, status: "已驳回", statusReason: "发布门槛校验未通过，仅允许保存草稿或模拟测试", updatedAt: MOCK_NOW }
              : item,
          ),
        },
      }));
      setGateProduct({ ...product, gate });
      showToast("error", `发布被阻止：${gate.checks.filter((check) => !check.ok).map((check) => check.name).join("、")}`);
      return;
    }
    const approval: ProductApproval = {
      id: uid("pa"),
      productId: product.id,
      productName: product.name,
      submittedBy: "运营人员-何运营",
      submittedAt: MOCK_NOW,
      status: "待负责人确认",
      steps: [
        { name: "资产负责人确认", role: `资产负责人-${product.owner}`, status: "pending" },
        { name: "安全审批", role: "安全审批人-吴安全", status: "pending" },
      ],
    };
    update((current) => ({
      ...current,
      service: {
        ...current.service,
        products: current.service.products.map((item) => (item.id === product.id ? { ...item, status: "待审批", gate, updatedAt: MOCK_NOW } : item)),
        productApprovals: [approval, ...current.service.productApprovals],
      },
    }));
    showToast("success", "发布门槛校验通过，已进入发布审批流程");
  };

  const runMockTest = (product: DataProduct) => {
    const gate = evaluatePublishGate(state, product);
    update((current) => ({
      ...current,
      service: {
        ...current.service,
        products: current.service.products.map((item) => (item.id === product.id ? { ...item, gate, updatedAt: MOCK_NOW } : item)),
      },
    }));
    setGateProduct({ ...product, gate });
    showToast(gate.passed ? "success" : "info", gate.passed ? "模拟测试通过：发布条件全部满足" : "模拟测试完成：存在未满足的发布条件（仅允许草稿与模拟测试）");
  };

  const toggleProductStatus = (product: DataProduct, target: "已暂停" | "已发布" | "已下线") => {
    if (target !== "已发布" && !pauseReason.trim()) return;
    update((current) => ({
      ...current,
      service: {
        ...current.service,
        products: current.service.products.map((item) =>
          item.id === product.id
            ? {
                ...item,
                status: target,
                statusReason: target === "已发布" ? undefined : `${target === "已暂停" ? "运营人员暂停" : "运营人员下线"}：${pauseReason}`,
                updatedAt: MOCK_NOW,
              }
            : item,
        ),
      },
    }));
    setPauseProduct(null);
    setPauseReason("");
    showToast("success", target === "已发布" ? "产品已恢复运营（需已核对主体、范围、用途与交付方式）" : target === "已暂停" ? "产品已暂停，相关调用与下载将被拒绝" : "产品已下线");
  };

  // ---- 审批操作 ----
  const handleApproval = (approval: ProductApproval, action: "通过" | "驳回" | "退回修改", opinion: string) => {
    const stepIndex = approval.steps.findIndex((step) => step.status === "pending");
    if (stepIndex === -1) return;
    const isFirstStep = stepIndex === 0;
    const nextStatus = action === "通过" ? (isFirstStep ? "待安全审批" : "已通过") : action === "驳回" ? "已驳回" : "已退回修改";
    const product = state.service.products.find((item) => item.id === approval.productId);
    update((current) => ({
      ...current,
      service: {
        ...current.service,
        productApprovals: current.service.productApprovals.map((item) =>
          item.id === approval.id
            ? {
                ...item,
                status: nextStatus,
                steps: item.steps.map((step, index) =>
                  index === stepIndex
                    ? { ...step, status: action === "通过" ? "approved" : action === "驳回" ? "rejected" : "returned", by: isFirstStep ? product?.owner : "吴安全", at: MOCK_NOW, opinion }
                    : step,
                ),
              }
            : item,
        ),
        products: current.service.products.map((item) =>
          item.id === approval.productId
            ? { ...item, status: (nextStatus === "已通过" ? "已发布" : nextStatus) as ProductStatus, statusReason: nextStatus === "已通过" ? undefined : `审批：${action}${opinion ? `（${opinion}）` : ""}`, updatedAt: MOCK_NOW }
            : item,
        ),
      },
    }));
    setApprovalModal(null);
    showToast(
      action === "通过" ? (nextStatus === "已通过" ? "success" : "info") : "error",
      nextStatus === "已通过" ? "发布审批通过，产品已上架" : nextStatus === "待安全审批" ? "资产负责人已确认，等待安全审批人审核" : `审批已${action}`,
    );
  };

  // ---- 授权操作 ----
  const approveAuthorization = (authorization: Authorization, pass: boolean, opinion: string) => {
    if (!opinion.trim()) return;
    const pendingSecurity = authorization.requiresSecurity && authorization.securityStatus === "待安全审批";
    const next = pendingSecurity
      ? { status: pass ? ("已授权" as const) : ("已拒绝" as const), securityStatus: pass ? ("已通过" as const) : ("已拒绝" as const), approvedBy: "吴安全" }
      : pass
        ? {
            status: authorization.requiresSecurity ? "待审批" : "已授权",
            securityStatus: authorization.requiresSecurity ? "待安全审批" : "无需",
            approvedBy: "张明",
          } as const
        : { status: "已拒绝" as const, securityStatus: "无需" as const, approvedBy: "张明" };
    update((current) => ({
      ...current,
      service: {
        ...current.service,
        authorizations: current.service.authorizations.map((item) =>
          item.id === authorization.id ? { ...item, ...next, rejectedReason: pass ? undefined : opinion, updatedAt: MOCK_NOW } : item,
        ),
      },
    }));
    setApproveAuth(null);
    if (pass && next.securityStatus === "已通过") showToast("success", "授权已生效（安全审批已通过）");
    else if (pass && next.securityStatus === "待安全审批") showToast("info", "资产负责人已通过；申请涉及敏感数据/对外使用，追加安全审批");
    else if (pass) showToast("success", "授权已生效");
    else showToast("error", "授权已拒绝");
  };

  const revokeAuthorization = (authorization: Authorization) => {
    if (!revokeReason.trim()) return;
    update((current) => ({
      ...current,
      service: {
        ...current.service,
        authorizations: current.service.authorizations.map((item) =>
          item.id === authorization.id ? { ...item, status: "已撤销", revokedReason: revokeReason, updatedAt: MOCK_NOW } : item,
        ),
      },
    }));
    setRevokeAuth(null);
    setRevokeReason("");
    showToast("success", "授权已撤销，关联调用与下载将被运行时校验拒绝并记录审计");
  };

  // ---- 下载 ----
  const downloadFile = (task: DownloadTask) => {
    setSimulating(true);
    window.setTimeout(() => {
      const verdict = validateDownload(state, task.id);
      const authorization = state.service.authorizations.find((item) => item.id === task.authorizationId);
      const event = buildAuditEvent({
        at: MOCK_NOW,
        principal: authorization?.applicant ?? task.requester,
        principalKind: authorization?.applicantKind === "外部" ? "外部机构" : "人员",
        appId: authorization?.useSystem ?? "app-download",
        appNameMasked: "文件下载服务",
        channel: "下载",
        ipRegion: "内网",
        accountMasked: "user-***",
        productId: task.productId,
        productName: task.productName,
        serviceVersion: task.serviceVersion,
        authorizationId: task.authorizationId,
        authorizedPurpose: authorization?.purpose,
        declaredPurpose: authorization?.purpose,
        result: verdict.ok ? "成功" : "拒绝",
        statusCode: verdict.ok ? "200" : "403",
        rejectedReason: verdict.ok ? undefined : verdict.rejectedReason,
        fileSizeKB: verdict.ok ? 1284 : undefined,
        durationMs: verdict.ok ? 860 : 25,
      });
      update((current) => ({
        ...current,
        audit: { ...current.audit, events: [event, ...current.audit.events] },
        service: {
          ...current.service,
          downloadTasks: current.service.downloadTasks.map((item) =>
            item.id === task.id && verdict.ok
              ? { ...item, usedDownloads: item.usedDownloads + 1, status: item.usedDownloads + 1 >= item.maxDownloads ? "已用完" : item.status }
              : item,
          ),
        },
      }));
      setSimulating(false);
      showToast(verdict.ok ? "success" : "error", verdict.ok ? `文件生成并下载成功（mock），已写入使用审计（第 ${task.usedDownloads + 1}/${task.maxDownloads} 次）` : `下载被拒绝：${verdict.rejectedReason}（已写入使用审计）`);
    }, 600);
  };

  // ---- API 模拟调用 ----
  const runApiCall = (authorization: Authorization, declaredPurpose: string, fields: string[], region: string) => {
    setSimulating(true);
    const verdict = validateApiCall(state, { authorizationId: authorization.id, declaredPurpose, fields, region: region || undefined });
    window.setTimeout(() => {
      const product = state.service.products.find((item) => item.id === authorization.productId);
      const event = buildAuditEvent({
        at: MOCK_NOW,
        principal: authorization.applicant,
        principalKind: authorization.applicantKind === "外部" ? "外部机构" : "内部系统",
        appId: authorization.useSystem,
        appNameMasked: authorization.useSystem,
        channel: "API",
        ipRegion: authorization.applicantKind === "外部" ? "外联网区域" : "内网",
        accountMasked: "svc-***",
        productId: authorization.productId,
        productName: authorization.productName,
        serviceVersion: product?.serviceVersion,
        assetId: product?.assets[0]?.assetId,
        assetVersion: product?.assets[0]?.assetVersion,
        authorizationId: authorization.id,
        authorizedPurpose: authorization.purpose,
        declaredPurpose,
        result: verdict.ok ? "成功" : "拒绝",
        statusCode: verdict.ok ? "200" : "403",
        rejectedReason: verdict.ok ? undefined : verdict.rejectedReason,
        recordCount: verdict.ok ? 128 : undefined,
        durationMs: verdict.ok ? 230 : 30,
      });
      update((current) => ({ ...current, audit: { ...current.audit, events: [event, ...current.audit.events] } }));
      setSimulating(false);
      showToast(verdict.ok ? "success" : "error", verdict.ok ? "API 调用成功，已生成访问审计" : `调用被拒绝：${verdict.rejectedReason}（已记录审计事件）`);
    }, 500);
  };

  // ---- 使用统计（从审计事件汇总） ----
  const apiEvents = useMemo(() => state.audit.events.filter((event) => event.channel === "API"), [state.audit.events]);
  const downloadEvents = useMemo(() => state.audit.events.filter((event) => event.channel === "下载"), [state.audit.events]);

  const apiStats = useMemo(() => {
    const count = (result: AccessResult) => apiEvents.filter((event) => event.result === result).length;
    const success = count("成功");
    const total = apiEvents.length;
    const durationAvg = success ? Math.round(apiEvents.filter((event) => event.result === "成功").reduce((sum, event) => sum + (event.durationMs ?? 0), 0) / success) : 0;
    return { total, success, failed: count("失败"), rejected: count("拒绝"), timeout: count("超时"), successRate: total ? Number(((success / total) * 100).toFixed(1)) : 0, durationAvg };
  }, [apiEvents]);

  const downloadStats = useMemo(() => ({
    applied: authorizations.filter((authorization) => products.find((product) => product.id === authorization.productId)?.delivery === "下载").length,
    approved: authorizations.filter((authorization) => authorization.status === "已授权" && products.find((product) => product.id === authorization.productId)?.delivery === "下载").length,
    generated: state.service.downloadTasks.length,
    success: downloadEvents.filter((event) => event.result === "成功").length,
    failed: downloadEvents.filter((event) => event.result === "拒绝").length,
  }), [authorizations, downloadEvents, products, state.service.downloadTasks.length]);

  const purposeDistribution = useMemo(() => {
    const map = new Map<string, number>();
    apiEvents.forEach((event) => {
      const key = event.authorizedPurpose ?? "未知目的";
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [apiEvents]);

  const trendByDay = useMemo(() => {
    const map = new Map<string, number>();
    apiEvents.forEach((event) => {
      const day = event.at.slice(0, 10);
      map.set(day, (map.get(day) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? -1 : 1));
  }, [apiEvents]);

  return (
    <div className="page-shell animate-fade-in">
      <div className="space-y-4">
        <PageHeader
          title="资产运营"
          description="数据产品的发布、审批、使用授权、API 与下载交付；使用统计统一从资产使用审计记录汇总"
          actions={<PrimaryButton icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setProductModal({})}>新建数据产品</PrimaryButton>}
        />

        {meta.error && <WarnNote text={`SQLite 状态读写异常：${meta.error.message}`} />}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard label="已发布产品" value={published} icon={Rocket} color="text-emerald-600" bg="bg-emerald-50" />
          <KpiCard label="草稿 / 已驳回" value={drafts} icon={TestTube2} color="text-slate-600" bg="bg-slate-100" />
          <KpiCard label="审批中" value={pendingApproval} icon={Activity} color="text-blue-600" bg="bg-blue-50" />
          <KpiCard label="有效使用授权" value={validAuths} icon={CheckCircle2} color="text-primary" bg="bg-primary/10" />
        </section>

        {products.filter((product) => product.securityAlert).length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-800">
            <div className="flex items-center gap-2 font-medium"><ShieldAlert className="h-4 w-4" />安全待复核 / 估值待更新联动</div>
            <div className="mt-1 leading-relaxed">
              {products.filter((product) => product.securityAlert).map((product) => (
                <div key={product.id}>「{product.name}」：{product.securityAlert?.reason}；整改期限 {product.securityAlert?.dueAt}，超期未完成复核将自动暂停。</div>
              ))}
            </div>
          </div>
        )}

        <SectionCard>
          <TabBar
            tabs={[
              { key: "products", label: "数据产品", count: products.length },
              { key: "approvals", label: "发布审批", count: pendingApproval },
              { key: "auths", label: "使用授权", count: authorizations.length },
              { key: "downloads", label: "下载任务", count: state.service.downloadTasks.length },
              { key: "stats", label: "使用统计" },
            ]}
            active={tab}
            onChange={setTab}
          />

          {tab === "products" && (
            <div className="overflow-x-auto px-5 py-3">
              <table className="w-full min-w-[1120px] border-separate border-spacing-0 text-left">
                <thead>
                  <tr className="text-[12px] font-medium text-slate-600">
                    {["产品", "交付方式", "关联资产", "服务版本", "状态", "更新时间", "操作"].map((label) => <th key={label} className="border-b border-border py-3 pr-4">{label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="text-[13px] text-foreground">
                      <td className="border-b border-border py-3.5 pr-4">
                        <div className="font-medium">{product.name}</div>
                        <div className="mt-0.5 max-w-[240px] text-[11px] text-muted-foreground">{product.description}</div>
                        {product.statusReason && <div className="mt-0.5 text-[11px] text-amber-700">{product.statusReason}</div>}
                      </td>
                      <td className="border-b border-border py-3.5 pr-4"><Badge tone={product.delivery === "API" ? "blue" : "violet"}>{product.delivery}</Badge></td>
                      <td className="border-b border-border py-3.5 pr-4">
                        <div className="flex flex-col gap-0.5">{product.assets.map((ref) => <span key={ref.assetId} className="font-mono text-[11px] text-muted-foreground">{ref.assetId} · v{ref.assetVersion}</span>)}</div>
                      </td>
                      <td className="border-b border-border py-3.5 pr-4"><span className="rounded-md bg-blue-50 px-1.5 py-0.5 font-mono text-[11px] text-blue-700">v{product.serviceVersion}</span></td>
                      <td className="border-b border-border py-3.5 pr-4"><Badge tone={PRODUCT_TONE[product.status]}>{PRODUCT_STATUS_LABEL[product.status]}</Badge></td>
                      <td className="border-b border-border py-3.5 pr-4 text-[11px] tabular-nums text-muted-foreground">{product.updatedAt}</td>
                      <td className="border-b border-border py-3.5">
                        <div className="flex flex-wrap items-center gap-1">
                          <button type="button" onClick={() => setProductModal({ product })} className="inline-flex h-7 items-center rounded-md border border-input px-2 text-[11px] text-foreground hover:border-primary/30 hover:text-primary">配置</button>
                          {(product.status === "草稿" || product.status === "已驳回") && (
                            <>
                              <button type="button" onClick={() => runMockTest(product)} className="inline-flex h-7 items-center gap-1 rounded-md border border-input px-2 text-[11px] text-foreground hover:border-primary/30 hover:text-primary"><TestTube2 className="h-3 w-3" />模拟测试</button>
                              <button type="button" onClick={() => submitPublish(product)} className="inline-flex h-7 items-center gap-1 rounded-md bg-primary px-2 text-[11px] text-primary-foreground hover:opacity-90"><Send className="h-3 w-3" />提交发布</button>
                            </>
                          )}
                          {product.status === "已发布" && (
                            <button type="button" onClick={() => setPauseProduct(product)} className="inline-flex h-7 items-center gap-1 rounded-md border border-amber-200 px-2 text-[11px] text-amber-700 hover:bg-amber-50"><PauseCircle className="h-3 w-3" />暂停</button>
                          )}
                          {product.status === "已暂停" && (
                            <>
                              <button type="button" onClick={() => toggleProductStatus(product, "已发布")} className="inline-flex h-7 items-center gap-1 rounded-md border border-emerald-200 px-2 text-[11px] text-emerald-700 hover:bg-emerald-50"><Play className="h-3 w-3" />核对并恢复</button>
                              <button type="button" onClick={() => setPauseProduct(product)} className="inline-flex h-7 items-center gap-1 rounded-md border border-red-200 px-2 text-[11px] text-red-600 hover:bg-red-50"><XCircle className="h-3 w-3" />下线</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {products.length === 0 && <EmptyState title="暂无数据产品" />}
            </div>
          )}

          {tab === "approvals" && (
            <div className="space-y-3 px-5 py-4">
              {approvals.length === 0 ? <EmptyState title="暂无发布审批" /> : approvals.map((approval) => (
                <div key={approval.id} className="rounded-md border border-border p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-medium text-foreground">{approval.productName}</span>
                    <Badge tone={approval.status === "已通过" ? "green" : approval.status === "待负责人确认" || approval.status === "待安全审批" ? "amber" : approval.status === "已驳回" ? "red" : "slate"}>{approval.status}</Badge>
                    <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">提交：{approval.submittedAt} · {approval.submittedBy}</span>
                  </div>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    {approval.steps.map((step, index) => (
                      <div key={step.name} className="flex-1 rounded-md border border-border p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-medium text-foreground">{index + 1}. {step.name}</span>
                          <Badge tone={step.status === "approved" ? "green" : step.status === "rejected" ? "red" : step.status === "returned" ? "amber" : "slate"}>
                            {step.status === "approved" ? "已通过" : step.status === "rejected" ? "已驳回" : step.status === "returned" ? "已退回" : "待处理"}
                          </Badge>
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">处理角色：{step.role}</div>
                        {step.at && <div className="mt-1 text-[11px] text-muted-foreground">{step.by} · {step.at}{step.opinion ? ` · ${step.opinion}` : ""}</div>}
                      </div>
                    ))}
                  </div>
                  {(approval.status === "待负责人确认" || approval.status === "待安全审批") && (
                    <div className="mt-3 flex items-center gap-2">
                      <PrimaryButton className="h-7 px-2.5" onClick={() => setApprovalModal({ product: products.find((product) => product.id === approval.productId) ?? fallbackProduct(approval) })}>处理审批</PrimaryButton>
                      <span className="text-[11px] text-muted-foreground">运营人员提交 → 资产负责人确认 → 安全审批人审核；不能取消核心职责分离</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === "auths" && (
            <div className="px-5 py-3">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[12px] text-muted-foreground">使用授权决定申请方的用途、数据范围、交付方式、有效期与配额；发布审批与使用授权是两个独立但关联的流程</span>
                <PrimaryButton className="h-7 px-2.5" onClick={() => setAuthorizationModal(true)}><Plus className="h-3 w-3" />申请使用授权</PrimaryButton>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1160px] border-separate border-spacing-0 text-left">
                  <thead>
                    <tr className="text-[12px] font-medium text-slate-600">
                      {["产品", "使用方", "标准目的", "数据范围 / 字段", "有效期", "配额", "状态", "安全审批", "操作"].map((label) => <th key={label} className="border-b border-border py-3 pr-4">{label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {authorizations.map((authorization) => (
                      <tr key={authorization.id} className="text-[13px] text-foreground">
                        <td className="border-b border-border py-3.5 pr-4"><div className="font-medium">{authorization.productName}</div><div className="mt-0.5 text-[11px] text-muted-foreground">{authorization.applicantKind === "外部" ? "对外使用" : "内部申请"}</div></td>
                        <td className="border-b border-border py-3.5 pr-4">{authorization.applicant}<div className="mt-0.5 text-[11px] text-muted-foreground">{authorization.useSystem}</div></td>
                        <td className="border-b border-border py-3.5 pr-4"><Badge tone="blue">{authorization.purpose}</Badge><div className="mt-0.5 max-w-[160px] text-[11px] text-muted-foreground">{authorization.purposeNote}</div></td>
                        <td className="border-b border-border py-3.5 pr-4 max-w-[220px] text-[11px] text-muted-foreground">{authorization.fields.length > 0 ? authorization.fields.join("、") : "全部字段"}{authorization.region ? ` · ${authorization.region}` : ""}</td>
                        <td className="border-b border-border py-3.5 pr-4 text-[11px] tabular-nums text-muted-foreground">{authorization.effectiveFrom} ~ {authorization.effectiveTo}</td>
                        <td className="border-b border-border py-3.5 pr-4 text-[12px] tabular-nums text-muted-foreground">{authorization.quotaPerDay ? `${authorization.quotaPerDay}/日` : "不限"}</td>
                        <td className="border-b border-border py-3.5 pr-4"><Badge tone={authorization.status === "已授权" ? "green" : authorization.status === "待审批" ? "amber" : authorization.status === "已过期" ? "slate" : "red"}>{AUTHORIZATION_STATUS_LABEL[authorization.status]}</Badge></td>
                        <td className="border-b border-border py-3.5 pr-4"><Badge tone={authorization.securityStatus === "已通过" ? "green" : authorization.securityStatus === "待安全审批" ? "amber" : "slate"}>{authorization.securityStatus}</Badge></td>
                        <td className="border-b border-border py-3.5">
                          <div className="flex flex-wrap items-center gap-1">
                            {authorization.status === "待审批" && (
                              <button type="button" onClick={() => setApproveAuth(authorization)} className="inline-flex h-7 items-center rounded-md border border-blue-200 bg-blue-50 px-2 text-[11px] text-blue-700 hover:bg-blue-100">审批</button>
                            )}
                            {authorization.status === "已授权" && products.find((product) => product.id === authorization.productId)?.delivery === "API" && (
                              <button type="button" onClick={() => setApiCallAuth(authorization)} className="inline-flex h-7 items-center gap-1 rounded-md border border-input px-2 text-[11px] text-foreground hover:border-primary/30 hover:text-primary"><Send className="h-3 w-3" />模拟调用</button>
                            )}
                            {authorization.status === "已授权" && (
                              <button type="button" onClick={() => setRevokeAuth(authorization)} className="inline-flex h-7 items-center rounded-md border border-red-200 px-2 text-[11px] text-red-600 hover:bg-red-50">撤销</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "downloads" && (
            <div className="overflow-x-auto px-5 py-3">
              <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left">
                <thead>
                  <tr className="text-[12px] font-medium text-slate-600">
                    {["任务", "请求方", "文件 / 数据范围", "次数", "有效期", "状态", "操作"].map((label) => <th key={label} className="border-b border-border py-3 pr-4">{label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {state.service.downloadTasks.map((task) => (
                    <tr key={task.id} className="text-[13px] text-foreground">
                      <td className="border-b border-border py-3.5 pr-4"><div className="font-medium">{task.productName}</div><div className="mt-0.5 font-mono text-[11px] text-muted-foreground">{task.id} · v{task.serviceVersion}</div></td>
                      <td className="border-b border-border py-3.5 pr-4 text-[12px] text-muted-foreground">{task.requester}</td>
                      <td className="border-b border-border py-3.5 pr-4 text-[12px] text-muted-foreground">{task.fileFormat}<div className="mt-0.5 text-[11px]">{task.dataRange} · 脱敏：{task.masking}</div></td>
                      <td className="border-b border-border py-3.5 pr-4 tabular-nums text-muted-foreground">{task.usedDownloads} / {task.maxDownloads}</td>
                      <td className="border-b border-border py-3.5 pr-4 text-[11px] tabular-nums text-muted-foreground">{task.validUntil}</td>
                      <td className="border-b border-border py-3.5 pr-4"><Badge tone={task.status === "有效" ? "green" : task.status === "已用完" ? "amber" : "slate"}>{task.status}</Badge></td>
                      <td className="border-b border-border py-3.5">
                        {task.status === "有效" ? (
                          <button type="button" disabled={simulating} onClick={() => downloadFile(task)} className="inline-flex h-7 items-center gap-1 rounded-md bg-primary px-2 text-[11px] text-primary-foreground hover:opacity-90 disabled:opacity-50"><FileDown className="h-3 w-3" />模拟下载</button>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-2 rounded-md border border-border bg-surface-raised p-3 text-[11px] leading-relaxed text-muted-foreground">
                下载任务在使用授权批准后生成，绑定服务版本、资产版本与授权记录；每次生成或下载前校验有效期、剩余次数、数据范围、文件格式、脱敏策略、授权状态与产品状态。文件过期、授权撤销、产品暂停或下线后任务立即失效，每次尝试均写入使用审计。
              </div>
            </div>
          )}

          {tab === "stats" && (
            <div className="space-y-4 px-5 py-4">
              {apiStats.total > 0 && apiStats.rejected / apiStats.total > 0.03 && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-800">预警：今日 API 拒绝率 {((apiStats.rejected / apiStats.total) * 100).toFixed(1)}%，超过预警阈值 3%，已生成异常记录供审计研判。</div>
              )}
              <div className="grid gap-3 lg:grid-cols-2">
                <SectionCard title="API 统计" description="从资产使用审计记录直接汇总，不维护独立手工调用计数">
                  <div className="grid grid-cols-3 gap-3 p-4">
                    {[["总调用量", apiStats.total], ["成功量", apiStats.success], ["失败量", apiStats.failed], ["拒绝量", apiStats.rejected], ["超时量", apiStats.timeout], ["成功率", `${apiStats.successRate}%`], ["平均响应", `${apiStats.durationAvg}ms`]].map(([label, value]) => (
                      <div key={label} className="rounded-md border border-border p-3">
                        <div className="text-[11px] text-muted-foreground">{label}</div>
                        <div className="mt-1 text-[18px] font-semibold tabular-nums text-foreground">{value}</div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
                <SectionCard title="下载统计" description="申请 / 审批通过 / 文件生成 / 成功下载 / 失败量">
                  <div className="grid grid-cols-3 gap-3 p-4">
                    {[["申请量", downloadStats.applied], ["审批通过", downloadStats.approved], ["文件生成", downloadStats.generated], ["成功下载", downloadStats.success], ["拒绝 / 失败", downloadStats.failed]].map(([label, value]) => (
                      <div key={label} className="rounded-md border border-border p-3">
                        <div className="text-[11px] text-muted-foreground">{label}</div>
                        <div className="mt-1 text-[18px] font-semibold tabular-nums text-foreground">{value}</div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <SectionCard title="使用目的分布" description="调用自动继承授权目的，调用方只能补充场景，不能覆盖授权目的">
                  <div className="space-y-2 p-4">
                    {purposeDistribution.map(([purpose, count]) => (
                      <div key={purpose} className="flex items-center gap-3">
                        <span className="w-36 shrink-0 text-[12px] text-foreground">{purpose}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${(count / Math.max(apiStats.total, 1)) * 100}%` }} />
                        </div>
                        <span className="w-12 text-right text-[11px] tabular-nums text-muted-foreground">{count}</span>
                      </div>
                    ))}
                    {purposeDistribution.length === 0 && <EmptyState title="暂无调用记录" />}
                  </div>
                </SectionCard>
                <SectionCard title="按日调用趋势" description="按日 / 周 / 月汇总，用于运营目标与效益评价">
                  <div className="flex h-44 items-end gap-2 p-4">
                    {trendByDay.map(([day, count]) => {
                      const max = Math.max(...trendByDay.map(([, value]) => value), 1);
                      return (
                        <div key={day} className="flex flex-1 flex-col items-center gap-1">
                          <span className="text-[10px] tabular-nums text-muted-foreground">{count}</span>
                          <div className="w-full rounded-t bg-primary/70" style={{ height: `${Math.max((count / max) * 110, 4)}px` }} />
                          <span className="text-[10px] text-muted-foreground">{day.slice(5)}</span>
                        </div>
                      );
                    })}
                  </div>
                </SectionCard>
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      {productModal && (
        <ProductModal
          product={productModal.product}
          onClose={() => setProductModal(null)}
          onSubmit={(product) => {
            update((current) => ({
              ...current,
              service: {
                ...current.service,
                products: current.service.products.some((item) => item.id === product.id)
                  ? current.service.products.map((item) => (item.id === product.id ? product : item))
                  : [product, ...current.service.products],
              },
            }));
            setProductModal(null);
            showToast("success", product.id ? "产品配置已保存" : "产品草稿已保存（未满足发布条件时仅允许草稿与模拟测试）");
          }}
        />
      )}

      {gateProduct && <GateResultModal product={gateProduct} onClose={() => setGateProduct(null)} />}

      {approvalModal && (
        <ApprovalModal
          product={approvalModal.product}
          approval={approvals.find((approval) => approval.productId === approvalModal.product.id)}
          onClose={() => setApprovalModal(null)}
          onSubmit={(action, opinion) => {
            const approval = approvals.find((item) => item.productId === approvalModal.product.id);
            if (approval) handleApproval(approval, action, opinion);
          }}
        />
      )}

      {authorizationModal && (
        <AuthorizationModal
          products={products}
          onClose={() => setAuthorizationModal(false)}
          onSubmit={(input) => {
            const product = products.find((item) => item.id === input.productId);
            if (!product) return;
            const sensitive = product.apiConfig?.fields?.includes("mobile") ?? false;
            const requiresSecurity = input.applicantKind === "外部" || sensitive;
            const authorization: Authorization = {
              id: uid("az"),
              ...input,
              productName: product.name,
              status: "待审批",
              requiresSecurity,
              securityStatus: requiresSecurity ? "待安全审批" : "无需",
              createdAt: MOCK_NOW,
              updatedAt: MOCK_NOW,
            };
            update((current) => ({
              ...current,
              service: { ...current.service, authorizations: [authorization, ...current.service.authorizations] },
            }));
            setAuthorizationModal(false);
            showToast("success", requiresSecurity ? "使用申请已提交，涉及敏感数据/对外使用，将追加安全审批" : "使用申请已提交，等待资产负责人审批");
          }}
        />
      )}

      {approveAuth && <ApproveAuthorizationModal authorization={approveAuth} onClose={() => setApproveAuth(null)} onSubmit={(pass, opinion) => approveAuthorization(approveAuth, pass, opinion)} />}

      {revokeAuth && (
        <Modal
          title="撤销使用授权"
          description={`撤销后原授权保留历史证据，但运行时校验拒绝 API 调用与文件下载。目标：${revokeAuth.applicant} → ${revokeAuth.productName}`}
          onClose={() => { setRevokeAuth(null); setRevokeReason(""); }}
          footer={
            <>
              <SecondaryButton onClick={() => { setRevokeAuth(null); setRevokeReason(""); }}>取消</SecondaryButton>
              <PrimaryButton onClick={() => revokeAuthorization(revokeAuth)} disabled={!revokeReason.trim()} className="bg-red-600 hover:opacity-90">确认撤销</PrimaryButton>
            </>
          }
        >
          <Field label="撤销原因" required hint="暂停、恢复、撤销及其原因均进入变更历史和审计记录">
            <Input value={revokeReason} onChange={setRevokeReason} placeholder="例如：大量失败调用 / 合作终止" />
          </Field>
        </Modal>
      )}

      {pauseProduct && (
        <Modal
          title={pauseProduct.status === "已暂停" ? "下线产品" : "暂停产品"}
          description="暂停、恢复、下线及其原因均进入变更历史和审计记录；已发布服务版本关联快照不随资产最新版本自动变化"
          onClose={() => { setPauseProduct(null); setPauseReason(""); }}
          footer={
            <>
              <SecondaryButton onClick={() => { setPauseProduct(null); setPauseReason(""); }}>取消</SecondaryButton>
              <PrimaryButton onClick={() => toggleProductStatus(pauseProduct, pauseProduct.status === "已暂停" ? "已下线" : "已暂停")} disabled={!pauseReason.trim()}>确认</PrimaryButton>
            </>
          }
        >
          <Field label={pauseProduct.status === "已暂停" ? "下线原因" : "暂停原因"} required>
            <Input value={pauseReason} onChange={setPauseReason} placeholder="例如：发现大量失败调用 / 模型升级中" />
          </Field>
        </Modal>
      )}

      {apiCallAuth && <ApiCallModal authorization={apiCallAuth} onClose={() => setApiCallAuth(null)} onSubmit={(purpose, fields, region) => runApiCall(apiCallAuth, purpose, fields, region)} />}
    </div>
  );
}

function fallbackProduct(approval: ProductApproval): DataProduct {
  return {
    id: approval.productId,
    name: approval.productName,
    delivery: "API",
    serviceVersion: 1,
    description: "",
    targetUsers: "",
    assets: [],
    status: "待审批",
    operator: "运营人员-何运营",
    owner: "",
    createdAt: approval.submittedAt,
    updatedAt: approval.submittedAt,
  };
}
