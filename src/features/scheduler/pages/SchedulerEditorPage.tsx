import { useCallback, useEffect, useMemo, useState, type ComponentType, type DragEvent, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Handle,
  Position,
  Panel,
  useReactFlow,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Node,
  type Edge,
  type NodeProps,
  type Connection,
  type NodeChange,
  type EdgeChange,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  Braces,
  ChevronDown,
  ChevronRight,
  Code,
  Database,
  FileInput,
  Filter,
  GitBranch,
  Globe,
  Layers,
  MessageSquare,
  Play,
  Plus,
  Save,
  Server,
  ShieldCheck,
  Settings2,
  Square,
  Table,
  Trash2,
} from "lucide-react";

import { mockClient } from "@/lib/mock-client";
import { cn } from "@/lib/utils";
import {
  type SchedulerGraph,
  type SchedulerGraphNode,
  type SchedulerNodeCategory,
  type SchedulerNodeData,
  type SchedulerTask,
  type SchedulerTaskType,
} from "../api/mock";

const CATEGORY_META: Record<SchedulerNodeCategory, { title: string; badge: string; accent: string; border: string; header: string }> = {
  integration: {
    title: "数据集成",
    badge: "bg-cyan-500/10 text-cyan-700",
    accent: "bg-cyan-500",
    border: "border-cyan-300",
    header: "bg-cyan-50",
  },
  development: {
    title: "数据开发",
    badge: "bg-blue-500/10 text-blue-600",
    accent: "bg-blue-500",
    border: "border-blue-300",
    header: "bg-blue-50",
  },
  processing: {
    title: "数据处理",
    badge: "bg-amber-500/10 text-amber-600",
    accent: "bg-amber-500",
    border: "border-amber-300",
    header: "bg-amber-50",
  },
  quality: {
    title: "数据质量校验",
    badge: "bg-rose-500/10 text-rose-600",
    accent: "bg-rose-500",
    border: "border-rose-300",
    header: "bg-rose-50",
  },
  service: {
    title: "数据服务",
    badge: "bg-violet-500/10 text-violet-600",
    accent: "bg-violet-500",
    border: "border-violet-300",
    header: "bg-violet-50",
  },
  sync: {
    title: "数据集成",
    badge: "bg-cyan-500/10 text-cyan-700",
    accent: "bg-cyan-500",
    border: "border-cyan-300",
    header: "bg-cyan-50",
  },
};

interface NodeTemplate {
  type: string;
  category: SchedulerNodeCategory;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  config: Record<string, string>;
}

