import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type DragEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Panel,
  Position,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ArrowLeft,
  Braces,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Combine,
  Database,
  Filter,
  GitBranch,
  GripVertical,
  Layers3,
  ListChecks,
  Play,
  Save,
  Send,
  Square,
  Table2,
  Trash2,
  WandSparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { initialEtlWorkspace, createBlankEtlTask } from "../fixtures";
import { formatNow, makeId, useDevelopmentWorkspace } from "../state";
import type {
  DevelopmentRun,
  EtlGraphEdge,
  EtlGraphNode,
  EtlNodeCategory,
  EtlNodeData,
  EtlTask,
  ValidationIssue,
} from "../types";
import {
  ArtifactListPage,
  EditorButton,
  Field,
  LoadingWorkspace,
  MissingArtifact,
  PanelTabs,
  StatusBadge,
  inputClass,
  textareaClass,
} from "../components/common";

const ETL_SCOPE = "data-agent.data-development.etl";

interface EtlTemplate {
  type: string;
  category: EtlNodeCategory;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  config: Record<string, string>;
}

const templates: EtlTemplate[] = [
  { type: "table-input", category: "input", label: "数据表输入", description: "读取数据湖或数据源表", icon: Database, config: { source: "lakehouse_dev", object: "source_table", mode: "全量" } },
  { type: "file-input", category: "input", label: "文件输入", description: "读取 CSV 或 Parquet 文件引用", icon: Table2, config: { source: "mock://files/input", format: "Parquet", header: "是" } },
  { type: "select", category: "transform", label: "字段选择", description: "选择、重命名和排序字段", icon: ListChecks, config: { fields: "customer_id, amount", rename: "" } },
  { type: "filter", category: "transform", label: "数据过滤", description: "按条件过滤记录", icon: Filter, config: { expression: "amount > 0", nullHandling: "丢弃" } },
  { type: "derive", category: "transform", label: "字段派生", description: "通过表达式生成新字段", icon: WandSparkles, config: { targetField: "new_field", expression: "UPPER(source_field)" } },
  { type: "join", category: "transform", label: "关联 Join", description: "关联两个输入数据集", icon: GitBranch, config: { joinType: "LEFT JOIN", expression: "left.id = right.id" } },
  { type: "aggregate", category: "transform", label: "聚合", description: "按维度进行指标聚合", icon: Layers3, config: { groupBy: "dimension", metrics: "SUM(amount)" } },
  { type: "union", category: "transform", label: "合并 Union", description: "合并多个相同结构的数据集", icon: Combine, config: { mode: "UNION ALL", alignBy: "字段名称" } },
  { type: "script", category: "transform", label: "表达式转换", description: "使用受控表达式处理字段", icon: Braces, config: { expression: "result = source_value", language: "Expression" } },
  { type: "table-output", category: "output", label: "数据表输出", description: "写入目标湖表引用", icon: Send, config: { target: "target_table", writeMode: "覆盖分区", partition: "biz_date" } },
  { type: "dataset-output", category: "output", label: "数据集输出", description: "生成可复用数据集引用", icon: Send, config: { target: "target_dataset", writeMode: "覆盖", partition: "无" } },
];

const categoryMeta: Record<EtlNodeCategory, { label: string; dot: string; header: string; border: string; mini: string }> = {
  input: { label: "输入", dot: "bg-cyan-500", header: "bg-cyan-50", border: "border-cyan-300", mini: "#06b6d4" },
  transform: { label: "转换", dot: "bg-blue-500", header: "bg-blue-50", border: "border-blue-300", mini: "#3b82f6" },
  output: { label: "输出", dot: "bg-emerald-500", header: "bg-emerald-50", border: "border-emerald-300", mini: "#10b981" },
};

const configLabels: Record<string, string> = {
  source: "数据源引用",
  object: "数据对象",
  mode: "读取模式",
  format: "文件格式",
  header: "包含表头",
  fields: "字段列表",
  rename: "重命名",
  expression: "表达式",
  nullHandling: "空值处理",
  targetField: "目标字段",
  joinType: "关联类型",
  groupBy: "分组字段",
  metrics: "聚合指标",
  alignBy: "字段对齐",
  language: "表达式语言",
  target: "目标对象",
  writeMode: "写入策略",
  partition: "分区字段",
};

