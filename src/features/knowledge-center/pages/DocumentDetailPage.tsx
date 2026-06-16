import { useState, useMemo } from "react";
import type { ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  X,
  Trash2,
  Edit2,
  FileText,
  AlertCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";

export interface DocumentChunk {
  id: string;
  index: number;
  text: string;
  charRange: [number, number];
  tokenCount: number;
  pageNumber?: number;
}

export interface DocumentDetail {
  id: string;
  fileName: string;
  categoryId: string;
  categoryName: string;
  knowledgeBase: string;
  parser: string;
  uploader: string;
  size: string;
  uploadedAt: string;
  chunks: DocumentChunk[];
}

const MOCK_DOCUMENTS: Record<string, DocumentDetail> = {
  "doc-postgresql": {
    id: "doc-postgresql",
    fileName: "PostgreSQL从入门到精通.pdf",
    categoryId: "cat-database",
    categoryName: "数据库",
    knowledgeBase: "技术文档知识库",
    parser: "Plain Text",
    uploader: "shixing",
    size: "5.1 MB",
    uploadedAt: "2026/6/5 15:35:59",
    chunks: [
      {
        id: "chunk-1",
        index: 1,
        text: "PostgreSQL 是一个功能强大的开源对象关系型数据库系统，它使用和扩展了 SQL 语言，并结合了许多特性，这些特性使它成为最强大的数据库管理系统之一。",
        charRange: [0, 100],
        tokenCount: 35,
        pageNumber: 1,
      },
      {
        id: "chunk-2",
        index: 2,
        text: "PostgreSQL 支持复杂查询、外键、触发器、视图、事务完整性、MVCC 等特性。它还支持多种编程语言的接口，包括 C/C++、Java、Python、Perl、Ruby 等。",
        charRange: [100, 200],
        tokenCount: 42,
        pageNumber: 1,
      },
      {
        id: "chunk-3",
        index: 3,
        text: "安装 PostgreSQL 非常简单。在 Linux 系统上，可以使用包管理器进行安装。在 Windows 上，可以下载安装程序进行安装。",
        charRange: [200, 300],
        tokenCount: 32,
        pageNumber: 2,
      },
      {
        id: "chunk-4",
        index: 4,
        text: "创建数据库是使用 PostgreSQL 的第一步。可以使用 createdb 命令或者在 psql 中使用 CREATE DATABASE 语句来创建数据库。",
        charRange: [300, 400],
        tokenCount: 38,
        pageNumber: 2,
      },
      {
        id: "chunk-5",
        index: 5,
        text: "PostgreSQL 支持多种索引类型，包括 B-tree、Hash、GiST、GIN 等。正确使用索引可以大大提高查询性能。",
        charRange: [400, 500],
        tokenCount: 36,
        pageNumber: 3,
      },
      {
        id: "chunk-6",
        index: 6,
        text: "事务是数据库操作的基本单位。PostgreSQL 支持 ACID 事务特性，确保数据的一致性和完整性。",
        charRange: [500, 600],
        tokenCount: 30,
        pageNumber: 3,
      },
    ],
  },
  "doc-kubernetes": {
    id: "doc-kubernetes",
    fileName: "Kubernetes指南（Kubernetes Handbook）(202005).pdf",
    categoryId: "cat-cloud-native",
    categoryName: "云原生",
    knowledgeBase: "技术文档知识库",
    parser: "Auto",
    uploader: "shixing",
    size: "25 MB",
    uploadedAt: "2026/6/5 15:35:59",
    chunks: [],
  },
};

export function DocumentDetailPage() {
  const navigate = useNavigate();
  const { documentId } = useParams<{ documentId: string }>();
  const document = MOCK_DOCUMENTS[documentId || ""];

  const [chunks, setChunks] = useState<DocumentChunk[]>(document?.chunks || []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DocumentChunk | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);

  const totalTokens = useMemo(
    () => chunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0),
    [chunks]
  );

  const allSelected = chunks.length > 0 && chunks.every((chunk) => selectedIds.includes(chunk.id));
  const selectedCount = selectedIds.length;

  if (!document) {
    return (
      <div className="page-shell animate-fade-in">
        <header className="mb-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="返回"
            className="grid h-8 w-8 place-items-center rounded-md border border-border bg-card text-slate-500 transition-colors hover:border-primary/30 hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="truncate text-[18px] font-semibold text-foreground">文档详情</h1>
        </header>
        <div className="grid h-[300px] place-items-center rounded-lg border border-border bg-card text-[14px] text-muted-foreground">
          文档不存在
        </div>
      </div>
    );
  }

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(chunks.map((chunk) => chunk.id));
    }
  };

  const toggleChunk = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const startEditing = (chunk: DocumentChunk) => {
    setEditingId(chunk.id);
    setEditingText(chunk.text);
  };

  const saveEdit = () => {
    if (!editingId) return;
    const trimmedText = editingText.trim();
    if (!trimmedText) return;

    setChunks((current) =>
      current.map((chunk) =>
        chunk.id === editingId
          ? {
              ...chunk,
              text: trimmedText,
              tokenCount: Math.ceil(trimmedText.length / 3),
            }
          : chunk
      )
    );
    setEditingId(null);
    setEditingText("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingText("");
  };

  const confirmDelete = (chunk: DocumentChunk) => {
    setDeleteTarget(chunk);
  };

  const deleteChunk = () => {
    if (!deleteTarget) return;
    setChunks((current) =>
      current
        .filter((chunk) => chunk.id !== deleteTarget!.id)
        .map((chunk, index) => ({ ...chunk, index: index + 1 }))
    );
    setDeleteTarget(null);
  };

  const handleBatchDelete = () => {
    setShowBatchDeleteConfirm(true);
  };

  const confirmBatchDelete = () => {
    setChunks((current) =>
      current
        .filter((chunk) => !selectedIds.includes(chunk.id))
        .map((chunk, index) => ({ ...chunk, index: index + 1 }))
    );
    setSelectedIds([]);
    setShowBatchDeleteConfirm(false);
  };

  return (
    <div className="page-shell animate-fade-in">
      <header className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="返回知识库"
          className="grid h-8 w-8 place-items-center rounded-md border border-border bg-card text-slate-500 transition-colors hover:border-primary/30 hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="truncate text-[18px] font-semibold text-foreground">
          {document.fileName}
        </h1>
      </header>

      <section className="mb-4 rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap gap-4 text-[13px]">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-500" />
            <span className="text-muted-foreground">分类:</span>
            <span className="font-medium text-foreground">{document.categoryName}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">解析器:</span>
            <span className="font-medium text-foreground">{document.parser}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">上传人:</span>
            <span className="font-medium text-foreground">{document.uploader}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">大小:</span>
            <span className="font-medium text-foreground">{document.size}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">上传时间:</span>
            <span className="font-medium text-foreground">{document.uploadedAt}</span>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card shadow-sm">
        <div className="flex min-h-14 items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-4 text-[13px]">
            <span className="font-medium text-foreground">分片列表</span>
            <span className="text-muted-foreground">
              共 {chunks.length} 个分片 · {totalTokens} tokens
            </span>
          </div>
          {selectedCount > 0 && (
            <button
              type="button"
              onClick={handleBatchDelete}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-red-500 px-3 text-[12px] font-medium text-white shadow-sm transition-colors hover:bg-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
              批量删除 ({selectedCount})
            </button>
          )}
        </div>

        <div className="divide-y divide-border">
          {chunks.length === 0 ? (
            <div className="grid h-[200px] place-items-center px-4 py-8 text-[14px] text-muted-foreground">
              该文档暂无分片内容
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4 px-4 py-3 border-b border-border bg-surface-raised/50">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="选择全部分片"
                  className="h-3.5 w-3.5 rounded border-slate-300 accent-primary"
                />
                <span className="text-[12px] text-muted-foreground">全选</span>
              </div>
              {chunks.map((chunk) => (
                <div
                  key={chunk.id}
                  className={cn(
                    "group relative px-4 py-4 transition-colors",
                    selectedIds.includes(chunk.id) ? "bg-primary/5" : "hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(chunk.id)}
                      onChange={() => toggleChunk(chunk.id)}
                      aria-label={`选择分片 ${chunk.index}`}
                      className="mt-1 h-3.5 w-3.5 rounded border-slate-300 accent-primary"
                    />
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[11px] font-medium text-primary">
                      #{chunk.index}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span>{chunk.charRange[0]}–{chunk.charRange[1]} chars</span>
                        <span>{chunk.tokenCount} tokens</span>
                        {chunk.pageNumber && <span>页码 {chunk.pageNumber}</span>}
                      </div>

                      {editingId === chunk.id ? (
                        <div className="space-y-3">
                          <textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="w-full rounded-lg border border-primary/40 bg-card px-3 py-2 text-[13px] leading-relaxed outline-none focus:border-primary"
                            rows={4}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Escape") cancelEdit();
                              if (e.key === "Enter" && e.ctrlKey) saveEdit();
                            }}
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={saveEdit}
                              className="inline-flex h-7 items-center justify-center gap-1 rounded-md bg-primary px-3 text-[12px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
                            >
                              <Check className="h-3.5 w-3.5" />
                              保存
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="inline-flex h-7 items-center justify-center gap-1 rounded-md border border-input bg-card px-3 text-[12px] font-medium text-foreground transition-colors hover:border-primary/30"
                            >
                              <X className="h-3.5 w-3.5" />
                              取消
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-[13px] leading-relaxed text-foreground">
                            {chunk.text}
                          </p>
                          <div className="mt-3 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                            <ActionButton
                              icon={<Edit2 className="h-3.5 w-3.5" />}
                              onClick={() => startEditing(chunk)}
                            >
                              编辑
                            </ActionButton>
                            <ActionButton
                              icon={<Trash2 className="h-3.5 w-3.5" />}
                              danger
                              onClick={() => confirmDelete(chunk)}
                            >
                              删除
                            </ActionButton>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </section>

      {deleteTarget && (
        <DeleteConfirmDialog
          chunkIndex={deleteTarget.index}
          onClose={() => setDeleteTarget(null)}
          onConfirm={deleteChunk}
        />
      )}

      {showBatchDeleteConfirm && (
        <BatchDeleteConfirmDialog
          count={selectedCount}
          onClose={() => setShowBatchDeleteConfirm(false)}
          onConfirm={confirmBatchDelete}
        />
      )}
    </div>
  );
}

function ActionButton({
  children,
  danger,
  icon,
  onClick,
}: {
  children: ReactNode;
  danger?: boolean;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center justify-center gap-1 rounded-md px-2.5 text-[12px] font-medium transition-colors",
        danger
          ? "bg-red-100 text-red-600 hover:bg-red-200"
          : "border border-input bg-card text-foreground hover:border-primary/30 hover:text-primary"
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function DeleteConfirmDialog({
  chunkIndex,
  onClose,
  onConfirm,
}: {
  chunkIndex: number;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <section className="w-full max-w-[360px] overflow-hidden rounded-xl bg-card shadow-xl animate-fade-in">
        <div className="border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-red-100 text-red-500">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-foreground">删除分片</h2>
              <p className="mt-1 text-[13px] text-muted-foreground">
                确认删除第 {chunkIndex} 个分片？
              </p>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg border border-input bg-card px-4 text-[13px] font-medium text-foreground transition-colors hover:border-primary/30 hover:text-primary"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-9 rounded-lg bg-red-500 px-4 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-red-600"
          >
            删除
          </button>
        </div>
      </section>
    </div>
  );
}

function BatchDeleteConfirmDialog({
  count,
  onClose,
  onConfirm,
}: {
  count: number;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <section className="w-full max-w-[360px] overflow-hidden rounded-xl bg-card shadow-xl animate-fade-in">
        <div className="border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-red-100 text-red-500">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-foreground">批量删除分片</h2>
              <p className="mt-1 text-[13px] text-muted-foreground">
                确认删除选中的 {count} 个分片？此操作不可撤销。
              </p>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg border border-input bg-card px-4 text-[13px] font-medium text-foreground transition-colors hover:border-primary/30 hover:text-primary"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-9 rounded-lg bg-red-500 px-4 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-red-600"
          >
            确认删除
          </button>
        </div>
      </section>
    </div>
  );
}