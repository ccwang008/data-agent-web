import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Database,
  FileSearch,
  GitBranch,
  History,
  Layers3,
  Loader2,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  Tags,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { mockClient } from "@/lib/mock-client";
import { cn } from "@/lib/utils";

import type {
  RecallHistoryItem,
  RecallRetrievalMethod,
  RecallTestRequest,
  RecallTestResponse,
  RecallTestResult,
  RecallTraceStep,
  VectorRecordType,
} from "../api/mock";
import { DEFAULT_BASES } from "./knowledge-base-data";

const DATASETS = [
  { id: "technical", label: "技术文档问答集", hint: "覆盖数据库、系统配置、研发资料等技术文档" },
  { id: "cloud", label: "云原生运维问答集", hint: "用于 Kubernetes、容器编排和平台运维问题" },
  { id: "statistics", label: "统计指标问答集", hint: "适合年鉴、指标解释、产业和人口统计问题" },
  { id: "custom", label: "自定义临时问题", hint: "不绑定固定评测集, 仅测试当前输入问题" },
];

const METHOD_OPTIONS: Array<{
  key: RecallRetrievalMethod;
  label: string;
  icon: ReactNode;
  description: string;
}> = [
  {
    key: "vector",
    label: "向量检索",
    icon: <BrainCircuit className="h-3.5 w-3.5" />,
    description: "适合语义相近但关键词不完全一致的问题",
  },
  {
    key: "keyword",
    label: "关键字检索",
    icon: <Tags className="h-3.5 w-3.5" />,
    description: "适合精确术语、编号、配置项和标题匹配",
  },
  {
    key: "graph",
    label: "图谱检索",
    icon: <GitBranch className="h-3.5 w-3.5" />,
    description: "适合实体、关系、路径和指标关联问题",
  },
  {
    key: "hybrid",
    label: "混合检索",
    icon: <Sparkles className="h-3.5 w-3.5" />,
    description: "融合向量、关键词和图谱信号后统一重排",
  },
];

const EXAMPLE_QUERIES = [
  "PostgreSQL 支持哪些索引类型？",
  "Kubernetes 中 Pod 和 Service 的关系是什么？",
  "统计周年鉴里人口指标包含哪些内容？",
  "如何创建 PostgreSQL 数据库？",
];

const RECORD_TYPE_LABELS: Record<VectorRecordType, string> = {
  chunk: "Chunk",
  entity: "实体",
  relation: "关系",
};

