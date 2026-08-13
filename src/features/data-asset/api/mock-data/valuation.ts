/** Data Asset · mock 价值评估数据：评估记录与复核记录。 */

import type { Evaluation, EvaluationReview, MethodParameter, MethodResult, ValuationSource } from "../types";

function src(
  type: ValuationSource["type"],
  name: string,
  period: string,
  provider: string,
  evidenceNo: string,
  rawValue: number,
  quality = "数据完整，抽查通过",
  compliance = "脱敏后使用",
  adjustedValue?: number,
  adjustReason?: string,
): ValuationSource {
  return {
    type, name, period, provider, collectedAt: "2026-05-08",
    evidenceNo, quality, compliance, rawValue,
    ...(adjustedValue !== undefined ? { adjustedValue, adjustReason } : {}),
  };
}

function param(key: string, label: string, value: string, unit: string, source: ValuationSource): MethodParameter {
  return { key, label, value, unit, source };
}

/** 成本法：重置成本 200 − 功能贬值 45 − 经济贬值 35 = 120，× 质量 0.95 × 合规 1.00 */
function costMethod(): MethodResult {
  return {
    method: "cost",
    formula: "重置成本 − 功能性贬值 − 经济性贬值，再应用质量与合规调整系数",
    parameters: [
      param("replace", "重置成本", "200.00", "万元", src("财务成本台账", "客户标签库建设成本台账", "2025-01 ~ 2026-04", "财务部", "EV-2026-C001", 200)),
      param("func", "功能性贬值", "45.00", "万元", src("人工补充材料", "功能折旧评估说明", "2026-04", "评估人员", "EV-2026-C002", 45)),
      param("econ", "经济性贬值", "35.00", "万元", src("人工补充材料", "经济性贬值评估说明", "2026-04", "评估人员", "EV-2026-C003", 35)),
      param("quality", "质量系数", "0.95", "—", src("人工补充材料", "数据质量评价表", "2026-04", "数据质量组", "EV-2026-C004", 0.95)),
      param("compliance", "合规系数", "1.00", "—", src("人工补充材料", "合规评估说明", "2026-04", "合规部", "EV-2026-C005", 1)),
    ],
    intermediate: [
      "重置成本 200 − 功能性贬值 45 = 155",
      "155 − 经济性贬值 35 = 120",
      "120 × 质量系数 0.95 × 合规系数 1.00 = 114",
      "结果 = 114",
    ],
    result: 120,
  };
}

/** 收益法：三年增量净收益 40/50/60 万、折现率 10%、终值 110 万 → 205.4 万 */
function incomeMethod(): MethodResult {
  return {
    method: "income",
    formula: "Σ(预测期各年增量净收益 / (1+折现率)^n) + 终值现值",
    parameters: [
      param("years", "预测年限", "3", "年", src("业务收益预测", "客户标签收益预测", "2027-2029", "市场部", "EV-2026-I001", 3)),
      param("y1", "第 1 年增量净收益", "40.00", "万元", src("业务收益预测", "客户标签收益预测", "2027", "市场部", "EV-2026-I002", 40)),
      param("y2", "第 2 年增量净收益", "50.00", "万元", src("业务收益预测", "客户标签收益预测", "2028", "市场部", "EV-2026-I003", 50)),
      param("y3", "第 3 年增量净收益", "60.00", "万元", src("业务收益预测", "客户标签收益预测", "2029", "市场部", "EV-2026-I004", 60)),
      param("rate", "折现率", "10%", "—", src("财务成本台账", "集团加权平均资本成本", "2026", "财务部", "EV-2026-I005", 0.1)),
      param("tv", "终值", "110.00", "万元", src("业务收益预测", "预测期后终值", "2029", "市场部", "EV-2026-I006", 110)),
    ],
    intermediate: [
      "PV1 = 40 / 1.10 = 36.4",
      "PV2 = 50 / 1.21 = 41.3",
      "PV3 = 60 / 1.331 = 45.1",
      "终值现值 = 110 / 1.331 = 82.6",
      "合计 = 36.4 + 41.3 + 45.1 + 82.6 = 205.4",
    ],
    result: 205.4,
  };
}

