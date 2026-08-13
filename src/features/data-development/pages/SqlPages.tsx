import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlignLeft,
  ArrowLeft,
  Braces,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Clock3,
  Code2,
  Columns3,
  Database,
  FileDiff,
  FolderTree,
  History,
  ListChecks,
  Play,
  Plus,
  RotateCcw,
  Save,
  Send,
  Square,
  Table2,
  Trash2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { initialSqlWorkspace, createBlankSqlScript } from "../fixtures";
import { formatNow, makeId, useDevelopmentWorkspace } from "../state";
import type { DevelopmentRun, SqlParameter, SqlResult, SqlScript, ValidationIssue } from "../types";
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

const SQL_SCOPE = "data-agent.data-development.sql";

function cloneScript(script: SqlScript): SqlScript {
  const now = formatNow();
  return { ...structuredClone(script), id: makeId("sql"), name: `${script.name} - 副本`, lifecycleStatus: "draft", publishedVersion: undefined, currentVersion: 1, saveStatus: "clean", result: undefined, versions: [], createdAt: now, updatedAt: now };
}

function markEdited(script: SqlScript): SqlScript {
  return { ...script, lifecycleStatus: "draft", saveStatus: "dirty", validationStatus: "unchecked", currentVersion: script.publishedVersion === script.currentVersion ? script.currentVersion + 1 : script.currentVersion, updatedAt: formatNow() };
}

function validateSql(content: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const trimmed = content.trim();
  if (!trimmed) return [{ id: "empty", level: "error", message: "SQL 内容不能为空", line: 1, column: 1 }];
  if (!/^(with|select|insert|create)\b/i.test(trimmed)) issues.push({ id: "entry", level: "error", message: "脚本应以 SELECT、WITH、INSERT 或 CREATE 开始", line: 1, column: 1 });
  const openCount = (content.match(/\(/g) ?? []).length;
  const closeCount = (content.match(/\)/g) ?? []).length;
  if (openCount !== closeCount) issues.push({ id: "parenthesis", level: "error", message: "左右括号数量不一致", line: content.split("\n").length, column: 1 });
  const typo = content.split("\n").findIndex((line) => /\bSELEC\b/i.test(line));
  if (typo >= 0) issues.push({ id: "select-typo", level: "error", message: "无法识别关键字 SELEC，是否应为 SELECT？", line: typo + 1, column: 1 });
  if (/\b(drop|truncate)\b/i.test(content)) issues.push({ id: "risk", level: "warning", message: "检测到高风险 DDL/DML，当前仅生成 mock 结果", line: 1, column: 1 });
  return issues;
}

function formatSql(content: string) {
  const keywords = ["select", "from", "where", "with", "as", "group by", "order by", "limit", "join", "left join", "right join", "inner join", "on", "having", "insert into", "create table", "case", "when", "then", "else", "end"];
  let formatted = content.replace(/[ \t]+/g, " ").replace(/\s*;\s*/g, ";\n");
  keywords.sort((a, b) => b.length - a.length).forEach((keyword) => {
    formatted = formatted.replace(new RegExp(`\\b${keyword.replace(" ", "\\s+")}\\b`, "gi"), keyword.toUpperCase());
  });
  formatted = formatted.replace(/\s+(FROM|WHERE|GROUP BY|ORDER BY|HAVING|LIMIT|LEFT JOIN|RIGHT JOIN|INNER JOIN|JOIN)\b/g, "\n$1");
  return formatted.trim();
}

function mockSqlResult(status: "success" | "running" | "failed", error?: ValidationIssue): SqlResult {
  if (status === "running") return { status, columns: [], rows: [], rowCount: 0, scanned: "计算中", duration: "运行中", logs: ["解析参数与数据源上下文", "提交 mock 查询任务"], plan: [] };
  if (status === "failed") return { status, columns: [], rows: [], rowCount: 0, scanned: "0 B", duration: "0.03s", logs: ["SQL 校验失败，未提交执行"], plan: [], error };
  return {
    status,
    columns: ["customer_id", "customer_name", "total_amount", "customer_level"],
    rows: [["C10028", "林晓", "86,420.00", "A"], ["C10991", "周宁", "75,230.50", "A"], ["C20384", "陈曦", "64,810.00", "A"], ["C20116", "赵明", "53,119.80", "B"]],
    rowCount: 12840,
    scanned: "2.4 GB",
    duration: "1.28s",
    logs: ["参数解析完成", "逻辑计划生成完成", "mock 查询执行成功，共返回 12,840 行"],
    plan: ["Sort total_amount DESC", "Filter total_amount >= :amount_threshold", "HashAggregate customer_id", "TableScan dwd_trade_order"],
  };
}

