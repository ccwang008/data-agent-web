import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BookMarked,
  BookOpen,
  Bot,
  Boxes,
  Calculator,
  Cloud,
  Code2,
  Database,
  FileText,
  Gauge,
  GitBranch,
  Handshake,
  Layers,
  LineChart,
  ListTree,
  MessageSquareText,
  NotebookTabs,
  Rocket,
  Route,
  Search,
  ServerCog,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sigma,
  Sparkles,
  SquareCode,
  Table2, Tags, Target, Timer, Workflow, Wrench,
} from "lucide-react";

import type { Locale } from "@/lib/i18n";

export type MenuLabel = Record<Locale, string>;

export interface MenuNode {
  id: string;
  builtinRouteKey?: string;
  label: MenuLabel;
  children?: MenuNode[];
  visible: boolean;
  customGroup?: boolean;
}

export interface MenuConfig {
  version: number;
  root: MenuNode[];
  updatedAt: string;
}

export interface BuiltinMenuEntry {
  key: string;
  to?: string;
  matchPrefix?: string;
  icon: LucideIcon;
  status?: "ready" | "todo";
  defaultLabel: MenuLabel;
}

export const BUILTIN_MENU: Record<string, BuiltinMenuEntry> = {
  "data-agent": {
    key: "data-agent",
    matchPrefix: "/data-agent",
    icon: Bot,
    status: "ready",
    defaultLabel: { "zh-CN": "Data Agent", "en-US": "Data Agent" },
  },
  "data-agent.general": {
    key: "data-agent.general",
    to: "/data-agent/general",
    icon: Sparkles,
    defaultLabel: { "zh-CN": "通用 Agent", "en-US": "General Agent" },
  },
  "data-agent.discovery": {
    key: "data-agent.discovery",
    to: "/data-agent/discovery",
    icon: Search,
    defaultLabel: { "zh-CN": "数据发现 Agent", "en-US": "Data Discovery Agent" },
  },
  "data-agent.qa": {
    key: "data-agent.qa",
    to: "/data-agent/qa",
    icon: MessageSquareText,
    defaultLabel: { "zh-CN": "数据问答 Agent", "en-US": "Data Q&A Agent" },
  },
  "data-agent.development": {
    key: "data-agent.development",
    to: "/data-agent/development",
    icon: Code2,
    defaultLabel: { "zh-CN": "数据开发 Agent", "en-US": "Data Development Agent" },
  },
  "data-agent.governance": {
    key: "data-agent.governance",
    to: "/data-agent/governance",
    icon: ShieldCheck,
    defaultLabel: { "zh-CN": "数据治理 Agent", "en-US": "Data Governance Agent" },
  },
  "data-agent.operations": {
    key: "data-agent.operations",
    to: "/data-agent/operations",
    icon: Activity,
    defaultLabel: { "zh-CN": "数据运维 Agent", "en-US": "Data Operations Agent" },
  },
  "data-asset": {
    key: "data-asset",
    matchPrefix: "/data-asset",
    icon: Database,
    status: "ready",
    defaultLabel: { "zh-CN": "数据资产", "en-US": "Data Assets" },
  },
  "data-asset.catalog": {
    key: "data-asset.catalog",
    to: "/data-asset/catalog",
    icon: Boxes,
    defaultLabel: { "zh-CN": "资产目录", "en-US": "Asset Catalog" },
  },
  "data-asset.circulation": {
    key: "data-asset.circulation",
    to: "/data-asset/circulation",
    icon: Workflow,
    defaultLabel: { "zh-CN": "资产流通", "en-US": "Asset Circulation" },
  },
  "data-asset.ownership": {
    key: "data-asset.ownership",
    to: "/data-asset/ownership",
    icon: Handshake,
    defaultLabel: { "zh-CN": "权属登记", "en-US": "Ownership" },
  },
  "data-asset.value": {
    key: "data-asset.value",
    to: "/data-asset/value",
    icon: Calculator,
    defaultLabel: { "zh-CN": "价值评估", "en-US": "Valuation" },
  },
  "data-asset.service": {
    key: "data-asset.service",
    to: "/data-asset/service",
    icon: Rocket,
    defaultLabel: { "zh-CN": "资产运营", "en-US": "Asset Ops" },
  },
  "data-asset.audit": {
    key: "data-asset.audit",
    to: "/data-asset/audit",
    icon: ShieldAlert,
    defaultLabel: { "zh-CN": "使用审计", "en-US": "Audit" },
  },
  "data-asset.reports": {
    key: "data-asset.reports",
    to: "/data-asset/reports",
    icon: LineChart,
    defaultLabel: { "zh-CN": "量化报告", "en-US": "Reports" },
  },
  "data-source": {
    key: "data-source",
    matchPrefix: "/data-source",
    icon: Database,
    status: "ready",
    defaultLabel: { "zh-CN": "数据集成", "en-US": "Data Integration" },
  },
  "data-source.sources": {
    key: "data-source.sources",
    to: "/data-source/sources",
    icon: Database,
    defaultLabel: { "zh-CN": "数据源", "en-US": "Data Sources" },
  },
  "data-source.sync": {
    key: "data-source.sync",
    to: "/data-source/sync",
    icon: Workflow,
    defaultLabel: { "zh-CN": "数据同步", "en-US": "Data Sync" },
  },
  "data-source.exchange": {
    key: "data-source.exchange",
    to: "/data-source/exchange",
    icon: Route,
    defaultLabel: { "zh-CN": "共享交换", "en-US": "Data Exchange" },
  },
  "data-lake": {
    key: "data-lake",
    matchPrefix: "/data-lake",
    icon: Cloud,
    status: "ready",
    defaultLabel: { "zh-CN": "数据湖", "en-US": "Data Lake" },
  },
  "data-lake.storage": {
    key: "data-lake.storage",
    to: "/data-lake/storage",
    icon: Cloud,
    defaultLabel: { "zh-CN": "统一存储", "en-US": "Storage" },
  },
  "data-lake.tables": {
    key: "data-lake.tables",
    to: "/data-lake/tables",
    icon: Table2,
    defaultLabel: { "zh-CN": "数据建模", "en-US": "Data Modeling" },
  },
  "data-lake.capacity": {
    key: "data-lake.capacity",
    to: "/data-lake/capacity",
    icon: LineChart,
    defaultLabel: { "zh-CN": "分层与容量", "en-US": "Capacity" },
  },
  "data-governance": {
    key: "data-governance",
    matchPrefix: "/data-governance",
    icon: ShieldCheck,
    status: "ready",
    defaultLabel: { "zh-CN": "数据治理", "en-US": "Data Governance" },
  },
  "data-governance.group.center": {
    key: "data-governance.group.center",
    matchPrefix: "/data-governance/center",
    icon: ShieldCheck,
    defaultLabel: { "zh-CN": "治理中心", "en-US": "Governance Center" },
  },
  "data-governance.center": {
    key: "data-governance.center",
    to: "/data-governance/center",
    icon: Gauge,
    defaultLabel: { "zh-CN": "治理大盘", "en-US": "Governance Dashboard" },
  },
  "data-governance.center.organization": {
    key: "data-governance.center.organization",
    to: "/data-governance/center/organization",
    icon: Handshake,
    defaultLabel: { "zh-CN": "治理组织", "en-US": "Organization" },
  },
  "data-governance.center.regulation": {
    key: "data-governance.center.regulation",
    to: "/data-governance/center/regulation",
    icon: FileText,
    defaultLabel: { "zh-CN": "制度管理", "en-US": "Regulation" },
  },
  "data-governance.center.culture": {
    key: "data-governance.center.culture",
    to: "/data-governance/center/culture",
    icon: BookOpen,
    defaultLabel: { "zh-CN": "数据文化", "en-US": "Culture" },
  },
  "data-governance.group.metadata": {
    key: "data-governance.group.metadata",
    matchPrefix: "/data-governance/metadata",
    icon: Database,
    defaultLabel: { "zh-CN": "元数据", "en-US": "Metadata" },
  },
  "data-governance.metadata": {
    key: "data-governance.metadata",
    to: "/data-governance/metadata",
    icon: Database,
    defaultLabel: { "zh-CN": "元数据检索", "en-US": "Metadata Map" },
  },
  "data-governance.metadata.model": {
    key: "data-governance.metadata.model",
    to: "/data-governance/metadata/model",
    icon: Boxes,
    defaultLabel: { "zh-CN": "元模型配置", "en-US": "Meta Model" },
  },
  "data-governance.metadata.quality": {
    key: "data-governance.metadata.quality",
    to: "/data-governance/metadata/quality",
    icon: ShieldCheck,
    defaultLabel: { "zh-CN": "元数据质量", "en-US": "Metadata Quality" },
  },
  "data-governance.metadata.reports": {
    key: "data-governance.metadata.reports",
    to: "/data-governance/metadata/reports",
    icon: LineChart,
    defaultLabel: { "zh-CN": "管理报告", "en-US": "Reports" },
  },
  "data-governance.group.quality": {
    key: "data-governance.group.quality",
    matchPrefix: "/data-governance/quality",
    icon: ShieldCheck,
    defaultLabel: { "zh-CN": "数据质量", "en-US": "Data Quality" },
  },
  "data-governance.quality": {
    key: "data-governance.quality",
    to: "/data-governance/quality",
    icon: Gauge,
    defaultLabel: { "zh-CN": "质量概览", "en-US": "Quality Overview" },
  },
  "data-governance.quality.requirements": {
    key: "data-governance.quality.requirements",
    to: "/data-governance/quality/requirements",
    icon: Target,
    defaultLabel: { "zh-CN": "质量需求", "en-US": "Requirements" },
  },
  "data-governance.quality.rules": {
    key: "data-governance.quality.rules",
    to: "/data-governance/quality/rules",
    icon: Wrench,
    defaultLabel: { "zh-CN": "质量规则", "en-US": "Rules" },
  },
  "data-governance.quality.issues": {
    key: "data-governance.quality.issues",
    to: "/data-governance/quality/issues",
    icon: ShieldAlert,
    defaultLabel: { "zh-CN": "质量问题", "en-US": "Issues" },
  },
  "data-governance.quality.analysis": {
    key: "data-governance.quality.analysis",
    to: "/data-governance/quality/analysis",
    icon: LineChart,
    defaultLabel: { "zh-CN": "质量分析", "en-US": "Analysis" },
  },
  "data-governance.quality.improvement": {
    key: "data-governance.quality.improvement",
    to: "/data-governance/quality/improvement",
    icon: FileText,
    defaultLabel: { "zh-CN": "质量改进", "en-US": "Improvement" },
  },
  "data-standard": {
    key: "data-standard",
    matchPrefix: "/data-standard",
    icon: BookMarked,
    status: "ready",
    defaultLabel: { "zh-CN": "数据标准", "en-US": "Data Standard" },
  },
  "data-standard.business-terms": {
    key: "data-standard.business-terms",
    to: "/data-standard/business-terms",
    icon: BookOpen,
    defaultLabel: { "zh-CN": "业务术语", "en-US": "Business Terms" },
  },
  "data-standard.master-data": {
    key: "data-standard.master-data",
    to: "/data-standard/master-data",
    icon: Boxes,
    defaultLabel: { "zh-CN": "主数据", "en-US": "Master Data" },
  },
  "data-standard.reference-data": {
    key: "data-standard.reference-data",
    to: "/data-standard/reference-data",
    icon: ListTree,
    defaultLabel: { "zh-CN": "参考数据", "en-US": "Reference Data" },
  },
  "data-standard.data-element-standards": {
    key: "data-standard.data-element-standards",
    to: "/data-standard/data-element-standards",
    icon: Layers,
    defaultLabel: { "zh-CN": "数据元标准", "en-US": "Data Element" },
  },
  "data-standard.metric-dictionary": {
    key: "data-standard.metric-dictionary",
    to: "/data-standard/metric-dictionary",
    icon: Sigma,
    defaultLabel: { "zh-CN": "指标字典", "en-US": "Metric Dictionary" },
  },
  "data-development": {
    key: "data-development",
    matchPrefix: "/data-development",
    icon: Code2,
    status: "ready",
    defaultLabel: { "zh-CN": "数据开发", "en-US": "Data Development" },
  },
  "data-development.etl": {
    key: "data-development.etl",
    to: "/data-development/etl",
    icon: Workflow,
    defaultLabel: { "zh-CN": "可视化 ETL", "en-US": "Visual ETL" },
  },
  "data-development.sql": {
    key: "data-development.sql",
    to: "/data-development/sql",
    icon: SquareCode,
    defaultLabel: { "zh-CN": "SQL 开发", "en-US": "SQL Development" },
  },
  "data-development.notebook": {
    key: "data-development.notebook",
    to: "/data-development/notebook",
    icon: NotebookTabs,
    defaultLabel: { "zh-CN": "Notebook", "en-US": "Notebook" },
  },
  scheduler: {
    key: "scheduler",
    matchPrefix: "/scheduler",
    icon: Timer,
    status: "ready",
    defaultLabel: { "zh-CN": "调度引擎", "en-US": "Scheduler" },
  },
  "scheduler.tasks": {
    key: "scheduler.tasks",
    to: "/scheduler/tasks",
    icon: Timer,
    defaultLabel: { "zh-CN": "调度任务", "en-US": "Tasks" },
  },
  "scheduler.editor": {
    key: "scheduler.editor",
    to: "/scheduler/editor",
    icon: Workflow,
    defaultLabel: { "zh-CN": "任务画布", "en-US": "Task Editor" },
  },
  "scheduler.monitor": {
    key: "scheduler.monitor",
    to: "/scheduler/monitor",
    icon: LineChart,
    defaultLabel: { "zh-CN": "任务监控", "en-US": "Monitor" },
  },
  "ops-monitor": {
    key: "ops-monitor",
    matchPrefix: "/ops-monitor",
    icon: ServerCog,
    status: "ready",
    defaultLabel: { "zh-CN": "运维与监控", "en-US": "Operations" },
  },
  "ops-monitor.tasks": {
    key: "ops-monitor.tasks",
    to: "/ops-monitor/tasks",
    icon: Timer,
    defaultLabel: { "zh-CN": "任务监控", "en-US": "Task Monitoring" },
  },
  "ops-monitor.lineage": {
    key: "ops-monitor.lineage",
    to: "/ops-monitor/lineage",
    icon: GitBranch,
    defaultLabel: { "zh-CN": "链路监控", "en-US": "Lineage Monitoring" },
  },
  "ops-monitor.quality": {
    key: "ops-monitor.quality",
    to: "/ops-monitor/quality",
    icon: ShieldCheck,
    defaultLabel: { "zh-CN": "质量监控", "en-US": "Quality Monitoring" },
  },
  "ops-monitor.resource": {
    key: "ops-monitor.resource",
    to: "/ops-monitor/resource",
    icon: ServerCog,
    defaultLabel: { "zh-CN": "资源监控", "en-US": "Resource Monitoring" },
  },
  "data-security": {
    key: "data-security",
    matchPrefix: "/data-security",
    icon: ShieldAlert,
    status: "ready",
    defaultLabel: { "zh-CN": "数据安全", "en-US": "Data Security" },
  },
  "data-security.overview": {
    key: "data-security.overview",
    to: "/data-security/overview",
    icon: LineChart,
    defaultLabel: { "zh-CN": "安全总览", "en-US": "Security Overview" },
  },
  "data-security.group.compliance": {
    key: "data-security.group.compliance",
    matchPrefix: "/data-security/compliance",
    icon: ShieldCheck,
    defaultLabel: { "zh-CN": "数据合规", "en-US": "Compliance" },
  },
  "data-security.compliance": {
    key: "data-security.compliance",
    to: "/data-security/compliance",
    icon: ShieldCheck,
    defaultLabel: { "zh-CN": "合规清单", "en-US": "Compliance Checklist" },
  },
  "data-security.compliance-reviews": {
    key: "data-security.compliance-reviews",
    to: "/data-security/compliance/reviews",
    icon: FileText,
    defaultLabel: { "zh-CN": "合规审查", "en-US": "Compliance Reviews" },
  },
  "data-security.personal-information": {
    key: "data-security.personal-information",
    to: "/data-security/compliance/personal-information",
    icon: Database,
    defaultLabel: { "zh-CN": "个人信息", "en-US": "Personal Information" },
  },
  "data-security.important-data": {
    key: "data-security.important-data",
    to: "/data-security/compliance/important-data",
    icon: ShieldAlert,
    defaultLabel: { "zh-CN": "重要数据", "en-US": "Important Data" },
  },
  "data-security.cross-border": {
    key: "data-security.cross-border",
    to: "/data-security/cross-border",
    icon: Route,
    defaultLabel: { "zh-CN": "出境评估", "en-US": "Cross-border Assessment" },
  },
  "data-security.group.classification": {
    key: "data-security.group.classification",
    matchPrefix: "/data-security/classification",
    icon: Tags,
    defaultLabel: { "zh-CN": "分类分级", "en-US": "Classification" },
  },
  "data-security.classification": {
    key: "data-security.classification",
    to: "/data-security/classification",
    icon: Tags,
    defaultLabel: { "zh-CN": "识别任务", "en-US": "Recognition Tasks" },
  },
  "data-security.classification-reviews": {
    key: "data-security.classification-reviews",
    to: "/data-security/classification/reviews",
    icon: ShieldCheck,
    defaultLabel: { "zh-CN": "复核审批", "en-US": "Reviews" },
  },
  "data-security.classification-rules": {
    key: "data-security.classification-rules",
    to: "/data-security/classification/rules",
    icon: Wrench,
    defaultLabel: { "zh-CN": "分类规则", "en-US": "Rules" },
  },
  "data-security.classification-reports": {
    key: "data-security.classification-reports",
    to: "/data-security/classification/reports",
    icon: FileText,
    defaultLabel: { "zh-CN": "分类报告", "en-US": "Reports" },
  },
  "data-security.group.protection": {
    key: "data-security.group.protection",
    icon: Wrench,
    defaultLabel: { "zh-CN": "安全防护", "en-US": "Protection" },
  },
  "data-security.protection": {
    key: "data-security.protection",
    to: "/data-security/protection",
    icon: ShieldCheck,
    defaultLabel: { "zh-CN": "防护策略", "en-US": "Protection Policies" },
  },
  "data-security.access-control": {
    key: "data-security.access-control",
    to: "/data-security/access-control",
    icon: Handshake,
    defaultLabel: { "zh-CN": "访问控制", "en-US": "Access Control" },
  },
  "data-security.masking": {
    key: "data-security.masking",
    to: "/data-security/masking",
    icon: Wrench,
    defaultLabel: { "zh-CN": "脱敏管理", "en-US": "Masking" },
  },
  "data-security.encryption": {
    key: "data-security.encryption",
    to: "/data-security/encryption",
    icon: ShieldCheck,
    defaultLabel: { "zh-CN": "加密管理", "en-US": "Encryption" },
  },
  "data-security.watermark": {
    key: "data-security.watermark",
    to: "/data-security/watermark",
    icon: FileText,
    defaultLabel: { "zh-CN": "数据水印", "en-US": "Data Watermark" },
  },
  "data-security.risk": {
    key: "data-security.risk",
    to: "/data-security/risk",
    icon: ShieldAlert,
    defaultLabel: { "zh-CN": "监控与风险", "en-US": "Monitoring & Risk" },
  },
  "data-security.group.audit": {
    key: "data-security.group.audit",
    matchPrefix: "/data-security/audit",
    icon: FileText,
    defaultLabel: { "zh-CN": "安全审计", "en-US": "Security Audit" },
  },
  "data-security.audit": {
    key: "data-security.audit",
    to: "/data-security/audit",
    icon: FileText,
    defaultLabel: { "zh-CN": "审计计划", "en-US": "Audit Plans" },
  },
  "data-security.audit-executions": {
    key: "data-security.audit-executions",
    to: "/data-security/audit/executions",
    icon: Workflow,
    defaultLabel: { "zh-CN": "审计执行", "en-US": "Audit Execution" },
  },
  "data-security.audit-evidence": {
    key: "data-security.audit-evidence",
    to: "/data-security/audit/evidence",
    icon: Database,
    defaultLabel: { "zh-CN": "审计证据", "en-US": "Audit Evidence" },
  },
  "data-security.audit-reports": {
    key: "data-security.audit-reports",
    to: "/data-security/audit/reports",
    icon: LineChart,
    defaultLabel: { "zh-CN": "审计报告", "en-US": "Audit Reports" },
  },
  "data-security.audit-findings": {
    key: "data-security.audit-findings",
    to: "/data-security/audit/findings",
    icon: ShieldAlert,
    defaultLabel: { "zh-CN": "问题整改", "en-US": "Findings" },
  },
  "data-security.group.incidents": {
    key: "data-security.group.incidents",
    matchPrefix: "/data-security/incidents",
    icon: ShieldAlert,
    defaultLabel: { "zh-CN": "事件响应", "en-US": "Incident Response" },
  },
  "data-security.incidents": {
    key: "data-security.incidents",
    to: "/data-security/incidents",
    icon: ShieldAlert,
    defaultLabel: { "zh-CN": "事件台账", "en-US": "Incidents" },
  },
  "data-security.incident-sop": {
    key: "data-security.incident-sop",
    to: "/data-security/incidents/sop",
    icon: FileText,
    defaultLabel: { "zh-CN": "响应 SOP", "en-US": "Response SOP" },
  },
  "data-security.incident-notifications": {
    key: "data-security.incident-notifications",
    to: "/data-security/incidents/notifications",
    icon: Route,
    defaultLabel: { "zh-CN": "通知记录", "en-US": "Notifications" },
  },
  "data-security.incident-drills": {
    key: "data-security.incident-drills",
    to: "/data-security/incidents/drills",
    icon: Timer,
    defaultLabel: { "zh-CN": "演练与复盘", "en-US": "Drills & Reviews" },
  },
  metrics: {
    key: "metrics",
    to: "/metrics",
    matchPrefix: "/metrics",
    icon: Gauge,
    status: "ready",
    defaultLabel: { "zh-CN": "量化看板", "en-US": "Metrics Dashboard" },
  },
  settings: {
    key: "settings",
    to: "/settings/menu",
    matchPrefix: "/settings",
    icon: Settings,
    status: "ready",
    defaultLabel: { "zh-CN": "系统设置", "en-US": "Settings" },
  },
};

