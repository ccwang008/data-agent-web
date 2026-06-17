import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Brain,
  BrainCog,
  Database,
  FileInput,
  FileText,
  GitBranch,
  HelpCircle,
  LineChart,
  Network,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  SquareCode,
  Timer,
  Workflow,
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
  kg: {
    key: "kg",
    matchPrefix: "/knowledge-graph",
    icon: Network,
    status: "ready",
    defaultLabel: { "zh-CN": "知识图谱", "en-US": "Knowledge Graph" },
  },
  "kg.graphs": {
    key: "kg.graphs",
    to: "/knowledge-graph/graphs",
    icon: Network,
    defaultLabel: { "zh-CN": "图实例", "en-US": "Graphs" },
  },
  "kg.metadata": {
    key: "kg.metadata",
    to: "/knowledge-graph/metadata",
    icon: Database,
    defaultLabel: { "zh-CN": "元数据建模", "en-US": "Metadata" },
  },
  "kg.import": {
    key: "kg.import",
    to: "/knowledge-graph/import",
    icon: FileInput,
    defaultLabel: { "zh-CN": "数据导入", "en-US": "Import" },
  },
  "kg.analysis": {
    key: "kg.analysis",
    to: "/knowledge-graph/analysis",
    icon: SquareCode,
    defaultLabel: { "zh-CN": "数据分析", "en-US": "Analysis" },
  },
  "kg.visualization": {
    key: "kg.visualization",
    to: "/knowledge-graph/visualization",
    icon: GitBranch,
    defaultLabel: { "zh-CN": "图谱浏览", "en-US": "Visualization" },
  },
  "kg.async-tasks": {
    key: "kg.async-tasks",
    to: "/knowledge-graph/async-tasks",
    icon: Timer,
    defaultLabel: { "zh-CN": "异步任务", "en-US": "Async Tasks" },
  },
  "kg.computer": {
    key: "kg.computer",
    to: "/knowledge-graph/computer",
    icon: LineChart,
    defaultLabel: { "zh-CN": "图计算", "en-US": "Computer" },
  },
  "kg.ai": {
    key: "kg.ai",
    to: "/knowledge-graph/ai",
    icon: Brain,
    defaultLabel: { "zh-CN": "图 AI", "en-US": "AI" },
  },
  "kg.ai-graph": {
    key: "kg.ai-graph",
    to: "/knowledge-graph/ai-graph",
    icon: BrainCog,
    defaultLabel: { "zh-CN": "AI 图谱", "en-US": "AI Graph" },
  },
  "kg.admin": {
    key: "kg.admin",
    to: "/knowledge-graph/admin",
    icon: ShieldAlert,
    defaultLabel: { "zh-CN": "管理中心", "en-US": "Admin" },
  },
  "kg.help": {
    key: "kg.help",
    to: "/knowledge-graph/help",
    icon: HelpCircle,
    defaultLabel: { "zh-CN": "帮助文档", "en-US": "Help" },
  },
  "knowledge-center": {
    key: "knowledge-center",
    matchPrefix: "/knowledge-center",
    icon: BookOpen,
    status: "ready",
    defaultLabel: { "zh-CN": "知识中心", "en-US": "Knowledge Center" },
  },
  "knowledge-center.knowledge-bases": {
    key: "knowledge-center.knowledge-bases",
    to: "/knowledge-center/knowledge-bases",
    icon: BookOpen,
    defaultLabel: { "zh-CN": "知识库", "en-US": "Knowledge Base" },
  },
  "knowledge-center.documents": {
    key: "knowledge-center.documents",
    to: "/knowledge-center/documents",
    icon: FileText,
    defaultLabel: { "zh-CN": "文档管理", "en-US": "Document Management" },
  },
  "knowledge-center.reports": {
    key: "knowledge-center.reports",
    to: "/knowledge-center/reports",
    icon: LineChart,
    defaultLabel: { "zh-CN": "分析报表", "en-US": "Analysis Reports" },
  },
  "knowledge-center.permissions": {
    key: "knowledge-center.permissions",
    to: "/knowledge-center/permissions",
    icon: ShieldCheck,
    defaultLabel: { "zh-CN": "知识权限", "en-US": "Knowledge Permissions" },
  },
  "data-source": {
    key: "data-source",
    to: "/data-source",
    icon: Database,
    status: "todo",
    defaultLabel: { "zh-CN": "数据源", "en-US": "Data Source" },
  },
  agents: {
    key: "agents",
    to: "/agents",
    icon: Sparkles,
    status: "todo",
    defaultLabel: { "zh-CN": "智能体", "en-US": "Agents" },
  },
  workflow: {
    key: "workflow",
    to: "/workflow",
    icon: Workflow,
    status: "todo",
    defaultLabel: { "zh-CN": "编排流水线", "en-US": "Workflow" },
  },
  insights: {
    key: "insights",
    to: "/insights",
    icon: LineChart,
    status: "todo",
    defaultLabel: { "zh-CN": "洞察分析", "en-US": "Insights" },
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

const kgChildren: MenuNode[] = [
  builtinNode("kg.graphs"),
  builtinNode("kg.metadata"),
  builtinNode("kg.import"),
  builtinNode("kg.analysis"),
  builtinNode("kg.visualization"),
  builtinNode("kg.async-tasks"),
  builtinNode("kg.computer"),
  builtinNode("kg.ai"),
  builtinNode("kg.ai-graph"),
  builtinNode("kg.admin"),
  builtinNode("kg.help"),
];

const knowledgeCenterChildren: MenuNode[] = [
  builtinNode("knowledge-center.knowledge-bases"),
  builtinNode("knowledge-center.documents"),
  builtinNode("knowledge-center.reports"),
  builtinNode("knowledge-center.permissions"),
];

const DEPRECATED_MENU_KEYS = new Set(["knowledge-center.vectors"]);

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
    version: 2,
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
  return {
    ...config,
    version: 2,
    root: mergeMissingBuiltinNodes(
      removeDeprecatedBuiltinNodes(flattenLegacySections(config.root)),
      createDefaultRootNodes(),
    ),
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

function createDefaultRootNodes(): MenuNode[] {
  return [
    builtinNode("kg", kgChildren),
    builtinNode("knowledge-center", knowledgeCenterChildren),
    builtinNode("data-source"),
    builtinNode("agents"),
    builtinNode("workflow"),
    builtinNode("insights"),
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
