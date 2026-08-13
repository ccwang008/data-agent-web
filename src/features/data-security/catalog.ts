import type {
  SecurityDomain,
  SecurityDomainState,
  SecurityFieldValue,
  SecurityPageConfig,
  SecurityPageKey,
  SecurityRecord,
} from "./types";

export const SECURITY_SCOPES: Record<SecurityDomain, string> = {
  overview: "data-agent.data-security.overview",
  compliance: "data-agent.data-security.compliance",
  classification: "data-agent.data-security.classification",
  protection: "data-agent.data-security.protection",
  audit: "data-agent.data-security.audit",
  incidents: "data-agent.data-security.incidents",
};

type Seed = {
  name: string;
  summary: string;
  status: string;
  owner: string;
  fields: Record<string, SecurityFieldValue>;
  risk?: SecurityRecord["risk"];
  evidenceState?: SecurityRecord["evidenceState"];
};

function seeds(prefix: string, values: Seed[]): SecurityRecord[] {
  return values.map((value, index) => ({
    id: `${prefix}-${String(index + 1).padStart(3, "0")}`,
    name: value.name,
    summary: value.summary,
    status: value.status,
    owner: value.owner,
    updatedAt: index === 0 ? "2026-08-13 09:20" : "2026-08-12 16:40",
    version: 1,
    risk: value.risk ?? "中",
    evidenceState: value.evidenceState ?? "有效",
    evidenceRefs: [`EV-${prefix.toUpperCase()}-${String(index + 1).padStart(3, "0")}`],
    fields: value.fields,
    mock: true,
  }));
}

function page(
  config: Omit<SecurityPageConfig, "variant" | "runningStatus" | "completedStatus"> &
    Partial<Pick<SecurityPageConfig, "variant" | "runningStatus" | "completedStatus">>,
): SecurityPageConfig {
  return {
    variant: "general",
    runningStatus: "执行中",
    completedStatus: "已完成",
    ...config,
  };
}

