import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookOpen,
  Braces,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Code2,
  Database,
  FileText,
  Gauge,
  Hash,
  ListTree,
  Play,
  Plus,
  RefreshCcw,
  RotateCcw,
  Save,
  Send,
  Settings2,
  Sigma,
  Square,
  Trash2,
  Variable,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { initialNotebookWorkspace, createBlankNotebook } from "../fixtures";
import { formatNow, makeId, useDevelopmentWorkspace } from "../state";
import type {
  DevelopmentRun,
  NotebookCell,
  NotebookCellType,
  NotebookDocument,
  NotebookOutput,
  NotebookVariable,
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
} from "../components/common";

const NOTEBOOK_SCOPE = "data-agent.data-development.notebook";

const cellTypeMeta: Record<NotebookCellType, { label: string; icon: typeof Code2; accent: string }> = {
  markdown: { label: "Markdown", icon: FileText, accent: "text-slate-600 bg-slate-100" },
  sql: { label: "SQL", icon: Database, accent: "text-cyan-700 bg-cyan-50" },
  python: { label: "Python", icon: Braces, accent: "text-blue-700 bg-blue-50" },
  r: { label: "R", icon: Sigma, accent: "text-violet-700 bg-violet-50" },
  parameter: { label: "参数", icon: Settings2, accent: "text-amber-700 bg-amber-50" },
};

const kernelLabels: Record<NotebookDocument["kernelStatus"], string> = {
  not_started: "未启动",
  starting: "启动中",
  idle: "空闲",
  busy: "忙碌",
  failed: "失败",
  stopped: "已停止",
};

function cloneNotebook(notebook: NotebookDocument): NotebookDocument {
  const now = formatNow();
  return { ...structuredClone(notebook), id: makeId("notebook"), name: `${notebook.name} - 副本`, lifecycleStatus: "draft", publishedVersion: undefined, currentVersion: 1, saveStatus: "clean", kernelStatus: "not_started", variables: [], checkpoints: [], cells: notebook.cells.map((cell) => ({ ...cell, id: makeId("cell"), executionCount: undefined, status: "idle", stale: false, outputs: [] })), createdAt: now, updatedAt: now };
}

function markEdited(notebook: NotebookDocument): NotebookDocument {
  return { ...notebook, lifecycleStatus: "draft", saveStatus: "dirty", validationStatus: "unchecked", currentVersion: notebook.publishedVersion === notebook.currentVersion ? notebook.currentVersion + 1 : notebook.currentVersion, updatedAt: formatNow() };
}

function createCell(type: NotebookCellType): NotebookCell {
  const source = type === "markdown" ? "## 新的分析步骤\n记录说明或结论。" : type === "sql" ? "SELECT *\nFROM source_table\nLIMIT 100;" : type === "python" ? "# Python 代码\nresult = df.head()\nresult" : type === "r" ? "# R 代码\nsummary(dataset)" : "analysis_date = '2026-08-13'";
  return { id: makeId("cell"), type, source, status: "idle", stale: false, outputs: [] };
}

function outputsFor(cell: NotebookCell): NotebookOutput[] {
  if (cell.type === "sql") return [{ id: makeId("output"), type: "table", title: "查询结果", content: "返回 3 行", columns: ["customer_id", "active_days", "order_count"], rows: [["C10001", "23", "8"], ["C10002", "3", "1"], ["C10003", "41", "12"]] }];
  if (cell.type === "python") return [{ id: makeId("output"), type: "metric", title: "Python 执行结果", content: "accuracy = 0.873" }, { id: makeId("output"), type: "text", content: "mock kernel: cell completed in 0.42s" }];
  if (cell.type === "r") return [{ id: makeId("output"), type: "metric", title: "均值", content: "42.18" }];
  if (cell.type === "parameter") return [{ id: makeId("output"), type: "log", content: "参数已注入当前 Notebook 运行上下文" }];
  return [];
}

