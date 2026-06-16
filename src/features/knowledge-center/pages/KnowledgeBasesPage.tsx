import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Edit2,
  Lock,
  Plus,
  Power,
  RefreshCw,
  Search,
  Send,
  Trash2,
  Unlock,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

import { DEFAULT_BASES } from "./knowledge-base-data";
import type { AccessMode, KnowledgeBase, KnowledgeStatus } from "./knowledge-base-data";

const PARSER_STRATEGIES = [
  {
    label: "自动解析（推荐）",
    formats: ["pdf", "docx", "doc", "xlsx", "xls", "csv", "txt", "md", "html"],
  },
  {
    label: "通用文档",
    formats: ["pdf", "docx", "doc", "pptx", "ppt", "md", "html"],
  },
  {
    label: "表格优先",
    formats: ["xlsx", "xls", "csv", "tsv"],
  },
  {
    label: "扫描件/OCR优先",
    formats: ["pdf", "jpg", "jpeg", "png", "tiff", "bmp"],
  },
  {
    label: "纯文本优先",
    formats: ["txt", "md", "log", "json", "xml", "html"],
  },
  {
    label: "问答对",
    formats: ["xlsx", "csv", "txt", "pdf", "docx"],
  },
  {
    label: "操作手册",
    formats: ["pdf", "docx", "doc", "html", "md"],
  },
  {
    label: "学术论文",
    formats: ["pdf", "docx", "tex"],
  },
  {
    label: "高级自定义",
    formats: ["pdf", "docx", "xlsx", "xls", "csv", "txt", "md", "html", "json"],
  },
] as const;

const DEFAULT_PARSER_STRATEGY = PARSER_STRATEGIES[0].label;

function normalizeParserStrategy(parser: string) {
  if (PARSER_STRATEGIES.some((item) => item.label === parser)) return parser;

  if (parser === "naive 通用文档") return "通用文档";
  if (parser === "qa 问答文档") return "问答对";

  return DEFAULT_PARSER_STRATEGY;
}

interface CreateKnowledgeForm {
  name: string;
  description: string;
  access: AccessMode;
  parser: string;
  pdfParser: string;
  chunkSize: string;
  status: KnowledgeStatus;
}

const initialForm: CreateKnowledgeForm = {
  name: "",
  description: "",
  access: "private",
  parser: DEFAULT_PARSER_STRATEGY,
  pdfParser: "DeepDOC",
  chunkSize: "512",
  status: "active",
};

function toForm(base: KnowledgeBase): CreateKnowledgeForm {
  return {
    name: base.name,
    description: base.description,
    access: base.access,
    parser: normalizeParserStrategy(base.parser),
    pdfParser: base.pdfParser,
    chunkSize: String(base.chunkSize),
    status: base.status,
  };
}

