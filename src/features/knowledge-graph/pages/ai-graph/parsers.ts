import * as pdfjsLib from "pdfjs-dist";

let _workerReady = false;
function ensureWorker() {
  if (_workerReady) return;
  _workerReady = true;
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).href;
}

export interface ParsedDoc {
  text: string;
  charCount: number;
  pageCount?: number;
}

export async function parsePdf(file: File): Promise<ParsedDoc> {
  ensureWorker();
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const pages = await Promise.all(
    Array.from({ length: pdf.numPages }, (_, i) =>
      pdf.getPage(i + 1).then((p) => p.getTextContent()),
    ),
  );
  const text = pages
    .flatMap((p) => p.items)
    .map((item) => ("str" in item ? (item as { str: string }).str : ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  return { text, charCount: text.length, pageCount: pdf.numPages };
}

export async function parseDocx(file: File): Promise<ParsedDoc> {
  const mammoth = await import("mammoth");
  const buf = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buf });
  const text = result.value.trim();
  return { text, charCount: text.length };
}

export async function parseTxt(file: File): Promise<ParsedDoc> {
  const text = (await file.text()).trim();
  return { text, charCount: text.length };
}

const MIME_PARSERS: Record<string, (f: File) => Promise<ParsedDoc>> = {
  "application/pdf": parsePdf,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": parseDocx,
  "application/msword": parseDocx,
  "text/plain": parseTxt,
  "text/markdown": parseTxt,
};

const EXT_PARSERS: Record<string, (f: File) => Promise<ParsedDoc>> = {
  ".pdf": parsePdf,
  ".docx": parseDocx,
  ".doc": parseDocx,
  ".txt": parseTxt,
  ".md": parseTxt,
};

export async function parseFile(file: File): Promise<ParsedDoc> {
  if (file.size > 50 * 1024 * 1024) throw new Error("文件过大（>50MB），请拆分后上传");
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  const fn = MIME_PARSERS[file.type] ?? EXT_PARSERS[ext];
  if (!fn) throw new Error(`不支持的文件类型：${file.type || ext}`);
  return fn(file);
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export const ACCEPTED_TYPES = ".pdf,.docx,.doc,.txt,.md";
