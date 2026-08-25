import type {
  AgentEvidence,
  AgentKey,
  AgentObjectRef,
  AgentTask,
  AgentWorkspaceData,
  DataAgentState,
} from "./types";

const sharedRefs: AgentObjectRef[] = [
  { id: "asset-customer-360", type: "数据资产", label: "客户主数据宽表", route: "/data-asset/catalog" },
  { id: "asset-order-detail", type: "数据资产", label: "订单明细事实表", route: "/data-asset/catalog" },
  { id: "metric-repurchase-rate", type: "指标", label: "客户复购率 v3", route: "/data-standard/metric-dictionary" },
  { id: "sql-repurchase-daily", type: "开发产物", label: "每日复购率 SQL v1.3", route: "/data-development/sql" },
  { id: "scheduler-repurchase", type: "调度任务", label: "每日客户复购率任务", route: "/scheduler/monitor" },
];

const sharedEvidence: AgentEvidence[] = [
  { id: "ev-metric-v3", label: "指标口径 v3", source: "企业指标字典", confidence: 0.98, status: "valid" },
  { id: "ev-quality-0824", label: "订单表质量快照 2026-08-24", source: "数据质量", confidence: 0.94, status: "valid" },
  { id: "ev-run-9841", label: "运行批次 RUN-9841", source: "调度监控", confidence: 0.91, status: "review" },
];