export const SECURITY_PAGE_CONFIGS: Record<Exclude<SecurityPageKey, "overview">, SecurityPageConfig> = {
  compliance: page({
    key: "compliance", domain: "compliance", eyebrow: "Security / Compliance", title: "合规清单",
    description: "维护中国大陆优先的规则包、适用性、控制项与证据映射；结论用于内部就绪度，不替代法律意见。",
    createLabel: "新建清单", runLabel: "执行检查", columns: [{ key: "适用范围", label: "适用范围" }, { key: "控制项", label: "控制项" }],
    seedRecords: seeds("cmp", [
      { name: "DCMM4 数据安全控制清单", summary: "覆盖安全制度、保护、审计与事件记录的举证准备。", status: "待完善", owner: "刘妍", fields: { 适用范围: "全域数据资产", 控制项: "28 项", 证据覆盖率: "76%", 规则版本: "GB/T 36073-2025" } },
      { name: "个人信息处理合规清单", summary: "核查处理目的、最小必要、授权与接收方记录。", status: "已完成", owner: "赵宁", fields: { 适用范围: "客户与员工域", 控制项: "18 项", 证据覆盖率: "91%", 规则版本: "CN-PI-v3" }, risk: "低" },
    ]),
  }),
  "compliance-reviews": page({
    key: "compliance-reviews", domain: "compliance", eyebrow: "Security / Compliance Review", title: "合规审查",
    description: "以检查清单记录审查事实、风险、建议和整改证据，保留每次复核版本。",
    createLabel: "发起审查", runLabel: "提交复核", completedStatus: "待复核", columns: [{ key: "审查范围", label: "审查范围" }, { key: "问题数", label: "问题数" }],
    seedRecords: seeds("review", [
      { name: "营销数据使用季度审查", summary: "检查人群圈选、导出、授权期限与使用目的。", status: "整改中", owner: "周凯", fields: { 审查范围: "营销分析场景", 问题数: "3 项", 建议: "收紧导出授权期限", 截止日期: "2026-08-20" }, risk: "高", evidenceState: "待核验" },
      { name: "供应商数据交换审查", summary: "核对共享范围、接收方和删除证明。", status: "已完成", owner: "刘妍", fields: { 审查范围: "2 家供应商", 问题数: "0 项", 建议: "保持季度复核", 截止日期: "—" }, risk: "低" },
    ]),
  }),
  "personal-information": page({
    key: "personal-information", domain: "compliance", eyebrow: "Security / Personal Information", title: "个人信息处理活动",
    description: "登记处理目的、依据、影响评估、接收方与证据引用，仅保存脱敏元数据。",
    createLabel: "登记处理活动", runLabel: "复核活动", completedStatus: "已复核", columns: [{ key: "处理目的", label: "处理目的" }, { key: "影响评估", label: "影响评估" }],
    seedRecords: seeds("pi", [
      { name: "客户实名认证", summary: "使用证件类型、脱敏证件号与验证结果完成身份核验。", status: "生效", owner: "王雪", fields: { 处理目的: "身份核验", 影响评估: "已完成", 处理依据: "履行合同", 接收方: "认证服务商 A（mock）" }, risk: "中" },
      { name: "客户关怀回访", summary: "按服务记录生成待回访名单，授权到期后自动失效。", status: "待复核", owner: "陈晨", fields: { 处理目的: "服务改进", 影响评估: "待补充", 处理依据: "单独同意（mock）", 接收方: "内部客服" }, risk: "高", evidenceState: "缺失" },
    ]),
  }),
  "important-data": page({
    key: "important-data", domain: "compliance", eyebrow: "Security / Important Data", title: "重要数据候选",
    description: "管理重要/核心数据候选、依据与双人批准；AI 识别只形成候选，不能自动生效。",
    createLabel: "登记候选", runLabel: "提交双人审批", completedStatus: "待安全负责人审批", columns: [{ key: "建议等级", label: "建议等级" }, { key: "审批进度", label: "审批进度" }],
    seedRecords: seeds("important", [
      { name: "企业风险评分特征集", summary: "聚合企业经营与风险特征，需结合目录与场景人工确认。", status: "待数据负责人确认", owner: "周凯", fields: { 建议等级: "重要数据候选", 审批进度: "0 / 2", 识别依据: "目录规则 + 场景组合", 申报记录: "待确认" }, risk: "严重", evidenceState: "待核验" },
      { name: "区域交易运行统计", summary: "统计粒度和覆盖范围可能触发更高保护要求。", status: "待安全负责人审批", owner: "张敏", fields: { 建议等级: "重要数据候选", 审批进度: "1 / 2", 识别依据: "规模规则命中", 申报记录: "内部登记中" }, risk: "高" },
    ]),
  }),
  "cross-border": page({
    key: "cross-border", domain: "compliance", eyebrow: "Security / Cross-border", title: "数据出境评估",
    description: "记录传输场景、关键事实、路径建议、材料缺口与内部审批；系统不输出“监管批准”结论。",
    createLabel: "新建评估", runLabel: "生成路径建议", completedStatus: "待法务与安全复核", variant: "cross-border",
    columns: [{ key: "接收地", label: "接收地" }, { key: "建议路径", label: "建议路径" }],
    seedRecords: seeds("cross", [
      { name: "海外客服工单支持", summary: "向新加坡区域支持团队提供脱敏工单字段。", status: "待补充材料", owner: "刘妍", fields: { 接收地: "新加坡", 建议路径: "标准合同或认证（建议）", 个人信息规模: "8.2 万人/年", 材料缺口: "接收方再转移说明", 命中规则: "CN-CB-v2 / R-14" }, risk: "高", evidenceState: "缺失" },
      { name: "境外会议联系人同步", summary: "临时同步参会联系人，关键事实仍不完整。", status: "信息不足", owner: "陈晨", fields: { 接收地: "德国", 建议路径: "信息不足", 个人信息规模: "未知", 材料缺口: "敏感个人信息数量、保存期限", 命中规则: "待评估" }, risk: "中", evidenceState: "待核验" },
    ]),
  }),
  classification: page({
    key: "classification", domain: "classification", eyebrow: "Security / Classification", title: "分类分级识别任务",
    description: "基于语义与确定性规则识别 PII、重要数据候选和敏感商业数据，形成可追溯发现。",
    createLabel: "新建识别任务", runLabel: "执行识别", completedStatus: "识别成功", variant: "classification",
    columns: [{ key: "分类标签", label: "分类标签" }, { key: "监管等级", label: "监管等级" }],
    seedRecords: seeds("class", [
      { name: "客户域敏感字段识别", summary: "扫描元数据、字段注释和脱敏样例，不保存真实字段值。", status: "识别成功", owner: "王雪", fields: { 分类标签: ["个人信息", "敏感个人信息"], 监管等级: "一般敏感", 置信度: "96%", 覆盖范围: "12 张表 / 86 字段", 规则版本: "CLS-v2.3" }, risk: "中" },
      { name: "风险域重要数据识别", summary: "对风险评分特征及关联场景形成重要数据候选。", status: "待复核", owner: "周凯", fields: { 分类标签: ["经营数据", "商业秘密"], 监管等级: "重要数据候选", 置信度: "88%", 覆盖范围: "3 个模型 / 41 字段", 规则版本: "CLS-v2.3" }, risk: "严重", evidenceState: "待核验" },
    ]),
  }),
  "classification-reviews": page({
    key: "classification-reviews", domain: "classification", eyebrow: "Security / Classification Review", title: "分类复核审批",
    description: "集中处理低置信度、规则冲突、抽样项及重要/核心数据候选。",
    createLabel: "创建抽样复核", runLabel: "提交审批", completedStatus: "待安全负责人审批", variant: "classification",
    columns: [{ key: "冲突原因", label: "冲突原因" }, { key: "审批进度", label: "审批进度" }],
    seedRecords: seeds("class-review", [
      { name: "交易备注字段冲突项", summary: "语义模型判定个人信息，目录规则判定经营数据。", status: "待数据负责人确认", owner: "张敏", fields: { 冲突原因: "模型与目录规则不一致", 审批进度: "0 / 2", 分类标签: ["个人信息", "经营数据"], 监管等级: "一般敏感" }, risk: "高", evidenceState: "待核验" },
      { name: "研发配方字段抽样", summary: "高置信度自动识别结果的季度抽样复核。", status: "已复核", owner: "赵宁", fields: { 冲突原因: "无，抽样复核", 审批进度: "已完成", 分类标签: ["研发数据", "商业秘密"], 监管等级: "一般敏感" }, risk: "中" },
    ]),
  }),
  "classification-rules": page({
    key: "classification-rules", domain: "classification", eyebrow: "Security / Classification Rules", title: "分类分级规则",
    description: "版本化管理分类目录、等级聚合、识别模型与确定性规则依据。",
    createLabel: "新建规则版本", runLabel: "发布规则", completedStatus: "已发布", columns: [{ key: "规则类型", label: "规则类型" }, { key: "规则版本", label: "规则版本" }],
    seedRecords: seeds("class-rule", [
      { name: "个人信息语义识别规则", summary: "字段名、注释、血缘场景与词典组合匹配。", status: "已发布", owner: "王雪", fields: { 规则类型: "语义 + 确定性", 规则版本: "CLS-v2.3", 阈值: "高置信 0.92（版本配置）", 生效日期: "2026-08-01" }, risk: "低", evidenceState: "已固化" },
      { name: "资产等级向上聚合规则", summary: "取最高等级，并按规模、精度、关联性只建议升级。", status: "草稿", owner: "周凯", fields: { 规则类型: "等级聚合", 规则版本: "AGG-v1.1-draft", 阈值: "按场景配置", 生效日期: "未生效" }, risk: "中" },
    ]),
  }),
  "classification-reports": page({
    key: "classification-reports", domain: "classification", eyebrow: "Security / Classification Reports", title: "分类分级报告",
    description: "固化范围、规则版本、覆盖率、差异、影响引用和审批记录。",
    createLabel: "新建报告", runLabel: "生成报告草稿", completedStatus: "待复核", variant: "classification",
    columns: [{ key: "覆盖率", label: "覆盖率" }, { key: "版本差异", label: "版本差异" }],
    seedRecords: seeds("class-report", [
      { name: "2026 Q3 客户域分类报告", summary: "包含 12 张表、86 个字段的识别与复核结论。", status: "待复核", owner: "王雪", fields: { 覆盖率: "92.4%", 版本差异: "+6 字段 / 1 级别上调", 排除项: "2 个失效视图", 规则版本: "CLS-v2.3" }, risk: "中", evidenceState: "待核验" },
      { name: "2026 Q2 风险域分类报告", summary: "已冻结审批版本，仅允许补充说明形成新版本。", status: "已批准", owner: "周凯", fields: { 覆盖率: "100%", 版本差异: "无", 排除项: "无", 规则版本: "CLS-v2.1" }, risk: "低", evidenceState: "已固化" },
    ]),
  }),
  protection: page({
    key: "protection", domain: "protection", eyebrow: "Security / Protection", title: "安全防护策略",
    description: "把分类等级映射为访问、脱敏、加密、水印和监控控制基线，跟踪例外与覆盖率。",
    createLabel: "新建基线", runLabel: "应用基线", completedStatus: "生效", columns: [{ key: "适用等级", label: "适用等级" }, { key: "覆盖率", label: "覆盖率" }],
    seedRecords: seeds("protect", [
      { name: "一般敏感数据保护基线", summary: "最小权限、动态脱敏、传输加密和全量访问审计。", status: "生效", owner: "王雪", fields: { 适用等级: "一般敏感", 覆盖率: "89%", 控制项: "访问 / 脱敏 / 加密 / 审计", 例外数: "2" }, risk: "中" },
      { name: "重要数据候选临时基线", summary: "候选确认期间先按增强控制执行。", status: "审批中", owner: "周凯", fields: { 适用等级: "重要数据候选", 覆盖率: "72%", 控制项: "双人审批 / 水印 / 加密 / 监控", 例外数: "1" }, risk: "高" },
    ]),
  }),
  "access-control": page({
    key: "access-control", domain: "protection", eyebrow: "Security / Access", title: "访问控制",
    description: "按主体、对象、目的、期限和配额维护授权，并提供确定性模拟校验。",
    createLabel: "新建访问策略", runLabel: "模拟校验", completedStatus: "校验通过", columns: [{ key: "授权主体", label: "授权主体" }, { key: "有效期限", label: "有效期限" }],
    seedRecords: seeds("access", [
      { name: "客服受控查询客户信息", summary: "仅允许按工单目的查询脱敏视图，限制日配额。", status: "生效", owner: "陈晨", fields: { 授权主体: "客服专员角色", 有效期限: "2026-12-31", 使用目的: "客户服务", 配额: "50 次/日" }, risk: "中" },
      { name: "外部研究数据集下载", summary: "按项目授权，下载前需复核水印与脱敏状态。", status: "待审批", owner: "张敏", fields: { 授权主体: "研究合作方（mock）", 有效期限: "30 天", 使用目的: "联合研究", 配额: "2 次" }, risk: "高", evidenceState: "待核验" },
    ]),
  }),
  masking: page({
    key: "masking", domain: "protection", eyebrow: "Security / Masking", title: "脱敏管理",
    description: "独立管理静态/动态脱敏规则、样例预览、模拟执行和例外，不混入加密配置。",
    createLabel: "新建脱敏策略", runLabel: "应用脱敏", completedStatus: "生效", variant: "masking",
    columns: [{ key: "脱敏方式", label: "脱敏方式" }, { key: "适用范围", label: "适用范围" }],
    seedRecords: seeds("mask", [
      { name: "证件号码动态遮盖", summary: "仅显示前 3 后 4 位，原始值不进入页面或 SQLite。", status: "生效", owner: "王雪", fields: { 脱敏方式: "动态遮盖", 适用范围: "客服与分析视图", 脱敏样例: "110***********1234", 覆盖字段: "12" }, risk: "中" },
      { name: "交易金额区间泛化", summary: "外部研究数据集导出时按金额区间泛化。", status: "审批中", owner: "张敏", fields: { 脱敏方式: "静态泛化", 适用范围: "研究数据集", 脱敏样例: "¥50,000–100,000", 覆盖字段: "3" }, risk: "高" },
    ]),
  }),
  encryption: page({
    key: "encryption", domain: "protection", eyebrow: "Security / Encryption", title: "加密管理",
    description: "独立管理传输、存储和字段级加密策略，只保存脱敏密钥引用和轮换证据。",
    createLabel: "新建加密策略", runLabel: "校验加密配置", completedStatus: "校验通过", variant: "encryption",
    columns: [{ key: "加密层", label: "加密层" }, { key: "算法", label: "算法" }],
    seedRecords: seeds("enc", [
      { name: "客户敏感字段加密", summary: "字段级加密配置，密钥材料不进入原型。", status: "生效", owner: "王雪", fields: { 加密层: "字段级", 算法: "SM4（mock）", 密钥引用: "key://kms/mock/customer-***", 轮换状态: "正常" }, risk: "中" },
      { name: "数据交换文件包加密", summary: "受控交换下载包使用独立密钥引用。", status: "轮换预警", owner: "刘妍", fields: { 加密层: "存储 / 文件", 算法: "AES-256（mock）", 密钥引用: "key://kms/mock/exchange-***", 轮换状态: "7 天内到期" }, risk: "高" },
    ]),
  }),
  watermark: page({
    key: "watermark", domain: "protection", eyebrow: "Security / Watermark", title: "数据水印",
    description: "管理显式与隐式追踪水印，模拟嵌入、验证和事件追踪，记录用户、授权、目的、时间与追踪号。",
    createLabel: "新建水印策略", runLabel: "模拟嵌入并验证", completedStatus: "验证成功", variant: "watermark",
    columns: [{ key: "水印模式", label: "水印模式" }, { key: "追踪字段", label: "追踪字段" }],
    seedRecords: seeds("wm", [
      { name: "报表导出显式水印", summary: "导出页眉展示操作人、授权编号和导出时间。", status: "生效", owner: "赵宁", fields: { 水印模式: "显式", 追踪字段: ["用户", "授权", "时间", "trace_id"], 水印模板: "{user} · {authorization} · {time}", 最近追踪号: "WM-26Q3-8F2A" }, risk: "中" },
      { name: "研究数据集隐式追踪", summary: "模拟嵌入不可见追踪标识，用于事件线索关联。", status: "待审批", owner: "张敏", fields: { 水印模式: "隐式追踪", 追踪字段: ["授权", "目的", "trace_id"], 水印模板: "invisible:{trace_id}", 最近追踪号: "未生成" }, risk: "高" },
    ]),
  }),
  risk: page({
    key: "risk", domain: "protection", eyebrow: "Security / Risk", title: "安全监控与风险",
    description: "汇总安全信号、监控规则、风险清单、处置状态与评估证据。",
    createLabel: "登记风险", runLabel: "重新评估", completedStatus: "已评估", columns: [{ key: "风险等级", label: "风险等级" }, { key: "处置期限", label: "处置期限" }],
    seedRecords: seeds("risk", [
      { name: "加密密钥轮换临期", summary: "交换文件包密钥引用将在 7 天内到期。", status: "整改中", owner: "刘妍", fields: { 风险等级: "高", 处置期限: "2026-08-19", 信号来源: "加密策略检查", 处置建议: "生成新密钥引用并保留轮换证据" }, risk: "高" },
      { name: "数据导出量异常", summary: "研究账号导出量超过近 30 日基线。", status: "研判中", owner: "周凯", fields: { 风险等级: "中", 处置期限: "2026-08-15", 信号来源: "访问审计", 处置建议: "核对授权目的与水印追踪号" }, risk: "中", evidenceState: "待核验" },
    ]),
  }),
  audit: page({
    key: "audit", domain: "audit", eyebrow: "Security / Audit", title: "安全审计计划",
    description: "定义审计类型、范围、期间、团队、抽样策略和内外部评估引用。",
    createLabel: "新建审计计划", runLabel: "启动审计", completedStatus: "执行中", columns: [{ key: "审计期间", label: "审计期间" }, { key: "抽样策略", label: "抽样策略" }],
    seedRecords: seeds("audit", [
      { name: "2026 Q3 数据安全专项审计", summary: "覆盖访问、流转、交换行为和保护策略执行证据。", status: "已排期", owner: "刘妍", fields: { 审计期间: "2026-07-01 至 09-30", 抽样策略: "高风险全量 + 其余 10%", 审计类型: "合规 / 标准", 团队: "内审组 A" }, risk: "中" },
      { name: "供应商数据交换审计", summary: "检查共享范围、审批、使用和删除证据。", status: "草稿", owner: "赵宁", fields: { 审计期间: "2026-08-01 至 08-31", 抽样策略: "2 家供应商全量", 审计类型: "供应商", 团队: "待指定" }, risk: "高", evidenceState: "缺失" },
    ]),
  }),
  "audit-executions": page({
    key: "audit-executions", domain: "audit", eyebrow: "Security / Audit Execution", title: "审计执行",
    description: "执行检查表，记录工作底稿、证据引用、发现和建议。",
    createLabel: "创建执行记录", runLabel: "执行下一检查项", completedStatus: "执行中", columns: [{ key: "完成进度", label: "完成进度" }, { key: "发现数", label: "发现数" }],
    seedRecords: seeds("audit-exec", [
      { name: "Q3 数据访问行为检查", summary: "检查高敏感对象的访问授权、目的和超期使用。", status: "执行中", owner: "陈晨", fields: { 完成进度: "18 / 28", 发现数: "4", 当前步骤: "访问样本核验", 工作底稿: "WP-AUD-2608-01" }, risk: "高", evidenceState: "待核验" },
      { name: "Q3 数据交换行为检查", summary: "检查交换审批、接收方和水印追踪记录。", status: "待执行", owner: "张敏", fields: { 完成进度: "0 / 12", 发现数: "0", 当前步骤: "等待证据", 工作底稿: "WP-AUD-2608-02" }, risk: "中", evidenceState: "缺失" },
    ]),
  }),
  "audit-evidence": page({
    key: "audit-evidence", domain: "audit", eyebrow: "Security / Audit Evidence", title: "审计证据目录",
    description: "汇聚数据访问、流转、交换和策略执行的来源引用，校验完整性并登记缺口。",
    createLabel: "登记证据引用", runLabel: "校验证据", completedStatus: "已核验", columns: [{ key: "来源域", label: "来源域" }, { key: "证据期间", label: "证据期间" }],
    seedRecords: seeds("evidence", [
      { name: "高敏感数据访问日志引用", summary: "仅保存来源记录 ID、期间、校验摘要和脱敏引用。", status: "已核验", owner: "陈晨", fields: { 来源域: "数据资产审计", 证据期间: "2026 Q3", 校验摘要: "sha256:9b2e...", 保存状态: "已固化" }, risk: "低", evidenceState: "已固化" },
      { name: "跨境交换审批记录引用", summary: "部分接收方再转移说明尚未采集。", status: "证据不足", owner: "刘妍", fields: { 来源域: "数据交换", 证据期间: "2026 Q3", 校验摘要: "待生成", 保存状态: "采集中" }, risk: "高", evidenceState: "缺失" },
    ]),
  }),
  "audit-reports": page({
    key: "audit-reports", domain: "audit", eyebrow: "Security / Audit Reports", title: "安全审计报告",
    description: "一键生成包含访问、流转、交换行为的审计草稿；证据不足必须披露，生成后仍需复核批准。",
    createLabel: "新建报告", runLabel: "一键生成草稿", completedStatus: "待复核", variant: "audit-report",
    columns: [{ key: "证据完整度", label: "证据完整度" }, { key: "发现数", label: "发现数" }],
    seedRecords: seeds("audit-report", [
      { name: "2026 Q3 数据安全审计报告", summary: "覆盖访问、流转、交换及保护策略执行情况。", status: "草稿", owner: "刘妍", fields: { 证据完整度: "82%", 发现数: "6", 限制说明: "跨境再转移证据缺 1 项", 根因候选: "授权到期检查未前置" }, risk: "高", evidenceState: "待核验" },
      { name: "2026 Q2 数据访问专项报告", summary: "批准版本已冻结，补充说明需创建新版本。", status: "已批准", owner: "陈晨", fields: { 证据完整度: "100%", 发现数: "2", 限制说明: "无", 根因候选: "角色回收不及时" }, risk: "低", evidenceState: "已固化" },
    ]),
  }),
  "audit-findings": page({
    key: "audit-findings", domain: "audit", eyebrow: "Security / Audit Findings", title: "审计问题整改",
    description: "跟踪问题责任人、期限、整改证据、独立复核和关闭记录。",
    createLabel: "登记审计问题", runLabel: "提交整改复核", completedStatus: "待复核", columns: [{ key: "严重程度", label: "严重程度" }, { key: "整改期限", label: "整改期限" }],
    seedRecords: seeds("finding", [
      { name: "导出授权到期未自动失效", summary: "发现 2 个研究账号授权到期后仍保留下载权限。", status: "整改中", owner: "张敏", fields: { 严重程度: "高", 整改期限: "2026-08-18", 根因: "权限回收任务未关联授权期限", 整改证据: "待补充" }, risk: "高", evidenceState: "缺失" },
      { name: "脱敏策略例外缺复核记录", summary: "例外有效但季度复核记录缺失。", status: "待复核", owner: "王雪", fields: { 严重程度: "中", 整改期限: "2026-08-22", 根因: "例外台账未生成待办", 整改证据: "EV-RECT-014" }, risk: "中", evidenceState: "待核验" },
    ]),
  }),
  incidents: page({
    key: "incidents", domain: "incidents", eyebrow: "Security / Incidents", title: "安全事件台账",
    description: "从信号到事件保留时间线与证据，按研判、处置、恢复、通知、复盘五阶段推进。",
    createLabel: "登记疑似事件", runLabel: "推进阶段", completedStatus: "处置中", variant: "incident",
    columns: [{ key: "严重性", label: "严重性" }, { key: "当前阶段", label: "当前阶段" }],
    seedRecords: seeds("incident", [
      { name: "研究数据集异常导出", summary: "访问量异常信号与水印追踪号已关联，正在核验授权目的。", status: "已确认", owner: "周凯", fields: { 严重性: "S2", 当前阶段: "处置", 首次发现: "2026-08-13 07:42", 追踪号: "WM-26Q3-8F2A", 影响范围: "1 个研究数据集" }, risk: "严重", evidenceState: "已固化" },
      { name: "客服批量查询预警", summary: "短时间查询量升高，初步判断为计划内服务回访。", status: "疑似", owner: "陈晨", fields: { 严重性: "S4", 当前阶段: "研判", 首次发现: "2026-08-13 08:55", 追踪号: "SIG-ACCESS-114", 影响范围: "客户脱敏视图" }, risk: "中", evidenceState: "待核验" },
    ]),
  }),
  "incident-sop": page({
    key: "incident-sop", domain: "incidents", eyebrow: "Security / Incident SOP", title: "事件响应 SOP",
    description: "维护五阶段轻量模板、职责、检查项和版本，避免把原型扩展成复杂流程引擎。",
    createLabel: "新建 SOP", runLabel: "发布 SOP", completedStatus: "已发布", variant: "incident",
    columns: [{ key: "适用等级", label: "适用等级" }, { key: "检查项", label: "检查项" }],
    seedRecords: seeds("sop", [
      { name: "S1/S2 数据泄露响应 SOP", summary: "含紧急授权、证据保全、恢复、通知研判和独立复盘。", status: "已发布", owner: "刘妍", fields: { 适用等级: "S1 / S2", 检查项: "22 项", SOP版本: "IR-SOP-v3.1", 当前阶段: "五阶段模板" }, risk: "低", evidenceState: "已固化" },
      { name: "S3/S4 异常访问处置 SOP", summary: "面向异常访问、误操作和可疑批量查询。", status: "草稿", owner: "陈晨", fields: { 适用等级: "S3 / S4", 检查项: "14 项", SOP版本: "IR-SOP-v2.0-draft", 当前阶段: "待复核" }, risk: "中" },
    ]),
  }),
  "incident-notifications": page({
    key: "incident-notifications", domain: "incidents", eyebrow: "Security / Notifications", title: "事件通知记录",
    description: "依据规则包生成通知义务和时限建议，最终决定由法务合规确认，实际通知按 mock 记录。",
    createLabel: "新建通知研判", runLabel: "提交法务确认", completedStatus: "待法务确认", variant: "incident",
    columns: [{ key: "通知对象", label: "通知对象" }, { key: "建议时限", label: "建议时限" }],
    seedRecords: seeds("notify", [
      { name: "研究数据异常导出通知研判", summary: "当前事实不足以自动判断对外通知义务。", status: "待法务确认", owner: "刘妍", fields: { 通知对象: "监管方 / 数据主体（待定）", 建议时限: "规则命中后计算", 法源版本: "CN-IR-v2", 决定: "pending_legal" }, risk: "严重", evidenceState: "待核验" },
      { name: "客服查询预警内部通报", summary: "作为内部安全信号同步，无对外通知建议。", status: "已记录", owner: "陈晨", fields: { 通知对象: "内部安全团队", 建议时限: "已完成", 法源版本: "内部制度 IR-07", 决定: "内部通报" }, risk: "低" },
    ]),
  }),
  "incident-drills": page({
    key: "incident-drills", domain: "incidents", eyebrow: "Security / Drills", title: "演练与复盘",
    description: "记录演练计划、结果、问题、改进措施与知识沉淀，支撑组织能力举证。",
    createLabel: "新建演练", runLabel: "完成演练并复盘", completedStatus: "待独立复核", variant: "incident",
    columns: [{ key: "演练场景", label: "演练场景" }, { key: "改进项", label: "改进项" }],
    seedRecords: seeds("drill", [
      { name: "2026 Q3 数据泄露桌面演练", summary: "模拟外部研究数据集泄露及水印追踪。", status: "待执行", owner: "周凯", fields: { 演练场景: "数据泄露 / S2", 改进项: "待演练", 计划日期: "2026-08-28", 知识沉淀: "待生成" }, risk: "中" },
      { name: "2026 Q2 密钥泄露桌面演练", summary: "完成密钥引用失效、替换、影响核查和复盘。", status: "已复盘", owner: "王雪", fields: { 演练场景: "密钥泄露 / S1", 改进项: "3 项，已关闭 2 项", 计划日期: "2026-05-20", 知识沉淀: "KB-IR-2026-02" }, risk: "低", evidenceState: "已固化" },
    ]),
  }),
};

