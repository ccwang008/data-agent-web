import {
  EntityWorkspace,
  type EntityRecord,
  type WorkspaceMetric,
} from "@/components/data-platform/EntityWorkspace";

const classificationRecords: EntityRecord[] = [
  { id: "class-001", name: "客户证件号码", category: "个人敏感信息", level: "L4 高敏感", scope: "客户域 / 12 张表", evidence: "规则 + 人工复核", owner: "王雪", status: "已识别", updatedAt: "2026-08-13 08:30" },
  { id: "class-002", name: "交易金额", category: "经营数据", level: "L3 敏感", scope: "交易域 / 18 张表", evidence: "规则识别", owner: "张敏", status: "审批中", updatedAt: "2026-08-13 08:12" },
  { id: "class-003", name: "公开产品目录", category: "公开数据", level: "L1 公开", scope: "产品域 / 4 个服务", evidence: "资产发布记录", owner: "赵宁", status: "已识别", updatedAt: "2026-08-12 16:40" },
];

const maskingRecords: EntityRecord[] = [
  { id: "mask-001", name: "证件号码展示脱敏", method: "保留前 3 后 4", scope: "分析与客服页面", coverage: "12 字段", encryption: "传输 TLS（mock）", owner: "王雪", status: "生效", updatedAt: "2026-08-13 08:26" },
  { id: "mask-002", name: "手机号不可逆散列", method: "HMAC 引用（脱敏）", scope: "营销沙箱", coverage: "6 字段", encryption: "密钥引用 kms-***", owner: "李浩", status: "生效", updatedAt: "2026-08-12 17:30" },
  { id: "mask-003", name: "交易金额区间化", method: "区间泛化", scope: "外部研究数据集", coverage: "3 字段", encryption: "下载包加密（mock）", owner: "张敏", status: "审批中", updatedAt: "2026-08-13 09:02" },
];

export function ClassificationPage() {
  return (
    <EntityWorkspace
      title="数据分级分类"
      description="识别数据主题、敏感等级和适用范围，记录审批与证据引用；结果仅用于本地合规工作台演示。"
      scope="data-agent.data-security.classification"
      initialRecords={classificationRecords}
      columns={[
        { key: "category", label: "分类" },
        { key: "level", label: "敏感等级" },
        { key: "scope", label: "适用范围" },
        { key: "evidence", label: "识别证据" },
      ]}
      fields={[
        { key: "name", label: "数据对象/字段" },
        { key: "category", label: "分类", options: ["个人敏感信息", "经营数据", "重要数据", "公开数据"] },
        { key: "level", label: "敏感等级", options: ["L1 公开", "L2 内部", "L3 敏感", "L4 高敏感"] },
        { key: "scope", label: "适用范围" },
        { key: "evidence", label: "识别证据" },
        { key: "owner", label: "负责人" },
      ]}
      createLabel="新建分类规则"
      emptyLabel="暂无分级分类记录。"
      createDefaults={{ category: "经营数据", level: "L2 内部", evidence: "待补充", status: "草稿" }}
      metrics={securityMetrics}
      action={{ label: "执行识别", runningStatus: "识别中", successStatus: "已识别", successMessage: "分类识别完成（mock）" }}
    />
  );
}

export function MaskingPage() {
  return (
    <EntityWorkspace
      title="脱敏与加密策略"
      description="管理展示脱敏、不可逆处理、传输/存储加密说明和受控访问范围；只使用脱敏策略引用。"
      scope="data-agent.data-security.masking"
      initialRecords={maskingRecords}
      columns={[
        { key: "method", label: "处理方法" },
        { key: "scope", label: "适用范围" },
        { key: "coverage", label: "覆盖对象" },
        { key: "encryption", label: "加密说明" },
      ]}
      fields={[
        { key: "name", label: "策略名称" },
        { key: "method", label: "处理方法", options: ["遮盖", "区间泛化", "不可逆散列", "替换", "随机化"] },
        { key: "scope", label: "适用范围" },
        { key: "coverage", label: "覆盖对象" },
        { key: "encryption", label: "加密说明（不得填写真实密钥）" },
        { key: "owner", label: "负责人" },
      ]}
      createLabel="新建安全策略"
      emptyLabel="暂无脱敏或加密策略。"
      createDefaults={{ method: "遮盖", coverage: "0 字段", encryption: "密钥引用 ***", status: "草稿" }}
      metrics={securityMetrics}
      action={{ label: "应用策略", runningStatus: "应用中", successStatus: "生效", successMessage: "安全策略已应用（mock）" }}
    />
  );
}

function securityMetrics(records: EntityRecord[]): WorkspaceMetric[] {
  return [
    { label: "策略/对象", value: records.length, hint: "当前持久化记录" },
    { label: "已识别/生效", value: records.filter((item) => /识别|生效/.test(item.status)).length, hint: "当前有效状态" },
    { label: "审批/处理中", value: records.filter((item) => /中|草稿/.test(item.status)).length, hint: "等待审批或执行" },
    { label: "责任主体", value: new Set(records.map((item) => item.owner)).size, hint: "安全责任覆盖" },
  ];
}
