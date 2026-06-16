export type AccessMode = "public" | "private";
export type KnowledgeStatus = "active" | "disabled";

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  parser: string;
  pdfParser: string;
  chunkSize: number;
  creator: string;
  documents: number;
  chunks: number;
  sizeCapacity: string;
  access: AccessMode;
  status: KnowledgeStatus;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_BASES: KnowledgeBase[] = [
  {
    id: "kb-test",
    name: "知识库test",
    description: "知识库test",
    parser: "通用文档",
    pdfParser: "DeepDOC",
    chunkSize: 512,
    creator: "wangchao",
    documents: 2,
    chunks: 54,
    sizeCapacity: "30.1 MB / 1 GB",
    access: "public",
    status: "active",
    createdAt: "2026/6/5 10:25:36",
    updatedAt: "2026/6/5 15:35:59",
  },
  {
    id: "kb-0605",
    name: "0605_知识库",
    description: "0605_知识库",
    parser: "通用文档",
    pdfParser: "DeepDOC",
    chunkSize: 512,
    creator: "shixing",
    documents: 4,
    chunks: 365,
    sizeCapacity: "86.4 MB / 1 GB",
    access: "private",
    status: "active",
    createdAt: "2026/6/5 09:55:35",
    updatedAt: "2026/6/5 15:12:20",
  },
  {
    id: "kb-anniversary",
    name: "统计周年鉴",
    description: "统计周年鉴",
    parser: "通用文档",
    pdfParser: "DeepDOC",
    chunkSize: 512,
    creator: "shixing",
    documents: 3,
    chunks: 90,
    sizeCapacity: "42.7 MB / 1 GB",
    access: "private",
    status: "active",
    createdAt: "2026/6/4 15:15:54",
    updatedAt: "2026/6/4 16:08:31",
  },
  {
    id: "kb-test-260604",
    name: "test_260604",
    description: "1",
    parser: "通用文档",
    pdfParser: "DeepDOC",
    chunkSize: 1024,
    creator: "kongqi",
    documents: 3,
    chunks: 71,
    sizeCapacity: "18.9 MB / 1 GB",
    access: "private",
    status: "active",
    createdAt: "2026/6/4 11:17:14",
    updatedAt: "2026/6/4 11:42:08",
  },
  {
    id: "kb-sx-0604",
    name: "sx_0604_知识库",
    description: "sx_0604_知识库",
    parser: "通用文档",
    pdfParser: "DeepDOC",
    chunkSize: 1024,
    creator: "shixing",
    documents: 4,
    chunks: 143,
    sizeCapacity: "63.5 MB / 1 GB",
    access: "private",
    status: "active",
    createdAt: "2026/6/4 10:22:41",
    updatedAt: "2026/6/4 10:50:12",
  },
];