function cloneTask(task: EtlTask): EtlTask {
  const now = formatNow();
  return {
    ...structuredClone(task),
    id: makeId("etl"),
    name: `${task.name} - 副本`,
    lifecycleStatus: "draft",
    publishedVersion: undefined,
    currentVersion: 1,
    saveStatus: "clean",
    createdAt: now,
    updatedAt: now,
  };
}

function markEdited(task: EtlTask): EtlTask {
  return {
    ...task,
    lifecycleStatus: "draft",
    saveStatus: "dirty",
    validationStatus: "unchecked",
    currentVersion: task.publishedVersion === task.currentVersion ? task.currentVersion + 1 : task.currentVersion,
    updatedAt: formatNow(),
  };
}

function nodeData(value: unknown) {
  return value as EtlNodeData;
}

function toStoredNodes(nodes: Node<EtlNodeData>[]): EtlGraphNode[] {
  return nodes.map((item) => ({ id: item.id, type: "etlNode", position: item.position, data: nodeData(item.data) }));
}

function toStoredEdges(edges: Edge[]): EtlGraphEdge[] {
  return edges.map((item) => ({ id: item.id, source: item.source, target: item.target, animated: item.animated }));
}

function validateEtl(task: EtlTask): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { nodes, edges } = task.graph;
  if (nodes.length === 0) issues.push({ id: "empty", level: "error", message: "画布中还没有节点" });
  if (!nodes.some((item) => item.data.category === "input")) issues.push({ id: "input", level: "error", message: "流程至少需要一个输入节点" });
  if (!nodes.some((item) => item.data.category === "output")) issues.push({ id: "output", level: "error", message: "流程至少需要一个输出节点" });
  nodes.forEach((item) => {
    const incoming = edges.some((edgeItem) => edgeItem.target === item.id);
    const outgoing = edges.some((edgeItem) => edgeItem.source === item.id);
    if (item.data.category !== "input" && !incoming) issues.push({ id: `incoming-${item.id}`, level: "error", targetId: item.id, message: `${item.data.label} 缺少上游连接` });
    if (item.data.category !== "output" && !outgoing) issues.push({ id: `outgoing-${item.id}`, level: "error", targetId: item.id, message: `${item.data.label} 缺少下游连接` });
    if (Object.values(item.data.config).some((value) => !value.trim())) issues.push({ id: `config-${item.id}`, level: "warning", targetId: item.id, message: `${item.data.label} 存在空配置项` });
  });

  const adjacency = new Map<string, string[]>();
  edges.forEach((item) => adjacency.set(item.source, [...(adjacency.get(item.source) ?? []), item.target]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const hasCycle = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    if ((adjacency.get(id) ?? []).some(hasCycle)) return true;
    visiting.delete(id);
    visited.add(id);
    return false;
  };
  if (nodes.some((item) => hasCycle(item.id))) issues.push({ id: "cycle", level: "error", message: "ETL 流程不能包含环路" });
  return issues;
}

function EtlNodeView(props: NodeProps<Node<EtlNodeData>>) {
  const data = nodeData(props.data);
  const meta = categoryMeta[data.category];
  const statusClass = data.runStatus === "success" ? "bg-emerald-500" : data.runStatus === "failed" ? "bg-red-500" : data.runStatus === "running" ? "bg-blue-500 animate-pulse" : data.runStatus === "stopped" ? "bg-amber-500" : "bg-slate-300";
  return (
    <div className={cn("w-[218px] overflow-hidden rounded-lg border bg-card shadow-sm", meta.border, props.selected && "ring-2 ring-primary/30 ring-offset-2")}>
      {data.category !== "input" && <Handle type="target" position={Position.Left} className="!h-3 !w-3 !border-2 !border-white !bg-slate-400" />}
      <div className={cn("flex items-center gap-2 px-3 py-2 text-[12px] font-semibold text-slate-700", meta.header)}><span className={cn("h-2 w-2 rounded-full", meta.dot)} /><span className="min-w-0 flex-1 truncate">{data.label}</span><span className={cn("h-2 w-2 rounded-full", statusClass)} /></div>
      <div className="px-3 py-2 text-[11px] leading-4 text-muted-foreground">{data.description}</div>
      <div className="flex items-center justify-between border-t border-border px-3 py-1.5 text-[10px] text-muted-foreground"><span>{meta.label}</span><span>{Object.keys(data.config).length} 项配置</span></div>
      {data.category !== "output" && <Handle type="source" position={Position.Right} className="!h-3 !w-3 !border-2 !border-white !bg-slate-400" />}
    </div>
  );
}