const dataAgentChildren: MenuNode[] = [
  builtinNode("data-agent.general"),
  builtinNode("data-agent.discovery"),
  builtinNode("data-agent.qa"),
  builtinNode("data-agent.development"),
  builtinNode("data-agent.governance"),
  builtinNode("data-agent.operations"),
];

const dataAssetChildren: MenuNode[] = [
  builtinNode("data-asset.catalog"),
  builtinNode("data-asset.circulation"),
  builtinNode("data-asset.ownership"),
  builtinNode("data-asset.value"),
  builtinNode("data-asset.service"),
  builtinNode("data-asset.audit"),
  builtinNode("data-asset.reports"),
];

const dataSourceChildren = [
  builtinNode("data-source.sources"),
  builtinNode("data-source.sync"),
  builtinNode("data-source.exchange"),
];
const dataLakeChildren = [
  builtinNode("data-lake.storage"),
  builtinNode("data-lake.tables"),
  builtinNode("data-lake.capacity"),
];
const dataGovernanceCenterChildren = [
  builtinNode("data-governance.center"),
  builtinNode("data-governance.center.organization"),
  builtinNode("data-governance.center.regulation"),
  builtinNode("data-governance.center.culture"),
];
const dataGovernanceMetadataChildren = [
  builtinNode("data-governance.metadata"),
  builtinNode("data-governance.metadata.model"),
  builtinNode("data-governance.metadata.quality"),
  builtinNode("data-governance.metadata.reports"),
];
const dataGovernanceQualityChildren = [
  builtinNode("data-governance.quality"),
  builtinNode("data-governance.quality.requirements"),
  builtinNode("data-governance.quality.rules"),
  builtinNode("data-governance.quality.issues"),
  builtinNode("data-governance.quality.analysis"),
  builtinNode("data-governance.quality.improvement"),
];
const dataGovernanceChildren = [
  builtinNode("data-governance.group.center", dataGovernanceCenterChildren),
  builtinNode("data-governance.group.metadata", dataGovernanceMetadataChildren),
  builtinNode("data-governance.group.quality", dataGovernanceQualityChildren),
];
const dataStandardChildren = [
  builtinNode("data-standard.business-terms"),
  builtinNode("data-standard.master-data"),
  builtinNode("data-standard.reference-data"),
  builtinNode("data-standard.data-element-standards"),
  builtinNode("data-standard.metric-dictionary"),
];
const dataDevelopmentChildren = [
  builtinNode("data-development.etl"),
  builtinNode("data-development.sql"),
  builtinNode("data-development.notebook"),
];
const schedulerChildren = [
  builtinNode("scheduler.tasks"),
  builtinNode("scheduler.editor"),
  builtinNode("scheduler.monitor"),
];
const opsMonitorChildren = [
  builtinNode("ops-monitor.tasks"),
  builtinNode("ops-monitor.lineage"),
  builtinNode("ops-monitor.quality"),
  builtinNode("ops-monitor.resource"),
];
const dataSecurityComplianceChildren = [
  builtinNode("data-security.compliance"),
  builtinNode("data-security.compliance-reviews"),
  builtinNode("data-security.personal-information"),
  builtinNode("data-security.important-data"),
  builtinNode("data-security.cross-border"),
];
const dataSecurityClassificationChildren = [
  builtinNode("data-security.classification"),
  builtinNode("data-security.classification-reviews"),
  builtinNode("data-security.classification-rules"),
  builtinNode("data-security.classification-reports"),
];
const dataSecurityProtectionChildren = [
  builtinNode("data-security.protection"),
  builtinNode("data-security.access-control"),
  builtinNode("data-security.masking"),
  builtinNode("data-security.encryption"),
  builtinNode("data-security.watermark"),
  builtinNode("data-security.risk"),
];
const dataSecurityAuditChildren = [
  builtinNode("data-security.audit"),
  builtinNode("data-security.audit-executions"),
  builtinNode("data-security.audit-evidence"),
  builtinNode("data-security.audit-reports"),
  builtinNode("data-security.audit-findings"),
];
const dataSecurityIncidentChildren = [
  builtinNode("data-security.incidents"),
  builtinNode("data-security.incident-sop"),
  builtinNode("data-security.incident-notifications"),
  builtinNode("data-security.incident-drills"),
];
const dataSecurityChildren = [
  builtinNode("data-security.overview"),
  builtinNode("data-security.group.compliance", dataSecurityComplianceChildren),
  builtinNode("data-security.group.classification", dataSecurityClassificationChildren),
  builtinNode("data-security.group.protection", dataSecurityProtectionChildren),
  builtinNode("data-security.group.audit", dataSecurityAuditChildren),
  builtinNode("data-security.group.incidents", dataSecurityIncidentChildren),
];

