import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  Check,
  ChevronDown,
  FileText,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

import { DEFAULT_BASES } from "./knowledge-base-data";

type ChunkType = "text";
type ChunkTypeFilter = "all" | ChunkType;

export interface DocumentChunk {
  id: string;
  index: number;
  type: ChunkType;
  text: string;
  charRange: [number, number];
  tokenCount: number;
  enabled: boolean;
  positionCount: number;
  image?: string;
  pageNumber?: number;
}

export interface DocumentDetail {
  id: string;
  fileName: string;
  fileType: string;
  categoryId: string;
  categoryName: string;
  knowledgeBase: string;
  parser: string;
  uploader: string;
  size: string;
  uploadedAt: string;
  createdAt: string;
  chunks: DocumentChunk[];
}

interface DocumentLocationState {
  knowledgeBaseName?: string;
  documentName?: string;
}

const CHUNK_TYPE_OPTIONS: Array<{ value: ChunkTypeFilter; label: string }> = [
  { value: "all", label: "全部" },
  { value: "text", label: "文本" },
];

const MOCK_DOCUMENTS: Record<string, DocumentDetail> = {
  "doc-postgresql": {
    id: "doc-postgresql",
    fileName: "PostgreSQL从入门到精通.pdf",
    fileType: "PDF",
    categoryId: "cat-database",
    categoryName: "数据库",
    knowledgeBase: "技术文档知识库",
    parser: "Plain Text",
    uploader: "shixing",
    size: "5.1 MB",
    uploadedAt: "2026/6/5 15:35:59",
    createdAt: "2026/6/5 15:35:59",
    chunks: [
      {
        id: "chunk-postgresql-1",
        index: 1,
        type: "text",
        text: "PostgreSQL 是一个功能强大的开源对象关系型数据库系统，它使用和扩展了 SQL 语言，并结合了许多特性，这些特性使它成为最强大的数据库管理系统之一。",
        charRange: [0, 100],
        tokenCount: 35,
        enabled: true,
        positionCount: 1,
        pageNumber: 1,
      },
      {
        id: "chunk-postgresql-2",
        index: 2,
        type: "text",
        text: "PostgreSQL 支持复杂查询、外键、触发器、视图、事务完整性、MVCC 等特性。它还支持多种编程语言的接口，包括 C/C++、Java、Python、Perl、Ruby 等。",
        charRange: [100, 200],
        tokenCount: 42,
        enabled: true,
        positionCount: 2,
        pageNumber: 1,
      },
      {
        id: "chunk-postgresql-3",
        index: 3,
        type: "text",
        text: "安装 PostgreSQL 非常简单。在 Linux 系统上，可以使用包管理器进行安装。在 Windows 上，可以下载安装程序进行安装。",
        charRange: [200, 300],
        tokenCount: 32,
        enabled: true,
        positionCount: 1,
        pageNumber: 2,
      },
      {
        id: "chunk-postgresql-4",
        index: 4,
        type: "text",
        text: "创建数据库是使用 PostgreSQL 的第一步。可以使用 createdb 命令或者在 psql 中使用 CREATE DATABASE 语句来创建数据库。",
        charRange: [300, 400],
        tokenCount: 38,
        enabled: false,
        positionCount: 1,
        pageNumber: 2,
      },
      {
        id: "chunk-postgresql-5",
        index: 5,
        type: "text",
        text: "PostgreSQL 支持多种索引类型，包括 B-tree、Hash、GiST、GIN 等。正确使用索引可以大大提高查询性能。",
        charRange: [400, 500],
        tokenCount: 36,
        enabled: true,
        positionCount: 3,
        pageNumber: 3,
      },
      {
        id: "chunk-postgresql-6",
        index: 6,
        type: "text",
        text: "事务是数据库操作的基本单位。PostgreSQL 支持 ACID 事务特性，确保数据的一致性和完整性。",
        charRange: [500, 600],
        tokenCount: 30,
        enabled: true,
        positionCount: 1,
        pageNumber: 3,
      },
    ],
  },
  "doc-kubernetes": {
    id: "doc-kubernetes",
    fileName: "Kubernetes指南（Kubernetes Handbook）(202005).pdf",
    fileType: "PDF",
    categoryId: "cat-cloud-native",
    categoryName: "云原生",
    knowledgeBase: "技术文档知识库",
    parser: "Auto",
    uploader: "shixing",
    size: "25 MB",
    uploadedAt: "2026/6/5 15:35:59",
    createdAt: "2026/6/5 15:35:59",
    chunks: [],
  },
};

