export type DevelopmentArtifactType = "etl" | "sql" | "notebook";
export type LifecycleStatus = "draft" | "ready" | "published" | "disabled" | "archived";
export type SaveStatus = "clean" | "dirty" | "saving" | "save_failed";
export type ValidationStatus = "unchecked" | "validating" | "valid" | "invalid";
export type RunStatus = "queued" | "running" | "success" | "failed" | "stopped";

export interface ArtifactRef {
  artifactType: DevelopmentArtifactType;
  artifactId: string;
  version: number;
}

export interface DataObjectRef {
  id: string;
  name: string;
  kind: "source" | "table" | "dataset" | "file" | "temporary";
}

export interface ValidationIssue {
  id: string;
  level: "error" | "warning";
  message: string;
  targetId?: string;
  line?: number;
  column?: number;
}

export interface DevelopmentRun {
  id: string;
  artifactType: DevelopmentArtifactType;
  artifactId: string;
  version: number;
  status: RunStatus;
  triggeredBy: string;
  startedAt: string;
  finishedAt?: string;
  duration: string;
  logs: string[];
}

export interface DevelopmentWorkspaceState<TArtifact> {
  artifacts: TArtifact[];
  runs: DevelopmentRun[];
}

export interface DevelopmentArtifactBase {
  id: string;
  name: string;
  description: string;
  owner: string;
  tags: string[];
  lifecycleStatus: LifecycleStatus;
  saveStatus: SaveStatus;
  validationStatus: ValidationStatus;
  currentVersion: number;
  publishedVersion?: number;
  createdAt: string;
  updatedAt: string;
  lastRun?: {
    status: RunStatus;
    at: string;
    summary: string;
  };
}

export type EtlNodeCategory = "input" | "transform" | "output";
export type EtlNodeRunStatus = "idle" | RunStatus;

export interface EtlField {
  name: string;
  type: string;
  nullable: boolean;
}

export interface EtlNodeData extends Record<string, unknown> {
  label: string;
  description: string;
  category: EtlNodeCategory;
  nodeType: string;
  config: Record<string, string>;
  inputSchema: EtlField[];
  outputSchema: EtlField[];
  validationIssues: ValidationIssue[];
  runStatus: EtlNodeRunStatus;
  runMessage?: string;
  metrics?: {
    inputRows: number;
    outputRows: number;
    filteredRows: number;
    duration: string;
  };
}

export interface EtlGraphNode {
  id: string;
  type: "etlNode";
  position: { x: number; y: number };
  data: EtlNodeData;
}

export interface EtlGraphEdge {
  id: string;
  source: string;
  target: string;
  animated?: boolean;
}

export interface EtlTask extends DevelopmentArtifactBase {
  graph: {
    nodes: EtlGraphNode[];
    edges: EtlGraphEdge[];
  };
  validationIssues: ValidationIssue[];
}

export interface SqlContext {
  sourceRef: string;
  database: string;
  schema: string;
}

export interface SqlParameter {
  id: string;
  name: string;
  type: "string" | "number" | "date" | "boolean";
  defaultValue: string;
  required: boolean;
  description: string;
}

export interface SqlResult {
  status: RunStatus;
  columns: string[];
  rows: string[][];
  rowCount: number;
  scanned: string;
  duration: string;
  logs: string[];
  plan: string[];
  error?: ValidationIssue;
}

export interface SqlVersion {
  version: number;
  content: string;
  parameters: SqlParameter[];
  context: SqlContext;
  output?: DataObjectRef;
  createdAt: string;
  createdBy: string;
  changeNote: string;
}

export interface SqlScript extends DevelopmentArtifactBase {
  context: SqlContext;
  content: string;
  parameters: SqlParameter[];
  output?: DataObjectRef;
  validationIssues: ValidationIssue[];
  result?: SqlResult;
  versions: SqlVersion[];
}

export type NotebookCellType = "markdown" | "sql" | "python" | "r" | "parameter";
export type NotebookKernelStatus = "not_started" | "starting" | "idle" | "busy" | "failed" | "stopped";

export interface NotebookOutput {
  id: string;
  type: "text" | "table" | "log" | "image" | "metric" | "error";
  title?: string;
  content: string;
  columns?: string[];
  rows?: string[][];
}

export interface NotebookCell {
  id: string;
  type: NotebookCellType;
  source: string;
  executionCount?: number;
  status: "idle" | RunStatus;
  stale: boolean;
  outputs: NotebookOutput[];
}

export interface NotebookVariable {
  name: string;
  type: string;
  summary: string;
  cellId: string;
  updatedAt: string;
}

export interface NotebookCheckpoint {
  id: string;
  name: string;
  createdAt: string;
  runtime: string;
  cells: NotebookCell[];
}

export interface NotebookDocument extends DevelopmentArtifactBase {
  runtime: string;
  kernelStatus: NotebookKernelStatus;
  cells: NotebookCell[];
  variables: NotebookVariable[];
  checkpoints: NotebookCheckpoint[];
}

export interface DevelopmentArtifactSummary {
  id: string;
  name: string;
  owner: string;
  lifecycleStatus: LifecycleStatus;
  validationStatus: ValidationStatus;
  currentVersion: number;
  publishedVersion?: number;
  updatedAt: string;
  lastRun?: DevelopmentArtifactBase["lastRun"];
}