const DEPRECATED_MENU_KEYS = new Set([
  "product-matrix",
  "solutions",
  "agents",
  "workflow",
  "insights",
  "knowledge-center",
  "knowledge-center.knowledge-bases",
  "knowledge-center.documents",
  "knowledge-center.reports",
  "knowledge-center.permissions",
  "knowledge-center.vectors",
  "kg",
  "kg.graphs",
  "kg.metadata",
  "kg.import",
  "kg.analysis",
  "kg.visualization",
  "kg.async-tasks",
  "kg.computer",
  "kg.ai",
  "kg.ai-graph",
  "kg.admin",
  "kg.help",
  "data-asset.scan-tasks",
  "data-governance.standards",
  "data-governance.lifecycle",
]);

export function builtinNode(key: string, children?: MenuNode[]): MenuNode {
  const entry = BUILTIN_MENU[key];

  return {
    id: key,
    builtinRouteKey: key,
    label: { ...entry.defaultLabel },
    visible: true,
    ...(children ? { children: cloneMenuNodes(children) } : {}),
  };
}

export function createDefaultMenuConfig(): MenuConfig {
  return {
    version: 14,
    updatedAt: new Date().toISOString(),
    root: createDefaultRootNodes(),
  };
}

export async function loadMenuConfigFromPublic(): Promise<MenuConfig> {
  try {
    const url = `${import.meta.env.BASE_URL}menu.config.json`;
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) throw new Error(`menu.config.json status ${res.status}`);
    const raw = (await res.json()) as MenuConfig;
    return normalizeMenuConfig(raw);
  } catch {
    return createDefaultMenuConfig();
  }
}

