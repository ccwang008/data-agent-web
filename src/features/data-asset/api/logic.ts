/**
 * Data Asset · 纯函数业务逻辑（固定规则）。
 * 跨域联动在此集中实现：发布门槛、权属失效暂停产品、估值待替代预警、API/下载校验。
 */

import { clone, isExpired, MOCK_NOW, MOCK_TODAY, validValuation } from "./types";
import type {
  Authorization,
  AuditEvent,
  DataAssetState,
  DataProduct,
  PublishGate,
  ProductStatus,
} from "./types";
import { AUTHORIZATION_STATUS_LABEL } from "./types";

// ---------------------------------------------------------------- 发布门槛

export function evaluatePublishGate(state: DataAssetState, product: DataProduct): PublishGate {
  const checks: PublishGateCheck[] = [];
  type PublishGateCheck = PublishGate["checks"][number];

  const unconfirmed = product.assets.filter((ref) => {
    const right = state.ownership.rights.find((item) => item.id === ref.rightId);
    return !right || right.status !== "confirmed";
  });
  checks.push({
    name: "关联资产已确权",
    ok: unconfirmed.length === 0,
    detail: unconfirmed.length
      ? `存在未确权权属记录：${unconfirmed.map((ref) => ref.assetId).join("、")}`
      : "全部关联资产权属已确权",
  });

  const noRight = product.assets.filter((ref) => {
    const right = state.ownership.rights.find((item) => item.id === ref.rightId);
    if (!right) return true;
    if (right.rightType !== "经营权") return true;
    return isExpired(right.effectiveTo);
  });
  checks.push({
    name: "有效经营权覆盖数据范围与交付方式",
    ok: noRight.length === 0,
    detail: noRight.length
      ? `缺少有效经营权：${noRight.map((ref) => ref.assetId).join("、")}`
      : "有效经营权覆盖全部关联资产",
  });

  const noValuation = product.assets.filter((ref) => !validValuation(state, ref.assetId));
  checks.push({
    name: "关联资产存在有效估值",
    ok: noValuation.length === 0,
    detail: noValuation.length
      ? `估值缺失或已失效：${noValuation.map((ref) => ref.assetId).join("、")}`
      : "全部关联资产存在有效估值",
  });

  const versionComplete = product.delivery === "API"
    ? Boolean(product.apiConfig?.path && product.apiConfig.method && product.apiConfig.quotaPerDay)
    : Boolean(product.downloadConfig?.fileFormat && product.downloadConfig.maxDownloads);
  checks.push({
    name: "产品服务版本信息完整",
    ok: versionComplete,
    detail: versionComplete ? "服务版本信息完整" : "服务配置不完整（路径/方法/配额或文件格式/下载次数）",
  });

  const approval = state.service.productApprovals.find((item) => item.productId === product.id);
  const approved = Boolean(approval && approval.status === "已通过");
  checks.push({
    name: "发布审批与安全审核通过",
    ok: approved,
    detail: approved ? `审批已通过（提交于 ${approval?.submittedAt}）` : "发布审批未完成或未通过",
  });

  const passed = checks.every((check) => check.ok);
  return { checkedAt: MOCK_NOW, passed, checks };
}

// ---------------------------------------------------------------- 权属失效联动

/**
 * 持有权或经营权到期/撤销后，立即暂停其覆盖的数据产品；
 * 既有使用授权保留原状态与历史证据（调用/下载由运行时校验拒绝）。
 */
export function pauseProductsByRights(state: DataAssetState, rightIds: string[], reason: string): DataAssetState {
  const next = clone(state);
  const targets = new Set(rightIds);
  next.service.products = next.service.products.map((product) => {
    const covered = product.assets.some((ref) => targets.has(ref.rightId));
    if (!covered || product.status === "已暂停" || product.status === "已下线") return product;
    return { ...product, status: "已暂停" as ProductStatus, statusReason: reason, updatedAt: MOCK_NOW };
  });
  return next;
}

// ---------------------------------------------------------------- 估值待替代联动

/**
 * 触发重评后，原估值转为「待替代」不得用于新发布；
 * 关联已发布产品进入「估值待更新」预警，超过整改期限仍未形成新有效估值时自动暂停。
 */
export function applyValuationReplacement(state: DataAssetState, evaluationId: string, triggerReason: string): DataAssetState {
  const next = clone(state);
  const evaluation = next.valuation.evaluations.find((item) => item.id === evaluationId);
  if (!evaluation || evaluation.status !== "已生效") return next;

  evaluation.status = "已被替代";
  evaluation.triggerReason = triggerReason;
  evaluation.updatedAt = MOCK_NOW;

  next.service.products = next.service.products.map((product) => {
    if (product.status !== "已发布") return product;
    if (!product.assets.some((ref) => ref.assetId === evaluation.assetId)) return product;
    // 超过整改期限（30 天）仍未形成新有效估值 → 自动暂停
    const deadline = addDays(evaluation.validUntil, 0); // 以重评触发日为整改起点
    const newValuation = validValuation(next, evaluation.assetId);
    const overdue = !newValuation && MOCK_NOW > `${deadline} 23:59:59`;
    return {
      ...product,
      status: overdue ? ("已暂停" as ProductStatus) : product.status,
      statusReason: overdue ? `估值待更新超过整改期限（${deadline}）后自动暂停` : undefined,
      securityAlert: { reason: `关联资产「${evaluation.assetName}」估值待替代（${triggerReason}）`, dueAt: deadline, state: "待复核" },
      updatedAt: MOCK_NOW,
    };
  });

  return next;
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + days);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// ---------------------------------------------------------------- API 调用校验