export function DocumentDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { documentId, knowledgeBaseId } = useParams<{
    documentId: string;
    knowledgeBaseId: string;
  }>();
  const routeState = location.state as DocumentLocationState | null;
  const document = MOCK_DOCUMENTS[documentId || ""];
  const baseName =
    routeState?.knowledgeBaseName ||
    DEFAULT_BASES.find((item) => item.id === knowledgeBaseId)?.name ||
    document?.knowledgeBase ||
    "知识库";

  const [chunks, setChunks] = useState<DocumentChunk[]>(document?.chunks || []);
  const [selectedChunkId, setSelectedChunkId] = useState<string | null>(document?.chunks[0]?.id ?? null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ChunkTypeFilter>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<DocumentChunk | null>(null);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);

  const filteredChunks = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return chunks.filter((chunk) => {
      const matchesSearch = keyword
        ? chunk.id.toLowerCase().includes(keyword) || chunk.text.toLowerCase().includes(keyword)
        : true;
      const matchesType = typeFilter === "all" || chunk.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [chunks, search, typeFilter]);

  const selectedChunk = chunks.find((chunk) => chunk.id === selectedChunkId) ?? chunks[0] ?? null;
  const allSelected =
    filteredChunks.length > 0 && filteredChunks.every((chunk) => selectedIds.includes(chunk.id));
  const selectedCount = selectedIds.filter((id) => chunks.some((chunk) => chunk.id === id)).length;

  if (!document) {
    return (
      <div className="page-shell animate-fade-in">
        <header className="mb-4">
          <Breadcrumbs
            documentName="文档详情"
            knowledgeBaseId={knowledgeBaseId}
            knowledgeBaseName={baseName}
            onKnowledgeBaseClick={() => navigate(`/knowledge-center/knowledge-bases/${knowledgeBaseId}`)}
            onListClick={() => navigate("/knowledge-center/knowledge-bases")}
          />
          <h1 className="mt-4 truncate text-[20px] font-semibold text-foreground">文档详情</h1>
        </header>
        <div className="grid h-[300px] place-items-center rounded-md border border-border bg-card text-[14px] text-muted-foreground">
          文档不存在
        </div>
      </div>
    );
  }

  const resetFilters = () => {
    setSearch("");
    setTypeFilter("all");
  };

  const toggleAll = () => {
    setSelectedIds((current) => {
      const filteredIds = filteredChunks.map((chunk) => chunk.id);
      if (filteredIds.every((id) => current.includes(id))) {
        return current.filter((id) => !filteredIds.includes(id));
      }

      return Array.from(new Set([...current, ...filteredIds]));
    });
  };

  const toggleChunk = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const startEditing = (chunk: DocumentChunk) => {
    setSelectedChunkId(chunk.id);
    setEditingId(chunk.id);
    setEditingText(chunk.text);
    setExpandedIds((current) => (current.includes(chunk.id) ? current : [...current, chunk.id]));
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingText("");
  };

  const saveEditing = () => {
    if (!editingId) return;

    const nextText = editingText.trim();
    if (!nextText) return;

    setChunks((current) =>
      current.map((chunk) =>
        chunk.id === editingId
          ? {
              ...chunk,
              text: nextText,
              tokenCount: Math.max(1, Math.ceil(nextText.length / 3)),
              charRange: [chunk.charRange[0], chunk.charRange[0] + nextText.length],
            }
          : chunk,
      ),
    );
    cancelEditing();
  };

  const setChunkEnabled = (ids: string[], enabled: boolean) => {
    if (ids.length === 0) return;

    setChunks((current) =>
      current.map((chunk) => (ids.includes(chunk.id) ? { ...chunk, enabled } : chunk)),
    );
  };

  const deleteChunks = (ids: string[]) => {
    setChunks((current) => {
      const nextChunks = current
        .filter((chunk) => !ids.includes(chunk.id))
        .map((chunk, index) => ({ ...chunk, index: index + 1 }));
      const nextSelectedChunk =
        nextChunks.find((chunk) => chunk.id === selectedChunkId)?.id ?? nextChunks[0]?.id ?? null;

      setSelectedChunkId(nextSelectedChunk);
      return nextChunks;
    });
    setSelectedIds((current) => current.filter((id) => !ids.includes(id)));
    setExpandedIds((current) => current.filter((id) => !ids.includes(id)));
    if (editingId && ids.includes(editingId)) {
      cancelEditing();
    }
  };

  const addChunk = () => {
    const nextIndex = chunks.length + 1;
    const start = chunks.at(-1)?.charRange[1] ?? 0;
    const nextChunk: DocumentChunk = {
      id: `chunk-${Date.now()}`,
      index: nextIndex,
      type: "text",
      text: "请输入新的文档块内容",
      charRange: [start, start + 11],
      tokenCount: 4,
      enabled: true,
      positionCount: 0,
      pageNumber: selectedChunk?.pageNumber ?? 1,
    };

    setChunks((current) => [...current, nextChunk]);
    setSelectedChunkId(nextChunk.id);
    setExpandedIds((current) => [...current, nextChunk.id]);
    setEditingId(nextChunk.id);
    setEditingText(nextChunk.text);
  };

  return (
    <div className="page-shell animate-fade-in">
      <header className="mb-4">
        <Breadcrumbs
          documentName={document.fileName}
          knowledgeBaseId={knowledgeBaseId}
          knowledgeBaseName={baseName}
          onKnowledgeBaseClick={() => navigate(`/knowledge-center/knowledge-bases/${knowledgeBaseId}`)}
          onListClick={() => navigate("/knowledge-center/knowledge-bases")}
        />

        <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-[22px] font-semibold text-foreground">
              {routeState?.documentName || document.fileName}
            </h1>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-slate-600">
              <MetaText label="文件类型" value={document.fileType} />
              <MetaText label="文档块总数" value={`${chunks.length}`} />
              <MetaText label="创建时间" value={document.createdAt} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            <span className="mr-1 text-[12px] text-slate-400">已选择 {selectedCount} 项</span>
            <ToolbarButton disabled={selectedCount === 0} onClick={() => setChunkEnabled(selectedIds, true)}>
              批量启用
            </ToolbarButton>
            <ToolbarButton disabled={selectedCount === 0} onClick={() => setChunkEnabled(selectedIds, false)}>
              批量禁用
            </ToolbarButton>
            <ToolbarButton
              danger
              disabled={selectedCount === 0}
              onClick={() => setBatchDeleteOpen(true)}
            >
              批量删除
            </ToolbarButton>
            <button
              type="button"
              onClick={addChunk}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full bg-primary px-3.5 text-[12px] font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" />
              添加文档块
            </button>
          </div>
        </div>
      </header>

      <main className="grid min-h-[640px] gap-4 xl:grid-cols-[minmax(0,1.42fr)_minmax(420px,1fr)]">
        <section className="flex min-h-[640px] min-w-0 flex-col rounded-md border border-border bg-card">
          <div className="flex flex-col gap-3 border-b border-border px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <div className="flex h-9 w-full min-w-0 items-center gap-2 rounded-md border border-input bg-surface-raised px-3 text-[13px] text-muted-foreground sm:w-[430px]">
                <Search className="h-4 w-4 shrink-0" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground/70"
                  placeholder="搜索内容..."
                />
              </div>

              <div className="relative">
                <select
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value as ChunkTypeFilter)}
                  className="h-9 w-[136px] appearance-none rounded-md border border-input bg-card px-3 pr-8 text-[13px] text-foreground outline-none transition-colors hover:border-primary/30 focus:border-primary"
                >
                  {CHUNK_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resetFilters}
                className="h-8 rounded-md px-3 text-[12px] font-medium text-primary transition-colors hover:bg-primary/5"
              >
                重置
              </button>
              <button
                type="button"
                className="h-8 rounded-full bg-primary px-4 text-[12px] font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
              >
                筛选
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-x-auto">
            <table className="w-full min-w-[860px] border-separate border-spacing-0 text-left">
              <thead>
                <tr className="border-b border-border bg-card text-[12px] font-medium text-slate-500">
                  <ChunkHeader className="w-[5%] text-center">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="选择全部文档块"
                      className="h-3.5 w-3.5 rounded border-slate-300 align-middle accent-primary"
                    />
                  </ChunkHeader>
                  <ChunkHeader className="w-[15%]">ID</ChunkHeader>
                  <ChunkHeader className="w-[10%]">图片</ChunkHeader>
                  <ChunkHeader className="w-[10%]">类型</ChunkHeader>
                  <ChunkHeader>内容</ChunkHeader>
                  <ChunkHeader className="w-[18%] text-center">操作</ChunkHeader>
                </tr>
              </thead>
              <tbody>
                {filteredChunks.map((chunk) => (
                  <tr
                    key={chunk.id}
                    onClick={() => setSelectedChunkId(chunk.id)}
                    className={cn(
                      "cursor-pointer border-b border-border text-[13px] text-foreground transition-colors",
                      selectedChunkId === chunk.id ? "bg-primary/5" : "hover:bg-muted/40",
                    )}
                  >
                    <ChunkCell className="text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(chunk.id)}
                        onClick={(event) => event.stopPropagation()}
                        onChange={() => toggleChunk(chunk.id)}
                        aria-label={`选择 ${chunk.id}`}
                        className="h-3.5 w-3.5 rounded border-slate-300 align-middle accent-primary"
                      />
                    </ChunkCell>
                    <ChunkCell>
                      <span className="block max-w-[112px] truncate font-mono text-[12px] text-slate-500">
                        {chunk.id}
                      </span>
                    </ChunkCell>
                    <ChunkCell>
                      <ChunkImagePreview image={chunk.image} />
                    </ChunkCell>
                    <ChunkCell>
                      <span className="inline-flex h-7 items-center rounded-full bg-slate-100 px-3 text-[12px] text-slate-700">
                        文本
                      </span>
                    </ChunkCell>
                    <ChunkCell>
                      <div
                        className={cn(
                          "rounded-none border px-3 py-3 transition-colors",
                          selectedChunkId === chunk.id
                            ? "border-primary/40 bg-primary/10"
                            : "border-transparent bg-transparent",
                        )}
                      >
                        <div className="mb-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                          <span>{chunk.tokenCount} tokens</span>
                          <span>{chunk.positionCount} 个位置</span>
                          {chunk.pageNumber ? <span>页码 {chunk.pageNumber}</span> : null}
                          <span className={chunk.enabled ? "text-emerald-600" : "text-slate-400"}>
                            {chunk.enabled ? "已启用" : "已禁用"}
                          </span>
                        </div>

                        {editingId === chunk.id ? (
                          <div className="space-y-3" onClick={(event) => event.stopPropagation()}>
                            <textarea
                              value={editingText}
                              onChange={(event) => setEditingText(event.target.value)}
                              rows={4}
                              autoFocus
                              className="w-full resize-none rounded-md border border-primary/40 bg-card px-3 py-2 text-[13px] leading-relaxed text-foreground outline-none focus:border-primary"
                              onKeyDown={(event) => {
                                if (event.key === "Escape") cancelEditing();
                                if (event.key === "Enter" && event.metaKey) saveEditing();
                                if (event.key === "Enter" && event.ctrlKey) saveEditing();
                              }}
                            />
                            <div className="flex items-center gap-2">
                              <InlineActionButton icon={<Check className="h-3.5 w-3.5" />} onClick={saveEditing}>
                                保存
                              </InlineActionButton>
                              <InlineActionButton
                                icon={<X className="h-3.5 w-3.5" />}
                                variant="secondary"
                                onClick={cancelEditing}
                              >
                                取消
                              </InlineActionButton>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p
                              className={cn(
                                "whitespace-pre-wrap text-[13px] leading-relaxed text-foreground",
                                !expandedIds.includes(chunk.id) && "line-clamp-3",
                              )}
                            >
                              {chunk.text}
                            </p>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleExpanded(chunk.id);
                              }}
                              className="mt-2 text-[12px] font-medium text-primary transition-opacity hover:opacity-80"
                            >
                              {expandedIds.includes(chunk.id) ? "收起" : "展开"}
                            </button>
                          </>
                        )}
                      </div>
                    </ChunkCell>
                    <ChunkCell>
                      <div className="flex items-center justify-center gap-2" onClick={(event) => event.stopPropagation()}>
                        <SwitchButton
                          checked={chunk.enabled}
                          label={chunk.enabled ? "禁用文档块" : "启用文档块"}
                          onClick={() => setChunkEnabled([chunk.id], !chunk.enabled)}
                        />
                        <IconActionButton label="编辑" onClick={() => startEditing(chunk)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </IconActionButton>
                        <IconActionButton danger label="删除" onClick={() => setDeleteTarget(chunk)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </IconActionButton>
                      </div>
                    </ChunkCell>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredChunks.length === 0 ? (
              <div className="grid h-56 place-items-center border-t border-border text-[13px] text-muted-foreground">
                暂无匹配文档块
              </div>
            ) : null}
          </div>

          <div className="flex min-h-[56px] flex-col gap-3 border-t border-border px-4 py-3 text-[13px] text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <span>
              显示第 1 - {filteredChunks.length} 条，共 {filteredChunks.length} 条
            </span>
            <div className="flex items-center gap-2">
              <select
                aria-label="每页条数"
                className="h-8 rounded-md border border-input bg-card px-2 text-[12px] outline-none"
                defaultValue="10"
              >
                <option value="10">10</option>
                <option value="20">20</option>
              </select>
              <span>条</span>
            </div>
          </div>
        </section>

        <PdfPreviewPanel document={document} selectedChunk={selectedChunk} />
      </main>

      {deleteTarget ? (
        <ConfirmDialog
          title="删除文档块"
          description={`确认删除文档块 ${deleteTarget.id}？此操作只影响当前页面 mock 数据。`}
          confirmText="删除"
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => {
            deleteChunks([deleteTarget.id]);
            setDeleteTarget(null);
          }}
        />
      ) : null}

      {batchDeleteOpen ? (
        <ConfirmDialog
          title="批量删除文档块"
          description={`确认删除选中的 ${selectedCount} 个文档块？此操作只影响当前页面 mock 数据。`}
          confirmText="批量删除"
          onClose={() => setBatchDeleteOpen(false)}
          onConfirm={() => {
            deleteChunks(selectedIds);
            setBatchDeleteOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function Breadcrumbs({
  documentName,
  knowledgeBaseId,
  knowledgeBaseName,
  onKnowledgeBaseClick,
  onListClick,
}: {
  documentName: string;
  knowledgeBaseId?: string;
  knowledgeBaseName: string;
  onKnowledgeBaseClick: () => void;
  onListClick: () => void;
}) {
  return (
    <nav className="flex min-w-0 flex-wrap items-center gap-2 text-[13px] text-slate-500">
      <button type="button" onClick={onListClick} className="transition-colors hover:text-primary">
        知识库列表
      </button>
      <span>›</span>
      {knowledgeBaseId ? (
        <button type="button" onClick={onKnowledgeBaseClick} className="transition-colors hover:text-primary">
          知识库详情
        </button>
      ) : (
        <span>知识库详情</span>
      )}
      <span>›</span>
      <span className="max-w-[420px] truncate text-slate-600">{documentName || knowledgeBaseName}</span>
    </nav>
  );
}

function MetaText({ label, value }: { label: string; value: string }) {
  return (
    <span>
      <span className="text-slate-500">{label}</span>
      <span className="ml-2 text-slate-700">{value}</span>
    </span>
  );
}

function ToolbarButton({
  children,
  danger,
  disabled,
  onClick,
}: {
  children: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "h-8 rounded-full border px-3 text-[12px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45",
        danger
          ? "border-red-100 bg-red-50 text-red-400 hover:border-red-200 hover:text-red-600"
          : "border-border bg-card text-slate-500 hover:border-primary/30 hover:text-primary",
      )}
    >
      {children}
    </button>
  );
}

function ChunkHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th className={cn("border-b border-border px-4 py-3 text-[12px] font-medium", className)}>
      {children}
    </th>
  );
}

function ChunkCell({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("border-b border-border px-4 py-3 align-middle", className)}>{children}</td>;
}

function ChunkImagePreview({ image }: { image?: string }) {
  return (
    <div className="grid h-12 w-12 place-items-center border border-dashed border-border bg-surface-raised text-slate-400">
      {image ? (
        <img src={image} alt="文档块图片" className="h-full w-full object-cover" />
      ) : (
        <FileText className="h-5 w-5" />
      )}
    </div>
  );
}

function SwitchButton({
  checked,
  label,
  onClick,
}: {
  checked: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "flex h-5 w-9 items-center rounded-full px-0.5 transition-colors",
        checked ? "bg-primary" : "bg-slate-300",
      )}
    >
      <span
        className={cn(
          "h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
          checked && "translate-x-4",
        )}
      />
    </button>
  );
}

