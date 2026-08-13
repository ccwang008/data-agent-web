import {
  EntityWorkspace,
  type EntityRecord,
  type WorkspaceMetric,
} from "@/components/data-platform/EntityWorkspace";

const storageRecords: EntityRecord[] = [
  { id: "lake-001", name: "ods_trade_order", type: "数据表", location: "lake://ods/trade_order", size: "2.8 TB", tier: "热", owner: "张敏", status: "正常", updatedAt: "2026-08-13 09:12" },
  { id: "lake-002", name: "customer-contracts", type: "文档", location: "lake://document/contracts", size: "640 GB", tier: "温", owner: "王雪", status: "正常", updatedAt: "2026-08-13 08:36" },
  { id: "lake-003", name: "device-video-archive", type: "视频", location: "lake://media/device", size: "18.4 TB", tier: "冷", owner: "李浩", status: "迁移中", updatedAt: "2026-08-13 07:20" },
];

const tableRecords: EntityRecord[] = [
  { id: "table-001", name: "dwd_customer_profile", format: "Iceberg", schemaVersion: "v18", partitions: "dt / region", acid: "启用", owner: "陈晨", status: "已发布", updatedAt: "2026-08-13 08:50" },
  { id: "table-002", name: "dws_trade_summary", format: "Delta", schemaVersion: "v7", partitions: "month", acid: "启用", owner: "张敏", status: "变更审批", updatedAt: "2026-08-12 17:46" },
  { id: "table-003", name: "ads_risk_alert", format: "Hudi", schemaVersion: "v4", partitions: "dt", acid: "启用", owner: "周凯", status: "已发布", updatedAt: "2026-08-12 16:02" },
];

const capacityRecords: EntityRecord[] = [
  { id: "capacity-hot", name: "热数据层", quota: "40 TB", used: "31.2 TB", growth: "+8.2% / 月", policy: "30 天转温", owner: "平台运维", status: "正常", updatedAt: "2026-08-13 09:00" },
  { id: "capacity-warm", name: "温数据层", quota: "80 TB", used: "52.8 TB", growth: "+4.1% / 月", policy: "180 天转冷", owner: "平台运维", status: "正常", updatedAt: "2026-08-13 09:00" },
  { id: "capacity-cold", name: "冷归档层", quota: "240 TB", used: "188.5 TB", growth: "+2.8% / 月", policy: "7 年归档", owner: "合规与运维", status: "容量预警", updatedAt: "2026-08-13 09:00" },
];

export function DataLakeStoragePage() {
  return (
    <EntityWorkspace
      title="统一数据存储"
      description="统一纳管数据表、文件、图片、视频、日志和文档，跟踪位置、容量、存储层级与生命周期状态。"
      scope="data-agent.data-lake.storage"
      initialRecords={storageRecords}
      columns={[
        { key: "type", label: "对象类型" },
        { key: "location", label: "位置" },
        { key: "size", label: "大小" },
        { key: "tier", label: "层级" },
      ]}
      fields={[
        { key: "name", label: "对象名称" },
        { key: "type", label: "对象类型", options: ["数据表", "文件", "图片", "视频", "日志", "文档"] },
        { key: "location", label: "存储位置" },
        { key: "size", label: "容量" },
        { key: "tier", label: "存储层级", options: ["热", "温", "冷", "归档"] },
        { key: "owner", label: "负责人" },
      ]}
      createLabel="登记存储对象"
      emptyLabel="暂无存储对象。"
      createDefaults={{ type: "数据表", tier: "热", size: "0 GB", status: "待校验" }}
      metrics={lakeMetrics}
      action={{ label: "生命周期校验", runningStatus: "校验中", successStatus: "正常", successMessage: "生命周期校验通过（mock）" }}
    />
  );
}

export function DataLakeTablesPage() {
  return (
    <EntityWorkspace
      title="湖表管理"
      description="管理湖表格式、Schema 版本、分区和事务属性，保留结构演进的 mock 版本记录。"
      scope="data-agent.data-lake.tables"
      initialRecords={tableRecords}
      columns={[
        { key: "format", label: "表格式" },
        { key: "schemaVersion", label: "Schema 版本" },
        { key: "partitions", label: "分区" },
        { key: "acid", label: "ACID" },
      ]}
      fields={[
        { key: "name", label: "湖表名称" },
        { key: "format", label: "表格式", options: ["Iceberg", "Delta", "Hudi", "Parquet"] },
        { key: "schemaVersion", label: "Schema 版本" },
        { key: "partitions", label: "分区字段" },
        { key: "acid", label: "事务能力", options: ["启用", "只读", "未启用"] },
        { key: "owner", label: "负责人" },
      ]}
      createLabel="新建湖表"
      emptyLabel="暂无湖表。"
      createDefaults={{ format: "Iceberg", schemaVersion: "v1", acid: "启用", status: "草稿" }}
      metrics={lakeMetrics}
      action={{ label: "提交版本", runningStatus: "提交中", successStatus: "已发布", successMessage: "Schema 版本已发布（mock）" }}
    />
  );
}

export function DataLakeCapacityPage() {
  return (
    <EntityWorkspace
      title="分层与容量"
      description="观察热、温、冷和归档层的配额、使用量、增长趋势，并配置生命周期策略。"
      scope="data-agent.data-lake.capacity"
      initialRecords={capacityRecords}
      columns={[
        { key: "quota", label: "配额" },
        { key: "used", label: "已使用" },
        { key: "growth", label: "增长趋势" },
        { key: "policy", label: "生命周期策略" },
      ]}
      fields={[
        { key: "name", label: "层级名称" },
        { key: "quota", label: "配额" },
        { key: "used", label: "已使用" },
        { key: "growth", label: "增长趋势" },
        { key: "policy", label: "生命周期策略" },
        { key: "owner", label: "负责人" },
      ]}
      createLabel="新增容量策略"
      emptyLabel="暂无容量层级。"
      createDefaults={{ quota: "10 TB", used: "0 TB", growth: "0%", policy: "未配置", status: "草稿" }}
      metrics={lakeMetrics}
      action={{ label: "应用策略", runningStatus: "应用中", successStatus: "生效", successMessage: "生命周期策略已生效（mock）" }}
    />
  );
}

function lakeMetrics(records: EntityRecord[]): WorkspaceMetric[] {
  return [
    { label: "对象/层级", value: records.length, hint: "当前持久化记录" },
    { label: "正常/已发布", value: records.filter((item) => /正常|发布|生效/.test(item.status)).length, hint: "可用状态" },
    { label: "处理中", value: records.filter((item) => /中|审批/.test(item.status)).length, hint: "迁移或变更流程" },
    { label: "责任主体", value: new Set(records.map((item) => item.owner)).size, hint: "已落实负责人" },
  ];
}