const sharedWorkspace: AgentWorkspaceData = {
  intent: {
    category: "跨域指标建设与运行保障",
    entities: ["客户复购率", "订单", "华东区域", "每日调度"],
    constraints: ["使用已批准指标口径", "敏感字段脱敏", "每日 08:30 前产出"],
    routeReason: "需求同时包含数据选择、指标解释、开发产物、治理检查和运行保障，需要五个领域 Agent 协作。",
  },
  candidates: [
    {
      id: "asset-order-detail",
      name: "订单明细事实表",
      type: "湖表",
      domain: "交易域",
      match: 96,
      quality: 94,
      freshness: "T+1 · 06:20",
      security: "敏感一般数据",
      access: "可申请",
      owner: "交易数据组",
      reason: "包含客户、订单完成时间、实付金额和区域字段，与复购率 v3 口径直接匹配。",
    },
    {
      id: "asset-customer-360",
      name: "客户主数据宽表",
      type: "湖表",
      domain: "客户域",
      match: 89,
      quality: 97,
      freshness: "T+1 · 05:50",
      security: "敏感一般数据",
      access: "已授权",
      owner: "客户数据组",
      reason: "提供客户统一 ID 和区域归属，需要与订单明细关联后计算。",
    },
    {
      id: "asset-order-summary",
      name: "门店订单日汇总",
      type: "数据集",
      domain: "经营分析域",
      match: 71,
      quality: 91,
      freshness: "T+1 · 07:10",
      security: "一般数据",
      access: "已授权",
      owner: "经营分析组",
      reason: "已有区域汇总但缺少客户粒度，适合交叉验证，不适合作为复购率主来源。",
    },
  ],
  recommendedCandidateId: "asset-order-detail",
  answer: {
    headline: "华东区复购率下降 3.8 个百分点，主要由新客占比上升与两家门店订单延迟共同造成。",
    narrative: "按企业指标字典 v3 口径，华东区本月复购率为 31.6%。剔除延迟入湖门店后为 33.1%，仍低于上月，说明数据延迟只解释了约 39% 的降幅。",
    metrics: [
      { label: "本月复购率", value: "31.6%", delta: "-3.8pp", tone: "red" },
      { label: "复购客户", value: "84,219", delta: "-5.2%", tone: "amber" },
      { label: "新客占比", value: "42.7%", delta: "+6.4pp", tone: "blue" },
    ],
    chart: [
      { label: "3月", value: 36.1, compare: 35.2 },
      { label: "4月", value: 35.4, compare: 35.0 },
      { label: "5月", value: 34.9, compare: 34.6 },
      { label: "6月", value: 35.8, compare: 34.9 },
      { label: "7月", value: 35.4, compare: 34.5 },
      { label: "8月", value: 31.6, compare: 34.1 },
    ],
    definition: "统计期内购买次数 ≥ 2 的去重客户数 ÷ 统计期内完成订单的去重客户数；取消、退款订单不进入分母。",
    sqlSummary: "使用 customer_id 去重，按 paid_at 归属统计期，并关联 region_code 的生效版本。",
  },
  development: {
    artifactType: "SQL",
    sourceVersion: "草稿 v1.2",
    targetVersion: "候选 v1.3",
    code: `WITH valid_orders AS (\n  SELECT customer_id, region_code, DATE(paid_at) AS paid_date\n  FROM dwd_order_detail\n  WHERE order_status = 'COMPLETED'\n    AND refund_flag = 0\n), customer_orders AS (\n  SELECT region_code, customer_id, COUNT(*) AS order_count\n  FROM valid_orders\n  WHERE paid_date BETWEEN :start_date AND :end_date\n  GROUP BY region_code, customer_id\n)\nSELECT region_code,\n  SUM(CASE WHEN order_count >= 2 THEN 1 ELSE 0 END) * 1.0 / COUNT(*) AS repurchase_rate\nFROM customer_orders\nGROUP BY region_code;`,
    diff: ["+ 使用批准口径 v3：退款订单不进入分母", "+ 绑定 region_code 参考数据版本 RD-REGION-12", "+ 增加空 customer_id 质量拦截", "~ 统计时间从 created_at 调整为 paid_at"],
    validations: [
      { label: "SQL 语法", status: "passed", detail: "SQLite mock 方言校验通过" },
      { label: "指标口径", status: "passed", detail: "与 metric-repurchase-rate v3 一致" },
      { label: "敏感字段", status: "warning", detail: "customer_id 仅用于聚合，结果禁止明细输出" },
      { label: "预估扫描", status: "passed", detail: "分区裁剪命中 31 天" },
    ],
    previewRows: [
      { region_code: "EAST", repurchase_rate: "31.6%", customer_count: "266,516" },
      { region_code: "NORTH", repurchase_rate: "34.1%", customer_count: "198,204" },
      { region_code: "SOUTH", repurchase_rate: "33.7%", customer_count: "223,810" },
    ],
  },
  governance: {
    scope: ["指标口径 v3", "订单明细 18 个字段", "客户主数据 9 个字段", "两条质量规则", "一项脱敏策略"],
    findings: [
      { id: "GOV-231", category: "标准", title: "两处旧脚本仍使用 created_at 统计", severity: "高", object: "复购率指标实现", owner: "经营分析组", status: "待确认", impact: "影响 3 张经营报表和 1 个数据服务", recommendation: "统一迁移到 paid_at 并绑定指标口径 v3" },
      { id: "GOV-232", category: "质量", title: "华东两家门店订单延迟入湖", severity: "中", object: "订单明细事实表", owner: "交易数据组", status: "整改中", impact: "约占华东订单 4.2%", recommendation: "补跑分区并增加 07:30 新鲜度拦截" },
      { id: "GOV-233", category: "安全", title: "客户 ID 需要聚合后输出", severity: "中", object: "复购率查询结果", owner: "数据安全组", status: "已识别", impact: "明细输出可能扩大使用范围", recommendation: "注入聚合约束并禁止 customer_id 出现在结果列" },
    ],
    impactObjects: [
      { id: "report-customer-weekly", label: "客户经营周报", relation: "消费指标" },
      { id: "service-customer-insight", label: "客户洞察 API", relation: "调用 SQL v1.2" },
      { id: "dashboard-east-region", label: "华东区域看板", relation: "展示复购率" },
    ],
  },
  operations: {
    nodes: [
      { id: "src-order", label: "订单库 CDC", status: "healthy", type: "数据源" },
      { id: "dwd-order", label: "订单明细入湖", status: "warning", type: "同步" },
      { id: "sql-repurchase", label: "复购率 SQL v1.3", status: "failed", type: "开发任务" },
      { id: "metric-snapshot", label: "指标日快照", status: "warning", type: "输出" },
      { id: "customer-report", label: "客户经营周报", status: "warning", type: "下游" },
    ],
    events: [
      { time: "06:02", status: "success", title: "订单库 CDC 完成", detail: "读取 1,284,092 条变更记录" },
      { time: "06:18", status: "warning", title: "两家门店分区延迟", detail: "E3102、E3118 未到达水位线" },
      { time: "06:31", status: "failed", title: "复购率 SQL 质量门禁失败", detail: "华东 customer_id 空值率 1.8%，阈值 1%" },
      { time: "06:34", status: "running", title: "Data Agent 完成影响分析", detail: "识别 3 个下游对象，未执行自动重试" },
    ],
    rootCauses: [
      { label: "门店分区延迟导致客户 ID 映射缺失", probability: 86, evidence: "E3102、E3118 水位线延迟与空值集中分布一致", action: "补跑两个门店分区后重试" },
      { label: "客户主数据映射版本不一致", probability: 42, evidence: "其中 0.3% 空值来自已失效映射", action: "回交数据开发 Agent 更新映射版本" },
      { label: "质量阈值设置过严", probability: 18, evidence: "历史基线空值率为 0.4%，本次异常显著", action: "不建议调整阈值" },
    ],
  },
};