function variableFor(cell: NotebookCell): NotebookVariable | null {
  if (cell.type === "sql") return { name: "df", type: "DataFrame", summary: "3 rows × 3 columns", cellId: cell.id, updatedAt: formatNow() };
  if (cell.type === "python") return { name: "result", type: "DataFrame", summary: "5 rows × 4 columns", cellId: cell.id, updatedAt: formatNow() };
  if (cell.type === "r") return { name: "summary_result", type: "list", summary: "6 elements", cellId: cell.id, updatedAt: formatNow() };
  if (cell.type === "parameter") return { name: cell.source.split("=")[0]?.trim() || "parameter", type: "parameter", summary: cell.source.split("=").slice(1).join("=").trim(), cellId: cell.id, updatedAt: formatNow() };
  return null;
}

export function NotebookDevelopmentPage() {
  const navigate = useNavigate();
  const [workspace, update, meta] = useDevelopmentWorkspace(NOTEBOOK_SCOPE, initialNotebookWorkspace);
  return (
    <ArtifactListPage
      title="Notebook 开发"
      description="使用 Markdown、SQL、Python、R 和参数单元进行交互式探索，通过检查点和干净运行保证发布版本可复现。"
      icon={BookOpen}
      createLabel="新建 Notebook"
      emptyLabel="暂无 Notebook"
      artifacts={workspace.artifacts}
      hydrated={meta.hydrated}
      error={meta.error}
      columns={[
        { label: "运行时", render: (notebook) => notebook.runtime },
        { label: "单元格", render: (notebook) => `${notebook.cells.length} 个` },
        { label: "内核", render: (notebook) => kernelLabels[notebook.kernelStatus] },
        { label: "最近运行", render: (notebook) => notebook.lastRun ? <StatusBadge status={notebook.lastRun.status} kind="run" /> : "未运行" },
      ]}
      onCreate={() => navigate("/data-development/notebook/new")}
      onOpen={(notebook) => navigate(`/data-development/notebook/${notebook.id}`)}
      onDuplicate={(notebook) => update((current) => ({ ...current, artifacts: [cloneNotebook(notebook), ...current.artifacts] }))}
      onDelete={(notebook) => {
        if (window.confirm(`确认删除 Notebook“${notebook.name}”？`)) update((current) => ({ ...current, artifacts: current.artifacts.filter((item) => item.id !== notebook.id) }));
      }}
    />
  );
}