/** 市场法：三可比案例调整后 162 / 171 / 175.1，按 0.3/0.4/0.3 加权 → 169.5 */
function marketMethod(): MethodResult {
  return {
    method: "market",
    formula: "Σ(可比价格 × (1 + 差异调整系数)) × 权重",
    parameters: [
      param("m1", "可比案例一价格", "150.00", "万元", src("市场可比案例", "同业标签产品交易案例 A", "2026-04", "评估人员", "EV-2026-M001", 150)),
      param("m1a", "案例一差异调整", "+8%", "—", src("人工补充材料", "规模/质量差异调整说明", "2026-04", "评估人员", "EV-2026-M002", 0.08)),
      param("m2", "可比案例二价格", "180.00", "万元", src("市场可比案例", "同业标签产品交易案例 B", "2026-03", "评估人员", "EV-2026-M003", 180)),
      param("m2a", "案例二差异调整", "-5%", "—", src("人工补充材料", "权利范围差异调整说明", "2026-04", "评估人员", "EV-2026-M004", -0.05)),
      param("m3", "可比案例三价格", "170.00", "万元", src("市场可比案例", "同业标签产品交易案例 C", "2026-02", "评估人员", "EV-2026-M005", 170)),
      param("m3a", "案例三差异调整", "+3%", "—", src("人工补充材料", "时效差异调整说明", "2026-04", "评估人员", "EV-2026-M006", 0.03)),
      param("w", "加权权重", "0.3 / 0.4 / 0.3", "—", src("人工补充材料", "可比案例代表性权重说明", "2026-04", "评估人员", "EV-2026-M007", 0.3)),
    ],
    intermediate: [
      "案例一调整后 = 150 × 1.08 = 162",
      "案例二调整后 = 180 × 0.95 = 171",
      "案例三调整后 = 170 × 1.03 = 175.1",
      "加权 = 162×0.3 + 171×0.4 + 175.1×0.3 = 169.5",
    ],
    result: 169.5,
  };
}

export const defaultEvaluations: Evaluation[] = [
  {
    id: "ev-customer-labels-valid",
    assetId: "asset-customer-labels",
    assetName: "客户标签库",
    basisDate: "2026-05-15",
    effectiveMonths: 12,
    validUntil: "2027-05-14",
    appraiser: "评估人员-孙立",
    status: "已生效",
    methods: [costMethod(), incomeMethod(), marketMethod()],
    weights: [
      { method: "cost", weight: 0.3, basis: "成本数据完整可验证" },
      { method: "income", weight: 0.5, basis: "收益预测经市场部确认" },
      { method: "market", weight: 0.2, basis: "可比案例时效性相对弱" },
    ],
    finalValue: 170.7,
    weightBasis: "收益法权重最高：客户标签主要价值体现于经营收益；市场法时效性较弱故权重最低。",
    adjustNote: "市场法可比案例三（时效差异）进行 +3% 时效调整。",
    snapshot: { assetVersion: 3, ownershipVersion: 3, securityVersion: "L3-敏感 v5", catalogStatus: "正常" },
    createdAt: "2026-05-10 10:00:00",
    updatedAt: "2026-05-15 16:00:00",
  },
  {
    id: "ev-enterprise-info-pending",
    assetId: "asset-enterprise-info",
    assetName: "企业基本信息表",
    basisDate: "2026-08-10",
    effectiveMonths: 12,
    validUntil: "2027-08-09",
    appraiser: "评估人员-孙立",
    status: "待复核",
    methods: [costMethod()],
    weights: [{ method: "cost", weight: 1, basis: "单一方法评估" }],
    finalValue: 80,
    weightBasis: "单一成本法。",
    adjustNote: "无",
    snapshot: { assetVersion: 1, ownershipVersion: 1, securityVersion: "L2-一般 v4", catalogStatus: "正常" },
    createdAt: "2026-08-08 09:00:00",
    updatedAt: "2026-08-10 15:00:00",
  },
  {
    id: "ev-region-sales-expired",
    assetId: "asset-region-sales-report",
    assetName: "区域销售月报",
    basisDate: "2025-05-10",
    effectiveMonths: 12,
    validUntil: "2026-05-09",
    appraiser: "评估人员-孙立",
    status: "已过期",
    methods: [costMethod()],
    weights: [{ method: "cost", weight: 1, basis: "单一方法评估" }],
    finalValue: 120,
    weightBasis: "单一成本法。",
    adjustNote: "无",
    snapshot: { assetVersion: 1, ownershipVersion: 1, securityVersion: "L2-一般 v3", catalogStatus: "正常" },
    createdAt: "2025-04-20 09:00:00",
    updatedAt: "2025-05-10 14:00:00",
  },
  {
    id: "ev-risk-model-valid",
    assetId: "asset-risk-model",
    assetName: "企业风险评分模型",
    basisDate: "2026-06-01",
    effectiveMonths: 12,
    validUntil: "2027-05-31",
    appraiser: "评估人员-孙立",
    status: "已生效",
    methods: [costMethod()],
    weights: [{ method: "cost", weight: 1, basis: "单一方法评估" }],
    finalValue: 120,
    weightBasis: "单一成本法。",
    adjustNote: "无",
    snapshot: { assetVersion: 1, ownershipVersion: 1, securityVersion: "L2-一般 v4", catalogStatus: "正常" },
    createdAt: "2026-05-25 09:00:00",
    updatedAt: "2026-06-01 15:00:00",
  },
];

export const defaultReviews: EvaluationReview[] = [
  {
    id: "rev-001",
    evaluationId: "ev-customer-labels-valid",
    reviewer: "评估复核人-周复审",
    action: "批准",
    opinion: "三方法参数与来源齐全，权重依据合理，批准成为有效估值。",
    at: "2026-05-15 16:00:00",
  },
  {
    id: "rev-002",
    evaluationId: "ev-risk-model-valid",
    reviewer: "评估复核人-周复审",
    action: "批准",
    opinion: "成本法依据充分，批准。",
    at: "2026-06-01 15:00:00",
  },
];
