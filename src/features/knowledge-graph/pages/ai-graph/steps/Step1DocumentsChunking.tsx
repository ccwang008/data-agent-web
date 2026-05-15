import { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Upload, FileText, ChevronDown, ChevronUp, X, AlertCircle, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { mockClient } from "@/lib/mock-client";
import { parseFile, formatBytes, ACCEPTED_TYPES } from "../parsers";
import type { AiGraphDocument, ChunkStrategy, DocumentChunk } from "@/features/knowledge-graph/api/mock";
import { ChunkPreview } from "../components/ChunkPreview";

type ParseStatus = "pending" | "parsing" | "done" | "error";

interface DocEntry {
  file: File;
  status: ParseStatus;
  text?: string;
  charCount?: number;
  pageCount?: number;
  error?: string;
  doc?: AiGraphDocument;
  previewOpen?: boolean;
  chunks?: DocumentChunk[];
}

export interface ChunkingConfig {
  strategy: ChunkStrategy;
  chunkSize: number;
  overlap: number;
}

const STRATEGY_OPTIONS: ChunkStrategy[] = ["token", "sentence", "paragraph", "recursive"];
const CHUNK_SIZES = [256, 512, 1024, 2048, 4096];

interface Props {
  graphId: string;
  chunking: ChunkingConfig;
  onChunkingChange: (c: ChunkingConfig) => void;
  onReady: (docs: AiGraphDocument[]) => void;
}

export function Step1DocumentsChunking({ graphId, chunking, onChunkingChange, onReady }: Props) {
  const { t } = useTranslation("knowledge-graph");
  const [entries, setEntries] = useState<DocEntry[]>([]);
  const [dragging, setDragging] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const update = (idx: number, patch: Partial<DocEntry>) =>
    setEntries((prev) => { const next = [...prev]; next[idx] = { ...next[idx], ...patch }; return next; });

  const readyDocs = entries.filter((e) => e.status === "done" && e.doc).map((e) => e.doc!);

  // Propagate to parent reactively
  useEffect(() => { onReady(readyDocs); }, [entries]); // eslint-disable-line react-hooks/exhaustive-deps

  const requestChunks = async (docId: string): Promise<DocumentChunk[]> => {
    const r = await mockClient.post<{ chunks: DocumentChunk[] }>(
      `/api/knowledge-graph/ai-graph/documents/${docId}/chunks`,
      chunking, { latencyMs: 120 },
    );
    return r.chunks;
  };

  const processFiles = async (files: File[]) => {
    const startIdx = entries.length;
    const newEntries: DocEntry[] = files.map((f) => ({ file: f, status: "pending" as ParseStatus }));
    setEntries((prev) => [...prev, ...newEntries]);
    for (let i = 0; i < newEntries.length; i++) {
      const idx = startIdx + i;
      update(idx, { status: "parsing" });
      try {
        const parsed = await parseFile(files[i]);
        const doc = await mockClient.post<AiGraphDocument>("/api/knowledge-graph/ai-graph/documents", {
          graphId, filename: files[i].name, mimeType: files[i].type, sizeBytes: files[i].size,
          charCount: parsed.charCount, textPreview: parsed.text.slice(0, 500),
        }, { latencyMs: 80 });
        const chunks = await requestChunks(doc.id);
        update(idx, { status: "done", text: parsed.text, charCount: parsed.charCount, pageCount: parsed.pageCount, doc: { ...doc, chunkCount: chunks.length, chunkingStrategy: chunking.strategy }, chunks });
      } catch (e) {
        update(idx, { status: "error", error: String(e) });
      }
    }
  };

  const rechunkAll = async () => {
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (e.doc) {
        const chunks = await requestChunks(e.doc.id);
        update(i, { chunks, doc: { ...e.doc, chunkCount: chunks.length, chunkingStrategy: chunking.strategy } });
      }
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    void processFiles(Array.from(e.dataTransfer.files));
  };
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) void processFiles(Array.from(e.target.files));
    e.target.value = "";
  };
  const removeEntry = (idx: number) =>
    setEntries((prev) => prev.filter((_, i) => i !== idx));
  const togglePreview = (idx: number) =>
    update(idx, { previewOpen: !entries[idx].previewOpen });

  return (
    <div className="space-y-4">
      {/* Header with chunking settings toggle */}
      <div className="flex items-start justify-between gap-3">
        <div className="text-[12px] text-muted-foreground">
          支持 PDF / DOCX / TXT / MD，单文件 ≤ 50MB · 当前切片：
          <span className="ml-1 font-mono">{t(`ai-graph.chunking.strategy.${chunking.strategy}`)} · {chunking.chunkSize} tok · overlap {chunking.overlap}%</span>
        </div>
        <button type="button" onClick={() => setSettingsOpen((o) => !o)}
          className="flex h-7 items-center gap-1 rounded border border-border px-2.5 text-[11px] text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors">
          <Settings2 className="h-3 w-3" />{t("ai-graph.chunking.settings")}
        </button>
      </div>

      {/* Chunking settings panel */}
      {settingsOpen && (
        <div className="rounded border border-border bg-card p-4 space-y-4 animate-fade-in">
          <div>
            <div className="eyebrow mb-2">{t("ai-graph.chunking.title")}</div>
            <div className="flex flex-wrap gap-2">
              {STRATEGY_OPTIONS.map((s) => (
                <button key={s} type="button" onClick={() => onChunkingChange({ ...chunking, strategy: s })}
                  className={cn("rounded border px-2.5 py-1 text-[11px] transition-colors",
                    chunking.strategy === s ? "border-primary bg-primary/5 text-primary font-medium" : "border-border text-muted-foreground hover:border-primary/40")}>
                  {t(`ai-graph.chunking.strategy.${s}`)}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="eyebrow mb-1.5">{t("ai-graph.chunking.chunkSize")} — {chunking.chunkSize}</div>
              <input type="range" min={0} max={CHUNK_SIZES.length - 1}
                value={CHUNK_SIZES.indexOf(chunking.chunkSize)}
                onChange={(e) => onChunkingChange({ ...chunking, chunkSize: CHUNK_SIZES[parseInt(e.target.value)] })}
                className="w-full accent-primary" />
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono mt-0.5">
                {CHUNK_SIZES.map(s => <span key={s}>{s}</span>)}
              </div>
            </div>
            <div>
              <div className="eyebrow mb-1.5">{t("ai-graph.chunking.overlap")} — {chunking.overlap}%</div>
              <input type="range" min={0} max={50} step={5}
                value={chunking.overlap}
                onChange={(e) => onChunkingChange({ ...chunking, overlap: parseInt(e.target.value) })}
                className="w-full accent-primary" />
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono mt-0.5">
                <span>0%</span><span>25%</span><span>50%</span>
              </div>
            </div>
          </div>
          <button type="button" onClick={() => void rechunkAll()} disabled={entries.filter(e => e.doc).length === 0}
            className="flex h-7 items-center gap-1 rounded border border-primary px-2.5 text-[11px] text-primary hover:bg-primary/5 disabled:opacity-50 transition-colors">
            {t("ai-graph.chunking.rechunk")}
          </button>
        </div>
      )}

      {/* Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn("cursor-pointer rounded border-2 border-dashed p-8 text-center transition-colors",
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}
      >
        <Upload className="mx-auto h-7 w-7 text-muted-foreground mb-2" />
        <p className="text-[13px] font-medium">拖拽文件到这里，或点击选择</p>
        <input ref={inputRef} type="file" multiple accept={ACCEPTED_TYPES} className="hidden" onChange={onFileChange} />
      </div>

      {/* File list */}
      {entries.length > 0 && (
        <div className="rounded border border-border overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="border-b border-border bg-card">
              <tr>
                {[t("ai-graph.docs.filename"), t("ai-graph.docs.size"), t("ai-graph.docs.status"), t("ai-graph.docs.chars"), t("ai-graph.docs.chunks"), ""].map((h) => (
                  <th key={h} className="px-4 py-2 text-left text-[11px] uppercase text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, idx) => (
                <ParseRow key={idx} entry={entry} idx={idx}
                  onToggle={() => togglePreview(idx)}
                  onRemove={() => removeEntry(idx)} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ParseRow({ entry, idx, onToggle, onRemove }: {
  entry: DocEntry; idx: number; onToggle: () => void; onRemove: () => void;
}) {
  return (
    <>
      <tr key={`row-${idx}`} className="border-b border-border/50">
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate max-w-[200px]">{entry.file.name}</span>
          </div>
        </td>
        <td className="px-4 py-3 font-mono text-[12px] text-muted-foreground">{formatBytes(entry.file.size)}</td>
        <td className="px-4 py-3"><StatusPill status={entry.status} /></td>
        <td className="px-4 py-3 font-mono text-[12px] text-muted-foreground">
          {entry.charCount != null ? entry.charCount.toLocaleString() : "—"}
        </td>
        <td className="px-4 py-3 font-mono text-[12px] text-muted-foreground">
          {entry.chunks?.length ?? "—"}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            {entry.status === "done" && (
              <button type="button" onClick={onToggle}
                className="p-1 rounded text-muted-foreground hover:text-primary transition-colors">
                {entry.previewOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            )}
            <button type="button" onClick={onRemove}
              className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </td>
      </tr>
      {entry.previewOpen && entry.chunks && (
        <tr key={`preview-${idx}`}>
          <td colSpan={6} className="px-4 py-3 bg-background/50">
            <ChunkPreview chunks={entry.chunks} charCount={entry.charCount} />
          </td>
        </tr>
      )}
      {entry.status === "error" && (
        <tr key={`err-${idx}`}>
          <td colSpan={6} className="px-4 pb-3">
            <div className="flex items-center gap-2 text-[12px] text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />{entry.error}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function StatusPill({ status }: { status: ParseStatus }) {
  const cfg = {
    pending: { cls: "badge-pending", label: "待解析" },
    parsing: { cls: "badge-running", label: "解析中" },
    done:    { cls: "badge-success", label: "已切片" },
    error:   { cls: "badge-offline", label: "失败" },
  }[status];
  return <span className={cn("rounded border px-2 py-0.5 font-mono text-[10px] uppercase", cfg.cls)}>{cfg.label}</span>;
}
