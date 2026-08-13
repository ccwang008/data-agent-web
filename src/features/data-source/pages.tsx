import {
  EntityWorkspace,
  type EntityRecord,
  type WorkspaceMetric,
} from "@/components/data-platform/EntityWorkspace";
import {
  DATA_SOURCE_SCOPE,
  DEFAULT_DATA_SOURCE_RECORDS,
} from "@/stores/dataSourceRegistry";

const syncRecords: EntityRecord[] = [
  {
    id: "sync-001",
    name: "交易订单 CDC 入湖",
    mode: "CDC",
    source: "核心交易 PostgreSQL",
    target: "ods_trade_order",
    schedule: "持续运行",
    owner: "张敏",
    status: "运行中",
    updatedAt: "刚刚",
  },
  {
    id: "sync-002",
    name: "客户主数据全量同步",
    mode: "全量",
    source: "CRM Oracle",
    target: "ods_customer",
    schedule: "每日 02:00",
    owner: "陈晨",
    status: "成功",
    updatedAt: "2026-08-13 02:18",
  },
  {
    id: "sync-003",
    name: "行为日志实时同步",
    mode: "实时",
    source: "客户事件 Kafka",
    target: "dwd_customer_event",
    schedule: "持续运行",
    owner: "李浩",
    status: "失败",
    updatedAt: "2026-08-13 09:02",
  },
];

const exchangeRecords: EntityRecord[] = [
  {
    id: "exchange-001",
    name: "集团客户画像 API",
    channel: "API",
    consumer: "集团营销中心",
    sla: "99.9% / 500ms",
    owner: "赵宁",
    status: "已发布",
    updatedAt: "2026-08-12 16:40",
  },
  {
    id: "exchange-002",
    name: "监管月报文件交换",
    channel: "文件",
    consumer: "合规管理部",
    sla: "每月 3 日前",
    owner: "王雪",
    status: "审批中",
    updatedAt: "2026-08-13 08:12",
  },
  {
    id: "exchange-003",
    name: "风险明细库表共享",
    channel: "库表",
    consumer: "风险管理部",
    sla: "T+1",
    owner: "周凯",
    status: "异常",
    updatedAt: "2026-08-12 23:50",
  },
];

export function DataSourcesPage() {
  return (
    <EntityWorkspace
      title="数据源管理"
      description="统一登记数据库、文件、本地文件、消息队列和 API 数据源；连接信息仅展示脱敏 mock 值。"
      scope={DATA_SOURCE_SCOPE}
      initialRecords={DEFAULT_DATA_SOURCE_RECORDS}
      columns={[
        { key: "type", label: "类型" },
        { key: "endpoint", label: "脱敏连接信息" },
      ]}
      fields={[
        { key: "name", label: "数据源名称", placeholder: "例如：核心交易 PostgreSQL" },
        {
          key: "type",
          label: "数据源类型",
          options: ["数据库", "文件源", "本地文件", "消息队列", "API"],
        },
        { key: "endpoint", label: "脱敏连接信息", placeholder: "不得填写真实密码或完整连接串" },
        { key: "owner", label: "负责人" },
      ]}
      createLabel="新增数据源"
      emptyLabel="暂无数据源，请创建第一条脱敏连接配置。"
      createDefaults={{ type: "数据库", endpoint: "***", status: "未测试" }}
      metrics={(records) => statusMetrics(records, "可用")}
      action={{
        label: "连接测试",
        runningStatus: "检测中",
        successStatus: "可用",
        successMessage: "连接测试成功（mock）",
      }}
    />
  );
}

export function DataSyncPage() {
  return (
    <EntityWorkspace
      title="数据同步"
      description="配置全量、增量、CDC 和实时同步任务，跟踪源端、目标端、调度与最近一次 mock 运行结果。"
      scope="data-agent.data-source.sync"
      initialRecords={syncRecords}
      columns={[
        { key: "mode", label: "同步模式" },
        { key: "source", label: "源端" },
        { key: "target", label: "目标端" },
        { key: "schedule", label: "调度策略" },
      ]}
      fields={[
        { key: "name", label: "任务名称" },
        { key: "mode", label: "同步模式", options: ["全量", "增量", "CDC", "实时"] },
        { key: "source", label: "源端" },
        { key: "target", label: "目标端" },
        { key: "schedule", label: "调度策略" },
        { key: "owner", label: "负责人" },
      ]}
      createLabel="新建同步任务"
      emptyLabel="暂无同步任务。"
      createDefaults={{ mode: "增量", schedule: "每日 02:00", status: "草稿" }}
      metrics={(records) => statusMetrics(records, "成功|运行中")}
      action={{
        label: "运行",
        runningStatus: "运行中",
        successStatus: "成功",
        successMessage: "同步运行成功（mock）",
      }}
    />
  );
}

export function DataExchangePage() {
  return (
    <EntityWorkspace
      title="共享交换"
      description="管理 API、文件、库表和消息交换通道，记录消费方、SLA、状态与审计关联。"
      scope="data-agent.data-source.exchange"
      initialRecords={exchangeRecords}
      columns={[
        { key: "channel", label: "交换方式" },
        { key: "consumer", label: "消费方" },
        { key: "sla", label: "SLA" },
      ]}
      fields={[
        { key: "name", label: "交换名称" },
        { key: "channel", label: "交换方式", options: ["API", "文件", "库表", "消息"] },
        { key: "consumer", label: "消费方" },
        { key: "sla", label: "SLA" },
        { key: "owner", label: "负责人" },
      ]}
      createLabel="新建交换通道"
      emptyLabel="暂无共享交换通道。"
      createDefaults={{ channel: "API", sla: "99.9%", status: "草稿" }}
      metrics={(records) => statusMetrics(records, "已发布|已完成")}
      action={{
        label: "执行交换",
        runningStatus: "执行中",
        successStatus: "已完成",
        successMessage: "交换执行完成（mock）",
      }}
    />
  );
}

function statusMetrics(records: EntityRecord[], successPattern: string): WorkspaceMetric[] {
  const success = new RegExp(successPattern).test.bind(new RegExp(successPattern));
  const successCount = records.filter((record) => success(record.status)).length;
  const exceptionCount = records.filter((record) => /异常|失败/.test(record.status)).length;
  return [
    { label: "对象总数", value: records.length, hint: "SQLite 持久化记录" },
    { label: "健康/运行", value: successCount, hint: "正常提供服务" },
    { label: "异常", value: exceptionCount, hint: "需要关注或重试" },
    {
      label: "负责人",
      value: new Set(records.map((record) => record.owner)).size,
      hint: "已分配责任主体",
    },
  ];
}
