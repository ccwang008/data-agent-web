import { useMemo, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  CheckCircle2,
  Cloud,
  Download,
  FileText,
  Folder,
  FolderOpen,
  Layers3,
  MoreHorizontal,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Play,
  Plus,
  Power,
  Quote,
  RefreshCw,
  Search,
  Settings,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { cn } from "@/lib/utils";

import { DEFAULT_BASES } from "./knowledge-base-data";

interface KnowledgeBaseLocationState {
  name?: string;
}

type DocumentStatus = "unparsed" | "parsing" | "parsed" | "failed";
type UploadMode = "local" | "storage";
type FilterMode = "file" | "chunk";
type EnabledFilter = "all" | "enabled" | "disabled";

interface DocumentCategory {
  id: string;
  name: string;
  children?: DocumentCategory[];
}

interface KnowledgeDocument {
  id: string;
  fileName: string;
  categoryId: string;
  knowledgeBase: string;
  parser: string;
  uploader: string;
  size: string;
  status: DocumentStatus;
  progress: number;
  uploadedAt: string;
  updatedAt: string;
  chunkSize: string;
  enabled: boolean;
  allowReference: boolean;
  chunks: DocumentChunk[];
}

interface DocumentChunk {
  id: string;
  text: string;
}

interface LocalUploadItem {
  id: string;
  file: File;
  error?: string;
}

interface StorageService {
  id: string;
  name: string;
  vendor: string;
  bucket: string;
}

interface UploadSubmitPayload {
  mode: UploadMode;
  categoryId: string;
  files: Array<{ name: string; size: string }>;
}

type CategoryDialogState =
  | { mode: "create"; parentId: string | null; initialName?: string }
  | { mode: "edit"; categoryId: string; initialName: string };

const SUPPORTED_EXTENSIONS = ["pdf", "doc", "docx", "ppt", "html", "pptx", "wps", "ppsx", "md"];
const ACCEPTED_TYPES = SUPPORTED_EXTENSIONS.map((extension) => `.${extension}`).join(",");
const MAX_FILE_SIZE = 200 * 1024 * 1024;
const UPLOAD_RULE_TEXT = "支持 pdf、doc、docx、ppt、html、pptx、wps、ppsx、md 格式，单个文件不超过 200MB";

const DOCUMENT_STATUS_OPTIONS: Array<{ value: DocumentStatus; label: string }> = [
  { value: "unparsed", label: "待解析" },
  { value: "parsing", label: "解析中" },
  { value: "parsed", label: "解析成功" },
  { value: "failed", label: "解析失败" },
];

const DOCUMENT_PARSER_OPTIONS = [
  { value: "Auto", label: "自动(继承知识库)" },
  { value: "Auto Detect", label: "自动判断" },
  { value: "DeepDOC", label: "DeepDOC" },
  { value: "Plain Text", label: "Plain Text" },
  { value: "PaddleOCR", label: "PaddleOCR" },
  { value: "Docling", label: "Docling" },
  { value: "OpenDataLoader", label: "OpenDataLoader" },
  { value: "TCADP Parser", label: "TCADP Parser" },
];

const DOCUMENT_STATUS_STYLES: Record<DocumentStatus, string> = {
  unparsed: "border-slate-200 bg-slate-50 text-slate-500",
  parsing: "border-amber-200 bg-amber-50 text-amber-700",
  parsed: "border-emerald-200 bg-emerald-50 text-emerald-600",
  failed: "border-red-200 bg-red-50 text-red-600",
};

const INITIAL_STATUS_COUNTS: Record<DocumentStatus, number> = {
  unparsed: 0,
  parsing: 0,
  parsed: 0,
  failed: 0,
};

const STORAGE_SERVICES: StorageService[] = [
  { id: "minio-docs", name: "MinIO 文档桶", vendor: "MinIO", bucket: "docs-prod" },
  { id: "aliyun-oss-materials", name: "阿里云 OSS 资料库", vendor: "阿里云 OSS", bucket: "materials-center" },
  { id: "tencent-cos-archive", name: "腾讯云 COS 归档库", vendor: "腾讯云 COS", bucket: "archive-files" },
];

const INITIAL_DOCUMENT_CATEGORIES: DocumentCategory[] = [
  {
    id: "cat-technical",
    name: "技术文档",
    children: [
      { id: "cat-database", name: "数据库" },
      { id: "cat-cloud-native", name: "云原生" },
    ],
  },
  {
    id: "cat-product",
    name: "产品资料",
    children: [
      { id: "cat-manual", name: "产品手册" },
      { id: "cat-training", name: "培训材料" },
    ],
  },
  {
    id: "cat-management",
    name: "管理制度",
    children: [
      { id: "cat-process", name: "流程规范" },
      { id: "cat-policy", name: "制度文件" },
    ],
  },
];

const DOCUMENTS: KnowledgeDocument[] = [
  {
    id: "doc-postgresql",
    fileName: "PostgreSQL从入门到精通.pdf",
    categoryId: "cat-database",
    knowledgeBase: "技术文档知识库",
    parser: "Plain Text",
    uploader: "shixing",
    size: "5.1 MB",
    status: "parsed",
    progress: 100,
    uploadedAt: "2026/6/5 15:35:59",
    updatedAt: "2026/6/5 16:12:30",
    chunkSize: "512 tokens",
    enabled: true,
    allowReference: true,
    chunks: [
      {
        id: "chunk-postgresql-1",
        text: "PostgreSQL 是一个功能强大的开源对象关系型数据库系统，它使用和扩展了 SQL 语言，并结合了许多特性。",
      },
      {
        id: "chunk-postgresql-2",
        text: "PostgreSQL 支持复杂查询、外键、触发器、视图、事务完整性、MVCC 等特性。",
      },
      {
        id: "chunk-postgresql-3",
        text: "安装 PostgreSQL 非常简单，可以使用包管理器或下载安装程序完成安装。",
      },
    ],
  },
  {
    id: "doc-kubernetes",
    fileName: "Kubernetes指南（Kubernetes Handbook）(202005).pdf",
    categoryId: "cat-cloud-native",
    knowledgeBase: "技术文档知识库",
    parser: "Auto",
    uploader: "shixing",
    size: "25 MB",
    status: "unparsed",
    progress: 0,
    uploadedAt: "2026/6/5 15:35:59",
    updatedAt: "2026/6/5 15:35:59",
    chunkSize: "自动",
    enabled: false,
    allowReference: false,
    chunks: [],
  },
];

export function KnowledgeBaseDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { knowledgeBaseId } = useParams();
  const state = location.state as KnowledgeBaseLocationState | null;
  const matchedBase = DEFAULT_BASES.find((item) => item.id === knowledgeBaseId);
  const name = state?.name || matchedBase?.name || knowledgeBaseId || "知识库";
  const [categories, setCategories] = useState<DocumentCategory[]>(INITIAL_DOCUMENT_CATEGORIES);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>(DOCUMENTS);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("file");
  const [fileFormat, setFileFormat] = useState("all");
  const [enabledFilter, setEnabledFilter] = useState<EnabledFilter>("all");
  const [parserFilter, setParserFilter] = useState("all");
  const [chunkKeyword, setChunkKeyword] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryTreeCollapsed, setCategoryTreeCollapsed] = useState(false);
  const [categoryDialog, setCategoryDialog] = useState<CategoryDialogState | null>(null);
  const [categoryNotice, setCategoryNotice] = useState<string | null>(null);
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<DocumentCategory | null>(null);
  const [status, setStatus] = useState<"all" | DocumentStatus>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [parserSettingsDocumentId, setParserSettingsDocumentId] = useState<string | null>(null);
  const [moreActionsDocumentId, setMoreActionsDocumentId] = useState<string | null>(null);
  const [renamingDocumentId, setRenamingDocumentId] = useState<string | null>(null);
  const [renamingFileName, setRenamingFileName] = useState("");

  const selectedCategoryIds = useMemo(
    () => (selectedCategoryId === "all" ? null : getCategoryIds(categories, selectedCategoryId)),
    [categories, selectedCategoryId],
  );

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const chunkSearch = chunkKeyword.trim().toLowerCase();

    return documents.filter((item) => {
      const matchesKeyword = keyword ? item.fileName.toLowerCase().includes(keyword) : true;
      const matchesCategory = selectedCategoryIds ? selectedCategoryIds.includes(item.categoryId) : true;
      const matchesFileFormat = fileFormat === "all" || getFileExtension(item.fileName) === fileFormat;
      const matchesEnabled =
        enabledFilter === "all" ||
        (enabledFilter === "enabled" ? item.enabled : !item.enabled);
      const matchesParser = parserFilter === "all" || item.parser === parserFilter;
      const matchesStatus = status === "all" || item.status === status;
      const matchesChunk = chunkSearch
        ? item.chunks.some((chunk) => chunk.text.toLowerCase().includes(chunkSearch))
        : true;

      if (filterMode === "chunk") {
        return matchesCategory && matchesKeyword && matchesChunk;
      }

      return matchesKeyword && matchesCategory && matchesFileFormat && matchesEnabled && matchesParser && matchesStatus;
    });
  }, [
    chunkKeyword,
    documents,
    enabledFilter,
    fileFormat,
    filterMode,
    parserFilter,
    search,
    selectedCategoryIds,
    status,
  ]);
  const visibleCategories = useMemo(() => filterCategoryTree(categories, categorySearch), [categories, categorySearch]);
  const categoryOptions = useMemo(() => flattenCategories(categories), [categories]);
  const categoryNameById = useMemo(() => categoryOptions.reduce<Record<string, string>>((map, item) => {
    map[item.id] = item.name;
    return map;
  }, {}), [categoryOptions]);
  const statusCounts = useMemo(
    () =>
      documents.reduce<Record<DocumentStatus, number>>(
        (counts, item) => ({
          ...counts,
          [item.status]: counts[item.status] + 1,
        }),
        { ...INITIAL_STATUS_COUNTS },
      ),
    [documents],
  );
  const baseInfoItems = [
    { label: "创建时间", value: matchedBase?.createdAt ?? "-" },
    { label: "默认解析策略", value: matchedBase?.parser ?? "-" },
    { label: "文档数量", value: `${documents.length}` },
    { label: "创建人", value: matchedBase?.creator ?? "-" },
  ];
  const allSelected = filtered.length > 0 && filtered.every((item) => selectedIds.includes(item.id));
  const selectedCount = selectedIds.filter((id) => filtered.some((item) => item.id === id)).length;

  const toggleAll = () => {
    setSelectedIds((current) => {
      const filteredIds = filtered.map((item) => item.id);
      if (filteredIds.every((id) => current.includes(id))) {
        return current.filter((id) => !filteredIds.includes(id));
      }

      return Array.from(new Set([...current, ...filteredIds]));
    });
  };

  const toggleDocument = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const refresh = () => {
    setRefreshing(true);
    window.setTimeout(() => setRefreshing(false), 520);
  };

  const updateParser = (id: string, parser: string) => {
    setDocuments((current) =>
      current.map((item) => (item.id === id ? { ...item, parser } : item)),
    );
    setParserSettingsDocumentId(null);
  };

  const startParsingDocument = (id: string) => {
    setDocuments((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              status: "parsing",
              progress: item.progress > 0 ? item.progress : 35,
            }
          : item,
      ),
    );
  };

  const startRenamingDocument = (document: KnowledgeDocument) => {
    setRenamingDocumentId(document.id);
    setRenamingFileName(document.fileName);
    setMoreActionsDocumentId(null);
    setParserSettingsDocumentId(null);
  };

  const cancelRenamingDocument = () => {
    setRenamingDocumentId(null);
    setRenamingFileName("");
  };

  const saveRenamingDocument = (id: string) => {
    const nextFileName = renamingFileName.trim();

    if (!nextFileName) {
      cancelRenamingDocument();
      return;
    }

    setDocuments((current) =>
      current.map((item) => (item.id === id ? { ...item, fileName: nextFileName } : item)),
    );
    cancelRenamingDocument();
  };

  const toggleDocumentEnabled = (id: string) => {
    setDocuments((current) =>
      current.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item)),
    );
    setMoreActionsDocumentId(null);
  };

  const toggleDocumentReference = (id: string) => {
    setDocuments((current) =>
      current.map((item) => (item.id === id ? { ...item, allowReference: !item.allowReference } : item)),
    );
    setMoreActionsDocumentId(null);
  };

  const deleteDocument = (id: string) => {
    setDocuments((current) => current.filter((item) => item.id !== id));
    setSelectedIds((current) => current.filter((item) => item !== id));
    setParserSettingsDocumentId((current) => (current === id ? null : current));
    setMoreActionsDocumentId((current) => (current === id ? null : current));
    setRenamingDocumentId((current) => (current === id ? null : current));
  };

  const addUploadedDocuments = (payload: UploadSubmitPayload) => {
    const uploadedAt = formatDateTime(new Date());
    const nextDocuments: KnowledgeDocument[] = payload.files.map((file, index) => ({
      id: `doc-${payload.mode}-${Date.now()}-${index}`,
      fileName: file.name,
      categoryId: payload.categoryId,
      knowledgeBase: name,
      parser: "Auto",
      uploader: "wangchao",
      size: file.size,
      status: "unparsed",
      progress: 0,
      uploadedAt,
      updatedAt: uploadedAt,
      chunkSize: "自动",
      enabled: true,
      allowReference: true,
      chunks: [],
    }));

    setDocuments((current) => [...nextDocuments, ...current]);
    setSelectedCategoryId(payload.categoryId);
    setShowUpload(false);
  };

  const saveCategory = (categoryName: string) => {
    const trimmed = categoryName.trim();
    if (!categoryDialog || !trimmed) return;

    if (categoryDialog.mode === "create") {
      const nextCategory: DocumentCategory = {
        id: `cat-${Date.now()}`,
        name: trimmed,
      };

      setCategories((current) => addCategory(current, categoryDialog.parentId, nextCategory));
      setCategoryDialog(null);
      return;
    }

    setCategories((current) => updateCategoryName(current, categoryDialog.categoryId, trimmed));
    setCategoryDialog(null);
  };

  const removeCategory = (categoryId: string) => {
    const category = findCategory(categories, categoryId);
    if (!category) return;

    if (hasChildCategories(category) || getCategoryDocumentCount(categories, categoryId, documents) > 0) {
      setCategoryNotice("请先删除子目录或移走文档后再删除");
      return;
    }

    setDeleteCategoryTarget(category);
  };

  const confirmRemoveCategory = () => {
    if (!deleteCategoryTarget) return;

    setCategories((current) => deleteCategory(current, deleteCategoryTarget.id));
    if (selectedCategoryId === deleteCategoryTarget.id) {
      setSelectedCategoryId("all");
    }
    setDeleteCategoryTarget(null);
  };

  return (
    <div className="page-shell animate-fade-in">
      <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
            <h1 className="text-[18px] font-semibold text-foreground">知识库详情页</h1>
            <p className="mt-1 truncate text-[12px] text-muted-foreground">{name}</p>
          </div>
        </div>
        <div className="flex w-fit flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              navigate("/knowledge-center/vectors", {
                state: { knowledgeBaseId, name },
              })
            }
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 text-[12px] font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            <Layers3 className="h-3.5 w-3.5" />
            知识向量
          </button>
          <button
            type="button"
            onClick={() =>
              navigate(`/knowledge-center/knowledge-bases/${knowledgeBaseId}/knowledge-graph`, {
                state: { name },
              })
            }
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-primary bg-primary px-3 text-[12px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Network className="h-3.5 w-3.5" />
            知识图谱
          </button>
        </div>
      </header>

      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border bg-card px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {baseInfoItems.map((item) => (
              <SummaryInfoItem key={item.label} label={item.label} value={item.value} />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            {DOCUMENT_STATUS_OPTIONS.map((item) => (
              <ParseStatusSummaryBadge
                key={item.value}
                label={item.label}
                count={statusCounts[item.value]}
              />
            ))}
          </div>
        </div>

        <div className="flex min-h-14 flex-col gap-3 border-b border-border px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <select
              value={filterMode}
              onChange={(event) => setFilterMode(event.target.value as FilterMode)}
              className="h-8 w-full rounded-lg border border-input bg-card px-3 text-[12px] text-foreground outline-none transition-colors hover:border-primary/30 focus:border-primary sm:w-[110px]"
            >
              <option value="file">按文件</option>
              <option value="chunk">按分片</option>
            </select>

            <div className="flex h-8 w-full min-w-0 items-center gap-2 rounded-lg border border-input bg-surface-raised px-3 text-[12px] text-muted-foreground sm:w-[180px]">
              <Search className="h-3.5 w-3.5 shrink-0" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground/70"
                placeholder={filterMode === "file" ? "文件名模糊搜索" : "文件名关键词搜索"}
              />
            </div>

            {filterMode === "file" ? (
              <>
                <select
                  value={fileFormat}
                  onChange={(event) => setFileFormat(event.target.value)}
                  className="h-8 w-full rounded-lg border border-input bg-card px-3 text-[12px] text-foreground outline-none transition-colors hover:border-primary/30 focus:border-primary sm:w-[120px]"
                >
                  <option value="all">全部格式</option>
                  {SUPPORTED_EXTENSIONS.map((extension) => (
                    <option key={extension} value={extension}>
                      {extension}
                    </option>
                  ))}
                </select>

                <select
                  value={enabledFilter}
                  onChange={(event) => setEnabledFilter(event.target.value as EnabledFilter)}
                  className="h-8 w-full rounded-lg border border-input bg-card px-3 text-[12px] text-foreground outline-none transition-colors hover:border-primary/30 focus:border-primary sm:w-[130px]"
                >
                  <option value="all">全部启用状态</option>
                  <option value="enabled">启用</option>
                  <option value="disabled">禁用</option>
                </select>

                <select
                  value={parserFilter}
                  onChange={(event) => setParserFilter(event.target.value)}
                  className="h-8 w-full rounded-lg border border-input bg-card px-3 text-[12px] text-foreground outline-none transition-colors hover:border-primary/30 focus:border-primary sm:w-[170px]"
                >
                  <option value="all">全部解析方式</option>
                  {DOCUMENT_PARSER_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>

                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as "all" | DocumentStatus)}
                  className="h-8 w-full rounded-lg border border-input bg-card px-3 text-[12px] text-foreground outline-none transition-colors hover:border-primary/30 focus:border-primary sm:w-[130px]"
                >
                  <option value="all">全部解析状态</option>
                  {DOCUMENT_STATUS_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <div className="flex h-8 w-full min-w-0 items-center gap-2 rounded-lg border border-input bg-surface-raised px-3 text-[12px] text-muted-foreground sm:w-[220px]">
                <Search className="h-3.5 w-3.5 shrink-0" />
                <input
                  value={chunkKeyword}
                  onChange={(event) => setChunkKeyword(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground/70"
                  placeholder="切片内容关键词搜索"
                />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            <button
              type="button"
              onClick={() => setShowUpload(true)}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-input bg-card px-3 text-[12px] font-medium text-foreground transition-colors hover:border-primary/30 hover:text-primary"
            >
              <Upload className="h-3.5 w-3.5" />
              上传
            </button>

            <button
              type="button"
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary/55 px-3 text-[12px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Play className="h-3.5 w-3.5" />
              批量解析 ({selectedCount})
            </button>

            <button
              type="button"
              onClick={refresh}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-input bg-card px-3 text-[12px] font-medium text-foreground transition-colors hover:border-primary/30 hover:text-primary"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
              刷新
            </button>
          </div>
        </div>

        <div className="flex min-h-[360px] flex-col lg:flex-row">
          {categoryTreeCollapsed ? (
            <aside className="border-b border-border bg-surface-raised/50 p-2 lg:w-11 lg:shrink-0 lg:border-b-0 lg:border-r">
              <button
                type="button"
                onClick={() => setCategoryTreeCollapsed(false)}
                aria-label="展开分类树"
                title="展开分类树"
                className="grid h-8 w-7 place-items-center rounded-md text-slate-500 transition-colors hover:bg-muted hover:text-primary"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </button>
            </aside>
          ) : (
            <aside className="border-b border-border bg-surface-raised/50 p-4 lg:w-[240px] lg:shrink-0 lg:border-b-0 lg:border-r">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-[13px] font-semibold text-foreground">文档分类</h2>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCategoryDialog({ mode: "create", parentId: null })}
                    aria-label="新增根目录分类"
                    title="新增根目录分类"
                    className="grid h-7 w-7 place-items-center rounded-md text-slate-500 transition-colors hover:bg-muted hover:text-primary"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategoryTreeCollapsed(true)}
                    aria-label="隐藏分类树"
                    title="隐藏分类树"
                    className="grid h-7 w-7 place-items-center rounded-md text-slate-500 transition-colors hover:bg-muted hover:text-primary"
                  >
                    <PanelLeftClose className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="mb-3 flex h-8 items-center gap-2 rounded-lg border border-input bg-card px-2.5 text-[12px] text-muted-foreground">
                <Search className="h-3.5 w-3.5 shrink-0" />
                <input
                  value={categorySearch}
                  onChange={(event) => setCategorySearch(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground/70"
                  placeholder="搜索分类"
                />
              </div>

              <div className="space-y-1">
                <CategoryTreeRoot
                  selected={selectedCategoryId === "all"}
                  count={documents.length}
                  onClick={() => setSelectedCategoryId("all")}
                  onAdd={() => setCategoryDialog({ mode: "create", parentId: null })}
                />
                {visibleCategories.map((category) => (
                  <CategoryTreeNode
                    key={category.id}
                    allCategories={categories}
                    category={category}
                    documents={documents}
                    selectedCategoryId={selectedCategoryId}
                    onAdd={(parentId) => setCategoryDialog({ mode: "create", parentId })}
                    onDelete={removeCategory}
                    onEdit={(item) =>
                      setCategoryDialog({ mode: "edit", categoryId: item.id, initialName: item.name })
                    }
                    onSelect={setSelectedCategoryId}
                  />
                ))}
                {visibleCategories.length === 0 && (
                  <div className="rounded-md border border-dashed border-border px-3 py-6 text-center text-[12px] text-muted-foreground">
                    暂无匹配分类
                  </div>
                )}
              </div>
            </aside>
          )}

          <div className="min-w-0 flex-1">
            <div className="overflow-x-auto px-4">
              <table className="w-full min-w-[1600px] border-separate border-spacing-0 text-left">
                <thead>
                  <tr className="text-[12px] font-medium text-slate-600">
                    <DocumentHeader className="w-[3%] text-center">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        aria-label="选择全部文档"
                        className="h-3.5 w-3.5 rounded border-slate-300 align-middle accent-primary"
                      />
                    </DocumentHeader>
                    <DocumentHeader className="w-[14%]">文件名</DocumentHeader>
                    <DocumentHeader className="w-[7%]">分类</DocumentHeader>
                    <DocumentHeader className="w-[8%]">知识库</DocumentHeader>
                    <DocumentHeader className="w-[8%]">解析器</DocumentHeader>
                    <DocumentHeader className="w-[5%]">大小</DocumentHeader>
                    <DocumentHeader className="w-[7%]">解析状态</DocumentHeader>
                    <DocumentHeader className="w-[5%]">启用</DocumentHeader>
                    <DocumentHeader className="w-[5%]">引用</DocumentHeader>
                    <DocumentHeader className="w-[7%]">进度</DocumentHeader>
                    <DocumentHeader className="w-[6%]">上传人</DocumentHeader>
                    <DocumentHeader className="w-[9%]">上传时间</DocumentHeader>
                    <DocumentHeader className="w-[9%]">更新时间</DocumentHeader>
                    <DocumentHeader className="w-[6%]">切片大小</DocumentHeader>
                    <DocumentHeader className="w-[6%]">切片数量</DocumentHeader>
                    <DocumentHeader className="w-[8%] text-center">操作</DocumentHeader>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.id} className="text-[13px] text-foreground">
                      <DocumentCell className="text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => toggleDocument(item.id)}
                          aria-label={`选择 ${item.fileName}`}
                          className="h-3.5 w-3.5 rounded border-slate-300 align-middle accent-primary"
                        />
                      </DocumentCell>
                      <DocumentCell>
                        {renamingDocumentId === item.id ? (
                          <input
                            autoFocus
                            value={renamingFileName}
                            onChange={(event) => setRenamingFileName(event.target.value)}
                            onBlur={() => saveRenamingDocument(item.id)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") saveRenamingDocument(item.id);
                              if (event.key === "Escape") cancelRenamingDocument();
                            }}
                            aria-label={`重命名 ${item.fileName}`}
                            className="h-8 w-full max-w-[285px] rounded-lg border border-primary/40 bg-card px-2.5 text-[13px] text-foreground outline-none transition-colors focus:border-primary"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/knowledge-center/knowledge-bases/${knowledgeBaseId}/documents/${item.id}`, {
                                state: { knowledgeBaseName: name, documentName: item.fileName },
                              })
                            }
                            className="max-w-[285px] text-left text-primary underline underline-offset-4 transition-opacity hover:opacity-80"
                            title={item.fileName}
                          >
                            {item.fileName}
                          </button>
                        )}
                      </DocumentCell>
                      <DocumentCell>
                        <CategoryBadge>{categoryNameById[item.categoryId] ?? "未分类"}</CategoryBadge>
                      </DocumentCell>
                      <DocumentCell>{item.knowledgeBase}</DocumentCell>
                      <DocumentCell>
                        <span className="inline-flex h-7 max-w-[150px] items-center rounded-md border border-slate-200 bg-slate-50 px-2.5 text-[12px] text-slate-600">
                          <span className="truncate">{getParserLabel(item.parser)}</span>
                        </span>
                      </DocumentCell>
                      <DocumentCell>{item.size}</DocumentCell>
                      <DocumentCell>
                        <DocumentStatusBadge status={item.status} />
                      </DocumentCell>
                      <DocumentCell>
                        <EnabledBadge enabled={item.enabled} />
                      </DocumentCell>
                      <DocumentCell>
                        <ReferenceBadge allowReference={item.allowReference} />
                      </DocumentCell>
                      <DocumentCell>
                        <ProgressValue value={item.progress} />
                      </DocumentCell>
                      <DocumentCell>{item.uploader}</DocumentCell>
                      <DocumentCell className="tabular-nums">{item.uploadedAt}</DocumentCell>
                      <DocumentCell className="tabular-nums">{item.updatedAt}</DocumentCell>
                      <DocumentCell>{item.chunkSize}</DocumentCell>
                      <DocumentCell className="tabular-nums">{item.chunks.length}</DocumentCell>
                      <DocumentCell>
                        <div className="relative flex items-center justify-center gap-1.5">
                          <ActionButton
                            icon={<Play className="h-3.5 w-3.5" />}
                            label="解析"
                            onClick={() => startParsingDocument(item.id)}
                          />
                          <ActionButton
                            icon={<Settings className="h-3.5 w-3.5" />}
                            label="设置解析方法"
                            onClick={() =>
                              setParserSettingsDocumentId((current) => (current === item.id ? null : item.id))
                            }
                          />
                          <ActionButton icon={<Download className="h-3.5 w-3.5" />} label="下载" />
                          <ActionButton
                            icon={<Trash2 className="h-3.5 w-3.5" />}
                            label="删除"
                            onClick={() => deleteDocument(item.id)}
                            variant="danger"
                          />
                          <ActionButton
                            icon={<MoreHorizontal className="h-3.5 w-3.5" />}
                            label="更多操作"
                            onClick={() => {
                              setMoreActionsDocumentId((current) => (current === item.id ? null : item.id));
                              setParserSettingsDocumentId(null);
                            }}
                          />
                          {parserSettingsDocumentId === item.id && (
                            <div className="absolute right-0 top-9 z-20 rounded-lg border border-border bg-card p-2 shadow-lg">
                              <select
                                autoFocus
                                value={item.parser}
                                onChange={(event) => updateParser(item.id, event.target.value)}
                                onBlur={() => setParserSettingsDocumentId(null)}
                                aria-label={`设置 ${item.fileName} 的解析方法`}
                                className="h-8 w-[180px] rounded-lg border border-input bg-card px-3 text-[12px] text-foreground outline-none transition-colors hover:border-primary/30 focus:border-primary"
                              >
                                {DOCUMENT_PARSER_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                          {moreActionsDocumentId === item.id && (
                            <div className="absolute right-0 top-9 z-20 w-[150px] rounded-lg border border-border bg-card p-1.5 shadow-lg">
                              <MoreActionMenuItem
                                icon={<Power className="h-3.5 w-3.5" />}
                                label={item.enabled ? "禁用" : "启用"}
                                onClick={() => toggleDocumentEnabled(item.id)}
                              />
                              <MoreActionMenuItem
                                icon={<Quote className="h-3.5 w-3.5" />}
                                label={item.allowReference ? "关闭引用" : "开启引用"}
                                onClick={() => toggleDocumentReference(item.id)}
                              />
                              <MoreActionMenuItem
                                icon={<Pencil className="h-3.5 w-3.5" />}
                                label="重命名"
                                onClick={() => startRenamingDocument(item)}
                              />
                            </div>
                          )}
                        </div>
                      </DocumentCell>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filtered.length === 0 && (
                <div className="grid h-48 place-items-center border-t border-border text-[13px] text-muted-foreground">
                  暂无文档
                </div>
              )}
            </div>

            <div className="flex min-h-[48px] flex-col gap-3 border-t border-border px-4 py-3 text-[13px] text-slate-600 sm:flex-row sm:items-center sm:justify-between">
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
          </div>
        </div>
      </section>

      {showUpload && (
        <UploadDocumentDialog
          categories={categoryOptions}
          initialCategoryId={selectedCategoryId === "all" ? categoryOptions[0]?.id ?? "" : selectedCategoryId}
          onClose={() => setShowUpload(false)}
          onSubmit={addUploadedDocuments}
        />
      )}

      {categoryDialog && (
        <CategoryNameDialog
          initialName={categoryDialog.initialName ?? ""}
          title={categoryDialog.mode === "create" ? "新增分类" : "编辑分类"}
          onClose={() => setCategoryDialog(null)}
          onSubmit={saveCategory}
        />
      )}

      {deleteCategoryTarget && (
        <CategoryDeleteDialog
          categoryName={deleteCategoryTarget.name}
          onClose={() => setDeleteCategoryTarget(null)}
          onConfirm={confirmRemoveCategory}
        />
      )}

      {categoryNotice && (
        <CategoryNoticeDialog message={categoryNotice} onClose={() => setCategoryNotice(null)} />
      )}

    </div>
  );
}

function CategoryTreeRoot({
  selected,
  count,
  onAdd,
  onClick,
}: {
  selected: boolean;
  count: number;
  onAdd: () => void;
  onClick: () => void;
}) {
  return (
    <div
      className={cn(
        "group flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] transition-colors",
        selected ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-muted hover:text-foreground",
      )}
    >
      <button type="button" onClick={onClick} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        {selected ? <FolderOpen className="h-3.5 w-3.5" /> : <Folder className="h-3.5 w-3.5" />}
        <span className="min-w-0 flex-1 truncate font-medium">全部文档</span>
      </button>
      <span className="tabular-nums text-[11px] text-muted-foreground">{count}</span>
      <button
        type="button"
        onClick={onAdd}
        aria-label="在根目录新增子目录"
        title="新增子目录"
        className="grid h-6 w-6 place-items-center rounded text-slate-400 opacity-0 transition-all hover:bg-card hover:text-primary group-hover:opacity-100"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function CategoryTreeNode({
  allCategories,
  category,
  documents,
  selectedCategoryId,
  onAdd,
  onDelete,
  onEdit,
  onSelect,
  depth = 0,
}: {
  allCategories: DocumentCategory[];
  category: DocumentCategory;
  documents: KnowledgeDocument[];
  selectedCategoryId: string;
  onAdd: (parentId: string) => void;
  onDelete: (id: string) => void;
  onEdit: (category: DocumentCategory) => void;
  onSelect: (id: string) => void;
  depth?: number;
}) {
  const selected = selectedCategoryId === category.id;
  const hasChildren = Boolean(category.children?.length);
  const count = getCategoryDocumentCount(allCategories, category.id, documents);

  return (
    <div>
      <div
        className={cn(
          "group flex h-8 w-full items-center gap-1.5 rounded-md px-2 text-left text-[13px] transition-colors",
          selected ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-muted hover:text-foreground",
        )}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        <button
          type="button"
          onClick={() => onSelect(category.id)}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
        >
          {hasChildren ? (
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          ) : (
            <span className="h-3.5 w-3.5" />
          )}
          {selected ? <FolderOpen className="h-3.5 w-3.5" /> : <Folder className="h-3.5 w-3.5" />}
          <span className="min-w-0 flex-1 truncate">{category.name}</span>
        </button>
        <span className="tabular-nums text-[11px] text-muted-foreground">{count}</span>
        <span className="flex items-center opacity-0 transition-opacity group-hover:opacity-100">
          <CategoryIconButton label={`新增 ${category.name} 的子目录`} title="新增子目录" onClick={() => onAdd(category.id)}>
            <Plus className="h-3.5 w-3.5" />
          </CategoryIconButton>
          <CategoryIconButton label={`编辑 ${category.name}`} title="编辑名称" onClick={() => onEdit(category)}>
            <Pencil className="h-3.5 w-3.5" />
          </CategoryIconButton>
          <CategoryIconButton label={`删除 ${category.name}`} title="删除" danger onClick={() => onDelete(category.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </CategoryIconButton>
        </span>
      </div>
      {category.children?.map((child) => (
        <CategoryTreeNode
          key={child.id}
          allCategories={allCategories}
          category={child}
          documents={documents}
          selectedCategoryId={selectedCategoryId}
          onAdd={onAdd}
          onDelete={onDelete}
          onEdit={onEdit}
          onSelect={onSelect}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

function CategoryIconButton({
  children,
  danger,
  label,
  onClick,
  title,
}: {
  children: ReactNode;
  danger?: boolean;
  label: string;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={title}
      className={cn(
        "grid h-6 w-6 place-items-center rounded text-slate-400 transition-colors hover:bg-card",
        danger ? "hover:text-red-500" : "hover:text-primary",
      )}
    >
      {children}
    </button>
  );
}

function CategoryNameDialog({
  initialName,
  onClose,
  onSubmit,
  title,
}: {
  initialName: string;
  onClose: () => void;
  onSubmit: (name: string) => void;
  title: string;
}) {
  const [name, setName] = useState(initialName);
  const [touched, setTouched] = useState(false);
  const error = touched && !name.trim() ? "分类名称不能为空" : undefined;

  const submit = () => {
    setTouched(true);
    if (!name.trim()) return;
    onSubmit(name);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <section className="w-full max-w-[360px] overflow-hidden rounded-xl bg-card shadow-xl animate-fade-in">
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

        <div className="px-5 py-5">
          <FieldLabel label="分类名称" error={error}>
            <input
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setTouched(true);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") submit();
              }}
              className={dialogInputClass(error)}
              placeholder="请输入分类名称"
              autoFocus
            />
          </FieldLabel>
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
            disabled={!name.trim()}
            className="h-9 rounded-lg bg-primary px-4 text-[13px] font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            保存
          </button>
        </div>
      </section>
    </div>
  );
}

function CategoryDeleteDialog({
  categoryName,
  onClose,
  onConfirm,
}: {
  categoryName: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <section className="w-full max-w-[360px] overflow-hidden rounded-xl bg-card shadow-xl animate-fade-in">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-[16px] font-semibold text-foreground">删除分类</h2>
          <p className="mt-2 text-[13px] leading-5 text-muted-foreground">
            确认删除分类“{categoryName}”？
          </p>
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

function CategoryNoticeDialog({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <section className="w-full max-w-[360px] overflow-hidden rounded-xl bg-card shadow-xl animate-fade-in">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-[16px] font-semibold text-foreground">无法删除</h2>
          <p className="mt-2 text-[13px] leading-5 text-muted-foreground">{message}</p>
        </div>
        <div className="flex justify-end px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg bg-primary px-4 text-[13px] font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
          >
            知道了
          </button>
        </div>
      </section>
    </div>
  );
}

function UploadDocumentDialog({
  categories,
  initialCategoryId,
  onClose,
  onSubmit,
}: {
  categories: Array<{ id: string; name: string; depth: number }>;
  initialCategoryId: string;
  onClose: () => void;
  onSubmit: (payload: UploadSubmitPayload) => void;
}) {
  const [mode, setMode] = useState<UploadMode>("local");
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [localFiles, setLocalFiles] = useState<LocalUploadItem[]>([]);
  const [storageServiceId, setStorageServiceId] = useState(STORAGE_SERVICES[0]?.id ?? "");
  const [objectPath, setObjectPath] = useState("");
  const [objectPathTouched, setObjectPathTouched] = useState(false);

  const objectFileName = getFileNameFromObjectPath(objectPath);
  const objectPathError = objectPathTouched ? validateObjectPath(objectPath) : undefined;
  const localValidFiles = localFiles.filter((item) => !item.error);
  const hasLocalErrors = localFiles.some((item) => item.error);
  const canSubmit =
    mode === "local"
      ? Boolean(categoryId) && localFiles.length > 0 && !hasLocalErrors
      : Boolean(categoryId) && objectPath.trim().length > 0 && !validateObjectPath(objectPath);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setLocalFiles((current) => [
      ...current,
      ...files.map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
        file,
        error: validateLocalFile(file),
      })),
    ]);
    event.target.value = "";
  };

  const removeLocalFile = (id: string) => {
    setLocalFiles((current) => current.filter((item) => item.id !== id));
  };

  const submit = () => {
    if (!canSubmit) {
      setObjectPathTouched(true);
      return;
    }

    if (mode === "local") {
      onSubmit({
        mode,
        categoryId,
        files: localValidFiles.map((item) => ({
          name: item.file.name,
          size: formatBytes(item.file.size),
        })),
      });
      return;
    }

    onSubmit({
      mode,
      categoryId,
      files: [{ name: objectFileName, size: "—" }],
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <section className="w-full max-w-[560px] overflow-hidden rounded-xl bg-card shadow-xl animate-fade-in">
        <div className="flex h-14 items-center justify-between border-b border-border px-5">
          <h2 className="text-[16px] font-semibold text-foreground">上传文档</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="grid h-8 w-8 place-items-center rounded-md text-slate-500 transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-5">
          <div className="grid grid-cols-2 rounded-lg border border-input bg-surface-raised p-1">
            <TabButton active={mode === "local"} onClick={() => setMode("local")} icon={<Upload className="h-3.5 w-3.5" />}>
              本地文件
            </TabButton>
            <TabButton active={mode === "storage"} onClick={() => setMode("storage")} icon={<Cloud className="h-3.5 w-3.5" />}>
              对象存储
            </TabButton>
          </div>

          <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-[12px] text-blue-700">
            {UPLOAD_RULE_TEXT}
          </div>

          <div className="mt-4">
            <FieldLabel label="文档分类">
              <select
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className={dialogInputClass()}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {`${"\u00A0\u00A0".repeat(category.depth)}${category.name}`}
                  </option>
                ))}
              </select>
            </FieldLabel>
          </div>

          {mode === "local" ? (
            <div className="mt-4 space-y-4">
              <label className="flex min-h-[126px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-input bg-surface-raised px-4 py-6 text-center transition-colors hover:border-primary/40 hover:bg-primary/5">
                <Upload className="h-7 w-7 text-slate-500" />
                <span className="mt-3 text-[13px] font-medium text-foreground">点击选择本地文件</span>
                <span className="mt-1 text-[12px] text-muted-foreground">可一次选择多个文档</span>
                <input
                  type="file"
                  multiple
                  accept={ACCEPTED_TYPES}
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {localFiles.length > 0 && (
                <div className="overflow-hidden rounded-lg border border-border">
                  <div className="grid grid-cols-[1fr_88px_84px_36px] border-b border-border bg-surface-raised px-3 py-2 text-[12px] font-medium text-slate-600">
                    <span>文件名</span>
                    <span>大小</span>
                    <span>状态</span>
                    <span />
                  </div>
                  <div className="max-h-[210px] overflow-y-auto">
                    {localFiles.map((item) => (
                      <div
                        key={item.id}
                        className="grid grid-cols-[1fr_88px_84px_36px] items-center border-b border-border px-3 py-2 text-[12px] last:border-b-0"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <FileText className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                          <span className="truncate" title={item.file.name}>
                            {item.file.name}
                          </span>
                        </span>
                        <span className="tabular-nums text-muted-foreground">{formatBytes(item.file.size)}</span>
                        <span>
                          {item.error ? (
                            <span className="inline-flex items-center gap-1 text-red-500" title={item.error}>
                              <AlertCircle className="h-3.5 w-3.5" />
                              异常
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-600">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              可上传
                            </span>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeLocalFile(item.id)}
                          aria-label={`移除 ${item.file.name}`}
                          className="grid h-7 w-7 place-items-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        {item.error && (
                          <p className="col-span-4 mt-1 text-[11px] text-red-500">{item.error}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <FieldLabel label="对象存储服务">
                <select
                  value={storageServiceId}
                  onChange={(event) => setStorageServiceId(event.target.value)}
                  className={dialogInputClass()}
                >
                  {STORAGE_SERVICES.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </FieldLabel>

              <FieldLabel label="对象路径 / Key" error={objectPathError}>
                <input
                  value={objectPath}
                  onChange={(event) => {
                    setObjectPath(event.target.value);
                    setObjectPathTouched(true);
                  }}
                  onBlur={() => setObjectPathTouched(true)}
                  className={dialogInputClass(objectPathError)}
                  placeholder="docs/2026/产品手册.pdf"
                />
              </FieldLabel>

              {objectFileName && !validateObjectPath(objectPath) && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  将导入：{objectFileName}
                </div>
              )}
            </div>
          )}
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
            disabled={!canSubmit}
            className="h-9 rounded-lg bg-primary px-4 text-[13px] font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            上传
          </button>
        </div>
      </section>
    </div>
  );
}

function TabButton({
  active,
  children,
  icon,
  onClick,
}: {
  active: boolean;
  children: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center justify-center gap-1.5 rounded-md text-[13px] font-medium transition-colors",
        active ? "bg-card text-primary shadow-sm" : "text-slate-500 hover:text-foreground",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function FieldLabel({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-foreground">{label}</span>
      {children}
      {error && <span className="mt-1 block text-[11px] text-red-500">{error}</span>}
    </label>
  );
}

function DocumentHeader({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <th className={cn("border-b border-border px-3 py-4", className)}>
      {children}
    </th>
  );
}

function DocumentCell({
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

function SummaryInfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 text-[12px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-2 font-medium text-foreground">{value}</span>
    </div>
  );
}

function ParseStatusSummaryBadge({
  count,
  label,
}: {
  count: number;
  label: string;
}) {
  return (
    <span className="inline-flex items-center text-[12px] text-black">
      {label}
      <span className="ml-1 tabular-nums">{count}</span>
    </span>
  );
}

function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  const label = DOCUMENT_STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status;

  return (
    <span
      className={cn(
        "inline-flex h-6 items-center justify-center rounded-full border px-2.5 text-[12px] font-medium",
        DOCUMENT_STATUS_STYLES[status],
      )}
    >
      {label}
    </span>
  );
}

function CategoryBadge({ children }: { children: string }) {
  return (
    <span className="inline-flex h-6 max-w-[96px] items-center rounded-full border border-slate-200 bg-slate-50 px-2 text-[12px] text-slate-600">
      <span className="truncate">{children}</span>
    </span>
  );
}

function ProgressValue({ value }: { value: number }) {
  return (
    <div className="w-[100px]">
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            value === 100 ? "bg-emerald-500" : "bg-slate-300",
          )}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="mt-1 block text-[11px] tabular-nums text-muted-foreground">{value}%</span>
    </div>
  );
}

function getParserLabel(value: string) {
  return DOCUMENT_PARSER_OPTIONS.find((item) => item.value === value)?.label ?? value;
}

function ActionButton({
  icon,
  disabled,
  label,
  onClick,
  variant = "default",
}: {
  icon: ReactNode;
  disabled?: boolean;
  label: string;
  onClick?: () => void;
  variant?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-lg border border-input bg-card text-slate-600 transition-colors hover:border-primary/30 hover:text-primary",
        variant === "danger" && "hover:border-red-200 hover:text-red-600",
        disabled && "cursor-not-allowed bg-slate-50 text-slate-400 hover:border-input hover:text-slate-400",
      )}
    >
      {icon}
    </button>
  );
}

function MoreActionMenuItem({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[12px] font-medium text-foreground transition-colors hover:bg-muted hover:text-primary"
    >
      <span className="text-slate-500">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function EnabledBadge({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          enabled ? "bg-emerald-500" : "bg-slate-400",
        )}
      />
      {enabled ? "已启用" : "已禁用"}
    </span>
  );
}

function ReferenceBadge({ allowReference }: { allowReference: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        allowReference ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500",
      )}
    >
      <Quote className="h-3 w-3" />
      {allowReference ? "显示引用" : "隐藏引用"}
    </span>
  );
}

function addCategory(
  categories: DocumentCategory[],
  parentId: string | null,
  nextCategory: DocumentCategory,
): DocumentCategory[] {
  if (!parentId) return [...categories, nextCategory];

  return categories.map((category) =>
    category.id === parentId
      ? { ...category, children: [...(category.children ?? []), nextCategory] }
      : { ...category, children: addCategory(category.children ?? [], parentId, nextCategory) },
  );
}

function updateCategoryName(categories: DocumentCategory[], id: string, name: string): DocumentCategory[] {
  return categories.map((category) =>
    category.id === id
      ? { ...category, name }
      : { ...category, children: updateCategoryName(category.children ?? [], id, name) },
  );
}

function deleteCategory(categories: DocumentCategory[], id: string): DocumentCategory[] {
  return categories
    .filter((category) => category.id !== id)
    .map((category) => ({ ...category, children: deleteCategory(category.children ?? [], id) }));
}

function findCategory(categories: DocumentCategory[], id: string): DocumentCategory | null {
  for (const category of categories) {
    if (category.id === id) return category;
    const child = findCategory(category.children ?? [], id);
    if (child) return child;
  }

  return null;
}

function hasChildCategories(category: DocumentCategory) {
  return Boolean(category.children?.length);
}

function filterCategoryTree(categories: DocumentCategory[], keyword: string): DocumentCategory[] {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return categories;

  return categories.flatMap((category) => {
    const children = filterCategoryTree(category.children ?? [], normalized);
    const matches = category.name.toLowerCase().includes(normalized);

    if (!matches && children.length === 0) return [];
    return [{ ...category, children }];
  });
}

function flattenCategories(categories: DocumentCategory[], depth = 0): Array<{ id: string; name: string; depth: number }> {
  return categories.flatMap((category) => [
    { id: category.id, name: category.name, depth },
    ...flattenCategories(category.children ?? [], depth + 1),
  ]);
}

function getCategoryIds(categories: DocumentCategory[], categoryId: string): string[] {
  for (const category of categories) {
    if (category.id === categoryId) {
      return [category.id, ...flattenCategories(category.children ?? []).map((item) => item.id)];
    }

    const childIds = getCategoryIds(category.children ?? [], categoryId);
    if (childIds.length > 0) return childIds;
  }

  return [];
}

function getCategoryDocumentCount(
  categories: DocumentCategory[],
  categoryId: string,
  documents: KnowledgeDocument[],
) {
  const ids = getCategoryIds(categories, categoryId);
  return documents.filter((document) => ids.includes(document.categoryId)).length;
}

function validateLocalFile(file: File) {
  if (!isSupportedDocument(file.name)) {
    return `仅支持 ${SUPPORTED_EXTENSIONS.join("、")} 格式`;
  }

  if (file.size > MAX_FILE_SIZE) {
    return "单个文件不能超过 200MB";
  }

  return undefined;
}

function validateObjectPath(path: string) {
  const fileName = getFileNameFromObjectPath(path);

  if (!path.trim()) {
    return "对象路径不能为空";
  }

  if (!fileName) {
    return "对象路径需包含文件名";
  }

  if (!isSupportedDocument(fileName)) {
    return `仅支持 ${SUPPORTED_EXTENSIONS.join("、")} 格式`;
  }

  return undefined;
}

function isSupportedDocument(fileName: string) {
  const extension = getFileExtension(fileName);
  return Boolean(extension && SUPPORTED_EXTENSIONS.includes(extension));
}

function getFileExtension(fileName: string) {
  const normalized = fileName.split("?")[0].split("#")[0].trim().toLowerCase();
  const dotIndex = normalized.lastIndexOf(".");

  if (dotIndex < 0 || dotIndex === normalized.length - 1) return "";
  return normalized.slice(dotIndex + 1);
}

function getFileNameFromObjectPath(path: string) {
  const normalized = path.trim().split("?")[0].split("#")[0].replace(/\\/g, "/");
  const fileName = normalized.split("/").filter(Boolean).pop() ?? "";

  try {
    return decodeURIComponent(fileName);
  } catch {
    return fileName;
  }
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${formatSizeNumber(value)} ${units[unitIndex]}`;
}

function formatSizeNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(value >= 10 ? 1 : 2);
}

function formatDateTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}:${pad(date.getSeconds())}`;
}

function dialogInputClass(error?: string) {
  return cn(
    "h-9 w-full rounded-lg border bg-card px-3 text-[13px] text-foreground outline-none transition-colors focus:border-primary",
    error ? "border-red-300" : "border-input",
  );
}