const nodeTypes: NodeTypes = { etlNode: EtlNodeView };

export function EtlDevelopmentPage() {
  const navigate = useNavigate();
  const [workspace, update, meta] = useDevelopmentWorkspace(ETL_SCOPE, initialEtlWorkspace);
  const create = () => navigate("/data-development/etl/new");
  return (
    <ArtifactListPage
      title="可视化 ETL"
      description="通过节点和连线搭建数据读取、清洗、转换、聚合与输出流程，并定位每个节点的 mock 运行结果。"
      icon={GitBranch}
      createLabel="新建 ETL 任务"
      emptyLabel="暂无 ETL 任务"
      artifacts={workspace.artifacts}
      hydrated={meta.hydrated}
      error={meta.error}
      columns={[
        { label: "节点", render: (task) => `${task.graph.nodes.length} 个` },
        { label: "输入", render: (task) => task.graph.nodes.filter((item) => item.data.category === "input").map((item) => item.data.label).join("、") || "未配置" },
        { label: "输出", render: (task) => task.graph.nodes.filter((item) => item.data.category === "output").map((item) => item.data.label).join("、") || "未配置" },
        { label: "最近运行", render: (task) => task.lastRun ? <StatusBadge status={task.lastRun.status} kind="run" /> : "未运行" },
      ]}
      onCreate={create}
      onOpen={(task) => navigate(`/data-development/etl/${task.id}`)}
      onDuplicate={(task) => update((current) => ({ ...current, artifacts: [cloneTask(task), ...current.artifacts] }))}
      onDelete={(task) => {
        if (window.confirm(`确认删除 ETL 任务“${task.name}”？`)) update((current) => ({ ...current, artifacts: current.artifacts.filter((item) => item.id !== task.id) }));
      }}
    />
  );
}

function EtlPalette({ onAdd }: { onAdd: (template: EtlTemplate, position?: { x: number; y: number }) => void }) {
  return (
    <aside className="flex h-full w-[214px] shrink-0 flex-col border-r border-border bg-card">
      <div className="border-b border-border px-4 py-3"><div className="flex items-center gap-2 text-[13px] font-semibold"><GripVertical className="h-4 w-4 text-primary" />节点库</div><p className="mt-1 text-[11px] leading-4 text-muted-foreground">拖到画布或点击添加节点</p></div>
      <div className="scrollbar-thin flex-1 overflow-y-auto p-3">
        {(["input", "transform", "output"] as EtlNodeCategory[]).map((category) => (
          <div key={category} className="mb-4">
            <div className="mb-2 flex items-center gap-1.5 px-1 text-[11px] font-semibold text-slate-600"><span className={cn("h-2 w-2 rounded-full", categoryMeta[category].dot)} />{categoryMeta[category].label}</div>
            <div className="space-y-1.5">{templates.filter((item) => item.category === category).map((template) => {
              const Icon = template.icon;
              return <button key={template.type} draggable onDragStart={(event) => { event.dataTransfer.setData("application/etl-node", template.type); event.dataTransfer.effectAllowed = "move"; }} type="button" onClick={() => onAdd(template)} className="flex w-full cursor-grab items-center gap-2 rounded-md border border-border bg-card px-2.5 py-2 text-left transition-colors hover:border-primary/40 hover:bg-blue-50/50"><span className={cn("grid h-6 w-6 place-items-center rounded-md", categoryMeta[category].header)}><Icon className="h-3.5 w-3.5" /></span><span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-medium text-foreground">{template.label}</span><span className="block truncate text-[10px] text-muted-foreground">{template.description}</span></span></button>;
            })}</div>
          </div>
        ))}
      </div>
    </aside>
  );
}