const NODE_TEMPLATES: NodeTemplate[] = [
  { type: "database-integration", category: "integration", label: "数据库集成", description: "接入数据库和湖表数据", icon: Database, config: { connector: "mock://source-db", target: "mock://lakehouse", mode: "增量同步" } },
  { type: "file-integration", category: "integration", label: "文件集成", description: "接入 CSV、Parquet 等文件", icon: FileInput, config: { source: "mock://files/incoming", format: "Parquet", mode: "追加" } },
  { type: "message-integration", category: "integration", label: "消息 / CDC", description: "接入消息队列和 CDC 事件", icon: MessageSquare, config: { topic: "mock.sales.order", mode: "消费" } },
  { type: "api-integration", category: "integration", label: "API 集成", description: "接入外部 API 数据", icon: Globe, config: { endpoint: "/mock-api/source", method: "GET" } },
  { type: "sql", category: "development", label: "SQL 开发", description: "编写 SQL 查询和模型", icon: Code, config: { language: "SQL", script: "SELECT * FROM input" } },
  { type: "python", category: "development", label: "Python 脚本", description: "执行 Python 数据处理脚本", icon: Braces, config: { language: "Python", script: "# mock script\nreturn input" } },
  { type: "notebook", category: "development", label: "Notebook", description: "运行 Notebook 开发任务", icon: Table, config: { kernel: "Python 3", notebook: "analysis.ipynb" } },
  { type: "clean", category: "processing", label: "数据清洗", description: "处理缺失值和异常值", icon: Filter, config: { operation: "异常值过滤", expression: "value IS NOT NULL" } },
  { type: "join", category: "processing", label: "关联 Join", description: "关联多个输入数据集", icon: GitBranch, config: { operation: "Join", expression: "left.id = right.id" } },
  { type: "aggregate", category: "processing", label: "指标聚合", description: "分组聚合计算指标", icon: Layers, config: { operation: "Group & Aggregate", expression: "GROUP BY dimension" } },
  { type: "quality-check", category: "quality", label: "数据质量校验", description: "校验完整性、准确性和唯一性", icon: ShieldCheck, config: { rule: "id IS NOT NULL", dimensions: "完整性 / 准确性", threshold: "通过率 ≥ 99%" } },
  { type: "quality-gate", category: "quality", label: "质量门禁", description: "质量不达标时阻断下游任务", icon: ShieldCheck, config: { rule: "quality_score >= 99", threshold: "99%", action: "阻断下游" } },
  { type: "quality-profile", category: "quality", label: "质量剖析", description: "生成字段分布和异常概览", icon: Table, config: { dimensions: "空值率 / 唯一值 / 分布", sample: "10,000 行" } },
  { type: "publish", category: "service", label: "发布数据服务", description: "发布可调用的数据服务", icon: Server, config: { endpoint: "/mock-api/v1/data", method: "POST", timeout: "30s" } },
  { type: "refresh", category: "service", label: "刷新服务缓存", description: "刷新服务数据缓存", icon: Settings2, config: { service: "mock-data-service", strategy: "增量刷新" } },
];

const CATEGORY_ORDER: SchedulerNodeCategory[] = ["integration", "development", "processing", "quality", "service"];

function categoryColor(category: SchedulerNodeCategory) {
  return {
    integration: "#06b6d4",
    development: "#3b82f6",
    processing: "#f59e0b",
    quality: "#f43f5e",
    service: "#8b5cf6",
    sync: "#06b6d4",
  }[category] ?? "#64748b";
}

function getTemplate(type: string) {
  return NODE_TEMPLATES.find((template) => template.type === type);
}

function readData(data: unknown) {
  return data as SchedulerNodeData;
}

function toFlowNodes(graphNodes: SchedulerGraphNode[]): Node<SchedulerNodeData>[] {
  return graphNodes.map((node) => ({ ...node }));
}

function toGraph(nodes: Node<SchedulerNodeData>[], edges: Edge[]): SchedulerGraph {
  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      type: "dataNode",
      position: node.position,
      data: readData(node.data),
    })),
    edges: edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target, animated: edge.animated })),
  };
}

function newNodeData(template: NodeTemplate): SchedulerNodeData {
  return {
    label: template.label,
    description: template.description,
    category: template.category,
    config: { ...template.config },
  };
}

function DataNode(props: NodeProps) {
  const data = readData(props.data);
  const meta = CATEGORY_META[data.category] ?? CATEGORY_META.integration;
  const resultClass = data.result?.status === "success" ? "bg-emerald-500" : data.result?.status === "failed" ? "bg-red-500" : data.result?.status === "running" ? "bg-blue-500" : "bg-slate-300";
  return (
    <div className={cn("w-[220px] overflow-hidden rounded-lg border bg-card shadow-sm transition-all", meta.border, props.selected && "ring-2 ring-offset-2 ring-offset-white ring-primary/40")}>
      <div className={cn("flex items-center gap-2 px-3 py-2 text-[12px] font-semibold text-slate-700", meta.header)}>
        <span className={cn("h-2 w-2 rounded-full", meta.accent)} />
        <span className="min-w-0 flex-1 truncate">{data.label}</span>
        <span className={cn("h-1.5 w-1.5 rounded-full", resultClass, data.result?.status === "running" && "animate-pulse")} />
      </div>
      <div className="px-3 py-2.5 text-[12px] text-muted-foreground">{data.description}</div>
      <div className="border-t border-border/70 px-3 py-1.5 text-[10px] text-muted-foreground">{meta.title} · 点击查看结果</div>
      <Handle type="target" position={Position.Left} className="!h-3 !w-3 !border-2 !border-white !bg-slate-400" />
      <Handle type="source" position={Position.Right} className="!h-3 !w-3 !border-2 !border-white !bg-slate-400" />
    </div>
  );
}