export function SqlDevelopmentPage() {
  const navigate = useNavigate();
  const [workspace, update, meta] = useDevelopmentWorkspace(SQL_SCOPE, initialSqlWorkspace);
  return (
    <ArtifactListPage
      title="SQL 开发"
      description="在明确的数据源上下文中编写、校验和试运行 SQL，查看结果、执行计划与版本差异。"
      icon={Code2}
      createLabel="新建 SQL 脚本"
      emptyLabel="暂无 SQL 脚本"
      artifacts={workspace.artifacts}
      hydrated={meta.hydrated}
      error={meta.error}
      columns={[
        { label: "数据上下文", render: (script) => `${script.context.database}.${script.context.schema}` },
        { label: "SQL 摘要", className: "max-w-[260px] truncate font-mono text-[10px]", render: (script) => script.content.replace(/\s+/g, " ").slice(0, 58) },
        { label: "参数", render: (script) => `${script.parameters.length} 个` },
        { label: "最近结果", render: (script) => script.result ? <StatusBadge status={script.result.status} kind="run" /> : "未运行" },
      ]}
      onCreate={() => navigate("/data-development/sql/new")}
      onOpen={(script) => navigate(`/data-development/sql/${script.id}`)}
      onDuplicate={(script) => update((current) => ({ ...current, artifacts: [cloneScript(script), ...current.artifacts] }))}
      onDelete={(script) => {
        if (window.confirm(`确认删除 SQL 脚本“${script.name}”？`)) update((current) => ({ ...current, artifacts: current.artifacts.filter((item) => item.id !== script.id) }));
      }}
    />
  );
}