export function cloneMenuConfig(config: MenuConfig): MenuConfig {
  return structuredClone(config);
}

export function normalizeMenuConfig(config: MenuConfig): MenuConfig {
  const defaults = createDefaultRootNodes();
  const source = reparentLegacyDataSecurityChildren(
    removeDeprecatedBuiltinNodes(flattenLegacySections(config.root)),
  );

  return {
    ...config,
    version: 12,
    root: mergeMissingBuiltinNodes(source, defaults),
  };
}

export function resolveMenuLabel(node: MenuNode, locale: Locale) {
  return node.label[locale] || node.label["zh-CN"] || node.label["en-US"];
}

export function canContainChildren(node: MenuNode) {
  if (node.customGroup) return true;
  if (!node.builtinRouteKey) return true;
  return !BUILTIN_MENU[node.builtinRouteKey]?.to;
}

function flattenLegacySections(nodes: MenuNode[]): MenuNode[] {
  return nodes.flatMap((node) => {
    if (node.id === "section.workspace" || node.id === "section.platform") {
      return node.children ?? [];
    }

    return [
      {
        ...node,
        children: node.children ? flattenLegacySections(node.children) : undefined,
      },
    ];
  });
}

function removeDeprecatedBuiltinNodes(nodes: MenuNode[]): MenuNode[] {
  return nodes.flatMap((node) => {
    if (node.builtinRouteKey && DEPRECATED_MENU_KEYS.has(node.builtinRouteKey)) return [];

    return [
      {
        ...node,
        children: node.children ? removeDeprecatedBuiltinNodes(node.children) : undefined,
      },
    ];
  });
}

