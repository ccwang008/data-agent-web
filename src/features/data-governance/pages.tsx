import {
  EntityWorkspace,
  type EntityRecord,
  type WorkspaceMetric,
} from "@/components/data-platform/EntityWorkspace";

const metadataRecords: EntityRecord[] = [
  { id: "meta-001", name: "客户主数据表", objectType: "湖表", system: "CRM → 数据湖", lineage: "12 上游 / 8 下游", domain: "客户域", owner: "陈晨", status: "已同步", updatedAt: "2026-08-13 09:08" },
  { id: "meta-002", name: "月度交易额指标", objectType: "指标", system: "指标平台", lineage: "4 上游 / 6 下游", domain: "交易域", owner: "张敏", status: "已同步", updatedAt: "2026-08-13 08:30" },
  { id: "meta-003", name: "客户画像服务", objectType: "数据服务", system: "资产运营", lineage: "7 上游 / 3 下游", domain: "营销域", owner: "赵宁", status: "待确认", updatedAt: "2026-08-12 17:10" },
];

const qualityRecords: EntityRecord[] = [
  { id: "quality-001", name: "客户证件号完整性", dimension: "完整性", target: "dwd_customer_profile.id_no", threshold: "≥ 99.5%", score: "99.8", owner: "王雪", status: "通过", updatedAt: "2026-08-13 08:00" },
  { id: "quality-002", name: "订单金额准确性", dimension: "准确性", target: "dwd_trade_order.amount", threshold: "≥ 99.9%", score: "98.7", owner: "张敏", status: "失败", updatedAt: "2026-08-13 07:45" },
  { id: "quality-003", name: "事件入湖及时性", dimension: "及时性", target: "dwd_customer_event", threshold: "≤ 5 min", score: "97.2", owner: "李浩", status: "执行中", updatedAt: "刚刚" },
];

const standardRecords: EntityRecord[] = [
  { id: "standard-001", name: "活跃客户", kind: "业务术语", version: "v3", scope: "客户域", approver: "数据治理委员会", owner: "陈晨", status: "已发布", updatedAt: "2026-08-12 16:20" },
  { id: "standard-002", name: "月度交易额", kind: "指标标准", version: "v7", scope: "交易域", approver: "经营分析部", owner: "张敏", status: "审批中", updatedAt: "2026-08-13 08:18" },
  { id: "standard-003", name: "风险客户等级", kind: "数据标准", version: "v2", scope: "风险域", approver: "风险管理部", owner: "周凯", status: "草稿", updatedAt: "2026-08-12 14:05" },
];

export function GovernanceMetadataPage() {
  return (
    <EntityWorkspace
      title="元数据与血缘"
      description="统一检索技术与业务元数据，查看责任主体、业务域及上下游影响范围。"
      scope="data-agent.data-governance.metadata"
      initialRecords={metadataRecords}
      columns={[
        { key: "objectType", label: "对象类型" },
        { key: "system", label: "来源系统" },
        { key: "domain", label: "业务域" },
        { key: "lineage", label: "血缘影响" },
      ]}
      fields={[
        { key: "name", label: "元数据名称" },
        { key: "objectType", label: "对象类型", options: ["数据源", "湖表", "指标", "任务", "数据服务"] },
        { key: "system", label: "来源系统" },
        { key: "domain", label: "业务域" },
        { key: "lineage", label: "血缘摘要" },
        { key: "owner", label: "负责人" },
      ]}
      createLabel="登记元数据"
      emptyLabel="暂无元数据对象。"
      createDefaults={{ objectType: "湖表", lineage: "0 上游 / 0 下游", status: "待同步" }}
      metrics={governanceMetrics}
      action={{ label: "刷新元数据", runningStatus: "同步中", successStatus: "已同步", successMessage: "元数据刷新完成（mock）" }}
    />
  );
}

export function DataQualityPage() {
  return (
    <EntityWorkspace
      title="数据质量"
      description="管理完整性、准确性、及时性、一致性和唯一性规则，保留阈值、评分和最近执行结果。"
      scope="data-agent.data-governance.quality"
      initialRecords={qualityRecords}
      columns={[
        { key: "dimension", label: "质量维度" },
        { key: "target", label: "检测对象" },
        { key: "threshold", label: "阈值" },
        { key: "score", label: "最近评分" },
      ]}
      fields={[
        { key: "name", label: "规则名称" },
        { key: "dimension", label: "质量维度", options: ["完整性", "准确性", "及时性", "一致性", "唯一性"] },
        { key: "target", label: "检测对象" },
        { key: "threshold", label: "阈值" },
        { key: "score", label: "最近评分" },
        { key: "owner", label: "负责人" },
      ]}
      createLabel="新建质量规则"
      emptyLabel="暂无质量规则。"
      createDefaults={{ dimension: "完整性", threshold: "≥ 99%", score: "—", status: "未执行" }}
      metrics={governanceMetrics}
      action={{ label: "执行规则", runningStatus: "执行中", successStatus: "通过", successMessage: "质量规则执行通过（mock）" }}
    />
  );
}

export function DataStandardsPage() {
  return (
    <EntityWorkspace
      title="数据标准"
      description="管理业务术语、指标定义和数据标准的版本、责任人及审批发布状态。"
      scope="data-agent.data-governance.standards"
      initialRecords={standardRecords}
      columns={[
        { key: "kind", label: "标准类型" },
        { key: "version", label: "版本" },
        { key: "scope", label: "适用范围" },
        { key: "approver", label: "审批主体" },
      ]}
      fields={[
        { key: "name", label: "标准名称" },
        { key: "kind", label: "标准类型", options: ["业务术语", "指标标准", "数据标准"] },
        { key: "version", label: "版本" },
        { key: "scope", label: "适用范围" },
        { key: "approver", label: "审批主体" },
        { key: "owner", label: "负责人" },
      ]}
      createLabel="新建数据标准"
      emptyLabel="暂无数据标准。"
      createDefaults={{ kind: "业务术语", version: "v1", status: "草稿" }}
      metrics={governanceMetrics}
      action={{ label: "提交审批", runningStatus: "审批中", successStatus: "已发布", successMessage: "标准审批发布完成（mock）" }}
    />
  );
}

function governanceMetrics(records: EntityRecord[]): WorkspaceMetric[] {
  return [
    { label: "治理对象", value: records.length, hint: "当前持久化记录" },
    { label: "有效/通过", value: records.filter((item) => /同步|通过|发布/.test(item.status)).length, hint: "当前有效状态" },
    { label: "待处理", value: records.filter((item) => /待|中|失败|草稿/.test(item.status)).length, hint: "需要确认或整改" },
    { label: "责任主体", value: new Set(records.map((item) => item.owner)).size, hint: "治理责任覆盖" },
  ];
}