const nodeTypes: NodeTypes = { dataNode: DataNode };

function DraggableTemplate({ template }: { template: NodeTemplate }) {
  const meta = CATEGORY_META[template.category];
  const Icon = template.icon;
  const onDragStart = (event: DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData("application/reactflow", template.type);
    event.dataTransfer.effectAllowed = "move";
  };
  return (
    <div draggable onDragStart={onDragStart} className="flex cursor-grab items-center gap-2 rounded-md border border-border bg-card px-2.5 py-2 text-[12px] transition-colors hover:border-primary/40 hover:bg-primary/5 active:cursor-grabbing">
      <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md", meta.badge)}><Icon className="h-3.5 w-3.5" /></span>
      <span className="min-w-0 flex-1 truncate font-medium text-foreground">{template.label}</span>
    </div>
  );
}

function NodePalette() {
  const [expanded, setExpanded] = useState<Record<SchedulerNodeCategory, boolean>>({ integration: true, development: true, processing: true, quality: true, service: true, sync: true });
  return (
    <aside className="flex h-full w-[220px] shrink-0 flex-col overflow-hidden border-r border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground"><Settings2 className="h-3.5 w-3.5 text-primary" />节点面板</div>
        <p className="mt-1 text-[11px] leading-4 text-muted-foreground">拖拽节点到画布，连接后形成调度 DAG</p>
      </div>
      <div className="scrollbar-thin flex-1 space-y-2 overflow-y-auto p-3">
        {CATEGORY_ORDER.map((category) => {
          const meta = CATEGORY_META[category];
          const items = NODE_TEMPLATES.filter((template) => template.category === category);
          const isOpen = expanded[category];
          return (
            <div key={category}>
              <button type="button" onClick={() => setExpanded((current) => ({ ...current, [category]: !current[category] }))} className="flex w-full items-center justify-between rounded-md px-1.5 py-1.5 text-[12px] font-medium text-slate-700 hover:bg-slate-100">
                <span className="flex items-center gap-1.5"><span className={cn("h-2 w-2 rounded-full", meta.accent)} />{meta.title}<span className="text-[11px] text-muted-foreground">({items.length})</span></span>
                {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
              {isOpen && <div className="mt-1.5 space-y-1.5">{items.map((template) => <DraggableTemplate key={template.type} template={template} />)}</div>}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function ConfigField({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-[12px] font-medium text-slate-700">{label}</span>{children}</label>;
}

const CONFIG_LABELS: Record<string, string> = {
  language: "语言",
  script: "脚本 / SQL",
  kernel: "计算内核",
  notebook: "Notebook 文件",
  operation: "处理方式",
  expression: "规则 / 表达式",
  connector: "连接器",
  source: "源端",
  target: "目标端",
  mode: "同步模式",
  topic: "消息主题",
  rule: "校验规则",
  dimensions: "质量维度",
  threshold: "通过阈值",
  action: "不通过动作",
  format: "文件格式",
  sample: "采样范围",
  endpoint: "服务地址",
  method: "请求方式",
  timeout: "超时",
  service: "服务名称",
  strategy: "刷新策略",
};

function PropertyPanel({
  node,
  onClose,
  onRun,
  onDelete,
  onUpdate,
}: {
  node: Node<SchedulerNodeData>;
  onClose: () => void;
  onRun: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: Partial<SchedulerNodeData>) => void;
}) {
  const data = readData(node.data);
  const meta = CATEGORY_META[data.category] ?? CATEGORY_META.integration;
  const [label, setLabel] = useState(data.label);
  const [description, setDescription] = useState(data.description);
  const [config, setConfig] = useState<Record<string, string>>({ ...data.config });

  useEffect(() => {
    setLabel(data.label);
    setDescription(data.description);
    setConfig({ ...data.config });
  }, [data.config, data.description, data.label, node.id]);

  const save = () => onUpdate(node.id, { label: label.trim() || data.label, description: description.trim(), config });
  const configEntries = Object.entries(config);

  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col overflow-hidden border-l border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground"><span className={cn("h-2.5 w-2.5 rounded-full", meta.accent)} />节点属性</div>
        <button type="button" onClick={onClose} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-slate-100 hover:text-foreground"><ChevronRight className="h-4 w-4" /></button>
      </div>
      <div className="scrollbar-thin flex-1 overflow-y-auto p-4">
        <div className="rounded-lg border border-border bg-surface-raised px-3 py-2.5">
          <div className="text-[14px] font-semibold text-foreground">{data.label}</div>
          <div className={cn("mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium", meta.badge)}>{meta.title}</div>
          <div className="mt-1 text-[12px] text-muted-foreground">{data.description}</div>
        </div>

        <div className="mt-4 space-y-3.5">
          <ConfigField label="节点名称"><input value={label} onChange={(event) => setLabel(event.target.value)} className="h-8 w-full rounded-md border border-input bg-card px-2.5 text-[12px] text-foreground outline-none focus:border-primary" /></ConfigField>
          {configEntries.map(([key, value]) => <ConfigField key={key} label={CONFIG_LABELS[key] ?? key}><textarea value={value} onChange={(event) => setConfig((current) => ({ ...current, [key]: event.target.value }))} rows={key === "script" || key === "expression" ? 3 : 1} className={cn("w-full resize-none rounded-md border border-input bg-card px-2.5 py-2 text-[12px] text-foreground outline-none focus:border-primary", (key === "script" || key === "expression") && "font-mono text-[11px]")} /></ConfigField>)}
          <ConfigField label="描述"><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} className="w-full resize-none rounded-md border border-input bg-card px-2.5 py-2 text-[12px] text-foreground outline-none focus:border-primary" /></ConfigField>
        </div>

        <div className="mt-4 flex gap-2">
          <button type="button" onClick={save} className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-[12px] font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"><Save className="h-3.5 w-3.5" />保存属性</button>
          <button type="button" onClick={() => onDelete(node.id)} className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-red-200 bg-red-50 px-3 text-[12px] font-medium text-red-600 transition-colors hover:bg-red-100"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>

        <div className="mt-5 rounded-lg border border-border bg-surface-raised p-3">
          <div className="flex items-center justify-between"><div className="text-[12px] font-semibold text-slate-700">查看节点结果</div><button type="button" onClick={() => onRun(node.id)} className="inline-flex h-7 items-center gap-1 rounded-md border border-input bg-card px-2 text-[11px] text-foreground hover:border-primary/30 hover:text-primary"><Play className="h-3 w-3" />执行</button></div>
          <div className="mt-2">{data.result ? <div className="flex items-start gap-2"><span className={cn("mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium", data.result.status === "success" ? "border border-emerald-200 bg-emerald-50 text-emerald-600" : data.result.status === "running" ? "border border-blue-200 bg-blue-50 text-blue-600" : "border border-red-200 bg-red-50 text-red-600")}>{data.result.status === "success" ? "成功" : data.result.status === "running" ? "运行中" : data.result.status === "stopped" ? "已停止" : "失败"}</span><span className="flex-1 text-[12px] leading-5 text-muted-foreground">{data.result.message}</span></div> : <div className="text-[12px] text-muted-foreground">尚未执行，点击执行按钮查看 mock 结果</div>}</div>
        </div>
      </div>
    </aside>
  );
}

interface ToolbarProps {
  tasks: SchedulerTask[];
  taskId: string;
  taskName: string;
  taskType: SchedulerTaskType;
  status: SchedulerTask["status"];
  zoom: number;
  running: boolean;
  saving: boolean;
  isNew: boolean;
  onTaskChange: (id: string) => void;
  onTaskNameChange: (value: string) => void;
  onTaskTypeChange: (value: SchedulerTaskType) => void;
  onNew: () => void;
  onRun: () => void;
  onStop: () => void;
  onSave: () => void;
  onDelete: () => void;
}

function Toolbar({ tasks, taskId, taskName, taskType, status, zoom, running, saving, isNew, onTaskChange, onTaskNameChange, onTaskTypeChange, onNew, onRun, onStop, onSave, onDelete }: ToolbarProps) {
  return (
    <div className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-4 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <select value={isNew ? "new" : taskId} onChange={(event) => onTaskChange(event.target.value)} className="h-8 max-w-[230px] rounded-md border border-input bg-card px-2.5 text-[12px] text-foreground outline-none focus:border-primary">
          <option value="new">新建调度任务</option>
          {tasks.map((task) => <option key={task.id} value={task.id}>{task.name}</option>)}
        </select>
        <button type="button" onClick={onNew} className="inline-flex h-8 items-center gap-1 rounded-md border border-input bg-card px-2.5 text-[12px] font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"><Plus className="h-3.5 w-3.5" />新建</button>
      </div>
      <div className="flex min-w-[220px] flex-1 items-center gap-2 lg:max-w-[430px]">
        <input value={taskName} onChange={(event) => onTaskNameChange(event.target.value)} className="h-8 min-w-0 flex-1 rounded-md border border-input bg-surface-raised px-3 text-[13px] font-medium text-foreground outline-none focus:border-primary" placeholder="输入任务名称" />
        <select value={taskType} onChange={(event) => onTaskTypeChange(event.target.value as SchedulerTaskType)} className="h-8 rounded-md border border-input bg-card px-2 text-[11px] text-foreground outline-none focus:border-primary"><option value="development">开发</option><option value="processing">处理</option><option value="sync">集成</option><option value="service">服务</option></select>
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden text-[11px] text-muted-foreground lg:inline">{isNew ? "未保存" : `v${tasks.find((task) => task.id === taskId)?.version ?? 1} · ${status}`}</span>
        {running ? <button type="button" onClick={onStop} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-red-500 px-3 text-[12px] font-medium text-white shadow-sm transition-opacity hover:opacity-90"><Square className="h-3.5 w-3.5" />停止</button> : <button type="button" onClick={onRun} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald-500 px-3 text-[12px] font-medium text-white shadow-sm transition-opacity hover:opacity-90"><Play className="h-3.5 w-3.5" />运行</button>}
        <button type="button" onClick={onSave} disabled={saving} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-card px-3 text-[12px] font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"><Save className="h-3.5 w-3.5" />{saving ? "保存中" : "保存"}</button>
        <button type="button" onClick={onDelete} className="grid h-8 w-8 place-items-center rounded-md border border-red-200 bg-red-50 text-red-600 transition-colors hover:bg-red-100" aria-label="删除任务"><Trash2 className="h-3.5 w-3.5" /></button>
        <div className="inline-flex h-8 items-center rounded-md border border-input bg-card px-2.5 text-[12px] text-muted-foreground tabular-nums">{Math.round(zoom * 100)}%</div>
      </div>
    </div>
  );
}

interface FlowCanvasProps {
  nodes: Node<SchedulerNodeData>[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  onDropNode: (type: string, x: number, y: number) => void;
  onSelectNode: (id: string) => void;
  onZoomChange: (zoom: number) => void;
}

function FlowCanvas({ nodes, edges, onNodesChange, onEdgesChange, onConnect, onDropNode, onSelectNode, onZoomChange }: FlowCanvasProps) {
  const { screenToFlowPosition } = useReactFlow();
  const onDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const type = event.dataTransfer.getData("application/reactflow");
    if (!type) return;
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    onDropNode(type, position.x, position.y);
  }, [onDropNode, screenToFlowPosition]);
  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);
  return (
    <div className="relative h-full flex-1 bg-slate-50" onDrop={onDrop} onDragOver={onDragOver}>
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} fitView fitViewOptions={{ padding: 0.2 }} panOnDrag zoomOnScroll selectNodesOnDrag={false} onNodeClick={(_, node) => onSelectNode(node.id)} onPaneClick={() => onSelectNode("")} onMove={(_, viewport) => onZoomChange(viewport.zoom)} proOptions={{ hideAttribution: true }}>
        <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="#cbd5e1" />
        <Controls showInteractive={false} position="bottom-right" className="!rounded-lg !border-border !bg-card" />
        <MiniMap nodeStrokeWidth={3} nodeColor={(node) => categoryColor(readData(node.data).category)} maskColor="rgb(15 23 42 / 0.7)" pannable zoomable position="bottom-left" className="!rounded-lg !border-border !bg-slate-900" />
        <Panel position="top-left" className="!m-3 !rounded-md !border-border !bg-card/90 !px-3 !py-2 text-[11px] !text-muted-foreground backdrop-blur-sm">拖拽左侧节点 · 节点可移动、连线、编辑和删除 · 点击节点查看结果</Panel>
      </ReactFlow>
    </div>
  );
}

function SchedulerEditorInner() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedTaskId = searchParams.get("task");
  const isNew = searchParams.get("new") === "1" || !requestedTaskId;
  const [tasks, setTasks] = useState<SchedulerTask[]>([]);
  const [currentTask, setCurrentTask] = useState<SchedulerTask | null>(null);
  const [taskName, setTaskName] = useState("新建调度任务");
  const [taskType, setTaskType] = useState<SchedulerTaskType>("processing");
  const [nodes, setNodes] = useState<Node<SchedulerNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const list = await mockClient.get<SchedulerTask[]>("/api/scheduler/tasks", { latencyMs: 160 });
      if (!active) return;
      setTasks(list);
      if (requestedTaskId) {
        const task = await mockClient.get<SchedulerTask>(`/api/scheduler/tasks/${requestedTaskId}`, { latencyMs: 160 });
        if (!active) return;
        setCurrentTask(task);
        setTaskName(task.name);
        setTaskType(task.type);
        setNodes(toFlowNodes(task.graph.nodes));
        setEdges(task.graph.edges);
      } else {
        setCurrentTask(null);
        setTaskName("新建调度任务");
        setTaskType("processing");
        setNodes([]);
        setEdges([]);
      }
      setSelectedId("");
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [requestedTaskId]);

  const selectedNode = useMemo(() => nodes.find((node) => node.id === selectedId) ?? null, [nodes, selectedId]);

  const onNodesChange = useCallback((changes: NodeChange[]) => setNodes((current) => applyNodeChanges(changes, current) as Node<SchedulerNodeData>[]), []);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => setEdges((current) => applyEdgeChanges(changes, current)), []);
  const onConnect = useCallback((connection: Connection) => setEdges((current) => addEdge({ ...connection, animated: false }, current)), []);

  const onDropNode = useCallback((type: string, x: number, y: number) => {
    const template = getTemplate(type);
    if (!template) return;
    const id = `node-${Date.now()}`;
    setNodes((current) => [...current, { id, type: "dataNode", position: { x, y }, data: newNodeData(template) }]);
    setSelectedId(id);
  }, []);

  const updateNode = useCallback((id: string, patch: Partial<SchedulerNodeData>) => {
    setNodes((current) => current.map((node) => node.id === id ? { ...node, data: { ...node.data, ...patch } } : node));
  }, []);

  const deleteNode = useCallback((id: string) => {
    setNodes((current) => current.filter((node) => node.id !== id));
    setEdges((current) => current.filter((edge) => edge.source !== id && edge.target !== id));
    setSelectedId("");
  }, []);

  const runNode = useCallback((id: string) => {
    setNodes((current) => current.map((node) => node.id === id ? { ...node, data: { ...node.data, result: { status: "running", message: "mock 节点运行中..." } } } : node));
    window.setTimeout(() => setNodes((current) => current.map((node) => node.id === id ? { ...node, data: { ...node.data, result: { status: "success", message: "手动执行成功，耗时 0.42s" } } } : node)), 800);
  }, []);

  const runAll = () => {
    setRunning(true);
    setNodes((current) => current.map((node) => ({ ...node, data: { ...node.data, result: { status: "running", message: "任务运行中..." } } })));
    if (currentTask) void mockClient.post<SchedulerTask>(`/api/scheduler/tasks/${currentTask.id}/run`, { triggeredBy: "画布运行" }).then((task) => setCurrentTask(task));
    window.setTimeout(() => {
      setNodes((current) => current.map((node) => ({ ...node, data: { ...node.data, result: { status: "success", message: "mock 执行成功，结果仅用于演示" } } })));
      setRunning(false);
    }, 1600);
  };

  const stop = () => {
    setRunning(false);
    if (currentTask) void mockClient.post<SchedulerTask>(`/api/scheduler/tasks/${currentTask.id}/stop`).then((task) => setCurrentTask(task));
    setNodes((current) => current.map((node) => node.data.result?.status === "running" ? { ...node, data: { ...node.data, result: { status: "stopped", message: "已停止本次 mock 运行" } } } : node));
  };

  const saveTask = async () => {
    setSaving(true);
    try {
      const graph = toGraph(nodes, edges);
      const payload = { name: taskName.trim() || "未命名调度任务", type: taskType, graph, description: currentTask?.description || "通过画布创建的调度任务", trigger: currentTask?.trigger || { type: "manual" }, enabled: currentTask?.enabled ?? false };
      const saved = currentTask ? await mockClient.patch<SchedulerTask>(`/api/scheduler/tasks/${currentTask.id}`, payload) : await mockClient.post<SchedulerTask>("/api/scheduler/tasks", payload);
      setCurrentTask(saved);
      setTaskName(saved.name);
      setTasks((current) => [saved, ...current.filter((task) => task.id !== saved.id)]);
      navigate(`/scheduler/editor?task=${saved.id}`, { replace: true });
    } finally {
      setSaving(false);
    }
  };

  const deleteTask = async () => {
    if (currentTask) {
      await mockClient.delete(`/api/scheduler/tasks/${currentTask.id}`);
      navigate("/scheduler/tasks");
      return;
    }
    navigate("/scheduler/tasks");
  };

  if (loading) return <div className="page-shell"><div className="grid min-h-[calc(100vh-2rem)] place-items-center rounded-lg border border-border bg-card text-[13px] text-muted-foreground">加载任务画布中...</div></div>;

  return (
    <div className="page-shell animate-fade-in">
      <div className="flex h-full min-h-[calc(100vh-2rem)] overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <NodePalette />
        <div className="flex min-w-0 flex-1 flex-col">
          <Toolbar tasks={tasks} taskId={currentTask?.id ?? "new"} taskName={taskName} taskType={taskType} status={currentTask?.status ?? "draft"} zoom={zoom} running={running} saving={saving} isNew={isNew} onTaskChange={(id) => id === "new" ? navigate("/scheduler/editor?new=1") : navigate(`/scheduler/editor?task=${id}`)} onTaskNameChange={setTaskName} onTaskTypeChange={setTaskType} onNew={() => navigate("/scheduler/editor?new=1")} onRun={runAll} onStop={stop} onSave={() => void saveTask()} onDelete={() => void deleteTask()} />
          <FlowCanvas nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onDropNode={onDropNode} onSelectNode={setSelectedId} onZoomChange={setZoom} />
        </div>
        {selectedNode && <PropertyPanel node={selectedNode} onClose={() => setSelectedId("")} onRun={runNode} onDelete={deleteNode} onUpdate={updateNode} />}
      </div>
    </div>
  );
}

export default function SchedulerEditorPage() {
  return <ReactFlowProvider><SchedulerEditorInner /></ReactFlowProvider>;
}