function reparentLegacyDataSecurityChildren(nodes: MenuNode[]): MenuNode[] {
  return nodes.map((node) => {
    if (node.builtinRouteKey !== "data-security" || !node.children) {
      return {
        ...node,
        children: node.children ? reparentLegacyDataSecurityChildren(node.children) : undefined,
      };
    }

    const legacyClassification = node.children.find(
      (child) => child.builtinRouteKey === "data-security.classification",
    );
    const legacyMasking = node.children.find(
      (child) => child.builtinRouteKey === "data-security.masking",
    );
    if (!legacyClassification && !legacyMasking) return node;

    const remaining = node.children.filter(
      (child) =>
        child.builtinRouteKey !== "data-security.classification" &&
        child.builtinRouteKey !== "data-security.masking",
    );

    function moveIntoGroup(groupKey: string, legacyChild: MenuNode | undefined) {
      if (!legacyChild) return;
      const existingIndex = remaining.findIndex((child) => child.builtinRouteKey === groupKey);
      if (existingIndex >= 0) {
        const group = remaining[existingIndex];
        remaining[existingIndex] = {
          ...group,
          children: [legacyChild, ...(group.children ?? []).filter((child) => child.builtinRouteKey !== legacyChild.builtinRouteKey)],
        };
      } else {
        remaining.push(builtinNode(groupKey, [legacyChild]));
      }
    }

    moveIntoGroup("data-security.group.classification", legacyClassification);
    moveIntoGroup("data-security.group.protection", legacyMasking);
    return { ...node, children: remaining };
  });
}