function NotebookOutline({ notebook }: { notebook: NotebookDocument }) {
  const headings = notebook.cells.flatMap((cell, index) => {
    if (cell.type !== "markdown") return [];
    const firstHeading = cell.source.split("\n").find((line) => /^#{1,3}\s/.test(line));
    return firstHeading ? [{ id: cell.id, index, label: firstHeading.replace(/^#{1,3}\s*/, "") }] : [];
  });
  return (
    <aside className="flex h-full w-[210px] shrink-0 flex-col border-r border-border bg-card">
      <div className="border-b border-border px-4 py-3"><div className="flex items-center gap-2 text-[13px] font-semibold"><ListTree className="h-4 w-4 text-primary" />文档大纲</div><p className="mt-1 text-[11px] text-muted-foreground">{notebook.cells.length} 个单元格</p></div>
      <div className="scrollbar-thin flex-1 overflow-y-auto p-3">
        {headings.length ? headings.map((heading) => <button key={heading.id} type="button" onClick={() => document.getElementById(`notebook-cell-${heading.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })} className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-[11px] text-slate-600 hover:bg-blue-50 hover:text-primary"><Hash className="mt-0.5 h-3 w-3 shrink-0" /><span>{heading.label}</span></button>) : <div className="p-3 text-center text-[11px] leading-5 text-muted-foreground">在 Markdown 单元中添加标题以生成大纲。</div>}
      </div>
      <div className="border-t border-border p-3"><div className="flex items-center gap-2 text-[10px] text-muted-foreground"><span className={cn("h-2 w-2 rounded-full", notebook.kernelStatus === "busy" ? "animate-pulse bg-blue-500" : notebook.kernelStatus === "idle" ? "bg-emerald-500" : "bg-slate-400")} />内核：{kernelLabels[notebook.kernelStatus]}</div></div>
    </aside>
  );
}

function MarkdownPreview({ source }: { source: string }) {
  return <div className="space-y-1 px-4 py-3 text-[12px] leading-6 text-slate-700">{source.split("\n").map((line, index) => /^#\s/.test(line) ? <h1 key={index} className="text-[20px] font-semibold text-foreground">{line.replace(/^#\s/, "")}</h1> : /^##\s/.test(line) ? <h2 key={index} className="text-[16px] font-semibold text-foreground">{line.replace(/^##\s/, "")}</h2> : <p key={index}>{line || "\u00a0"}</p>)}</div>;
}

function CellOutputView({ output }: { output: NotebookOutput }) {
  if (output.type === "table") return <div className="overflow-hidden rounded-md border border-border"><div className="border-b border-border bg-slate-50 px-3 py-1.5 text-[10px] font-medium text-muted-foreground">{output.title} · {output.content}</div><table className="w-full text-left text-[10px]"><thead className="bg-slate-50/60 text-muted-foreground"><tr>{output.columns?.map((column) => <th key={column} className="px-3 py-1.5 font-mono font-medium">{column}</th>)}</tr></thead><tbody className="divide-y divide-border">{output.rows?.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`} className="px-3 py-1.5 text-slate-700">{cell}</td>)}</tr>)}</tbody></table></div>;
  if (output.type === "metric") return <div className="inline-flex min-w-[180px] items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3"><Gauge className="h-5 w-5 text-primary" /><div><div className="text-[10px] text-blue-700">{output.title}</div><div className="mt-0.5 text-[18px] font-semibold text-blue-900">{output.content}</div></div></div>;
  return <pre className={cn("whitespace-pre-wrap rounded-md border px-3 py-2 font-mono text-[11px]", output.type === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-border bg-slate-50 text-slate-600")}>{output.content}</pre>;
}

function NotebookCellCard({
  cell,
  index,
  total,
  kernelBusy,
  onChange,
  onTypeChange,
  onRun,
  onDelete,
  onMove,
  onClearOutput,
  onAddBelow,
}: {
  cell: NotebookCell;
  index: number;
  total: number;
  kernelBusy: boolean;
  onChange: (source: string) => void;
  onTypeChange: (type: NotebookCellType) => void;
  onRun: () => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
  onClearOutput: () => void;
  onAddBelow: (type: NotebookCellType) => void;
}) {
  const [editingMarkdown, setEditingMarkdown] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const meta = cellTypeMeta[cell.type];
  const Icon = meta.icon;
  return (
    <article id={`notebook-cell-${cell.id}`} className={cn("group relative rounded-lg border bg-card shadow-sm transition-colors", cell.status === "running" ? "border-blue-300 ring-1 ring-blue-100" : cell.stale ? "border-amber-300" : "border-border")}>
      <div className="flex items-center gap-2 border-b border-border bg-slate-50/70 px-2 py-1.5">
        <span className="w-8 text-right font-mono text-[10px] text-muted-foreground">[{cell.executionCount ?? " "}]</span>
        <span className={cn("grid h-6 w-6 place-items-center rounded-md", meta.accent)}><Icon className="h-3.5 w-3.5" /></span>
        <select value={cell.type} onChange={(event) => onTypeChange(event.target.value as NotebookCellType)} className="h-6 rounded border border-transparent bg-transparent px-1 text-[10px] font-medium text-slate-600 outline-none hover:border-input"><option value="markdown">Markdown</option><option value="sql">SQL</option><option value="python">Python</option><option value="r">R</option><option value="parameter">参数</option></select>
        {cell.stale && <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-medium text-amber-700">结果可能已过期</span>}
        {cell.status === "running" && <span className="flex items-center gap-1 text-[9px] text-blue-600"><Clock3 className="h-3 w-3 animate-spin" />运行中</span>}
        <div className="ml-auto flex items-center gap-0.5">
          {cell.type === "markdown" && <button type="button" onClick={() => setEditingMarkdown((current) => !current)} className="h-6 rounded px-2 text-[10px] text-muted-foreground hover:bg-white hover:text-foreground">{editingMarkdown ? "预览" : "编辑"}</button>}
          {cell.type !== "markdown" && <button type="button" disabled={kernelBusy} onClick={onRun} className="grid h-6 w-6 place-items-center rounded text-emerald-600 hover:bg-emerald-50 disabled:opacity-40" title="运行单元"><Play className="h-3.5 w-3.5" /></button>}
          <button type="button" disabled={index === 0} onClick={() => onMove(-1)} className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-white disabled:opacity-30"><ArrowUp className="h-3 w-3" /></button>
          <button type="button" disabled={index === total - 1} onClick={() => onMove(1)} className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-white disabled:opacity-30"><ArrowDown className="h-3 w-3" /></button>
          {cell.outputs.length > 0 && <button type="button" onClick={onClearOutput} className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-white" title="清空输出"><X className="h-3 w-3" /></button>}
          <button type="button" onClick={onDelete} className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3 w-3" /></button>
        </div>
      </div>
      {cell.type === "markdown" && !editingMarkdown ? <MarkdownPreview source={cell.source} /> : <textarea value={cell.source} onChange={(event) => onChange(event.target.value)} spellCheck={false} rows={Math.max(3, cell.source.split("\n").length + 1)} className={cn("block w-full resize-y bg-transparent px-4 py-3 font-mono text-[12px] leading-6 text-slate-800 outline-none", cell.type === "markdown" && "font-sans")} />}
      {cell.outputs.length > 0 && <div className="space-y-2 border-t border-border bg-white px-4 py-3">{cell.outputs.map((output) => <CellOutputView key={output.id} output={output} />)}</div>}
      <div className="absolute -bottom-3 left-1/2 z-10 hidden -translate-x-1/2 group-hover:block"><div className="relative"><button type="button" onClick={() => setAddOpen((current) => !current)} className="inline-flex h-6 items-center gap-1 rounded-full border border-input bg-white px-2 text-[9px] text-muted-foreground shadow-sm hover:text-primary"><Plus className="h-3 w-3" />单元</button>{addOpen && <div className="absolute left-1/2 top-7 flex -translate-x-1/2 gap-1 rounded-md border border-border bg-white p-1 shadow-lg">{(Object.keys(cellTypeMeta) as NotebookCellType[]).map((type) => <button key={type} type="button" onClick={() => { onAddBelow(type); setAddOpen(false); }} className="whitespace-nowrap rounded px-2 py-1 text-[9px] text-slate-600 hover:bg-blue-50 hover:text-primary">{cellTypeMeta[type].label}</button>)}</div>}</div></div>
    </article>
  );
}

type NotebookSideTab = "variables" | "checkpoints" | "runtime";

function NotebookEditor() {
  const navigate = useNavigate();
  const { notebookId } = useParams<{ notebookId: string }>();
  const [workspace, update, meta] = useDevelopmentWorkspace(NOTEBOOK_SCOPE, initialNotebookWorkspace);
  const [sideTab, setSideTab] = useState<NotebookSideTab>("variables");
  const [notice, setNotice] = useState("");
  const creatingRef = useRef(false);

  useEffect(() => {
    if (!meta.hydrated || notebookId || creatingRef.current) return;
    creatingRef.current = true;
    const created = createBlankNotebook();
    update((current) => ({ ...current, artifacts: [created, ...current.artifacts] }));
    navigate(`/data-development/notebook/${created.id}`, { replace: true });
  }, [meta.hydrated, navigate, notebookId, update]);

  const notebook = workspace.artifacts.find((item) => item.id === notebookId);
  const updateNotebook = useCallback((transform: (current: NotebookDocument) => NotebookDocument) => {
    if (!notebookId) return;
    update((current) => ({ ...current, artifacts: current.artifacts.map((item) => item.id === notebookId ? transform(item) : item) }));
  }, [notebookId, update]);

  if (!meta.hydrated || !notebookId) return <LoadingWorkspace label="准备 Notebook 工作台..." />;
  if (!notebook) return <MissingArtifact label="Notebook" onBack={() => navigate("/data-development/notebook")} />;

  const executableCells = notebook.cells.filter((cell) => cell.type !== "markdown");
  const kernelBusy = notebook.kernelStatus === "busy" || notebook.kernelStatus === "starting";
  const changeCell = (cellId: string, transform: (current: NotebookCell) => NotebookCell) => updateNotebook((current) => {
    const index = current.cells.findIndex((item) => item.id === cellId);
    return { ...markEdited(current), cells: current.cells.map((item, itemIndex) => item.id === cellId ? transform(item) : itemIndex >= index && item.type !== "markdown" ? { ...item, stale: true } : item) };
  });
  const addCell = (type: NotebookCellType, afterId?: string) => updateNotebook((current) => {
    const created = createCell(type);
    const index = afterId ? current.cells.findIndex((item) => item.id === afterId) + 1 : current.cells.length;
    const cells = [...current.cells];
    cells.splice(Math.max(0, index), 0, created);
    return { ...markEdited(current), cells };
  });
  const moveCell = (cellId: string, direction: -1 | 1) => updateNotebook((current) => {
    const index = current.cells.findIndex((item) => item.id === cellId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= current.cells.length) return current;
    const cells = [...current.cells];
    [cells[index], cells[target]] = [cells[target], cells[index]];
    return { ...markEdited(current), cells: cells.map((item) => item.type === "markdown" ? item : { ...item, stale: true }) };
  });
  const runCell = (cellId: string) => {
    const cell = notebook.cells.find((item) => item.id === cellId);
    if (!cell || cell.type === "markdown") return;
    updateNotebook((current) => ({ ...current, kernelStatus: "busy", cells: current.cells.map((item) => item.id === cellId ? { ...item, status: "running", outputs: [] } : item) }));
    window.setTimeout(() => updateNotebook((current) => {
      const currentCell = current.cells.find((item) => item.id === cellId);
      if (!currentCell) return current;
      const count = Math.max(0, ...current.cells.map((item) => item.executionCount ?? 0)) + 1;
      const variable = variableFor(currentCell);
      return { ...current, kernelStatus: "idle", validationStatus: "unchecked", cells: current.cells.map((item) => item.id === cellId ? { ...item, executionCount: count, status: "success", stale: false, outputs: outputsFor(item) } : item), variables: variable ? [variable, ...current.variables.filter((item) => item.name !== variable.name)] : current.variables, lastRun: { status: "success", at: formatNow(), summary: `单元 [${count}] 执行成功` } };
    }), 800);
  };
  const runAll = () => {
    if (executableCells.length === 0) { setNotice("Notebook 至少需要一个可执行单元。 "); return; }
    const runId = makeId("notebook-run");
    const run: DevelopmentRun = { id: runId, artifactType: "notebook", artifactId: notebook.id, version: notebook.currentVersion, status: "running", triggeredBy: "干净内核运行全部", startedAt: formatNow(), duration: "运行中", logs: ["启动干净 mock 内核", `准备执行 ${executableCells.length} 个单元`] };
    update((current) => ({ ...current, runs: [run, ...current.runs], artifacts: current.artifacts.map((item) => item.id === notebook.id ? { ...item, kernelStatus: "busy", variables: [], lastRun: { status: "running", at: formatNow(), summary: "正在从头运行全部单元" }, cells: item.cells.map((cell) => cell.type === "markdown" ? cell : { ...cell, status: "running", outputs: [] }) } : item) }));
    setNotice("已使用干净 mock 内核从头执行。 ");
    window.setTimeout(() => update((current) => ({ ...current, runs: current.runs.map((item) => item.id === runId ? { ...item, status: "success", finishedAt: formatNow(), duration: "2.16s", logs: [...item.logs, "全部单元执行成功"] } : item), artifacts: current.artifacts.map((item) => {
      if (item.id !== notebook.id) return item;
      let executionCount = 0;
      const variables: NotebookVariable[] = [];
      const cells = item.cells.map((cell) => {
        if (cell.type === "markdown") return cell;
        executionCount += 1;
        const variable = variableFor(cell);
        if (variable) variables.push(variable);
        return { ...cell, executionCount, status: "success" as const, stale: false, outputs: outputsFor(cell) };
      });
      return { ...item, kernelStatus: "idle" as const, validationStatus: "valid" as const, cells, variables, lastRun: { status: "success" as const, at: formatNow(), summary: `${executionCount} 个单元执行成功` } };
    }) })), 1500);
  };
  const stop = () => updateNotebook((current) => ({ ...current, kernelStatus: "idle", cells: current.cells.map((cell) => cell.status === "running" ? { ...cell, status: "stopped" } : cell), lastRun: { status: "stopped", at: formatNow(), summary: "用户停止执行" } }));
  const restart = () => {
    updateNotebook((current) => ({
      ...current,
      kernelStatus: "starting",
      variables: [],
      cells: current.cells.map((cell) => cell.type === "markdown" ? cell : {
        ...cell,
        stale: cell.outputs.length > 0 || cell.executionCount !== undefined,
      }),
    }));
    window.setTimeout(() => updateNotebook((current) => ({ ...current, kernelStatus: "idle" })), 600);
    setNotice("内核已重启，变量状态已清空，代码和输出快照仍然保留。 ");
  };
  const checkpoint = () => {
    updateNotebook((current) => ({ ...current, saveStatus: "clean", checkpoints: [{ id: makeId("checkpoint"), name: `检查点 ${current.checkpoints.length + 1}`, createdAt: formatNow(), runtime: current.runtime, cells: structuredClone(current.cells) }, ...current.checkpoints], updatedAt: formatNow() }));
    setNotice("已保存包含代码、运行时和输出快照的检查点。 ");
  };
  const publish = () => {
    const invalid = executableCells.length === 0 || executableCells.some((cell) => cell.status !== "success" || cell.stale);
    if (invalid) {
      updateNotebook((current) => ({ ...current, validationStatus: "invalid" }));
      setNotice("发布失败：请先使用干净内核运行全部单元，并处理过期或失败结果。 ");
      return;
    }
    updateNotebook((current) => ({ ...current, lifecycleStatus: "published", validationStatus: "valid", publishedVersion: current.currentVersion, saveStatus: "clean", updatedAt: formatNow() }));
    setNotice(`已发布 Notebook v${notebook.currentVersion}，调度将引用不可变版本。`);
  };

  return (
    <div className="page-shell animate-fade-in">
      <div className="flex h-[calc(100vh-2rem)] min-h-[720px] overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <NotebookOutline notebook={notebook} />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-14 flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
            <div className="flex min-w-0 items-center gap-2"><EditorButton onClick={() => navigate("/data-development/notebook")} variant="ghost" className="px-2"><ArrowLeft className="h-4 w-4" /></EditorButton><input value={notebook.name} onChange={(event) => updateNotebook((current) => ({ ...markEdited(current), name: event.target.value }))} className="h-8 min-w-[180px] max-w-[340px] flex-1 rounded-md border border-transparent bg-slate-50 px-3 text-[13px] font-semibold outline-none focus:border-primary" /><StatusBadge status={notebook.lifecycleStatus} /><span className="text-[10px] text-muted-foreground">v{notebook.currentVersion} · {notebook.saveStatus === "dirty" ? "自动保存中" : "已保存"}</span></div>
            <div className="flex items-center gap-2"><select value={notebook.runtime} onChange={(event) => updateNotebook((current) => ({ ...markEdited(current), runtime: event.target.value, kernelStatus: "not_started", variables: [] }))} className="h-8 rounded-md border border-input bg-card px-2 text-[11px]"><option>Python 3.11</option><option>SQL + Python</option><option>R 4.4</option></select><span className={cn("inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[10px]", notebook.kernelStatus === "busy" ? "border-blue-200 bg-blue-50 text-blue-700" : notebook.kernelStatus === "idle" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600")}><span className={cn("h-2 w-2 rounded-full", notebook.kernelStatus === "busy" ? "animate-pulse bg-blue-500" : notebook.kernelStatus === "idle" ? "bg-emerald-500" : "bg-slate-400")} />{kernelLabels[notebook.kernelStatus]}</span><EditorButton onClick={restart} disabled={kernelBusy}><RefreshCcw className="h-3.5 w-3.5" />重启</EditorButton>{kernelBusy ? <EditorButton onClick={stop} variant="danger"><Square className="h-3.5 w-3.5" />停止</EditorButton> : <EditorButton onClick={runAll} variant="success"><Play className="h-3.5 w-3.5" />运行全部</EditorButton>}<EditorButton onClick={checkpoint}><Save className="h-3.5 w-3.5" />检查点</EditorButton><EditorButton onClick={publish} variant="primary"><Send className="h-3.5 w-3.5" />发布</EditorButton></div>
          </div>
          {notice && <div className={cn("flex items-center justify-between border-b px-3 py-2 text-[11px]", notebook.validationStatus === "invalid" ? "border-red-200 bg-red-50 text-red-700" : "border-blue-200 bg-blue-50 text-blue-700")}><span className="flex items-center gap-1.5">{notebook.validationStatus === "invalid" ? <CircleAlert className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}{notice}</span><button type="button" onClick={() => setNotice("")}><X className="h-3.5 w-3.5" /></button></div>}
          <div className="flex min-h-0 flex-1">
            <main className="scrollbar-thin min-w-0 flex-1 overflow-y-auto bg-slate-50/70 px-5 py-4">
              <div className="mx-auto max-w-[980px] space-y-4">
                {notebook.cells.map((cell, index) => <NotebookCellCard key={cell.id} cell={cell} index={index} total={notebook.cells.length} kernelBusy={kernelBusy} onChange={(source) => changeCell(cell.id, (current) => ({ ...current, source }))} onTypeChange={(type) => changeCell(cell.id, (current) => ({ ...current, type, status: "idle", executionCount: undefined, outputs: [], stale: false }))} onRun={() => runCell(cell.id)} onDelete={() => updateNotebook((current) => ({ ...markEdited(current), cells: current.cells.filter((item) => item.id !== cell.id), variables: current.variables.filter((item) => item.cellId !== cell.id) }))} onMove={(direction) => moveCell(cell.id, direction)} onClearOutput={() => changeCell(cell.id, (current) => ({ ...current, outputs: [], executionCount: undefined, status: "idle", stale: false }))} onAddBelow={(type) => addCell(type, cell.id)} />)}
                <div className="flex justify-center gap-2 py-2">{(["markdown", "sql", "python", "r", "parameter"] as NotebookCellType[]).map((type) => { const Icon = cellTypeMeta[type].icon; return <EditorButton key={type} onClick={() => addCell(type)} variant="secondary" className="h-7"><Icon className="h-3 w-3" />{cellTypeMeta[type].label}</EditorButton>; })}</div>
              </div>
            </main>
            <aside className="flex h-full w-[320px] shrink-0 flex-col border-l border-border bg-card">
              <PanelTabs value={sideTab} onChange={setSideTab} items={[{ value: "variables", label: "变量", count: notebook.variables.length }, { value: "checkpoints", label: "检查点", count: notebook.checkpoints.length }, { value: "runtime", label: "运行环境" }]} />
              <div className="scrollbar-thin flex-1 overflow-y-auto p-4">
                {sideTab === "variables" && <div className="space-y-2">{notebook.variables.length === 0 ? <div className="rounded-md border border-dashed border-border p-4 text-center text-[11px] leading-5 text-muted-foreground"><Variable className="mx-auto mb-2 h-5 w-5" />运行代码单元后显示 mock 变量。</div> : notebook.variables.map((variable) => <button key={`${variable.name}-${variable.cellId}`} type="button" onClick={() => document.getElementById(`notebook-cell-${variable.cellId}`)?.scrollIntoView({ behavior: "smooth", block: "center" })} className="w-full rounded-lg border border-border p-3 text-left hover:border-primary/30 hover:bg-blue-50/40"><div className="flex items-center justify-between"><code className="text-[11px] font-semibold text-primary">{variable.name}</code><span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] text-muted-foreground">{variable.type}</span></div><div className="mt-1 text-[10px] text-slate-600">{variable.summary}</div><div className="mt-1 text-[9px] text-muted-foreground">{variable.updatedAt}</div></button>)}</div>}
                {sideTab === "checkpoints" && <div><EditorButton onClick={checkpoint} variant="primary" className="mb-3 w-full"><Save className="h-3.5 w-3.5" />保存检查点</EditorButton><div className="space-y-2">{notebook.checkpoints.map((item) => <div key={item.id} className="rounded-lg border border-border p-3"><div className="flex items-center justify-between"><span className="text-[11px] font-semibold">{item.name}</span><span className="text-[9px] text-muted-foreground">{item.cells.length} 单元</span></div><div className="mt-1 text-[10px] text-muted-foreground">{item.createdAt} · {item.runtime}</div><EditorButton onClick={() => updateNotebook((current) => ({ ...markEdited(current), runtime: item.runtime, cells: structuredClone(item.cells), kernelStatus: "not_started", variables: [] }))} variant="ghost" className="mt-2 h-7 w-full"><RotateCcw className="h-3 w-3" />恢复为新草稿</EditorButton></div>)}{notebook.checkpoints.length === 0 && <div className="text-[11px] text-muted-foreground">尚未保存检查点。</div>}</div></div>}
                {sideTab === "runtime" && <div className="space-y-4"><div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-[11px] leading-5 text-blue-800"><div className="font-semibold">Mock 运行环境</div>当前页面不启动真实内核、安装依赖或分配 GPU。运行状态、变量和输出仅用于产品交互验证。</div><Field label="运行时"><select className={inputClass} value={notebook.runtime} onChange={(event) => updateNotebook((current) => ({ ...markEdited(current), runtime: event.target.value, kernelStatus: "not_started", variables: [] }))}><option>Python 3.11</option><option>SQL + Python</option><option>R 4.4</option></select></Field><div className="rounded-lg border border-border p-3"><div className="flex items-center justify-between text-[11px]"><span>CPU</span><span className="text-muted-foreground">2 vCPU</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-[36%] rounded-full bg-blue-500" /></div><div className="mt-3 flex items-center justify-between text-[11px]"><span>内存</span><span className="text-muted-foreground">1.8 / 8 GB</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-[23%] rounded-full bg-emerald-500" /></div></div><EditorButton onClick={restart} className="w-full"><RefreshCcw className="h-3.5 w-3.5" />重启并清空变量</EditorButton></div>}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

export function NotebookEditorPage() {
  return <NotebookEditor />;
}