function EtlCanvas({
  task,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onSelect,
  onAdd,
}: {
  task: EtlTask;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  onSelect: (id: string) => void;
  onAdd: (template: EtlTemplate, position?: { x: number; y: number }) => void;
}) {
  const { screenToFlowPosition } = useReactFlow();
  const drop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const type = event.dataTransfer.getData("application/etl-node");
    const template = templates.find((item) => item.type === type);
    if (!template) return;
    onAdd(template, screenToFlowPosition({ x: event.clientX, y: event.clientY }));
  }, [onAdd, screenToFlowPosition]);
  return (
    <div className="relative min-h-0 flex-1 bg-slate-50" onDrop={drop} onDragOver={(event) => event.preventDefault()}>
      <ReactFlow
        nodes={task.graph.nodes}
        edges={task.graph.edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, selected) => onSelect(selected.id)}
        onPaneClick={() => onSelect("")}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="#cbd5e1" />
        <Controls position="bottom-right" showInteractive={false} className="!rounded-lg !border-border !bg-card" />
        <MiniMap position="bottom-left" pannable zoomable nodeColor={(item) => categoryMeta[nodeData(item.data).category].mini} maskColor="rgb(248 250 252 / 0.8)" className="!rounded-lg !border-border !bg-white" />
        <Panel position="top-left" className="!m-3 !rounded-md !border !border-border !bg-white/90 !px-3 !py-2 text-[11px] !text-muted-foreground shadow-sm backdrop-blur">拖拽节点并从端口连线 · 点击节点配置字段和运行结果</Panel>
      </ReactFlow>
    </div>
  );
}

function NodePropertyPanel({ node, onChange, onRun, onDelete, onClose }: { node: EtlGraphNode; onChange: (data: EtlNodeData) => void; onRun: () => void; onDelete: () => void; onClose: () => void }) {
  const meta = categoryMeta[node.data.category];
  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col border-l border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3"><div className="flex items-center gap-2 text-[13px] font-semibold"><span className={cn("h-2.5 w-2.5 rounded-full", meta.dot)} />节点属性</div><button type="button" onClick={onClose} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-slate-100"><ChevronRight className="h-4 w-4" /></button></div>
      <div className="scrollbar-thin flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          <Field label="节点名称"><input className={inputClass} value={node.data.label} onChange={(event) => onChange({ ...node.data, label: event.target.value })} /></Field>
          <Field label="节点描述"><textarea className={textareaClass} rows={2} value={node.data.description} onChange={(event) => onChange({ ...node.data, description: event.target.value })} /></Field>
          {Object.entries(node.data.config).map(([key, value]) => <Field key={key} label={configLabels[key] ?? key}><textarea className={cn(textareaClass, /expression|metrics|fields/.test(key) && "font-mono text-[11px]")} rows={/expression|metrics|fields/.test(key) ? 3 : 1} value={value} onChange={(event) => onChange({ ...node.data, config: { ...node.data.config, [key]: event.target.value } })} /></Field>)}
        </div>
        <div className="mt-5 rounded-lg border border-border bg-slate-50 p-3"><div className="flex items-center justify-between"><span className="text-[12px] font-semibold">字段 Schema</span><span className="text-[10px] text-muted-foreground">{node.data.outputSchema.length} 字段</span></div><div className="mt-2 overflow-hidden rounded-md border border-border bg-card"><table className="w-full text-[10px]"><tbody className="divide-y divide-border">{node.data.outputSchema.slice(0, 4).map((field) => <tr key={field.name}><td className="px-2 py-1.5 font-mono text-slate-700">{field.name}</td><td className="px-2 py-1.5 text-right text-muted-foreground">{field.type}</td></tr>)}</tbody></table></div></div>
        <div className="mt-4 rounded-lg border border-border p-3"><div className="flex items-center justify-between"><span className="text-[12px] font-semibold">节点试运行</span><StatusBadge status={node.data.runStatus} kind="run" /></div><p className="mt-2 text-[11px] leading-5 text-muted-foreground">{node.data.runMessage ?? "运行当前节点，查看输入输出行数和 mock 日志。"}</p>{node.data.metrics && <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-slate-600"><span>输入 {node.data.metrics.inputRows.toLocaleString()}</span><span>输出 {node.data.metrics.outputRows.toLocaleString()}</span><span>过滤 {node.data.metrics.filteredRows.toLocaleString()}</span><span>耗时 {node.data.metrics.duration}</span></div>}<EditorButton onClick={onRun} variant="success" className="mt-3 w-full"><Play className="h-3.5 w-3.5" />运行当前节点</EditorButton></div>
        <EditorButton onClick={onDelete} variant="danger" className="mt-4 w-full"><Trash2 className="h-3.5 w-3.5" />删除节点</EditorButton>
      </div>
    </aside>
  );
}