function createDefaultRootNodes(): MenuNode[] {
  return [
    builtinNode("metrics"),
    builtinNode("data-agent", dataAgentChildren),
    builtinNode("data-source", dataSourceChildren),
    builtinNode("data-lake", dataLakeChildren),
    builtinNode("data-standard", dataStandardChildren),
    builtinNode("data-governance", dataGovernanceChildren),
    builtinNode("data-development", dataDevelopmentChildren),
    builtinNode("data-asset", dataAssetChildren),
    builtinNode("scheduler", schedulerChildren),
    builtinNode("ops-monitor", opsMonitorChildren),
    builtinNode("data-security", dataSecurityChildren),
    builtinNode("settings"),
  ];
}

function mergeMissingBuiltinNodes(nodes: MenuNode[], defaults: MenuNode[]): MenuNode[] {
  const normalized = nodes.map((node) => {
    const defaultNode = node.builtinRouteKey
      ? findBuiltinNode(defaults, node.builtinRouteKey)
      : null;

    return {
      ...node,
      children: node.children
        ? mergeMissingBuiltinNodes(node.children, defaultNode?.children ?? [])
        : defaultNode?.children
          ? cloneMenuNodes(defaultNode.children)
          : undefined,
    };
  });

  const existingKeys = collectBuiltinKeys(normalized);
  const missingDefaults = defaults.filter(
    (node) => node.builtinRouteKey && !existingKeys.has(node.builtinRouteKey),
  );

  if (!missingDefaults.length) return normalized;

  return insertMissingDefaultsInOrder(normalized, missingDefaults, defaults);
}