export function KnowledgeBasesPage() {
  const navigate = useNavigate();
  const [bases, setBases] = useState<KnowledgeBase[]>(DEFAULT_BASES);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | KnowledgeStatus>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editingBase, setEditingBase] = useState<KnowledgeBase | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return bases.filter((item) => {
      const matchesKeyword = keyword
        ? `${item.name} ${item.description}`.toLowerCase().includes(keyword)
        : true;
      const matchesStatus = status === "all" || item.status === status;

      return matchesKeyword && matchesStatus;
    });
  }, [bases, search, status]);

  const refresh = () => {
    setRefreshing(true);
    window.setTimeout(() => setRefreshing(false), 520);
  };

  const removeBase = (id: string) => {
    setBases((current) => current.filter((item) => item.id !== id));
  };

  const createBase = (form: CreateKnowledgeForm) => {
    const next: KnowledgeBase = {
      id: `kb-${Date.now()}`,
      name: form.name.trim(),
      description: form.description.trim() || form.name.trim(),
      parser: form.parser,
      pdfParser: form.pdfParser,
      chunkSize: Number(form.chunkSize),
      creator: "wangchao",
      documents: 0,
      chunks: 0,
      sizeCapacity: "0 MB / 1 GB",
      access: form.access,
      status: form.status,
      createdAt: formatDateTime(new Date()),
      updatedAt: formatDateTime(new Date()),
    };

    setBases((current) => [next, ...current]);
    setShowCreate(false);
  };

  const updateBase = (form: CreateKnowledgeForm) => {
    if (!editingBase) return;

    setBases((current) =>
      current.map((item) =>
        item.id === editingBase.id
          ? {
              ...item,
              name: form.name.trim(),
              description: form.description.trim() || form.name.trim(),
              parser: form.parser,
              pdfParser: form.pdfParser,
              chunkSize: Number(form.chunkSize),
              access: form.access,
              status: form.status,
              updatedAt: formatDateTime(new Date()),
            }
          : item,
      ),
    );
    setEditingBase(null);
  };

  return (
    <div className="page-shell animate-fade-in">
      <section className="min-h-[442px] rounded-lg border border-border bg-card shadow-sm">
        <div className="flex min-h-16 flex-col gap-3 border-b border-border px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <h1 className="text-[16px] font-semibold text-foreground">知识库</h1>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-8 w-full min-w-0 items-center gap-2 rounded-lg border border-input bg-surface-raised px-3 text-[12px] text-muted-foreground sm:w-[230px]">
              <Search className="h-3.5 w-3.5 shrink-0" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground/70"
                placeholder="搜索名称/描述"
              />
            </div>

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as "all" | KnowledgeStatus)}
              className="h-8 rounded-lg border border-input bg-card px-3 text-[12px] text-foreground outline-none transition-colors hover:border-primary/30 focus:border-primary"
            >
              <option value="all">全部状态</option>
              <option value="active">生效中</option>
              <option value="disabled">已停用</option>
            </select>

            <button
              type="button"
              onClick={refresh}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-input bg-card px-3 text-[12px] font-medium text-foreground transition-colors hover:border-primary/30 hover:text-primary"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
              刷新
            </button>

            <button
              type="button"
              onClick={() => navigate("/knowledge-center/knowledge-bases/recall-test")}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 text-[12px] font-medium text-amber-700 transition-colors hover:border-amber-300 hover:bg-amber-100"
            >
              <Send className="h-3.5 w-3.5" />
              召回测试
            </button>

            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-[12px] font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" />
              新建知识库
            </button>
          </div>
        </div>

        <div className="overflow-x-auto px-5">
          <table className="w-full min-w-[1220px] border-separate border-spacing-0 text-left">
            <thead>
              <tr className="text-[12px] font-medium text-slate-600">
                <ColumnHeader className="w-[9%]">名称</ColumnHeader>
                <ColumnHeader className="w-[9%]">说明</ColumnHeader>
                <ColumnHeader className="w-[10%]">解析策略</ColumnHeader>
                <ColumnHeader className="w-[7%] text-center">切片大小</ColumnHeader>
                <ColumnHeader className="w-[6%]">创建人</ColumnHeader>
                <ColumnHeader className="w-[5%] text-center">文档</ColumnHeader>
                <ColumnHeader className="w-[5%] text-center">CHUNK</ColumnHeader>
                <ColumnHeader className="w-[9%] text-center">大小/容量</ColumnHeader>
                <ColumnHeader className="w-[6%] text-center">公开</ColumnHeader>
                <ColumnHeader className="w-[6%] text-center">状态</ColumnHeader>
                <ColumnHeader className="w-[9%]">创建时间</ColumnHeader>
                <ColumnHeader className="w-[9%]">更新时间</ColumnHeader>
                <ColumnHeader className="w-[10%] text-center">操作</ColumnHeader>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="group text-[13px] text-foreground">
                  <DataCell className="font-medium">
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/knowledge-center/knowledge-bases/${item.id}`, {
                          state: { name: item.name },
                        })
                      }
                      className="inline-block max-w-full truncate text-left text-primary transition-colors hover:text-primary/80 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {item.name}
                    </button>
                  </DataCell>
                  <DataCell>{item.description}</DataCell>
                  <DataCell>{item.parser}</DataCell>
                  <DataCell className="text-center tabular-nums">{item.chunkSize}</DataCell>
                  <DataCell>{item.creator}</DataCell>
                  <DataCell className="text-center tabular-nums">{item.documents}</DataCell>
                  <DataCell className="text-center tabular-nums">{item.chunks}</DataCell>
                  <DataCell className="text-center tabular-nums">{item.sizeCapacity}</DataCell>
                  <DataCell className="text-center">
                    <AccessBadge access={item.access} />
                  </DataCell>
                  <DataCell className="text-center">
                    <StatusBadge status={item.status} />
                  </DataCell>
                  <DataCell className="tabular-nums">{item.createdAt}</DataCell>
                  <DataCell className="tabular-nums">{item.updatedAt}</DataCell>
                  <DataCell>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingBase(item)}
                        aria-label={`编辑 ${item.name}`}
                        className="grid h-7 w-7 place-items-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-primary"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeBase(item.id)}
                        aria-label={`删除 ${item.name}`}
                        className="grid h-7 w-8 place-items-center rounded-md bg-red-100 text-red-500 transition-colors hover:bg-red-200"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </DataCell>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="grid h-48 place-items-center border-t border-border text-[13px] text-muted-foreground">
              暂无知识库
            </div>
          )}
        </div>

        <div className="flex min-h-[52px] flex-col gap-3 border-t border-border px-5 py-4 text-[13px] text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <span>
            显示 1-{filtered.length} 条，共 {filtered.length} 条
          </span>
          <div className="flex items-center justify-end gap-3">
            <button type="button" className="text-slate-400" disabled>
              上一页
            </button>
            <span className="font-medium text-foreground">1 / 1</span>
            <button type="button" className="text-slate-400" disabled>
              下一页
            </button>
          </div>
        </div>
      </section>

      {showCreate && (
        <KnowledgeBaseDialog
          key="create"
          title="新建知识库"
          initialValue={initialForm}
          onClose={() => setShowCreate(false)}
          onSubmit={createBase}
        />
      )}

      {editingBase && (
        <KnowledgeBaseDialog
          key={editingBase.id}
          title="编辑知识库"
          initialValue={toForm(editingBase)}
          onClose={() => setEditingBase(null)}
          onSubmit={updateBase}
        />
      )}
    </div>
  );
}

function ColumnHeader({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <th className={cn("border-b border-border px-3 py-4", className)}>
      {children}
    </th>
  );
}

function DataCell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <td className={cn("border-b border-border px-3 py-3.5 align-middle", className)}>
      {children}
    </td>
  );
}

function AccessBadge({ access }: { access: AccessMode }) {
  const isPublic = access === "public";

  return (
    <span
      className={cn(
        "mx-auto inline-flex min-w-[48px] items-center justify-center gap-1 text-[12px]",
        isPublic ? "text-emerald-600" : "text-slate-500",
      )}
    >
      {isPublic ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
      {isPublic ? "公开" : "私有"}
    </span>
  );
}

function StatusBadge({ status }: { status: KnowledgeStatus }) {
  return (
    <span
      className={cn(
        "mx-auto inline-flex h-6 items-center justify-center rounded-full border px-2.5 text-[12px] font-medium",
        status === "active"
          ? "border-emerald-200 bg-emerald-50 text-emerald-600"
          : "border-slate-200 bg-slate-50 text-slate-500",
      )}
    >
      {status === "active" ? "生效中" : "已停用"}
    </span>
  );
}

function KnowledgeBaseDialog({
  title,
  initialValue,
  onClose,
  onSubmit,
}: {
  title: string;
  initialValue: CreateKnowledgeForm;
  onClose: () => void;
  onSubmit: (form: CreateKnowledgeForm) => void;
}) {
  const [form, setForm] = useState<CreateKnowledgeForm>(initialValue);
  const [errors, setErrors] = useState<Partial<Record<keyof CreateKnowledgeForm, string>>>({});
  const selectedParserStrategy =
    PARSER_STRATEGIES.find((item) => item.label === form.parser) ?? PARSER_STRATEGIES[0];

  const updateField = <K extends keyof CreateKnowledgeForm>(
    key: K,
    value: CreateKnowledgeForm[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const submit = () => {
    const nextErrors: Partial<Record<keyof CreateKnowledgeForm, string>> = {};
    const chunkSize = Number(form.chunkSize);

    if (!form.name.trim()) nextErrors.name = "名称不能为空";
    if (!Number.isFinite(chunkSize) || chunkSize <= 0) {
      nextErrors.chunkSize = "切片大小需为正整数";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <section className="w-full max-w-[460px] overflow-hidden rounded-xl bg-card shadow-xl animate-fade-in">
        <div className="flex h-14 items-center justify-between border-b border-border px-5">
          <h2 className="text-[16px] font-semibold text-foreground">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="grid h-8 w-8 place-items-center rounded-md text-slate-500 transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <Field label="名称" required error={errors.name}>
            <input
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              className={inputClass(errors.name)}
              placeholder="如：内部规章制度库"
            />
          </Field>

          <Field label="说明">
            <textarea
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              className={cn(inputClass(), "h-[88px] resize-none py-3 leading-5")}
              placeholder="知识库用途、范围、维护负责人..."
            />
          </Field>

          <Field label="访问权限">
            <button
              type="button"
              onClick={() => updateField("access", form.access === "private" ? "public" : "private")}
              className="flex min-h-[58px] w-full items-center gap-3 rounded-md border border-input bg-card px-3 text-left transition-colors hover:border-primary/30"
            >
              <span
                className={cn(
                  "relative h-[22px] w-9 rounded-full transition-colors",
                  form.access === "private" ? "bg-slate-400" : "bg-primary",
                )}
              >
                <span
                  className={cn(
                    "absolute top-[3px] h-4 w-4 rounded-full bg-white shadow transition-transform",
                    form.access === "private" ? "left-[3px]" : "translate-x-[17px]",
                  )}
                />
              </span>
              <span>
                <span className="flex items-center gap-1.5 text-[13px] font-medium text-foreground">
                  <Lock className="h-3.5 w-3.5 text-slate-500" />
                  {form.access === "private" ? "私有知识库" : "公开知识库"}
                </span>
                <span className="mt-1 block text-[12px] text-muted-foreground">
                  私有知识库只能在智能体中配置关联后才可用
                </span>
              </span>
            </button>
          </Field>

          <Field label="生效状态">
            <button
              type="button"
              onClick={() => updateField("status", form.status === "active" ? "disabled" : "active")}
              className="flex min-h-[58px] w-full items-center gap-3 rounded-md border border-input bg-card px-3 text-left transition-colors hover:border-primary/30"
            >
              <span
                className={cn(
                  "relative h-[22px] w-9 rounded-full transition-colors",
                  form.status === "active" ? "bg-primary" : "bg-slate-400",
                )}
              >
                <span
                  className={cn(
                    "absolute top-[3px] h-4 w-4 rounded-full bg-white shadow transition-transform",
                    form.status === "active" ? "translate-x-[17px]" : "left-[3px]",
                  )}
                />
              </span>
              <span>
                <span className="flex items-center gap-1.5 text-[13px] font-medium text-foreground">
                  <Power
                    className={cn(
                      "h-3.5 w-3.5",
                      form.status === "active" ? "text-primary" : "text-slate-500",
                    )}
                  />
                  {form.status === "active" ? "生效" : "不生效"}
                </span>
                <span className="mt-1 block text-[12px] text-muted-foreground">
                  生效状态的知识库能够被智能体检索
                </span>
              </span>
            </button>
          </Field>

          <Field label="解析策略">
            <select
              value={form.parser}
              onChange={(event) => updateField("parser", event.target.value)}
              className={inputClass()}
            >
              {PARSER_STRATEGIES.map((strategy) => (
                <option key={strategy.label} value={strategy.label}>
                  {strategy.label}
                </option>
              ))}
            </select>
            <div className="mt-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-[12px] leading-5 text-muted-foreground">
              <span className="font-medium text-slate-600">适合文档格式：</span>
              {selectedParserStrategy.formats.join("、")}
            </div>
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="PDF解析器">
              <select
                value={form.pdfParser}
                onChange={(event) => updateField("pdfParser", event.target.value)}
                className={inputClass()}
              >
                <option value="DeepDOC">DeepDOC</option>
                <option value="OCR">OCR</option>
                <option value="PlainText">PlainText</option>
              </select>
            </Field>

            <Field label="切片大小" error={errors.chunkSize}>
              <input
                value={form.chunkSize}
                onChange={(event) => updateField("chunkSize", event.target.value)}
                className={inputClass(errors.chunkSize)}
                inputMode="numeric"
              />
            </Field>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-border px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg border border-input bg-card px-4 text-[13px] font-medium text-foreground transition-colors hover:border-primary/30 hover:text-primary"
          >
            取消
          </button>
          <button
            type="button"
            onClick={submit}
            className="h-9 rounded-lg bg-primary px-4 text-[13px] font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
          >
            保存
          </button>
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  required = false,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="block">
      <span className="mb-2 block text-[13px] font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-[12px] text-red-500">{error}</span>}
    </div>
  );
}

function inputClass(error?: string) {
  return cn(
    "h-9 w-full rounded-lg border bg-surface-raised px-3 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary",
    error ? "border-red-300" : "border-input",
  );
}

function formatDateTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
