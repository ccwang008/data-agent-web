import {
  EntityWorkspace,
  type EntityRecord,
  type WorkspaceMetric,
} from "@/components/data-platform/EntityWorkspace";

const taskRecords: EntityRecord[] = [
  { id: "ops-task-001", name: "交易订单 CDC 入湖", domain: "数据集成", successRate: "99.8%", latency: "42 秒", alert: "无", owner: "张敏", status: "正常", updatedAt: "刚刚" },
  { id: "ops-task-002", name: "客户标签小时计算", domain: "数据开发", successRate: "96.4%", latency: "18 分钟", alert: "连续失败 2 次", owner: "李浩", status: "异常", updatedAt: "2026-08-13 09:04" },
  { id: "ops-task-003", name: "客户证件号质量校验", domain: "数据质量", successRate: "98.9%", latency: "3 分钟", alert: "评分下降", owner: "王雪", status: "关注", updatedAt: "2026-08-13 08:58" },
];

const lineageRecords: EntityRecord[] = [
  { id: "ops-lineage-001", name: "客户主数据链路", source: "CRM Oracle", target: "客户画像 API", hops: "7 跳", impact: "12 表 / 3 服务", owner: "陈晨", status: "正常", updatedAt: "2026-08-13 09:00" },
  { id: "ops-lineage-002", name: "交易指标链路", source: "核心交易库", target: "月度经营报表", hops: "5 跳", impact: "8 表 / 14 指标", owner: "张敏", status: "检测中", updatedAt: "刚刚" },
  { id: "ops-lineage-003", name: "营销事件链路", source: "客户事件 Kafka", target: "实时标签服务", hops: "9 跳", impact: "6 表 / 2 服务", owner: "李浩", status: "异常", updatedAt: "2026-08-13 08:46" },
];

const qualityRecords: EntityRecord[] = [
  { id: "ops-quality-001", name: "客户域质量总览", dimension: "完整性 / 准确性", score: "98.6", trend: "+0.4", issues: "3", owner: "王雪", status: "正常", updatedAt: "2026-08-13 08:00" },
  { id: "ops-quality-002", name: "交易域质量总览", dimension: "准确性 / 一致性", score: "94.2", trend: "-2.1", issues: "11", owner: "张敏", status: "异常", updatedAt: "2026-08-13 08:00" },
  { id: "ops-quality-003", name: "营销域质量总览", dimension: "及时性 / 唯一性", score: "97.8", trend: "+0.8", issues: "5", owner: "赵宁", status: "整改中", updatedAt: "2026-08-13 08:00" },
];

const resourceRecords: EntityRecord[] = [
  { id: "ops-resource-001", name: "批处理资源池", resourceType: "计算集群", usage: "68%", quota: "480 vCPU", queue: "12 作业", owner: "平台运维", status: "正常", updatedAt: "刚刚" },
  { id: "ops-resource-002", name: "实时计算资源池", resourceType: "流计算集群", usage: "82%", quota: "320 vCPU", queue: "4 作业", owner: "平台运维", status: "关注", updatedAt: "刚刚" },
  { id: "ops-resource-003", name: "Notebook GPU 池", resourceType: "GPU 集群", usage: "94%", quota: "16 GPU", queue: "7 作业", owner: "AI 平台团队", status: "过载", updatedAt: "刚刚" },
];

export function OpsTasksPage() {
  return (
    <EntityWorkspace
      title="任务监控"
      description="统一查看集成、开发、治理、调度和服务任务的成功率、延迟、失败与重试状态。"
      scope="data-agent.ops-monitor.tasks"
      initialRecords={taskRecords}
      columns={[
        { key: "domain", label: "任务域" },
        { key: "successRate", label: "成功率" },
        { key: "latency", label: "延迟/耗时" },
        { key: "alert", label: "告警摘要" },
      ]}
      fields={[
        { key: "name", label: "监控对象" },
        { key: "domain", label: "任务域", options: ["数据集成", "数据开发", "数据质量", "数据服务"] },
        { key: "successRate", label: "成功率" },
        { key: "latency", label: "延迟/耗时" },
        { key: "alert", label: "告警摘要" },
        { key: "owner", label: "负责人" },
      ]}
      createLabel="新增任务监控"
      emptyLabel="暂无任务监控对象。"
      createDefaults={{ domain: "数据开发", successRate: "—", latency: "—", alert: "无", status: "待接入" }}
      metrics={opsMetrics}
      action={{ label: "重跑", runningStatus: "执行中", successStatus: "正常", successMessage: "任务重跑成功（mock）" }}
    />
  );
}