export function RecallTestPage() {
  const navigate = useNavigate();
  const activeKnowledgeBaseIds = useMemo(
    () => DEFAULT_BASES.filter((item) => item.status === "active").map((item) => item.id),
    [],
  );
  const [query, setQuery] = useState(EXAMPLE_QUERIES[0]);
  const [datasetId, setDatasetId] = useState(DATASETS[0].id);
  const [knowledgeBaseIds, setKnowledgeBaseIds] = useState<string[]>(activeKnowledgeBaseIds);
  const [method, setMethod] = useState<RecallRetrievalMethod>("hybrid");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<RecallTestResult[]>([]);
  const [steps, setSteps] = useState<RecallTraceStep[]>([]);
  const [history, setHistory] = useState<RecallHistoryItem[]>([]);

  const selectedDataset = DATASETS.find((item) => item.id === datasetId) ?? DATASETS[0];
  const selectedMethod = METHOD_OPTIONS.find((item) => item.key === method) ?? METHOD_OPTIONS[3];
  const canRun = query.trim().length > 0 && knowledgeBaseIds.length > 0 && !loading;

  const toggleKnowledgeBase = (id: string) => {
    setKnowledgeBaseIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const selectAllKnowledgeBases = () => {
    setKnowledgeBaseIds(DEFAULT_BASES.map((item) => item.id));
  };

  const clearKnowledgeBases = () => {
    setKnowledgeBaseIds([]);
  };

  const runTest = async () => {
    if (!query.trim()) {
      setError("请输入测试问题");
      return;
    }

    if (knowledgeBaseIds.length === 0) {
      setError("请至少选择一个知识库");
      return;
    }

    setLoading(true);
    setError(null);

    const payload: RecallTestRequest = {
      query,
      datasetId,
      knowledgeBaseIds,
      method,
    };

    try {
      const response = await mockClient.post<RecallTestResponse>(
        "/api/knowledge-center/recall-test",
        payload,
        { latencyMs: 420 },
      );
      setResults(response.results);
      setSteps(response.steps);
      setHistory((current) => [response.historyItem, ...current].slice(0, 12));
    } finally {
      setLoading(false);
    }
  };

  const restoreHistory = (item: RecallHistoryItem) => {
    setQuery(item.query);
    setDatasetId(item.datasetId);
    setKnowledgeBaseIds(item.knowledgeBaseIds);
    setMethod(item.method);
    setResults(item.results);
    setSteps(item.steps);
    setError(null);
  };

  return (
    <div className="page-shell animate-fade-in">
      <header className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/knowledge-center/knowledge-bases")}
            aria-label="返回知识库列表"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-border bg-card text-slate-500 transition-colors hover:border-primary/30 hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-[18px] font-semibold text-foreground">召回测试</h1>
            <p className="mt-1 text-[12px] text-muted-foreground">
              对多个知识库执行召回测试, 查看结果、链路和历史记录
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={runTest}
          disabled={!canRun}
          className={cn(
            "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-4 text-[13px] font-medium shadow-sm transition-opacity",
            canRun
              ? "bg-primary text-primary-foreground hover:opacity-90"
              : "cursor-not-allowed bg-slate-100 text-slate-400",
          )}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          {loading ? "测试中..." : "开始测试"}
        </button>
      </header>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-4">
          <section className="rounded-lg border border-border bg-card shadow-sm">
            <PanelTitle icon={<FileSearch className="h-4 w-4" />} title="测试设置" />
            <div className="space-y-5 px-4 pb-4">
              <Field label="测试问题">
                <textarea
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                      event.preventDefault();
                      void runTest();
                    }
                  }}
                  className="h-24 w-full resize-none rounded-lg border border-input bg-card px-3 py-2 text-[13px] leading-5 text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary"
                  placeholder="请输入测试问题"
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {EXAMPLE_QUERIES.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setQuery(item)}
                      className="rounded-md border border-input bg-surface-raised px-2 py-1 text-[11px] text-slate-600 transition-colors hover:border-primary/30 hover:text-primary"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="测试数据集">
                <select
                  value={datasetId}
                  onChange={(event) => setDatasetId(event.target.value)}
                  className="h-9 w-full rounded-lg border border-input bg-card px-3 text-[13px] text-foreground outline-none transition-colors hover:border-primary/30 focus:border-primary"
                >
                  {DATASETS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-[12px] leading-5 text-muted-foreground">{selectedDataset.hint}</p>
              </Field>

              <Field label="选择知识库">
                <div className="mb-2 flex items-center justify-between gap-2 text-[12px]">
                  <span className="text-muted-foreground">已选择 {knowledgeBaseIds.length} 个</span>
                  <span className="flex items-center gap-2">
                    <button type="button" onClick={selectAllKnowledgeBases} className="text-primary hover:opacity-80">
                      全选
                    </button>
                    <button type="button" onClick={clearKnowledgeBases} className="text-slate-500 hover:text-foreground">
                      清空
                    </button>
                  </span>
                </div>
                <div className="max-h-[220px] space-y-2 overflow-y-auto rounded-lg border border-border p-2">
                  {DEFAULT_BASES.map((item) => {
                    const selected = knowledgeBaseIds.includes(item.id);

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleKnowledgeBase(item.id)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md border px-2.5 py-2 text-left transition-colors",
                          selected
                            ? "border-primary/30 bg-primary/5 text-primary"
                            : "border-transparent text-slate-600 hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <span
                          className={cn(
                            "grid h-4 w-4 place-items-center rounded border",
                            selected ? "border-primary bg-primary text-primary-foreground" : "border-slate-300",
                          )}
                        >
                          {selected && <CheckCircle2 className="h-3 w-3" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium">{item.name}</span>
                          <span className="mt-0.5 block text-[11px] text-muted-foreground">
                            {item.documents} 文档 · {item.chunks} Chunks
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Field>

              <Field label="检索方式">
                <div className="grid gap-2">
                  {METHOD_OPTIONS.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setMethod(item.key)}
                      className={cn(
                        "flex items-start gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors",
                        method === item.key
                          ? "border-primary/40 bg-primary/5 text-primary"
                          : "border-border bg-card text-slate-600 hover:border-primary/30 hover:text-foreground",
                      )}
                    >
                      <span className="mt-0.5">{item.icon}</span>
                      <span className="min-w-0">
                        <span className="block text-[13px] font-medium">{item.label}</span>
                        <span className="mt-1 block text-[11px] leading-4 text-muted-foreground">
                          {item.description}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </Field>

              {error && (
                <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-[12px] text-red-600">
                  {error}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card shadow-sm">
            <PanelTitle icon={<History className="h-4 w-4" />} title="测试历史" />
            <div className="max-h-[360px] overflow-y-auto px-4 pb-4">
              {history.length > 0 ? (
                <div className="space-y-2">
                  {history.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => restoreHistory(item)}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-left transition-colors hover:border-primary/30 hover:bg-primary/5"
                    >
                      <span className="block truncate text-[13px] font-medium text-foreground">{item.query}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                        <span>{item.testedAt}</span>
                        <span>{item.datasetName}</span>
                        <span>{item.knowledgeBaseCount} 库</span>
                        <span>{item.methodLabel}</span>
                        <span>{item.hitCount} 命中</span>
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <EmptyState icon={<History className="h-5 w-5" />} text="暂无测试历史" />
              )}
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-lg border border-border bg-card shadow-sm">
            <PanelTitle
              icon={<Layers3 className="h-4 w-4" />}
              title="召回结果"
              extra={`${selectedMethod.label} · ${results.length} 条`}
            />
            <div className="px-4 pb-4">
              {results.length > 0 ? (
                <div className="space-y-3">
                  {results.map((item) => (
                    <RecallResultCard key={item.id} result={item} />
                  ))}
                </div>
              ) : (
                <EmptyState icon={<Search className="h-5 w-5" />} text="输入问题并点击开始测试后显示召回结果" />
              )}
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card shadow-sm">
            <PanelTitle icon={<Database className="h-4 w-4" />} title="召回链路" extra={selectedMethod.description} />
            <div className="px-4 pb-4">
              {steps.length > 0 ? (
                <div className="space-y-3">
                  {steps.map((step, index) => (
                    <TraceStepItem key={step.id} step={step} isLast={index === steps.length - 1} />
                  ))}
                </div>
              ) : (
                <EmptyState icon={<RotateCcw className="h-5 w-5" />} text="完成测试后显示每一步召回链路" />
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function PanelTitle({
  extra,
  icon,
  title,
}: {
  extra?: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="flex min-h-14 flex-col gap-1 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
        <span className="text-primary">{icon}</span>
        {title}
      </h2>
      {extra && <span className="text-[12px] text-muted-foreground">{extra}</span>}
    </div>
  );
}

function Field({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

function RecallResultCard({ result }: { result: RecallTestResult }) {
  return (
    <article className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-[12px] font-semibold text-primary">
            {result.rank}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-[13px] font-semibold text-foreground" title={result.sourceTitle}>
              {result.sourceTitle}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <span>{result.knowledgeBaseName}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                {RECORD_TYPE_LABELS[result.recordType]}
              </span>
            </div>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex h-6 shrink-0 items-center justify-center rounded-full px-2.5 text-[12px] font-semibold tabular-nums",
            result.score >= 0.85
              ? "bg-emerald-100 text-emerald-700"
              : result.score >= 0.7
              ? "bg-amber-100 text-amber-700"
              : "bg-slate-100 text-slate-600",
          )}
        >
          {(result.score * 100).toFixed(0)}%
        </span>
      </div>
      <p className="mt-3 text-[13px] leading-6 text-slate-600">{result.content}</p>
      <div className="mt-3 rounded-md border border-dashed border-border bg-surface-raised px-3 py-2 text-[12px] text-muted-foreground">
        命中原因：{result.hitReason}
      </div>
    </article>
  );
}

function TraceStepItem({
  isLast,
  step,
}: {
  isLast: boolean;
  step: RecallTraceStep;
}) {
  return (
    <div className="grid grid-cols-[32px_minmax(0,1fr)] gap-3">
      <div className="flex flex-col items-center">
        <span className="grid h-8 w-8 place-items-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-4 w-4" />
        </span>
        {!isLast && <span className="mt-2 h-full min-h-8 w-px bg-border" />}
      </div>
      <div className="rounded-lg border border-border bg-card px-4 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-[12px] font-semibold tabular-nums text-primary">
              {String(step.order).padStart(2, "0")}
            </span>
            <h3 className="truncate text-[13px] font-semibold text-foreground">{step.name}</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-3 w-3" />
              {step.durationMs}ms
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{step.metric}</span>
          </div>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <TraceSummary label="输入" value={step.input} />
          <TraceSummary label="输出" value={step.output} />
        </div>
      </div>
    </div>
  );
}

function TraceSummary({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md bg-surface-raised px-3 py-2">
      <span className="block text-[11px] font-medium text-muted-foreground">{label}</span>
      <span className="mt-1 block text-[12px] leading-5 text-slate-600">{value}</span>
    </div>
  );
}

function EmptyState({
  icon,
  text,
}: {
  icon: ReactNode;
  text: string;
}) {
  return (
    <div className="grid min-h-[180px] place-items-center rounded-lg border border-dashed border-border text-center">
      <div>
        <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500">
          {icon}
        </div>
        <p className="mt-3 text-[13px] text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}