type BottomTab = "logs" | "issues" | "preview";

function EtlEditorInner() {
  const navigate = useNavigate();
  const { taskId } = useParams<{ taskId: string }>();
  const [workspace, update, meta] = useDevelopmentWorkspace(ETL_SCOPE, initialEtlWorkspace);
  const [selectedId, setSelectedId] = useState("");
  const [bottomTab, setBottomTab] = useState<BottomTab>("logs");
  const creatingRef = useRef(false);

  useEffect(() => {
    if (!meta.hydrated || taskId || creatingRef.current) return;
    creatingRef.current = true;
    const created = createBlankEtlTask();
    update((current) => ({ ...current, artifacts: [created, ...current.artifacts] }));
    navigate(`/data-development/etl/${created.id}`, { replace: true });
  }, [meta.hydrated, navigate, taskId, update]);

  const task = workspace.artifacts.find((item) => item.id === taskId);
  const updateTask = useCallback((transform: (current: EtlTask) => EtlTask) => {
    if (!taskId) return;
    update((current) => ({ ...current, artifacts: current.artifacts.map((item) => item.id === taskId ? transform(item) : item) }));
  }, [taskId, update]);
  const selectedNode = useMemo(() => task?.graph.nodes.find((item) => item.id === selectedId) ?? null, [selectedId, task]);

  if (!meta.hydrated || !taskId) return <LoadingWorkspace label="准备 ETL 工作台..." />;
  if (!task) return <MissingArtifact label="ETL 任务" onBack={() => navigate("/data-development/etl")} />;

  const changeGraph = (nodes: EtlGraphNode[], edges: EtlGraphEdge[]) => updateTask((current) => ({ ...markEdited(current), graph: { nodes, edges } }));
  const onNodesChange = (changes: NodeChange[]) => {
    const persistentChanges = changes.filter((change) => change.type === "position" || change.type === "remove" || change.type === "add" || change.type === "replace");
    if (persistentChanges.length === 0) return;
    const changed = applyNodeChanges(persistentChanges, task.graph.nodes as Node<EtlNodeData>[]) as Node<EtlNodeData>[];
    changeGraph(toStoredNodes(changed), task.graph.edges);
  };
  const onEdgesChange = (changes: EdgeChange[]) => changeGraph(task.graph.nodes, toStoredEdges(applyEdgeChanges(changes, task.graph.edges as Edge[])));
  const onConnect = (connection: Connection) => changeGraph(task.graph.nodes, toStoredEdges(addEdge({ ...connection, id: makeId("edge") }, task.graph.edges as Edge[])));
  const addNode = (template: EtlTemplate, position?: { x: number; y: number }) => {
    const id = makeId("node");
    const created: EtlGraphNode = {
      id,
      type: "etlNode",
      position: position ?? { x: 180 + task.graph.nodes.length * 32, y: 120 + (task.graph.nodes.length % 4) * 90 },
      data: { label: template.label, description: template.description, category: template.category, nodeType: template.type, config: { ...template.config }, inputSchema: [], outputSchema: [{ name: "customer_id", type: "string", nullable: false }, { name: "amount", type: "decimal(18,2)", nullable: true }], validationIssues: [], runStatus: "idle" },
    };
    changeGraph([...task.graph.nodes, created], task.graph.edges);
    setSelectedId(id);
  };
  const changeNode = (data: EtlNodeData) => changeGraph(task.graph.nodes.map((item) => item.id === selectedId ? { ...item, data } : item), task.graph.edges);
  const deleteNode = () => {
    changeGraph(task.graph.nodes.filter((item) => item.id !== selectedId), task.graph.edges.filter((item) => item.source !== selectedId && item.target !== selectedId));
    setSelectedId("");
  };
  const validate = () => {
    const issues = validateEtl(task);
    updateTask((current) => ({ ...current, validationStatus: issues.some((item) => item.level === "error") ? "invalid" : "valid", validationIssues: issues, graph: { ...current.graph, nodes: current.graph.nodes.map((item) => ({ ...item, data: { ...item.data, validationIssues: issues.filter((issue) => issue.targetId === item.id) } })) }, updatedAt: formatNow() }));
    setBottomTab("issues");
    return issues;
  };
  const runNode = (nodeId: string) => {
    updateTask((current) => ({ ...current, graph: { ...current.graph, nodes: current.graph.nodes.map((item) => item.id === nodeId ? { ...item, data: { ...item.data, runStatus: "running", runMessage: "mock 节点正在运行..." } } : item) } }));
    window.setTimeout(() => updateTask((current) => ({ ...current, graph: { ...current.graph, nodes: current.graph.nodes.map((item) => item.id === nodeId ? { ...item, data: { ...item.data, runStatus: "success", runMessage: "执行成功，输出样例已刷新", metrics: { inputRows: 12840, outputRows: item.data.category === "transform" ? 12492 : 12840, filteredRows: item.data.category === "transform" ? 348 : 0, duration: "0.42s" } } } : item) } })), 700);
  };
  const runAll = () => {
    const issues = validateEtl(task);
    if (issues.some((item) => item.level === "error")) { validate(); return; }
    const runId = makeId("etl-run");
    const run: DevelopmentRun = { id: runId, artifactType: "etl", artifactId: task.id, version: task.currentVersion, status: "running", triggeredBy: "画布试运行", startedAt: formatNow(), duration: "运行中", logs: ["流程校验通过", `开始执行 ${task.graph.nodes.length} 个节点`] };
    update((current) => ({ ...current, runs: [run, ...current.runs], artifacts: current.artifacts.map((item) => item.id === task.id ? { ...item, lastRun: { status: "running", at: formatNow(), summary: "正在运行全流程" }, graph: { ...item.graph, nodes: item.graph.nodes.map((graphNode) => ({ ...graphNode, data: { ...graphNode.data, runStatus: "running", runMessage: "等待 mock 执行结果..." } })) } } : item) }));
    setBottomTab("logs");
    window.setTimeout(() => update((current) => ({ ...current, runs: current.runs.map((item) => item.id === runId ? { ...item, status: "success", finishedAt: formatNow(), duration: "1.68s", logs: [...item.logs, "全部节点执行成功", "输出 12,492 行"] } : item), artifacts: current.artifacts.map((item) => item.id === task.id ? { ...item, lastRun: { status: "success", at: formatNow(), summary: "输出 12,492 行" }, graph: { ...item.graph, nodes: item.graph.nodes.map((graphNode, index) => ({ ...graphNode, data: { ...graphNode.data, runStatus: "success", runMessage: "mock 执行成功", metrics: { inputRows: 12840 - index * 80, outputRows: 12840 - index * 116, filteredRows: index * 36, duration: `${(0.31 + index * 0.17).toFixed(2)}s` } } })) } } : item) })), 1500);
  };
  const stop = () => updateTask((current) => ({ ...current, lastRun: { status: "stopped", at: formatNow(), summary: "用户停止运行" }, graph: { ...current.graph, nodes: current.graph.nodes.map((item) => item.data.runStatus === "running" ? { ...item, data: { ...item.data, runStatus: "stopped", runMessage: "已停止本次 mock 执行" } } : item) } }));
  const publish = () => {
    const issues = validateEtl(task);
    if (issues.some((item) => item.level === "error")) { validate(); return; }
    updateTask((current) => ({ ...current, lifecycleStatus: "published", validationStatus: "valid", publishedVersion: current.currentVersion, saveStatus: "clean", validationIssues: [], updatedAt: formatNow() }));
  };
  const latestRun = workspace.runs.find((item) => item.artifactId === task.id);
  const running = task.graph.nodes.some((item) => item.data.runStatus === "running");

  return (
    <div className="page-shell animate-fade-in">
      <div className="flex h-[calc(100vh-2rem)] min-h-[720px] overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <EtlPalette onAdd={addNode} />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-14 flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
            <div className="flex min-w-0 items-center gap-2"><EditorButton onClick={() => navigate("/data-development/etl")} variant="ghost" title="返回列表" className="px-2"><ArrowLeft className="h-4 w-4" /></EditorButton><input value={task.name} onChange={(event) => updateTask((current) => ({ ...markEdited(current), name: event.target.value }))} className="h-8 min-w-[180px] max-w-[360px] flex-1 rounded-md border border-transparent bg-slate-50 px-3 text-[13px] font-semibold outline-none focus:border-primary" /><StatusBadge status={task.lifecycleStatus} /><span className="text-[10px] text-muted-foreground">v{task.currentVersion} · {task.saveStatus === "dirty" ? "有未确认修改" : "已保存"}</span></div>
            <div className="flex items-center gap-2"><EditorButton onClick={validate}><ListChecks className="h-3.5 w-3.5" />校验</EditorButton>{running ? <EditorButton onClick={stop} variant="danger"><Square className="h-3.5 w-3.5" />停止</EditorButton> : <EditorButton onClick={runAll} variant="success"><Play className="h-3.5 w-3.5" />运行全流程</EditorButton>}<EditorButton onClick={() => updateTask((current) => ({ ...current, saveStatus: "clean", updatedAt: formatNow() }))}><Save className="h-3.5 w-3.5" />保存</EditorButton><EditorButton onClick={publish} variant="primary"><Send className="h-3.5 w-3.5" />发布 v{task.currentVersion}</EditorButton></div>
          </div>
          <div className="flex min-h-0 flex-1">
            <div className="flex min-w-0 flex-1 flex-col">
              <EtlCanvas task={task} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onSelect={setSelectedId} onAdd={addNode} />
              <div className="h-[210px] shrink-0 border-t border-border bg-card">
                <PanelTabs value={bottomTab} onChange={setBottomTab} items={[{ value: "logs", label: "运行日志", count: latestRun?.logs.length ?? 0 }, { value: "issues", label: "校验问题", count: task.validationIssues.length }, { value: "preview", label: "数据预览" }]} />
                <div className="scrollbar-thin h-[170px] overflow-auto p-3 text-[11px]">
                  {bottomTab === "logs" && <div className="space-y-1 font-mono text-slate-600">{latestRun?.logs.map((log, index) => <div key={`${log}-${index}`}><span className="mr-3 text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>{log}</div>) ?? <div className="font-sans text-muted-foreground">尚无运行日志，点击“运行全流程”生成 mock 结果。</div>}</div>}
                  {bottomTab === "issues" && <div className="space-y-2">{task.validationIssues.length === 0 ? <div className="flex items-center gap-2 text-emerald-700"><CheckCircle2 className="h-4 w-4" />暂无校验问题</div> : task.validationIssues.map((issue) => <button type="button" key={issue.id} onClick={() => issue.targetId && setSelectedId(issue.targetId)} className={cn("flex w-full items-start gap-2 rounded-md border px-3 py-2 text-left", issue.level === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-700")}><CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />{issue.message}</button>)}</div>}
                  {bottomTab === "preview" && <div className="overflow-hidden rounded-md border border-border"><table className="w-full text-left"><thead className="bg-slate-50 text-muted-foreground"><tr><th className="px-3 py-2">customer_id</th><th className="px-3 py-2">customer_name</th><th className="px-3 py-2">city</th><th className="px-3 py-2">amount</th></tr></thead><tbody className="divide-y divide-border"><tr><td className="px-3 py-2">C10028</td><td className="px-3 py-2">林晓</td><td className="px-3 py-2">上海</td><td className="px-3 py-2">86,420.00</td></tr><tr><td className="px-3 py-2">C10991</td><td className="px-3 py-2">周宁</td><td className="px-3 py-2">杭州</td><td className="px-3 py-2">75,230.50</td></tr></tbody></table></div>}
                </div>
              </div>
            </div>
            {selectedNode && <NodePropertyPanel node={selectedNode} onChange={changeNode} onRun={() => runNode(selectedNode.id)} onDelete={deleteNode} onClose={() => setSelectedId("")} />}
          </div>
        </div>
      </div>
    </div>
  );
}

export function EtlEditorPage() {
  return <ReactFlowProvider><EtlEditorInner /></ReactFlowProvider>;
}