export const OVERVIEW_CONTROLS = seeds("overview", [
  { name: "DS-01 数据安全制度与职责", summary: "制度、角色、培训与年度复核证据。", status: "就绪", owner: "刘妍", fields: { 能力域: "数据安全管理", DCMM参考: "数据安全", 证据覆盖率: "92%", 缺口: "0" }, risk: "低", evidenceState: "已固化" },
  { name: "DS-02 分类分级与防护", summary: "分类规则、审批和保护策略执行证据。", status: "需改进", owner: "王雪", fields: { 能力域: "数据安全技术", DCMM参考: "分类分级 / 防护", 证据覆盖率: "78%", 缺口: "3" }, risk: "高", evidenceState: "待核验" },
  { name: "DS-03 审计与事件响应", summary: "审计报告、整改、演练和事件复盘证据。", status: "证据不足", owner: "周凯", fields: { 能力域: "数据安全运营", DCMM参考: "审计 / 应急", 证据覆盖率: "65%", 缺口: "5" }, risk: "高", evidenceState: "缺失" },
]);

export function createInitialDomainState(domain: SecurityDomain): SecurityDomainState {
  const collections: SecurityDomainState["collections"] = {};

  if (domain === "overview") {
    collections.overview = structuredClone(OVERVIEW_CONTROLS);
  } else {
    Object.values(SECURITY_PAGE_CONFIGS)
      .filter((config) => config.domain === domain)
      .forEach((config) => {
        collections[config.key] = structuredClone(config.seedRecords);
      });
  }

  return {
    schemaVersion: 2,
    domain,
    updatedAt: "2026-08-13T09:20:00+08:00",
    collections,
    activity: [],
  };
}

export function createDraftRecord(config: SecurityPageConfig, sequence: number): SecurityRecord {
  const first = config.seedRecords[0];
  const fields = Object.fromEntries(
    Object.keys(first?.fields ?? {}).map((key) => [key, key.includes("数") ? "0" : "待配置"]),
  );

  return {
    id: `${config.key}-${Date.now()}`,
    name: `${config.createLabel.replace(/^新建|^登记|^发起|^创建/, "")} ${sequence}`,
    summary: "待补充范围、依据、责任人和证据引用。",
    status: "草稿",
    owner: "待指定",
    updatedAt: "刚刚",
    version: 1,
    risk: "中",
    evidenceState: "缺失",
    evidenceRefs: [],
    fields,
    mock: true,
  };
}