function makeTask(
  id: string,
  primaryAgent: AgentKey,
  title: string,
  summary: string,
  overrides: Partial<AgentTask> = {},
): AgentTask {
  return {
    id,
    caseId: `case-${id.toLowerCase()}`,
    title,
    prompt: title,
    summary,
    primaryAgent,
    participantAgents: [primaryAgent],
    status: "completed",
    progress: 100,
    currentStep: "任务结果已生成",
    steps: [
      { id: `${id}-s1`, agent: primaryAgent, label: "解析任务上下文", detail: "读取稳定对象引用与演示约束", status: "completed" },
      { id: `${id}-s2`, agent: primaryAgent, label: "生成专业结果", detail: "完成 mock 分析并保留证据", status: "completed" },
    ],
    contextRefs: sharedRefs.slice(0, 2),
    evidence: sharedEvidence.slice(0, 2),
    artifacts: [],
    workspace: sharedWorkspace,
    updatedAt: "2026-08-25 10:20",
    createdAt: "2026-08-25 09:30",
    ...overrides,
  };
}

export const fixtureTasks: AgentTask[] = [
  makeTask("DAT-1001", "general", "建立每日客户复购率指标并保证稳定运行", "五个领域 Agent 已完成数据选择、口径核对和开发预览，等待确认创建 SQL 草稿并配置运行保障。", {
    participantAgents: ["general", "discovery", "qa", "development", "governance", "operations"],
    status: "needs-confirmation",
    progress: 72,
    currentStep: "等待确认创建开发草稿",
    steps: [
      { id: "DAT-1001-s1", agent: "general", label: "理解需求并拆解任务", detail: "识别为跨域指标建设与运行保障", status: "completed" },
      { id: "DAT-1001-s2", agent: "discovery", label: "发现可信数据资产", detail: "比较 3 个候选，推荐订单明细与客户主数据", status: "completed", outputRef: "artifact-assets-1001" },
      { id: "DAT-1001-s3", agent: "governance", label: "检查口径与治理约束", detail: "发现 3 项治理问题，其中 1 项高风险", status: "completed", outputRef: "artifact-governance-1001" },
      { id: "DAT-1001-s4", agent: "development", label: "生成复购率 SQL 候选", detail: "SQL v1.3 已通过语法和口径校验", status: "needs-confirmation", outputRef: "artifact-sql-1001" },
      { id: "DAT-1001-s5", agent: "operations", label: "配置运行保障", detail: "等待开发版本确认后生成调度与恢复 Runbook", status: "waiting" },
      { id: "DAT-1001-s6", agent: "qa", label: "验证指标回答", detail: "将使用预览结果复核华东区域结论", status: "waiting" },
    ],
    contextRefs: sharedRefs,
    evidence: sharedEvidence,
    artifacts: [
      { id: "artifact-assets-1001", type: "asset-set", label: "复购率可信数据组合", summary: "订单明细 + 客户主数据 + 区域参考数据", status: "ready" },
      { id: "artifact-governance-1001", type: "governance-plan", label: "复购率治理检查", summary: "3 项发现，需先处理旧时间字段口径", status: "ready", route: "/data-governance/quality/issues" },
      { id: "artifact-sql-1001", type: "sql", label: "每日复购率 SQL v1.3", summary: "语法与口径通过，敏感字段约束待确认", status: "draft", route: "/data-development/sql" },
    ],
    pendingAction: {
      id: "confirm-sql-draft",
      label: "确认创建 SQL 草稿",
      description: "将在数据开发工作台创建候选 v1.3，不发布、不调度。",
      preview: ["新增 SQL 草稿 sql-repurchase-daily-v1.3", "引用指标口径 metric-repurchase-rate v3", "注入 customer_id 禁止明细输出约束"],
      risk: "medium",
    },
    workspace: sharedWorkspace,
  }),
  makeTask("DAT-G-002", "general", "评估门店画像数据是否可以用于精准营销", "已路由数据发现和数据治理 Agent，结论为可用于分群，但需要补充授权目的和两项字段脱敏。", {
    participantAgents: ["general", "discovery", "governance"],
    status: "completed",
    artifacts: [{ id: "artifact-g-002", type: "governance-plan", label: "门店画像使用评估", summary: "有条件可用 · 2 项保护要求", status: "approved" }],
  }),
  makeTask("DAT-G-003", "general", "分析华东销售下降并给出数据修复计划", "已路由问答、治理与运维 Agent；订单延迟解释部分降幅，建议补跑分区后重新计算。", {
    participantAgents: ["general", "qa", "governance", "operations"],
    status: "running",
    progress: 64,
    currentStep: "运维 Agent 正在生成恢复 Runbook",
  }),
  makeTask("DAT-DIS-002", "discovery", "查找供应商风险画像数据", "比较四项内外部资产，推荐供应商主数据与履约异常数据组合。", {
    workspace: {
      ...sharedWorkspace,
      candidates: sharedWorkspace.candidates?.map((candidate, index) => ({ ...candidate, id: `supplier-${index + 1}`, name: ["供应商主数据", "供应商履约异常明细", "外部工商风险快照"][index], domain: "供应链域", match: [95, 91, 78][index] })),
      recommendedCandidateId: "supplier-1",
    },
  }),
  makeTask("DAT-DIS-003", "discovery", "寻找客户流失预测可用数据", "已发现客户行为、服务工单与会员等级三类资产；服务工单授权仍待申请。", {
    status: "needs-confirmation",
    progress: 78,
    currentStep: "等待确认发起服务工单资产授权",
    pendingAction: { id: "access-churn", label: "确认发起资产授权", description: "申请只读、脱敏、30 天有效的工单特征访问。", preview: ["对象：客户服务工单特征集", "目的：客户流失预测特征评估", "有效期：30 天"], risk: "controlled" },
  }),
  makeTask("DAT-QA-002", "qa", "为什么本月 GMV 增长但利润率下降", "促销折扣扩大和低毛利品类占比上升贡献了 73% 的利润率下降。", {
    artifacts: [{ id: "answer-gmv-margin", type: "answer", label: "GMV 与利润率归因", summary: "两项主要驱动因素，证据完整", status: "ready" }],
  }),
  makeTask("DAT-QA-003", "qa", "本月 VIP 活跃率是多少", "VIP 活跃率为 68.4%，环比上升 2.1 个百分点；华南区域贡献最大。", {
    artifacts: [{ id: "answer-vip", type: "chart", label: "VIP 活跃趋势", summary: "6 个月趋势与区域对比", status: "ready" }],
  }),
  makeTask("DAT-DEV-002", "development", "把库存同步改为增量处理", "已生成基于 update_time 水位线的增量 SQL 和幂等合并方案，等待创建 ETL 草稿。", {
    status: "needs-confirmation",
    progress: 82,
    currentStep: "等待确认创建 ETL 草稿",
    pendingAction: { id: "create-inventory-etl", label: "确认创建 ETL 草稿", description: "创建增量读取、去重和 MERGE 三节点草稿。", preview: ["读取水位线 update_time", "按 sku_id + warehouse_id 去重", "失败时不推进检查点"], risk: "medium" },
    workspace: { ...sharedWorkspace, development: { ...sharedWorkspace.development!, artifactType: "ETL", sourceVersion: "全量 v2.0", targetVersion: "增量候选 v2.1" } },
  }),
  makeTask("DAT-DEV-003", "development", "为客户标签构建每日 ETL", "已生成四节点 ETL，字段映射校验通过，资源估算需要运维确认。", {
    participantAgents: ["development", "operations"],
    status: "running",
    progress: 66,
    currentStep: "等待数据运维 Agent 完成资源评估",
    workspace: { ...sharedWorkspace, development: { ...sharedWorkspace.development!, artifactType: "ETL", sourceVersion: "新建", targetVersion: "候选 v1.0" } },
  }),
  makeTask("DAT-GOV-002", "governance", "识别手机号字段治理问题", "发现三套格式、两项未落标字段和一条过期脱敏策略，已生成整改候选。", {
    status: "needs-confirmation",
    progress: 74,
    currentStep: "等待确认创建整改问题",
    pendingAction: { id: "create-phone-issues", label: "确认创建治理整改候选", description: "只创建待确认问题，不自动发布标准或关闭问题。", preview: ["创建 2 个落标整改问题", "创建 1 个脱敏策略复审事项", "责任人来自元数据认责字段"], risk: "controlled" },
  }),
  makeTask("DAT-GOV-003", "governance", "比对跨部门复购率指标口径", "识别一个批准变体和两个未受控冲突，影响三张报表。", {
    artifacts: [{ id: "metric-conflict-plan", type: "governance-plan", label: "复购率口径冲突清单", summary: "2 个冲突 · 1 个受控变体", status: "ready" }],
  }),
  makeTask("DAT-OPS-002", "operations", "诊断客户标签任务连续失败", "根因指向上游客户主数据 Schema 变更，已建议回交数据开发 Agent 生成兼容版本。", {
    participantAgents: ["operations", "development"],
    status: "blocked",
    progress: 58,
    currentStep: "等待数据开发 Agent 修复字段映射",
  }),
  makeTask("DAT-OPS-003", "operations", "定位会员查询服务延迟", "缓存命中率下降与下游查询扫描扩大共同导致 P95 延迟升至 1.8 秒。", {
    status: "needs-confirmation",
    progress: 84,
    currentStep: "等待确认执行限流与缓存预热",
    pendingAction: { id: "service-recovery", label: "确认执行低风险恢复动作", description: "先执行缓存预热并把非核心调用限流 10 分钟。", preview: ["缓存预热：会员画像热点键", "非核心调用限流至 60%", "10 分钟后自动恢复并复测 P95"], risk: "medium" },
  }),
];

export function createInitialDataAgentState(): DataAgentState {
  return {
    tasks: JSON.parse(JSON.stringify(fixtureTasks)) as AgentTask[],
    auditTrail: [
      { id: "audit-seed-1", taskId: "DAT-1001", action: "生成跨域计划", actor: "通用 Agent", at: "2026-08-25 10:18", result: "已路由五个领域 Agent" },
    ],
  };
}