export function OpsLineagePage() {
  return (
    <EntityWorkspace
      title="数据链路监控"
      description="查看数据源、同步、湖表、治理、服务之间的链路状态和影响范围。"
      scope="data-agent.ops-monitor.lineage"
      initialRecords={lineageRecords}
      columns={[
        { key: "source", label: "源端" },
        { key: "target", label: "目标端" },
        { key: "hops", label: "链路深度" },
        { key: "impact", label: "影响范围" },
      ]}
      fields={[
        { key: "name", label: "链路名称" },
        { key: "source", label: "源端" },
        { key: "target", label: "目标端" },
        { key: "hops", label: "链路深度" },
        { key: "impact", label: "影响范围" },
        { key: "owner", label: "负责人" },
      ]}
      createLabel="登记监控链路"
      emptyLabel="暂无链路监控对象。"
      createDefaults={{ hops: "1 跳", impact: "待计算", status: "待探测" }}
      metrics={opsMetrics}
      action={{ label: "链路探测", runningStatus: "检测中", successStatus: "正常", successMessage: "链路探测完成（mock）" }}
    />
  );
}

export function OpsQualityPage() {
  return (
    <EntityWorkspace
      title="质量监控"
      description="跟踪质量评分、趋势、异常数量和整改闭环，不用前端分数替代生产质量结论。"
      scope="data-agent.ops-monitor.quality"
      initialRecords={qualityRecords}
      columns={[
        { key: "dimension", label: "监控维度" },
        { key: "score", label: "评分" },
        { key: "trend", label: "趋势" },
        { key: "issues", label: "异常数" },
      ]}
      fields={[
        { key: "name", label: "质量监控主题" },
        { key: "dimension", label: "监控维度" },
        { key: "score", label: "评分" },
        { key: "trend", label: "趋势" },
        { key: "issues", label: "异常数" },
        { key: "owner", label: "负责人" },
      ]}
      createLabel="新增质量监控"
      emptyLabel="暂无质量监控主题。"
      createDefaults={{ score: "—", trend: "—", issues: "0", status: "待检测" }}
      metrics={opsMetrics}
      action={{ label: "复检", runningStatus: "检测中", successStatus: "正常", successMessage: "质量复检通过（mock）" }}
    />
  );
}

export function OpsResourcePage() {
  return (
    <EntityWorkspace
      title="计算资源监控"
      description="展示计算集群、作业资源、配额和队列状态；所有数据均为本地 mock 指标。"
      scope="data-agent.ops-monitor.resource"
      initialRecords={resourceRecords}
      columns={[
        { key: "resourceType", label: "资源类型" },
        { key: "usage", label: "使用率" },
        { key: "quota", label: "配额" },
        { key: "queue", label: "队列" },
      ]}
      fields={[
        { key: "name", label: "资源池名称" },
        { key: "resourceType", label: "资源类型", options: ["计算集群", "流计算集群", "GPU 集群", "存储资源"] },
        { key: "usage", label: "使用率" },
        { key: "quota", label: "配额" },
        { key: "queue", label: "队列" },
        { key: "owner", label: "负责人" },
      ]}
      createLabel="新增资源监控"
      emptyLabel="暂无资源监控对象。"
      createDefaults={{ resourceType: "计算集群", usage: "0%", quota: "未设置", queue: "0 作业", status: "待接入" }}
      metrics={opsMetrics}
      action={{ label: "刷新指标", runningStatus: "检测中", successStatus: "正常", successMessage: "资源指标已刷新（mock）" }}
    />
  );
}

function opsMetrics(records: EntityRecord[]): WorkspaceMetric[] {
  return [
    { label: "监控对象", value: records.length, hint: "当前持久化记录" },
    { label: "正常", value: records.filter((item) => item.status === "正常").length, hint: "当前健康对象" },
    { label: "异常/关注", value: records.filter((item) => /异常|关注|过载|整改/.test(item.status)).length, hint: "需要处置" },
    { label: "责任主体", value: new Set(records.map((item) => item.owner)).size, hint: "运维责任覆盖" },
  ];
}