function findBuiltinNode(nodes: MenuNode[], key: string): MenuNode | null {
  for (const node of nodes) {
    if (node.builtinRouteKey === key) return node;
    const childMatch = node.children ? findBuiltinNode(node.children, key) : null;
    if (childMatch) return childMatch;
  }

  return null;
}

function collectBuiltinKeys(nodes: MenuNode[]) {
  const keys = new Set<string>();

  nodes.forEach((node) => {
    if (node.builtinRouteKey) keys.add(node.builtinRouteKey);
    if (node.children) {
      collectBuiltinKeys(node.children).forEach((key) => keys.add(key));
    }
  });

  return keys;
}

function cloneMenuNodes(nodes: MenuNode[]): MenuNode[] {
  return structuredClone(nodes);
}

function insertMissingDefaultsInOrder(
  nodes: MenuNode[],
  missingDefaults: MenuNode[],
  defaults: MenuNode[],
): MenuNode[] {
  const next = [...nodes];

  missingDefaults.forEach((defaultNode) => {
    const defaultIndex = defaultNode.builtinRouteKey
      ? defaults.findIndex((node) => node.builtinRouteKey === defaultNode.builtinRouteKey)
      : -1;
    const insertAt = next.findIndex((node) => {
      if (!node.builtinRouteKey) return false;
      const currentDefaultIndex = defaults.findIndex(
        (defaultSibling) => defaultSibling.builtinRouteKey === node.builtinRouteKey,
      );
      return currentDefaultIndex > defaultIndex;
    });

    if (insertAt === -1) {
      next.push(cloneMenuNodes([defaultNode])[0]);
    } else {
      next.splice(insertAt, 0, cloneMenuNodes([defaultNode])[0]);
    }
  });

  return next;
}