function CatalogTree({ onInsert }: { onInsert: (value: string) => void }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ analytics: true, customer: true, trade: false });
  const groups = [
    { id: "customer", label: "dwd_customer_profile", fields: ["customer_id", "customer_name", "city", "customer_level"] },
    { id: "trade", label: "dwd_trade_order", fields: ["order_id", "customer_id", "amount", "biz_date", "channel"] },
  ];
  return (
    <aside className="flex h-full w-[230px] shrink-0 flex-col border-r border-border bg-card">
      <div className="border-b border-border px-4 py-3"><div className="flex items-center gap-2 text-[13px] font-semibold"><FolderTree className="h-4 w-4 text-primary" />数据目录</div><p className="mt-1 text-[11px] text-muted-foreground">lakehouse_prod.analytics</p></div>
      <div className="scrollbar-thin flex-1 overflow-y-auto p-3 text-[11px]">
        <button type="button" onClick={() => setExpanded((current) => ({ ...current, analytics: !current.analytics }))} className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 font-medium text-slate-700 hover:bg-slate-100">{expanded.analytics ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}<Database className="h-3.5 w-3.5 text-primary" />analytics</button>
        {expanded.analytics && <div className="ml-3 border-l border-slate-200 pl-2">{groups.map((group) => <div key={group.id} className="mt-1"><button type="button" onClick={() => setExpanded((current) => ({ ...current, [group.id]: !current[group.id] }))} className="flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-left text-slate-600 hover:bg-slate-100">{expanded[group.id] ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}<Table2 className="h-3.5 w-3.5 text-cyan-600" /><span className="truncate">{group.label}</span></button>{expanded[group.id] && <div className="ml-5 space-y-0.5">{group.fields.map((field) => <button key={field} type="button" onDoubleClick={() => onInsert(field)} className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left font-mono text-[10px] text-muted-foreground hover:bg-blue-50 hover:text-primary"><Columns3 className="h-3 w-3" />{field}</button>)}</div>}</div>)}</div>}
      </div>
      <div className="border-t border-border p-3 text-[10px] leading-4 text-muted-foreground">双击字段可插入编辑器。目录为脱敏 mock 元数据，不读取真实数据库。</div>
    </aside>
  );
}

type ResultTab = "result" | "logs" | "error" | "plan";
type SideTab = "parameters" | "versions" | "publish";

function SqlEditor() {
  const navigate = useNavigate();
  const { scriptId } = useParams<{ scriptId: string }>();
  const [workspace, update, meta] = useDevelopmentWorkspace(SQL_SCOPE, initialSqlWorkspace);
  const [resultTab, setResultTab] = useState<ResultTab>("result");
  const [sideTab, setSideTab] = useState<SideTab>("parameters");
  const [changeNote, setChangeNote] = useState("");
  const [compareVersion, setCompareVersion] = useState<number | null>(null);
  const [cursorPosition, setCursorPosition] = useState(0);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const creatingRef = useRef(false);

  useEffect(() => {
    if (!meta.hydrated || scriptId || creatingRef.current) return;
    creatingRef.current = true;
    const created = createBlankSqlScript();
    update((current) => ({ ...current, artifacts: [created, ...current.artifacts] }));
    navigate(`/data-development/sql/${created.id}`, { replace: true });
  }, [meta.hydrated, navigate, scriptId, update]);

  const script = workspace.artifacts.find((item) => item.id === scriptId);
  const updateScript = useCallback((transform: (current: SqlScript) => SqlScript) => {
    if (!scriptId) return;
    update((current) => ({ ...current, artifacts: current.artifacts.map((item) => item.id === scriptId ? transform(item) : item) }));
  }, [scriptId, update]);

  if (!meta.hydrated || !scriptId) return <LoadingWorkspace label="准备 SQL 编辑器..." />;
  if (!script) return <MissingArtifact label="SQL 脚本" onBack={() => navigate("/data-development/sql")} />;

  const issues = script.validationIssues;
  const validate = () => {
    const found = validateSql(script.content);
    updateScript((current) => ({ ...current, validationStatus: found.some((item) => item.level === "error") ? "invalid" : "valid", validationIssues: found, updatedAt: formatNow() }));
    if (found.length) setResultTab("error");
    return found;
  };
  const run = (mode: "selection" | "all") => {
    const textarea = editorRef.current;
    const selected = textarea && textarea.selectionStart !== textarea.selectionEnd ? script.content.slice(textarea.selectionStart, textarea.selectionEnd) : "";
    const executable = mode === "selection" && selected.trim() ? selected : script.content;
    const found = validateSql(executable);
    if (found.some((item) => item.level === "error")) {
      updateScript((current) => ({ ...current, validationStatus: "invalid", validationIssues: found, result: mockSqlResult("failed", found[0]), lastRun: { status: "failed", at: formatNow(), summary: found[0]?.message ?? "SQL 校验失败" } }));
      setResultTab("error");
      return;
    }
    const runId = makeId("sql-run");
    const startedAt = formatNow();
    const developmentRun: DevelopmentRun = { id: runId, artifactType: "sql", artifactId: script.id, version: script.currentVersion, status: "running", triggeredBy: mode === "selection" ? "选中 SQL" : "完整脚本", startedAt, duration: "运行中", logs: ["SQL 校验通过", "提交 mock 查询"] };
    update((current) => ({ ...current, runs: [developmentRun, ...current.runs], artifacts: current.artifacts.map((item) => item.id === script.id ? { ...item, validationStatus: "valid", validationIssues: found, result: mockSqlResult("running"), lastRun: { status: "running", at: startedAt, summary: "mock 查询运行中" } } : item) }));
    setResultTab("logs");
    window.setTimeout(() => {
      const completed = mockSqlResult("success");
      update((current) => ({ ...current, runs: current.runs.map((item) => item.id === runId ? { ...item, status: "success", duration: completed.duration, finishedAt: formatNow(), logs: completed.logs } : item), artifacts: current.artifacts.map((item) => item.id === script.id ? { ...item, result: completed, lastRun: { status: "success", at: formatNow(), summary: `返回 ${completed.rowCount.toLocaleString()} 行` } } : item) }));
      setResultTab("result");
    }, 1100);
  };
  const stop = () => updateScript((current) => ({ ...current, result: current.result ? { ...current.result, status: "stopped", duration: "已停止", logs: [...current.result.logs, "用户停止本次 mock 查询"] } : current.result, lastRun: { status: "stopped", at: formatNow(), summary: "用户停止查询" } }));
  const insertText = (value: string) => {
    const editor = editorRef.current;
    const start = editor?.selectionStart ?? script.content.length;
    const end = editor?.selectionEnd ?? start;
    updateScript((current) => ({ ...markEdited(current), content: `${current.content.slice(0, start)}${value}${current.content.slice(end)}` }));
    window.setTimeout(() => editorRef.current?.focus(), 0);
  };
  const completionWord = script.content.slice(0, cursorPosition).match(/[A-Za-z_][A-Za-z0-9_]*$/)?.[0] ?? "";
  const completionSuggestions = completionWord.length < 2 ? [] : [
    "SELECT", "FROM", "WHERE", "GROUP BY", "ORDER BY", "LEFT JOIN", "dwd_customer_profile", "dwd_trade_order", "customer_id", "customer_name", "amount", "biz_date",
  ].filter((item) => item.toLocaleLowerCase().startsWith(completionWord.toLocaleLowerCase()) && item.toLocaleLowerCase() !== completionWord.toLocaleLowerCase()).slice(0, 5);
  const applyCompletion = (value: string) => {
    const start = cursorPosition - completionWord.length;
    updateScript((current) => ({ ...markEdited(current), content: `${current.content.slice(0, start)}${value}${current.content.slice(cursorPosition)}` }));
    const nextPosition = start + value.length;
    setCursorPosition(nextPosition);
    window.setTimeout(() => {
      editorRef.current?.focus();
      editorRef.current?.setSelectionRange(nextPosition, nextPosition);
    }, 0);
  };
  const addParameter = () => {
    const parameter: SqlParameter = { id: makeId("param"), name: `param_${script.parameters.length + 1}`, type: "string", defaultValue: "", required: false, description: "" };
    updateScript((current) => ({ ...markEdited(current), parameters: [...current.parameters, parameter] }));
  };
  const updateParameter = (id: string, patch: Partial<SqlParameter>) => updateScript((current) => ({ ...markEdited(current), parameters: current.parameters.map((item) => item.id === id ? { ...item, ...patch } : item) }));
  const saveVersion = () => {
    const nextVersion = Math.max(script.currentVersion, ...script.versions.map((item) => item.version), 0) + 1;
    updateScript((current) => ({ ...current, currentVersion: nextVersion, saveStatus: "clean", versions: [{ version: nextVersion, content: current.content, parameters: structuredClone(current.parameters), context: { ...current.context }, output: current.output ? { ...current.output } : undefined, createdAt: formatNow(), createdBy: current.owner, changeNote: changeNote.trim() || "保存开发版本" }, ...current.versions], updatedAt: formatNow() }));
    setChangeNote("");
  };
  const publish = () => {
    const found = validateSql(script.content);
    if (!script.output) found.push({ id: "output", level: "error", message: "发布前必须声明输出对象" });
    if (found.some((item) => item.level === "error")) {
      updateScript((current) => ({ ...current, validationStatus: "invalid", validationIssues: found }));
      setResultTab("error");
      setSideTab("publish");
      return;
    }
    updateScript((current) => ({ ...current, lifecycleStatus: "published", validationStatus: "valid", publishedVersion: current.currentVersion, saveStatus: "clean", validationIssues: [], updatedAt: formatNow() }));
  };
  const result = script.result;
  const lineCount = Math.max(12, script.content.split("\n").length);
  const running = result?.status === "running";

  return (
    <div className="page-shell animate-fade-in">
      <div className="flex h-[calc(100vh-2rem)] min-h-[720px] overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <CatalogTree onInsert={insertText} />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-14 flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
            <div className="flex min-w-0 items-center gap-2"><EditorButton onClick={() => navigate("/data-development/sql")} variant="ghost" className="px-2"><ArrowLeft className="h-4 w-4" /></EditorButton><input value={script.name} onChange={(event) => updateScript((current) => ({ ...markEdited(current), name: event.target.value }))} className="h-8 min-w-[180px] max-w-[340px] flex-1 rounded-md border border-transparent bg-slate-50 px-3 text-[13px] font-semibold outline-none focus:border-primary" /><StatusBadge status={script.lifecycleStatus} /><span className="text-[10px] text-muted-foreground">v{script.currentVersion} · {script.saveStatus === "dirty" ? "未保存修改" : "已保存"}</span></div>
            <div className="flex items-center gap-2"><EditorButton onClick={() => updateScript((current) => ({ ...markEdited(current), content: formatSql(current.content) }))}><AlignLeft className="h-3.5 w-3.5" />格式化</EditorButton><EditorButton onClick={validate}><ListChecks className="h-3.5 w-3.5" />校验</EditorButton><EditorButton onClick={() => run("selection")} disabled={running}><Play className="h-3.5 w-3.5" />运行选中</EditorButton>{running ? <EditorButton onClick={stop} variant="danger"><Square className="h-3.5 w-3.5" />停止</EditorButton> : <EditorButton onClick={() => run("all")} variant="success"><Play className="h-3.5 w-3.5" />运行全部</EditorButton>}<EditorButton onClick={saveVersion}><Save className="h-3.5 w-3.5" />保存版本</EditorButton><EditorButton onClick={publish} variant="primary"><Send className="h-3.5 w-3.5" />发布</EditorButton></div>
          </div>
          <div className="flex items-center gap-2 border-b border-border bg-slate-50 px-3 py-2 text-[11px]"><Database className="h-3.5 w-3.5 text-primary" /><select value={script.context.database} onChange={(event) => updateScript((current) => ({ ...markEdited(current), context: { ...current.context, database: event.target.value } }))} className="h-7 rounded-md border border-input bg-card px-2"><option>lakehouse_dev</option><option>lakehouse_prod</option><option>analytics</option><option>risk_mart</option></select><span className="text-muted-foreground">/</span><select value={script.context.schema} onChange={(event) => updateScript((current) => ({ ...markEdited(current), context: { ...current.context, schema: event.target.value } }))} className="h-7 rounded-md border border-input bg-card px-2"><option>default</option><option>analytics</option><option>mart</option><option>report</option></select><span className="ml-auto flex items-center gap-1 text-muted-foreground"><Clock3 className="h-3 w-3" />最大返回 1,000 行 · mock 超时 30s</span></div>
          <div className="flex min-h-0 flex-1">
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="relative min-h-0 flex-1 overflow-hidden bg-[#fbfcfe]">
                <div className="absolute inset-y-0 left-0 w-12 overflow-hidden border-r border-border bg-slate-50 pt-3 text-right font-mono text-[12px] leading-6 text-slate-400">{Array.from({ length: lineCount }, (_, index) => <div key={index} className="pr-3">{index + 1}</div>)}</div>
                <textarea ref={editorRef} value={script.content} onChange={(event) => { setCursorPosition(event.currentTarget.selectionStart); updateScript((current) => ({ ...markEdited(current), content: event.target.value })); }} onClick={(event) => setCursorPosition(event.currentTarget.selectionStart)} onKeyUp={(event) => setCursorPosition(event.currentTarget.selectionStart)} spellCheck={false} className="absolute inset-0 h-full w-full resize-none bg-transparent py-3 pl-16 pr-4 font-mono text-[13px] leading-6 text-slate-800 outline-none" aria-label="SQL 编辑器" />
                {completionSuggestions.length > 0 && <div className="absolute bottom-3 left-16 flex items-center gap-1 rounded-md border border-blue-200 bg-white/95 p-1 shadow-lg"><span className="px-1 text-[9px] text-muted-foreground">补全</span>{completionSuggestions.map((item) => <button key={item} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applyCompletion(item)} className="rounded bg-blue-50 px-2 py-1 font-mono text-[9px] text-primary hover:bg-blue-100">{item}</button>)}</div>}
                <div className="pointer-events-none absolute bottom-3 right-4 rounded-md border border-border bg-white/90 px-2 py-1 text-[10px] text-muted-foreground shadow-sm">SQL · UTF-8 · {script.content.split("\n").length} 行</div>
              </div>
              <div className="h-[230px] shrink-0 border-t border-border">
                <PanelTabs value={resultTab} onChange={setResultTab} items={[{ value: "result", label: "数据结果", count: result?.rows.length ?? 0 }, { value: "logs", label: "执行日志", count: result?.logs.length ?? 0 }, { value: "error", label: "错误与校验", count: issues.length + (result?.error ? 1 : 0) }, { value: "plan", label: "执行计划", count: result?.plan.length ?? 0 }]} />
                <div className="scrollbar-thin h-[190px] overflow-auto p-3 text-[11px]">
                  {resultTab === "result" && (!result || result.status !== "success" ? <div className="grid h-full place-items-center text-muted-foreground">运行 SQL 后在此查看表格结果。</div> : <div><div className="mb-2 flex items-center gap-4 text-[10px] text-muted-foreground"><span>返回 {result.rowCount.toLocaleString()} 行</span><span>扫描 {result.scanned}</span><span>耗时 {result.duration}</span></div><div className="overflow-hidden rounded-md border border-border"><table className="w-full text-left"><thead className="bg-slate-50 text-muted-foreground"><tr>{result.columns.map((column) => <th key={column} className="px-3 py-2 font-mono font-medium">{column}</th>)}</tr></thead><tbody className="divide-y divide-border">{result.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`} className="px-3 py-2 text-slate-700">{cell}</td>)}</tr>)}</tbody></table></div></div>)}
                  {resultTab === "logs" && <div className="space-y-1 font-mono text-slate-600">{result?.logs.map((log, index) => <div key={`${log}-${index}`}><span className="mr-3 text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>{log}</div>) ?? <div className="font-sans text-muted-foreground">暂无执行日志。</div>}</div>}
                  {resultTab === "error" && <div className="space-y-2">{issues.length === 0 && !result?.error ? <div className="flex items-center gap-2 text-emerald-700"><CheckCircle2 className="h-4 w-4" />SQL 校验通过</div> : [...issues, ...(result?.error ? [result.error] : [])].map((issue) => <button key={issue.id} type="button" onClick={() => { if (issue.line) { const offset = script.content.split("\n").slice(0, issue.line - 1).join("\n").length + (issue.line > 1 ? 1 : 0) + Math.max(0, (issue.column ?? 1) - 1); editorRef.current?.focus(); editorRef.current?.setSelectionRange(offset, offset); } }} className={cn("flex w-full items-start gap-2 rounded-md border px-3 py-2 text-left", issue.level === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-700")}><CircleAlert className="mt-0.5 h-3.5 w-3.5" /><span>{issue.message}{issue.line ? ` · 第 ${issue.line} 行 ${issue.column ?? 1} 列` : ""}</span></button>)}</div>}
                  {resultTab === "plan" && <div className="space-y-2">{result?.plan.length ? result.plan.map((step, index) => <div key={step} className="flex items-center gap-2"><span className="grid h-5 w-5 place-items-center rounded-full bg-blue-50 text-[10px] font-semibold text-primary">{index + 1}</span><code className="rounded bg-slate-50 px-2 py-1 text-slate-700">{step}</code></div>) : <div className="text-muted-foreground">运行成功后生成 mock 执行计划。</div>}</div>}
                </div>
              </div>
            </div>
            <aside className="flex h-full w-[330px] shrink-0 flex-col border-l border-border bg-card">
              <PanelTabs value={sideTab} onChange={setSideTab} items={[{ value: "parameters", label: "参数", count: script.parameters.length }, { value: "versions", label: "版本", count: script.versions.length }, { value: "publish", label: "发布设置" }]} />
              <div className="scrollbar-thin flex-1 overflow-y-auto p-4">
                {sideTab === "parameters" && <div><div className="mb-3 flex items-center justify-between"><div className="text-[12px] font-semibold">运行参数</div><EditorButton onClick={addParameter} variant="ghost" className="h-7 px-2"><Plus className="h-3 w-3" />添加</EditorButton></div><div className="space-y-3">{script.parameters.length === 0 && <div className="rounded-md border border-dashed border-border p-4 text-center text-[11px] text-muted-foreground">暂无参数。SQL 中可使用双花括号引用参数。</div>}{script.parameters.map((parameter) => <div key={parameter.id} className="rounded-lg border border-border p-3"><div className="flex items-center gap-2"><input className={cn(inputClass, "font-mono")} value={parameter.name} onChange={(event) => updateParameter(parameter.id, { name: event.target.value })} /><button type="button" onClick={() => updateScript((current) => ({ ...markEdited(current), parameters: current.parameters.filter((item) => item.id !== parameter.id) }))} className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button></div><div className="mt-2 grid grid-cols-2 gap-2"><select className={inputClass} value={parameter.type} onChange={(event) => updateParameter(parameter.id, { type: event.target.value as SqlParameter["type"] })}><option value="string">字符串</option><option value="number">数字</option><option value="date">日期</option><option value="boolean">布尔</option></select><input className={inputClass} value={parameter.defaultValue} onChange={(event) => updateParameter(parameter.id, { defaultValue: event.target.value })} placeholder="默认值" /></div><input className={cn(inputClass, "mt-2")} value={parameter.description} onChange={(event) => updateParameter(parameter.id, { description: event.target.value })} placeholder="参数说明" /><label className="mt-2 flex items-center gap-2 text-[11px] text-slate-600"><input type="checkbox" checked={parameter.required} onChange={(event) => updateParameter(parameter.id, { required: event.target.checked })} />必填参数</label></div>)}</div></div>}
                {sideTab === "versions" && <div><Field label="变更说明"><textarea className={textareaClass} rows={2} value={changeNote} onChange={(event) => setChangeNote(event.target.value)} placeholder="说明本版本的主要变化" /></Field><EditorButton onClick={saveVersion} variant="primary" className="mt-3 w-full"><Save className="h-3.5 w-3.5" />保存为新版本</EditorButton>{compareVersion !== null && (() => { const version = script.versions.find((item) => item.version === compareVersion); if (!version) return null; const currentLines = script.content.split("\n"); const versionLines = version.content.split("\n"); const changed = Math.max(currentLines.length, versionLines.length) - currentLines.filter((line, index) => line === versionLines[index]).length; return <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3"><div className="flex items-center justify-between text-[11px] font-semibold text-blue-800"><span>当前草稿 ↔ v{version.version}</span><button type="button" onClick={() => setCompareVersion(null)} className="text-blue-600">关闭</button></div><div className="mt-2 text-[10px] text-blue-700">检测到约 {changed} 行内容差异，参数 {script.parameters.length} ↔ {version.parameters.length} 个。</div><div className="mt-2 grid grid-cols-2 gap-2"><pre className="max-h-24 overflow-hidden whitespace-pre-wrap rounded bg-white p-2 font-mono text-[9px] text-slate-600">{version.content.slice(0, 280)}</pre><pre className="max-h-24 overflow-hidden whitespace-pre-wrap rounded bg-white p-2 font-mono text-[9px] text-slate-600">{script.content.slice(0, 280)}</pre></div></div>; })()}<div className="mt-4 space-y-2">{script.versions.map((version) => <div key={`${version.version}-${version.createdAt}`} className="rounded-lg border border-border p-3"><div className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-[12px] font-semibold"><History className="h-3.5 w-3.5 text-primary" />v{version.version}</span><span className="text-[10px] text-muted-foreground">{version.createdAt}</span></div><p className="mt-1 text-[11px] text-slate-600">{version.changeNote}</p><div className="mt-2 flex gap-2"><EditorButton onClick={() => setCompareVersion(version.version)} variant="ghost" className="h-7 px-2"><FileDiff className="h-3 w-3" />比较</EditorButton><EditorButton onClick={() => updateScript((current) => ({ ...markEdited(current), content: version.content, parameters: structuredClone(version.parameters), context: { ...version.context }, output: version.output ? { ...version.output } : undefined }))} variant="ghost" className="h-7 px-2"><RotateCcw className="h-3 w-3" />恢复为草稿</EditorButton></div></div>)}{script.versions.length === 0 && <div className="text-[11px] text-muted-foreground">尚未保存开发版本。</div>}</div></div>}
                {sideTab === "publish" && <div className="space-y-4"><div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-[11px] leading-5 text-blue-800"><div className="flex items-center gap-1.5 font-semibold"><Braces className="h-3.5 w-3.5" />调度引用</div>发布后生成 <code>sql:{script.id}:v{script.currentVersion}</code>，调度不会读取后续草稿。</div><Field label="输出对象" hint="发布必填"><input className={inputClass} value={script.output?.name ?? ""} onChange={(event) => updateScript((current) => ({ ...markEdited(current), output: event.target.value ? { id: current.output?.id ?? makeId("output"), name: event.target.value, kind: "table" } : undefined }))} placeholder="例如 ads_customer_result" /></Field><Field label="运行超时"><select className={inputClass} defaultValue="30"><option value="30">30 秒</option><option value="60">60 秒</option><option value="300">5 分钟</option></select></Field><Field label="最大返回行数"><select className={inputClass} defaultValue="1000"><option>100</option><option>1000</option><option>10000</option></select></Field><EditorButton onClick={publish} variant="primary" className="w-full"><Send className="h-3.5 w-3.5" />发布当前版本</EditorButton></div>}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SqlEditorPage() {
  return <SqlEditor />;
}