function IconActionButton({
  children,
  danger,
  label,
  onClick,
}: {
  children: ReactNode;
  danger?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "grid h-7 w-7 place-items-center rounded-md transition-colors",
        danger ? "text-red-500 hover:bg-red-50" : "text-slate-500 hover:bg-primary/10 hover:text-primary",
      )}
    >
      {children}
    </button>
  );
}

function InlineActionButton({
  children,
  icon,
  onClick,
  variant = "primary",
}: {
  children: ReactNode;
  icon: ReactNode;
  onClick: () => void;
  variant?: "primary" | "secondary";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center justify-center gap-1 rounded-md px-3 text-[12px] font-medium transition-colors",
        variant === "primary"
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "border border-input bg-card text-foreground hover:border-primary/30 hover:text-primary",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function PdfPreviewPanel({
  document,
  selectedChunk,
}: {
  document: DocumentDetail;
  selectedChunk: DocumentChunk | null;
}) {
  return (
    <aside className="flex min-h-[640px] min-w-0 flex-col rounded-md border border-border bg-card">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-[16px] font-semibold text-foreground">PDF 预览</h2>
        {selectedChunk ? (
          <div className="mt-3 space-y-1 text-[13px]">
            <p className="font-medium text-primary">已选中文档块：{selectedChunk.id}</p>
            <p className="text-slate-500">
              类型：text | 位置数量：{selectedChunk.positionCount}
            </p>
            <p className="text-emerald-600">✓ PDF中相关位置已高亮显示</p>
          </div>
        ) : (
          <p className="mt-3 text-[13px] text-muted-foreground">请选择左侧文档块查看预览位置</p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-slate-50 px-5 py-5">
        <div className="mx-auto min-h-[420px] max-w-[760px] bg-white shadow-sm">
          <MockPdfPage document={document} selectedChunk={selectedChunk} />
        </div>
      </div>
    </aside>
  );
}

function MockPdfPage({
  document,
  selectedChunk,
}: {
  document: DocumentDetail;
  selectedChunk: DocumentChunk | null;
}) {
  return (
    <div className="relative overflow-hidden p-6 text-slate-900">
      <div className="absolute right-6 top-6 flex items-center gap-1 text-[10px] font-semibold text-slate-500">
        <span className="grid h-4 w-4 place-items-center rounded-full bg-red-500 text-[9px] text-white">P</span>
        MOCK.COM
      </div>

      <div className="mb-4 text-[13px] font-semibold">{document.categoryName}</div>
      <div className="mb-3 h-px w-[22%] bg-red-500" />

      <div className="mx-auto max-w-[520px] text-center">
        <p className="text-[14px] font-semibold text-primary">知识库文档块预览</p>
        <h3 className="mt-1 text-[22px] font-semibold leading-snug text-primary">
          {document.fileName.replace(/\.[^.]+$/, "")}
        </h3>
        <div className="mx-auto mt-4 h-px w-[80%] bg-red-500" />
        <p className="mx-auto mt-3 max-w-[500px] text-[10px] leading-relaxed text-slate-600">
          该区域为前端 mock PDF 预览，用于呈现文档块和原文位置的联动效果。选中左侧不同文档块后，高亮位置会同步变化。
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1.15fr_1fr]">
        <div className="space-y-2">
          <div className="grid aspect-[3/4] place-items-center bg-slate-800 px-3 text-center text-white">
            <div>
              <p className="text-[12px] font-semibold">{document.knowledgeBase}</p>
              <p className="mt-2 text-[10px] text-slate-300">PDF PREVIEW</p>
            </div>
          </div>
          <div className="rounded-sm bg-slate-100 p-2 text-[10px] leading-relaxed text-slate-700">
            当前文档由 {document.parser} 解析，共 {document.chunks.length} 个文档块。
          </div>
        </div>

        <div className="space-y-2">
          <PreviewBlock title="文档信息" active={selectedChunk?.index === 1}>
            <p>文件类型：{document.fileType}</p>
            <p>上传人：{document.uploader}</p>
            <p>文件大小：{document.size}</p>
          </PreviewBlock>
          <PreviewBlock title="选中文档块内容" active={Boolean(selectedChunk)}>
            <p className="line-clamp-5">{selectedChunk?.text ?? "左侧选择文档块后，这里会显示对应文本摘要。"}</p>
          </PreviewBlock>
          <PreviewBlock title="解析状态" active={selectedChunk?.enabled === false}>
            <p>{selectedChunk?.enabled === false ? "该文档块当前已禁用。" : "文档块可用于检索与引用。"}</p>
          </PreviewBlock>
        </div>

        <div className="space-y-2">
          <PreviewBlock title="位置标记" active={Boolean(selectedChunk?.positionCount)}>
            <div className="space-y-1">
              {Array.from({ length: Math.max(1, selectedChunk?.positionCount ?? 1) }).map((_, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="h-px flex-1 bg-slate-300" />
                  <span className={cn("h-2 w-12 rounded-full", index === 0 ? "bg-primary" : "bg-red-300")} />
                </div>
              ))}
            </div>
          </PreviewBlock>
          <PreviewBlock title="页码" active={Boolean(selectedChunk?.pageNumber)}>
            <p>第 {selectedChunk?.pageNumber ?? 1} 页</p>
          </PreviewBlock>
          <PreviewBlock title="Token" active={Boolean(selectedChunk)}>
            <p>{selectedChunk?.tokenCount ?? 0} tokens</p>
          </PreviewBlock>
        </div>
      </div>
    </div>
  );
}

function PreviewBlock({
  active,
  children,
  title,
}: {
  active?: boolean;
  children: ReactNode;
  title: string;
}) {
  return (
    <div
      className={cn(
        "rounded-sm border p-2 text-[10px] leading-relaxed",
        active ? "border-primary/50 bg-primary/10 text-slate-800" : "border-slate-100 bg-slate-50 text-slate-600",
      )}
    >
      <div className="mb-1 font-semibold text-slate-900">{title}</div>
      {children}
    </div>
  );
}

function ConfirmDialog({
  confirmText,
  description,
  onClose,
  onConfirm,
  title,
}: {
  confirmText: string;
  description: string;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <section className="w-full max-w-[380px] overflow-hidden rounded-md bg-card shadow-xl animate-fade-in">
        <div className="border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-red-100 text-red-500">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-foreground">{title}</h2>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{description}</p>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-md border border-input bg-card px-4 text-[13px] font-medium text-foreground transition-colors hover:border-primary/30 hover:text-primary"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-9 rounded-md bg-red-500 px-4 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-red-600"
          >
            {confirmText}
          </button>
        </div>
      </section>
    </div>
  );
}
