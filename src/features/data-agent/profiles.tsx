import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bot,
  Code2,
  MessageSquareText,
  Search,
  ShieldCheck,
} from "lucide-react";

import type { AgentKey } from "./types";

export interface AgentProfile {
  key: AgentKey;
  name: string;
  englishName: string;
  description: string;
  route: string;
  icon: LucideIcon;
  prompt: string;
  suggestions: string[];
  accent: string;
  soft: string;
}

export const agentProfiles: Record<AgentKey, AgentProfile> = {
  general: {
    key: "general",
    name: "通用 Agent",
    englishName: "General Agent",
    description: "理解复杂数据需求，自动路由专业 Agent，并汇总跨域结果与待确认动作。",
    route: "/data-agent/general",
    icon: Bot,
    prompt: "描述一个跨数据发现、问答、开发、治理或运维的需求…",
    suggestions: ["建立每日客户复购率指标并保证稳定运行", "评估门店画像数据是否可以用于营销", "分析华东销售下降并给出修复计划"],
    accent: "text-blue-700",
    soft: "bg-blue-50",
  },
  discovery: {
    key: "discovery",
    name: "数据发现 Agent",
    englishName: "Data Discovery Agent",
    description: "用语义、质量、安全、血缘和权限证据寻找最适合的数据资产。",
    route: "/data-agent/discovery",
    icon: Search,
    prompt: "描述你想寻找的数据、指标或业务对象…",
    suggestions: ["寻找计算客户复购率所需的数据", "查找供应商风险画像数据", "有哪些可用于流失预测的客户数据"],
    accent: "text-cyan-700",
    soft: "bg-cyan-50",
  },
  qa: {
    key: "qa",
    name: "数据问答 Agent",
    englishName: "Data Q&A Agent",
    description: "基于批准口径和可信资产生成带图表、解释与来源证据的数据回答。",
    route: "/data-agent/qa",
    icon: MessageSquareText,
    prompt: "输入你希望通过数据回答的业务问题…",
    suggestions: ["为什么华东区销售额下降", "本月 VIP 活跃率是多少", "比较各渠道订单转化率"],
    accent: "text-indigo-700",
    soft: "bg-indigo-50",
  },
  development: {
    key: "development",
    name: "数据开发 Agent",
    englishName: "Data Development Agent",
    description: "把需求转成可确认的 SQL、ETL 或 Notebook 草稿、差异和校验结果。",
    route: "/data-agent/development",
    icon: Code2,
    prompt: "描述要开发或优化的数据产物…",
    suggestions: ["生成每日客户复购率 SQL", "把库存同步改为增量处理", "为客户标签构建 ETL"],
    accent: "text-violet-700",
    soft: "bg-violet-50",
  },
  governance: {
    key: "governance",
    name: "数据治理 Agent",
    englishName: "Data Governance Agent",
    description: "跨标准、元数据、质量、安全和认责发现差距并生成整改候选。",
    route: "/data-agent/governance",
    icon: ShieldCheck,
    prompt: "描述需要检查的治理范围或数据问题…",
    suggestions: ["检查客户主题数据的标准与质量", "识别手机号字段治理问题", "比对复购率指标口径冲突"],
    accent: "text-emerald-700",
    soft: "bg-emerald-50",
  },
  operations: {
    key: "operations",
    name: "数据运维 Agent",
    englishName: "Data Operations Agent",
    description: "结合拓扑、时间线和运行证据定位根因，并生成安全的恢复 Runbook。",
    route: "/data-agent/operations",
    icon: Activity,
    prompt: "描述失败任务、链路异常或需要诊断的运行对象…",
    suggestions: ["诊断每日复购率任务失败", "分析客户标签任务连续失败", "定位会员查询服务延迟"],
    accent: "text-amber-700",
    soft: "bg-amber-50",
  },
};

export const agentOrder: AgentKey[] = ["general", "discovery", "qa", "development", "governance", "operations"];
