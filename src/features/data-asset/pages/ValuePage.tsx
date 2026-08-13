import { useMemo, useState } from "react";
import { AlertTriangle, BadgeCheck, Calculator, Clock3, FileBarChart, Plus, ShieldAlert } from "lucide-react";

import { useDataAssetState } from "../store";
import {
  MOCK_NOW,
  VALUATION_METHOD_LABEL,
  daysUntil,
  isExpired,
  uid,
  type Evaluation,
  type EvaluationStatus,
  type MethodResult,
  type ValuationMethod,
} from "../api/types";
import { applyValuationReplacement } from "../api/logic";
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

const STATUS_TONE: Record<EvaluationStatus, BadgeTone> = {
  草稿: "slate",
  计算中: "blue",
  待复核: "amber",
  已生效: "green",
  已驳回: "red",
  已过期: "red",
  已被替代: "amber",
};

export default function ValuePage() {
  const { state, update, meta } = useDataAssetState();
  const showToast = useToast();
  const [tab, setTab] = useState("tasks");
  const [detail, setDetail] = useState<Evaluation | null>(null);
  const [reviewEval, setReviewEval] = useState<Evaluation | null>(null);
  const [reviewOpinion, setReviewOpinion] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const evaluations = [...state.valuation.evaluations].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const valid = evaluations.filter((item) => item.status === "已生效" && !isExpired(item.validUntil));
  const pendingReview = evaluations.filter((item) => item.status === "待复核");
  const replaced = evaluations.filter((item) => item.status === "已被替代");
  const expired = evaluations.filter((item) => item.status === "已过期");

  const review = (evaluation: Evaluation, action: "批准" | "驳回") => {
    if (!reviewOpinion.trim()) return;
    update((current) => ({
      ...current,
      valuation: {
        ...current.valuation,
        evaluations: current.valuation.evaluations.map((item) =>
          item.id === evaluation.id
            ? {
                ...item,
                status: action === "批准" ? "已生效" : "已驳回",
                reviewComment: reviewOpinion,
                updatedAt: MOCK_NOW,
              }
            : item,
        ),
        reviews: [
          {
            id: uid("rev"),
            evaluationId: evaluation.id,
            reviewer: "评估复核人-周复审",
            action,
            opinion: reviewOpinion,
            at: MOCK_NOW,
          },
          ...current.valuation.reviews,
        ],
      },
    }));
    setReviewEval(null);
    setReviewOpinion("");
    showToast(action === "批准" ? "success" : "error", action === "批准" ? "复核通过，该估值已成为有效估值" : "估值已驳回");
  };

  const triggerRevaluation = (evaluation: Evaluation) => {
    const reason = "收益预测变化超过 20%（下调 25%）";
    update((current) => {
      const next = applyValuationReplacement(current, evaluation.id, reason);
      const replacement = buildReplacementEvaluation(evaluation);
      return {
        ...next,
        valuation: {
          ...next.valuation,
          evaluations: [replacement, ...next.valuation.evaluations],
        },
      };
    });
    showToast("info", `已触发重评：原估值转为「待替代」，新评估「${evaluation.assetName}」待复核；关联产品进入估值待更新预警`);
  };

  const simulateOverdueAutoPause = (evaluation: Evaluation) => {
    update((current) => ({
      ...current,
      service: {
        ...current.service,
        products: current.service.products.map((product) =>
          product.assets.some((ref) => ref.assetId === evaluation.assetId) && product.status === "已发布"
            ? {
                ...product,
                status: "已暂停",
                statusReason: `估值待更新超过整改期限（30 天）仍未形成新有效估值，自动暂停`,
                securityAlert: product.securityAlert ? { ...product.securityAlert, state: "已复核" } : undefined,
                updatedAt: MOCK_NOW,
              }
            : product,
        ),
      },
    }));
    showToast("info", "已模拟整改超期：关联产品自动暂停，原估值仍可查看但不能支撑新的产品发布");
  };

  const createEvaluation = (draft: EvaluationDraft) => {
    if (!draft.assetId) {
      showToast("error", "请选择关联资产");
      return;
    }
    const methods: MethodResult[] = [];
    if (draft.methods.cost) methods.push(computeCost(draft.params.cost));
    if (draft.methods.income) methods.push(computeIncome(draft.params.income));
    if (draft.methods.market) methods.push(computeMarket(draft.params.market));
    if (methods.length === 0) {
      showToast("error", "至少选择一种评估方法");
      return;
    }
    const weights: { method: ValuationMethod; weight: number; basis: string }[] = [];
    if (draft.methods.cost) weights.push({ method: "cost", weight: draft.weights.cost, basis: "评估人员设置" });
    if (draft.methods.income) weights.push({ method: "income", weight: draft.weights.income, basis: "评估人员设置" });
    if (draft.methods.market) weights.push({ method: "market", weight: draft.weights.market, basis: "评估人员设置" });
    const totalWeight = weights.reduce((sum, item) => sum + item.weight, 0);
    if (Math.abs(totalWeight - 1) > 0.001) {
      showToast("error", `方法权重之和必须为 1（当前 ${totalWeight.toFixed(2)}）`);
      return;
    }
    const finalValue = methods.reduce((sum, method, index) => sum + method.result * weights[index].weight, 0);
    const asset = state.catalog.assets.find((item) => item.id === draft.assetId);
    const evaluation: Evaluation = {
      id: uid("ev"),
      assetId: draft.assetId,
      assetName: asset?.name ?? draft.assetId,
      basisDate: draft.basisDate,
      effectiveMonths: draft.effectiveMonths,
      validUntil: draft.validUntil,
      appraiser: "评估人员-孙立",
      status: "待复核",
      methods,
      weights,
      finalValue: Number(finalValue.toFixed(2)),
      weightBasis: draft.weightBasis,
      adjustNote: draft.adjustNote,
      snapshot: {
        assetVersion: asset?.version ?? 1,
        ownershipVersion: state.ownership.rights.find((right) => right.assetId === draft.assetId)?.version ?? 0,
        securityVersion: asset?.securityLevel ?? "—",
        catalogStatus: asset ? asset.catalogStatus : "—",
      },
      createdAt: MOCK_NOW,
      updatedAt: MOCK_NOW,
    };
    update((current) => ({
      ...current,
      valuation: { ...current.valuation, evaluations: [evaluation, ...current.valuation.evaluations] },
    }));
    setCreateOpen(false);
    showToast("success", "评估已提交复核，复核通过后成为有效估值");
  };

  const warnedProducts = state.service.products.filter((product) => product.securityAlert);

  return (
    <div className="page-shell animate-fade-in">
      <div className="space-y-4">
        <PageHeader
          title="价值评估"
          description="支持成本法、收益法与市场法，评估结果经复核批准后才能成为有效估值；原评估快照不可随目录、权属或安全分类变化而更新"
          actions={<PrimaryButton icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setCreateOpen(true)}>新建评估任务</PrimaryButton>}
        />

        {meta.error && <WarnNote text={`SQLite 状态读写异常：${meta.error.message}`} />}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard label="有效估值" value={valid.length} icon={BadgeCheck} color="text-emerald-600" bg="bg-emerald-50" />
          <KpiCard label="待复核" value={pendingReview.length} icon={Clock3} color="text-blue-600" bg="bg-blue-50" />
          <KpiCard label="待替代" value={replaced.length} hint="触发重评后不得用于新的产品发布" icon={ShieldAlert} color="text-amber-600" bg="bg-amber-50" />
          <KpiCard label="已过期" value={expired.length} icon={AlertTriangle} color="text-red-600" bg="bg-red-50" />
        </section>

        {warnedProducts.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-800">
            <div className="flex items-center gap-2 font-medium"><ShieldAlert className="h-4 w-4" />估值待更新预警</div>
            <div className="mt-1 leading-relaxed">
              {warnedProducts.map((product) => (
                <div key={product.id}>「{product.name}」：{product.securityAlert?.reason}；超过整改期限（{product.securityAlert?.dueAt}）仍未完成时自动暂停。</div>
              ))}
            </div>
          </div>
        )}

        <SectionCard>
          <TabBar
            tabs={[
              { key: "tasks", label: "评估任务", count: evaluations.length },
              { key: "valid", label: "有效估值", count: valid.length },
              { key: "reports", label: "评估报告", count: evaluations.length },
            ]}
            active={tab}
            onChange={setTab}
          />
          {tab === "tasks" && (
            <div className="overflow-x-auto px-5 py-3">
              <table className="w-full min-w-[1000px] border-separate border-spacing-0 text-left">
                <thead>
                  <tr className="text-[12px] font-medium text-slate-600">
                    {["资产", "评估方法", "评估人", "状态", "基准日", "有效期", "估值（万元）", "操作"].map((label) => <th key={label} className="border-b border-border py-3 pr-4">{label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {evaluations.map((evaluation) => (
                    <tr key={evaluation.id} className="text-[13px] text-foreground">
                      <td className="border-b border-border py-3.5 pr-4">
                        <div className="font-medium">{evaluation.assetName}</div>
                        <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">{evaluation.assetId}</div>
                      </td>
                      <td className="border-b border-border py-3.5 pr-4">
                        <div className="flex flex-wrap gap-1">{evaluation.methods.map((method) => <Badge key={method.method} tone="blue">{VALUATION_METHOD_LABEL[method.method]}</Badge>)}</div>
                      </td>
                      <td className="border-b border-border py-3.5 pr-4 text-[12px] text-muted-foreground">{evaluation.appraiser}</td>
                      <td className="border-b border-border py-3.5 pr-4"><Badge tone={STATUS_TONE[evaluation.status]}>{evaluation.status}</Badge></td>
                      <td className="border-b border-border py-3.5 pr-4 text-[12px] tabular-nums text-muted-foreground">{evaluation.basisDate}</td>
                      <td className="border-b border-border py-3.5 pr-4">
                        <div className="text-[12px] tabular-nums text-muted-foreground">{evaluation.validUntil}</div>
                        {evaluation.status === "已生效" && !isExpired(evaluation.validUntil) && (
                          <div className="mt-0.5 text-[11px] text-amber-600">{daysUntil(evaluation.validUntil)} 天后到期</div>
                        )}
                      </td>
                      <td className="border-b border-border py-3.5 pr-4 text-[14px] font-semibold tabular-nums text-foreground">{evaluation.finalValue ?? "—"}</td>
                      <td className="border-b border-border py-3.5">
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => setDetail(evaluation)} className="inline-flex h-7 items-center rounded-md border border-input px-2 text-[11px] text-foreground hover:border-primary/30 hover:text-primary">详情</button>
                          {evaluation.status === "待复核" && (
                            <button type="button" onClick={() => setReviewEval(evaluation)} className="inline-flex h-7 items-center rounded-md border border-amber-200 bg-amber-50 px-2 text-[11px] text-amber-700 hover:bg-amber-100">复核</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {evaluations.length === 0 && <EmptyState title="暂无评估任务" />}
            </div>
          )}
          {tab === "valid" && (
            <div className="px-5 py-4">
              {valid.length === 0 ? (
                <EmptyState title="暂无有效估值" description="评估经复核批准后才会出现在这里" />
              ) : (
                <div className="space-y-3">
                  {valid.map((evaluation) => (
                    <div key={evaluation.id} className="flex flex-col gap-3 rounded-md border border-border p-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold text-foreground">{evaluation.assetName}</span>
                          <Badge tone="green">有效估值</Badge>
                          <Badge tone="amber">{daysUntil(evaluation.validUntil)} 天后到期（30/7/1 天提醒）</Badge>
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          基准日 {evaluation.basisDate} · 有效期 {evaluation.effectiveMonths} 个月（至 {evaluation.validUntil}）· 资产版本基准 {evaluation.snapshot.assetVersion} · 权属版本 {evaluation.snapshot.ownershipVersion} · 安全分类 {evaluation.snapshot.securityVersion}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-[20px] font-semibold tabular-nums text-foreground">{evaluation.finalValue} 万元</div>
                          <div className="text-[11px] text-muted-foreground">{evaluation.methods.map((method) => VALUATION_METHOD_LABEL[method.method]).join(" + ")}</div>
                        </div>
                        <PrimaryButton
                          className="h-8"
                          onClick={() => triggerRevaluation(evaluation)}
                        >
                          模拟触发重评（收益预测下调 25%）
                        </PrimaryButton>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {replaced.length > 0 && (
                <div className="mt-4 space-y-3">
                  <div className="text-[12px] font-semibold text-foreground">待替代估值（不得用于新的产品发布）</div>
                  {replaced.map((evaluation) => (
                    <div key={evaluation.id} className="flex flex-col gap-3 rounded-md border border-amber-200 bg-amber-50/50 p-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-medium text-foreground">{evaluation.assetName}</span>
                          <Badge tone="amber">待替代</Badge>
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">触发原因：{evaluation.triggerReason ?? "触发重评"} · 原估值仍可查看，但不能支撑新的产品发布</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right"><div className="text-[16px] font-semibold tabular-nums text-foreground">{evaluation.finalValue} 万元</div><div className="text-[11px] text-muted-foreground">历史估值</div></div>
                        <SecondaryButton className="h-8" onClick={() => simulateOverdueAutoPause(evaluation)}>模拟整改超期（自动暂停产品）</SecondaryButton>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {tab === "reports" && (
            <div className="space-y-3 px-5 py-4">
              {evaluations.length === 0 ? (
                <EmptyState title="暂无评估报告" />
              ) : (
                evaluations.map((evaluation) => (
                  <div key={evaluation.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <FileBarChart className="h-4 w-4 text-primary" />
                        <span className="text-[13px] font-medium text-foreground">{evaluation.assetName} 评估报告</span>
                        <Badge tone="slate">版本冻结 v1</Badge>
                        <Badge tone={STATUS_TONE[evaluation.status]}>{evaluation.status}</Badge>
                      </div>
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        基准日 {evaluation.basisDate} · 估值 {evaluation.finalValue ?? "—"} 万元 · 生成 {evaluation.createdAt} · 评估人 {evaluation.appraiser}
                        {evaluation.reviewComment ? ` · 复核意见：${evaluation.reviewComment}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <SecondaryButton className="h-7" onClick={() => setDetail(evaluation)}>查看报告</SecondaryButton>
                      <SecondaryButton className="h-7" onClick={() => showToast("info", "已模拟导出评估报告（原型仅展示，不声称具有认证效力）")}>模拟导出</SecondaryButton>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </SectionCard>
      </div>

      {detail && <EvaluationDetailModal evaluation={detail} onClose={() => setDetail(null)} />}

      {reviewEval && (
        <Modal
          title={`评估复核 · ${reviewEval.assetName}`}
          description="评估人员不得复核自己的评估；复核人批准后估值生效，驳回时保留意见"
          onClose={() => { setReviewEval(null); setReviewOpinion(""); }}
          footer={
            <>
              <SecondaryButton onClick={() => { setReviewEval(null); setReviewOpinion(""); }}>取消</SecondaryButton>
              <PrimaryButton onClick={() => review(reviewEval, "驳回")} disabled={!reviewOpinion.trim()} className="bg-red-600 hover:opacity-90">驳回</PrimaryButton>
              <PrimaryButton onClick={() => review(reviewEval, "批准")} disabled={!reviewOpinion.trim()}>批准生效</PrimaryButton>
            </>
          }
        >
          <div className="mb-4 rounded-md border border-border bg-surface-raised p-3 text-[12px] text-muted-foreground">
            估值结果：<span className="font-semibold text-foreground">{reviewEval.finalValue} 万元</span>（{reviewEval.methods.map((method) => `${VALUATION_METHOD_LABEL[method.method]} ${method.result}`).join("；")}）
          </div>
          <Field label="复核意见" required>
            <TextArea value={reviewOpinion} onChange={setReviewOpinion} placeholder="填写复核意见（必填），作为审批证据" />
          </Field>
        </Modal>
      )}

      {createOpen && (
        <CreateEvaluationModal
          assets={state.catalog.assets.filter((asset) => !asset.voided)}
          onClose={() => setCreateOpen(false)}
          onSubmit={createEvaluation}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------- 计算

interface CostParams { replace: number; func: number; econ: number; quality: number; compliance: number }
interface IncomeParams { y1: number; y2: number; y3: number; rate: number; tv: number }
interface MarketCase { price: number; adjust: number }
interface MarketParams { cases: MarketCase[] }

export interface EvaluationDraft {
  assetId: string;
  basisDate: string;
  effectiveMonths: number;
  validUntil: string;
  methods: { cost: boolean; income: boolean; market: boolean };
  params: { cost: CostParams; income: IncomeParams; market: MarketParams };
  weights: { cost: number; income: number; market: number };
  weightBasis: string;
  adjustNote: string;
}

function computeCost(params: CostParams): MethodResult {
  const replace = params.replace - params.func - params.econ;
  const result = replace * params.quality * params.compliance;
  return {
    method: "cost",
    formula: "重置成本 − 功能性贬值 − 经济性贬值，再应用质量与合规调整系数",
    parameters: [
      { key: "replace", label: "重置成本", value: String(params.replace), unit: "万元", source: mkSource("财务成本台账", "EV-NEW-C", params.replace) },
      { key: "func", label: "功能性贬值", value: String(params.func), unit: "万元", source: mkSource("人工补充材料", "EV-NEW-C", params.func) },
      { key: "econ", label: "经济性贬值", value: String(params.econ), unit: "万元", source: mkSource("人工补充材料", "EV-NEW-C", params.econ) },
      { key: "quality", label: "质量系数", value: String(params.quality), unit: "—", source: mkSource("人工补充材料", "EV-NEW-C", params.quality) },
      { key: "compliance", label: "合规系数", value: String(params.compliance), unit: "—", source: mkSource("人工补充材料", "EV-NEW-C", params.compliance) },
    ],
    intermediate: [
      `重置成本 ${params.replace} − 功能性贬值 ${params.func} = ${Number((params.replace - params.func).toFixed(2))}`,
      `${Number((params.replace - params.func).toFixed(2))} − 经济性贬值 ${params.econ} = ${Number(replace.toFixed(2))}`,
      `${Number(replace.toFixed(2))} × 质量 ${params.quality} × 合规 ${params.compliance} = ${Number(result.toFixed(2))}`,
    ],
    result: Number(result.toFixed(2)),
  };
}

function computeIncome(params: IncomeParams): MethodResult {
  const rate = params.rate;
  const pv = (value: number, year: number) => value / Math.pow(1 + rate, year);
  const pvs = [pv(params.y1, 1), pv(params.y2, 2), pv(params.y3, 3)];
  const tvPv = pv(params.tv, 3);
  const result = pvs.reduce((sum, item) => sum + item, 0) + tvPv;
  return {
    method: "income",
    formula: "Σ(预测期各年增量净收益 / (1+折现率)^n) + 终值现值",
    parameters: [
      { key: "y1", label: "第 1 年增量净收益", value: String(params.y1), unit: "万元", source: mkSource("业务收益预测", "EV-NEW-I", params.y1) },
      { key: "y2", label: "第 2 年增量净收益", value: String(params.y2), unit: "万元", source: mkSource("业务收益预测", "EV-NEW-I", params.y2) },
      { key: "y3", label: "第 3 年增量净收益", value: String(params.y3), unit: "万元", source: mkSource("业务收益预测", "EV-NEW-I", params.y3) },
      { key: "rate", label: "折现率", value: `${params.rate * 100}%`, unit: "—", source: mkSource("财务成本台账", "EV-NEW-I", params.rate) },
      { key: "tv", label: "终值", value: String(params.tv), unit: "万元", source: mkSource("业务收益预测", "EV-NEW-I", params.tv) },
    ],
    intermediate: [
      `PV1 = ${params.y1} / ${(1 + rate).toFixed(2)} = ${Number(pvs[0].toFixed(2))}`,
      `PV2 = ${params.y2} / ${(1 + rate).toFixed(4)} = ${Number(pvs[1].toFixed(2))}`,
      `PV3 = ${params.y3} / ${(1 + rate).toFixed(6)} = ${Number(pvs[2].toFixed(2))}`,
      `终值现值 = ${params.tv} / ${(1 + rate).toFixed(6)} = ${Number(tvPv.toFixed(2))}`,
      `合计 = ${Number(result.toFixed(2))}`,
    ],
    result: Number(result.toFixed(2)),
  };
}

function computeMarket(params: MarketParams): MethodResult {
  const adjusted = params.cases.map((item) => item.price * (1 + item.adjust));
  const weights = [0.3, 0.4, 0.3];
  const result = adjusted.reduce((sum, value, index) => sum + value * weights[index], 0);
  return {
    method: "market",
    formula: "Σ(可比价格 × (1 + 差异调整系数)) × 权重",
    parameters: params.cases.map((item, index) => ({
      key: `m${index + 1}`,
      label: `可比案例${index + 1}`,
      value: `${item.price}（调整 ${item.adjust * 100}%）`,
      unit: "万元",
      source: mkSource("市场可比案例", "EV-NEW-M", item.price),
    })),
    intermediate: adjusted.map((value, index) => `案例${index + 1}调整后 = ${Number(value.toFixed(2))}`),
    result: Number(result.toFixed(2)),
  };
}

function mkSource(type: string, evidence: string, rawValue: number) {
  return {
    type,
    name: `${type}（新建评估输入）`,
    period: "2026",
    provider: "评估人员-孙立",
    collectedAt: MOCK_NOW,
    evidenceNo: evidence,
    quality: "数据完整，抽查通过",
    compliance: "脱敏后使用",
    rawValue,
  };
}

function buildReplacementEvaluation(old: Evaluation): Evaluation {
  const scale = (method: MethodResult, factor: number): MethodResult => ({
    ...method,
    formula: `${method.formula}（参数按触发原因调整）`,
    intermediate: [...method.intermediate, `触发重评调整系数：${factor}`],
    result: Number((method.result * factor).toFixed(2)),
  });
  const methods = old.methods.map((method) => scale(method, method.method === "income" ? 0.75 : 0.9));
  const finalValue = methods.reduce((sum, method, index) => sum + method.result * old.weights[index].weight, 0);
  const basisDate = MOCK_NOW.slice(0, 10);
  const date = new Date(`${basisDate}T00:00:00`);
  date.setFullYear(date.getFullYear() + 1);
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    id: uid("ev"),
    assetId: old.assetId,
    assetName: old.assetName,
    basisDate,
    effectiveMonths: old.effectiveMonths,
    validUntil: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    appraiser: "评估人员-孙立",
    status: "待复核",
    methods,
    weights: old.weights,
    finalValue: Number(finalValue.toFixed(2)),
    weightBasis: "触发重评后按调整后参数重新加权。",
    adjustNote: old.adjustNote,
    snapshot: { ...old.snapshot },
    createdAt: MOCK_NOW,
    updatedAt: MOCK_NOW,
    triggerReason: "收益预测变化超过 20%（下调 25%）",
  };
}

// ---------------------------------------------------------------- 详情 / 新建

function EvaluationDetailModal({ evaluation, onClose }: { evaluation: Evaluation; onClose: () => void }) {
  return (
    <Modal
      title={`评估详情 · ${evaluation.assetName}`}
      description={`评估基准日 ${evaluation.basisDate} · 资产版本基准 v${evaluation.snapshot.assetVersion} · 权属版本 ${evaluation.snapshot.ownershipVersion} · 安全分类 ${evaluation.snapshot.securityVersion}`}
      onClose={onClose}
      width="max-w-4xl"
      footer={<SecondaryButton onClick={onClose}>关闭</SecondaryButton>}
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={STATUS_TONE[evaluation.status]}>{evaluation.status}</Badge>
          <span className="text-[12px] text-muted-foreground">评估人：{evaluation.appraiser}</span>
          <span className="text-[12px] text-muted-foreground">有效期：{evaluation.validUntil}（{evaluation.effectiveMonths} 个月）</span>
          {evaluation.triggerReason && <Badge tone="amber">触发原因：{evaluation.triggerReason}</Badge>}
        </div>

        {evaluation.methods.map((method) => (
          <div key={method.method} className="rounded-md border border-border">
            <div className="flex items-center justify-between border-b border-border bg-surface-raised px-4 py-2.5">
              <span className="text-[13px] font-semibold text-foreground">{VALUATION_METHOD_LABEL[method.method]}</span>
              <span className="text-[12px] text-muted-foreground">公式：{method.formula}</span>
            </div>
            <div className="p-4">
              <table className="w-full border-separate border-spacing-0 text-left">
                <thead>
                  <tr className="text-[11px] text-slate-500">
                    {["参数", "值", "单位", "来源类型 / 材料", "期间", "提供方", "证据编号", "原始值", "调整后", "调整原因"].map((label) => <th key={label} className="border-b border-border py-2 pr-3">{label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {method.parameters.map((item) => (
                    <tr key={item.key} className="text-[11px] text-foreground">
                      <td className="border-b border-border py-2 pr-3 font-medium">{item.label}</td>
                      <td className="border-b border-border py-2 pr-3 tabular-nums">{item.value}</td>
                      <td className="border-b border-border py-2 pr-3 text-muted-foreground">{item.unit}</td>
                      <td className="border-b border-border py-2 pr-3 text-muted-foreground">{item.source.type}<div className="text-muted-foreground/70">{item.source.name}</div></td>
                      <td className="border-b border-border py-2 pr-3 text-muted-foreground">{item.source.period}</td>
                      <td className="border-b border-border py-2 pr-3 text-muted-foreground">{item.source.provider}</td>
                      <td className="border-b border-border py-2 pr-3 font-mono text-muted-foreground">{item.source.evidenceNo}</td>
                      <td className="border-b border-border py-2 pr-3 tabular-nums text-muted-foreground">{item.source.rawValue}</td>
                      <td className="border-b border-border py-2 pr-3 tabular-nums text-foreground">{item.source.adjustedValue ?? "—"}</td>
                      <td className="border-b border-border py-2 text-muted-foreground">{item.source.adjustReason ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 rounded-md border border-border bg-surface-raised px-3 py-2.5">
                <div className="text-[11px] font-medium text-muted-foreground">计算过程（中间值）</div>
                <div className="mt-1 font-mono text-[11px] leading-5 text-foreground">{method.intermediate.join(" → ")}</div>
              </div>
              <div className="mt-3 text-right">
                <span className="text-[12px] text-muted-foreground">{VALUATION_METHOD_LABEL[method.method]}结果（只读，不可直接修改）：</span>
                <span className="ml-2 text-[18px] font-semibold tabular-nums text-foreground">{method.result} 万元</span>
              </div>
            </div>
          </div>
        ))}

        <div className="rounded-md border border-border p-4">
          <div className="text-[12px] font-medium text-foreground">多方法加权（权重依据：{evaluation.weightBasis}）</div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {evaluation.weights.map((weight) => (
              <span key={weight.method} className="text-[12px] text-muted-foreground">{VALUATION_METHOD_LABEL[weight.method]} {weight.weight * 100}%</span>
            ))}
            <span className="ml-auto text-[16px] font-semibold tabular-nums text-primary">最终估值 {evaluation.finalValue} 万元</span>
          </div>
          {evaluation.adjustNote && <div className="mt-2 text-[11px] text-muted-foreground">调整说明：{evaluation.adjustNote}</div>}
        </div>
      </div>
    </Modal>
  );
}

const EMPTY_DRAFT: EvaluationDraft = {
  assetId: "",
  basisDate: MOCK_NOW.slice(0, 10),
  effectiveMonths: 12,
  validUntil: "",
  methods: { cost: true, income: false, market: false },
  params: {
    cost: { replace: 200, func: 45, econ: 35, quality: 0.95, compliance: 1 },
    income: { y1: 40, y2: 50, y3: 60, rate: 0.1, tv: 110 },
    market: { cases: [{ price: 150, adjust: 0.08 }, { price: 180, adjust: -0.05 }, { price: 170, adjust: 0.03 }] },
  },
  weights: { cost: 1, income: 0, market: 0 },
  weightBasis: "",
  adjustNote: "",
};

function CreateEvaluationModal({
  assets,
  onClose,
  onSubmit,
}: {
  assets: { id: string; name: string; businessDomain: string }[];
  onClose: () => void;
  onSubmit: (draft: EvaluationDraft) => void;
}) {
  const [draft, setDraft] = useState<EvaluationDraft>(EMPTY_DRAFT);
  const [computed, setComputed] = useState<{ methods: MethodResult[]; finalValue: number } | null>(null);

  const set = <K extends keyof EvaluationDraft>(key: K, value: EvaluationDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setComputed(null);
  };

  const toggleMethod = (method: ValuationMethod, enabled: boolean) => {
    setDraft((current) => ({
      ...current,
      methods: { ...current.methods, [method]: enabled },
      weights: {
        ...current.weights,
        ...(enabled && method === "cost" ? { cost: 1, income: 0, market: 0 } : {}),
      },
    }));
    setComputed(null);
  };

  const compute = () => {
    const methods: MethodResult[] = [];
    if (draft.methods.cost) methods.push(computeCost(draft.params.cost));
    if (draft.methods.income) methods.push(computeIncome(draft.params.income));
    if (draft.methods.market) methods.push(computeMarket(draft.params.market));
    if (methods.length === 0) return;
    const weights = [draft.weights.cost, draft.weights.income, draft.weights.market].filter((_, index) => methods[index]);
    const finalValue = methods.reduce((sum, method, index) => sum + method.result * weights[index], 0);
    setComputed({ methods, finalValue: Number(finalValue.toFixed(2)) });
  };

  const validUntil = useMemo(() => {
    const date = new Date(`${draft.basisDate}T00:00:00`);
    date.setFullYear(date.getFullYear() + 1);
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }, [draft.basisDate]);

  return (
    <Modal
      title="新建评估任务"
      description="评估结果字段只读，任何变化必须来自有证据和调整理由的参数变更；评估人不得复核自己的评估"
      onClose={onClose}
      width="max-w-4xl"
      footer={
        <>
          <SecondaryButton onClick={onClose}>取消</SecondaryButton>
          {computed && (
            <PrimaryButton
              onClick={() =>
                onSubmit({
                  ...draft,
                  validUntil,
                  params: { ...draft.params },
                })
              }
            >
              提交复核
            </PrimaryButton>
          )}
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="关联资产" required>
          <Select value={draft.assetId} onChange={(value) => set("assetId", value)} options={[{ value: "", label: "请选择资产" }, ...assets.map((item) => ({ value: item.id, label: item.name }))]} className="w-full" />
        </Field>
        <Field label="评估基准日" required>
          <Input type="date" value={draft.basisDate} onChange={(value) => set("basisDate", value)} />
        </Field>
        <Field label="有效期" required hint={`默认 12 个月，评估时调整；到期前 30/7/1 天提醒`}>
          <div className="flex items-center gap-2">
            <Input type="number" value={String(draft.effectiveMonths)} onChange={(value) => set("effectiveMonths", Number(value))} className="w-20" />
            <span className="text-[12px] text-muted-foreground">个月（至 {validUntil}）</span>
          </div>
        </Field>
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-[12px] font-medium text-foreground">评估方法</span>
          {([["cost", "成本法"], ["income", "收益法"], ["market", "市场法"]] as [ValuationMethod, string][]).map(([method, label]) => (
            <label key={method} className="flex items-center gap-1.5 text-[12px] text-foreground">
              <input type="checkbox" checked={draft.methods[method]} onChange={(event) => toggleMethod(method, event.target.checked)} className="h-3.5 w-3.5 accent-blue-600" />
              {label}
            </label>
          ))}
          <span className="text-[11px] text-muted-foreground">一份评估可采用一种或多种方法</span>
        </div>

        {draft.methods.cost && (
          <div className="grid gap-3 rounded-md border border-border p-4 sm:grid-cols-5">
            <Field label="重置成本（万元）"><Input type="number" value={String(draft.params.cost.replace)} onChange={(value) => setDraft((current) => ({ ...current, params: { ...current.params, cost: { ...current.params.cost, replace: Number(value) } } }))} /></Field>
            <Field label="功能性贬值"><Input type="number" value={String(draft.params.cost.func)} onChange={(value) => setDraft((current) => ({ ...current, params: { ...current.params, cost: { ...current.params.cost, func: Number(value) } } }))} /></Field>
            <Field label="经济性贬值"><Input type="number" value={String(draft.params.cost.econ)} onChange={(value) => setDraft((current) => ({ ...current, params: { ...current.params, cost: { ...current.params.cost, econ: Number(value) } } }))} /></Field>
            <Field label="质量系数"><Input type="number" step="0.01" value={String(draft.params.cost.quality)} onChange={(value) => setDraft((current) => ({ ...current, params: { ...current.params, cost: { ...current.params.cost, quality: Number(value) } } }))} /></Field>
            <Field label="合规系数"><Input type="number" step="0.01" value={String(draft.params.cost.compliance)} onChange={(value) => setDraft((current) => ({ ...current, params: { ...current.params, cost: { ...current.params.cost, compliance: Number(value) } } }))} /></Field>
          </div>
        )}
        {draft.methods.income && (
          <div className="grid gap-3 rounded-md border border-border p-4 sm:grid-cols-5">
            <Field label="第 1 年净收益"><Input type="number" value={String(draft.params.income.y1)} onChange={(value) => setDraft((current) => ({ ...current, params: { ...current.params, income: { ...current.params.income, y1: Number(value) } } }))} /></Field>
            <Field label="第 2 年净收益"><Input type="number" value={String(draft.params.income.y2)} onChange={(value) => setDraft((current) => ({ ...current, params: { ...current.params, income: { ...current.params.income, y2: Number(value) } } }))} /></Field>
            <Field label="第 3 年净收益"><Input type="number" value={String(draft.params.income.y3)} onChange={(value) => setDraft((current) => ({ ...current, params: { ...current.params, income: { ...current.params.income, y3: Number(value) } } }))} /></Field>
            <Field label="折现率（小数）"><Input type="number" step="0.01" value={String(draft.params.income.rate)} onChange={(value) => setDraft((current) => ({ ...current, params: { ...current.params, income: { ...current.params.income, rate: Number(value) } } }))} /></Field>
            <Field label="终值"><Input type="number" value={String(draft.params.income.tv)} onChange={(value) => setDraft((current) => ({ ...current, params: { ...current.params, income: { ...current.params.income, tv: Number(value) } } }))} /></Field>
          </div>
        )}
        {draft.methods.market && (
          <div className="rounded-md border border-border p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {draft.params.market.cases.map((item, index) => (
                <div key={index} className="rounded-md border border-border p-3">
                  <div className="mb-2 text-[12px] font-medium text-foreground">可比案例{index + 1}</div>
                  <div className="space-y-2">
                    <Field label="价格（万元）"><Input type="number" value={String(item.price)} onChange={(value) => setDraft((current) => ({ ...current, params: { ...current.params, market: { ...current.params.market, cases: current.params.market.cases.map((c, i) => i === index ? { ...c, price: Number(value) } : c) } } }))} /></Field>
                    <Field label="差异调整系数（小数）"><Input type="number" step="0.01" value={String(item.adjust)} onChange={(value) => setDraft((current) => ({ ...current, params: { ...current.params, market: { ...current.params.market, cases: current.params.market.cases.map((c, i) => i === index ? { ...c, adjust: Number(value) } : c) } } }))} /></Field>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground">市场法按规模、质量、权利范围、时效与市场条件差异调整后加权（固定权重 0.3/0.4/0.3）。</div>
          </div>
        )}
      </div>

      {draft.methods.income && draft.methods.cost && draft.methods.market && (
        <div className="mt-3 grid gap-3 rounded-md border border-border p-4 sm:grid-cols-3">
          <Field label="成本法权重"><Input type="number" step="0.1" value={String(draft.weights.cost)} onChange={(value) => setDraft((current) => ({ ...current, weights: { ...current.weights, cost: Number(value) } }))} /></Field>
          <Field label="收益法权重"><Input type="number" step="0.1" value={String(draft.weights.income)} onChange={(value) => setDraft((current) => ({ ...current, weights: { ...current.weights, income: Number(value) } }))} /></Field>
          <Field label="市场法权重"><Input type="number" step="0.1" value={String(draft.weights.market)} onChange={(value) => setDraft((current) => ({ ...current, weights: { ...current.weights, market: Number(value) } }))} /></Field>
        </div>
      )}

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="权重依据与调整说明" hint="记录多方法权重依据和数值调整原因">
          <Input value={draft.weightBasis} onChange={(value) => set("weightBasis", value)} placeholder="例如：收益法权重最高，因其价值体现于经营收益" />
        </Field>
        <Field label="数据来源说明" hint="每个输入参数关联来源类型、期间、提供方与证据编号（当前原型保存脱敏 mock 值）">
          <Input value={draft.adjustNote} onChange={(value) => set("adjustNote", value)} placeholder="补充数据质量与合规说明" />
        </Field>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-md border border-border bg-surface-raised px-4 py-3">
        <SecondaryButton onClick={compute} className="border-primary/30 text-primary"><Calculator className="h-3.5 w-3.5" />计算评估结果</SecondaryButton>
        {computed ? (
          <div className="text-right">
            <div className="text-[11px] text-muted-foreground">各方法结果（只读）：{computed.methods.map((method) => `${VALUATION_METHOD_LABEL[method.method]} ${method.result}`).join("；")}</div>
            <div className="text-[16px] font-semibold tabular-nums text-primary">最终估值 {computed.finalValue} 万元</div>
          </div>
        ) : (
          <span className="text-[11px] text-muted-foreground">结果字段只读，参数变化需来源与调整理由</span>
        )}
      </div>
    </Modal>
  );
}