export interface ApiCallRequest {
  authorizationId: string;
  declaredPurpose: string;
  fields: string[];
  region?: string;
}

export function validateApiCall(state: DataAssetState, request: ApiCallRequest): ApiCallVerdict {
  const authorization = state.service.authorizations.find((item) => item.id === request.authorizationId);
  if (!authorization) return { ok: false, rejectedReason: "授权不存在" };
  const product = state.service.products.find((item) => item.id === authorization.productId);

  if (!product || product.status !== "已发布") {
    return { ok: false, rejectedReason: `产品未处于已发布状态（${product?.status ?? "未知"}）` };
  }
  if (authorization.status !== "已授权") {
    return { ok: false, rejectedReason: `授权状态为「${AUTHORIZATION_STATUS_LABEL[authorization.status]}」` };
  }
  if (isExpired(authorization.effectiveTo)) return { ok: false, rejectedReason: "授权已过期" };
  if (request.declaredPurpose !== authorization.purpose) {
    return { ok: false, rejectedReason: `目的不一致：声明「${request.declaredPurpose}」与授权目的「${authorization.purpose}」不符` };
  }
  const outOfScope = request.fields.filter((field) => !authorization.fields.includes(field));
  if (outOfScope.length > 0) return { ok: false, rejectedReason: `字段超出授权范围：${outOfScope.join("、")}` };
  if (request.region && authorization.region && request.region !== authorization.region) {
    return { ok: false, rejectedReason: `业务区域超出授权范围：请求「${request.region}」授权「${authorization.region}」` };
  }
  if (authorization.quotaPerDay) {
    const todayUsed = state.audit.events.filter(
      (event) =>
        event.authorizationId === authorization.id &&
        event.at.slice(0, 10) === MOCK_TODAY &&
        event.channel === "API",
    ).length;
    if (todayUsed >= authorization.quotaPerDay) return { ok: false, rejectedReason: "当日调用配额已用完" };
  }
  return { ok: true };
}

export interface ApiCallVerdict {
  ok: boolean;
  rejectedReason?: string;
}

// ---------------------------------------------------------------- 下载校验

export function validateDownload(state: DataAssetState, downloadTaskId: string): ApiCallVerdict {
  const task = state.service.downloadTasks.find((item) => item.id === downloadTaskId);
  if (!task) return { ok: false, rejectedReason: "下载任务不存在" };
  const product = state.service.products.find((item) => item.id === task.productId);
  const authorization = state.service.authorizations.find((item) => item.id === task.authorizationId);

  if (task.status === "已失效") return { ok: false, rejectedReason: "下载任务已失效" };
  if (task.status === "已用完") return { ok: false, rejectedReason: "下载次数已用完" };
  if (isExpired(task.validUntil)) return { ok: false, rejectedReason: "下载任务已过期" };
  if (!product || product.status !== "已发布") {
    return { ok: false, rejectedReason: `产品状态不可下载（${product?.status ?? "未知"}）` };
  }
  if (!authorization || authorization.status !== "已授权") return { ok: false, rejectedReason: "关联授权已失效" };
  if (task.usedDownloads >= task.maxDownloads) return { ok: false, rejectedReason: "已超过最大下载次数" };
  return { ok: true };
}

// ---------------------------------------------------------------- 审计事件构造

let traceCounter = 0;

export function nextTraceId(): string {
  traceCounter += 1;
  return `trc-${MOCK_TODAY.replaceAll("-", "")}-${String(traceCounter).padStart(4, "0")}`;
}

export function buildAuditEvent(partial: Partial<AuditEvent>): AuditEvent {
  const event: AuditEvent = {
    id: partial.id ?? `ev-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    at: partial.at ?? MOCK_NOW,
    principal: partial.principal ?? "未知主体",
    principalKind: partial.principalKind ?? "内部系统",
    appId: partial.appId ?? "app-unknown",
    appNameMasked: partial.appNameMasked ?? "未知应用",
    channel: partial.channel ?? "API",
    ipRegion: partial.ipRegion ?? "内网",
    accountMasked: partial.accountMasked ?? "svc-***",
    traceId: partial.traceId ?? nextTraceId(),
    result: partial.result ?? "成功",
  };
  return Object.assign(event, partial);
}

export function authorizationById(state: DataAssetState, authorizationId: string): Authorization | undefined {
  return state.service.authorizations.find((item) => item.id === authorizationId);
}
