export type AgentKey =
  | "general"
  | "discovery"
  | "qa"
  | "development"
  | "governance"
  | "operations";

export type AgentTaskStatus = "running" | "needs-confirmation" | "completed" | "blocked";
export type AgentStepStatus = "completed" | "running" | "waiting" | "needs-confirmation";

export interface AgentObjectRef {
  id: string;
  type: string;
  label: string;
  route?: string;
}

export interface AgentStep {
  id: string;
  agent: AgentKey;
  label: string;
  detail: string;
  status: AgentStepStatus;
  inputRefs?: string[];
  outputRef?: string;
}

export interface AgentEvidence {
  id: string;
  label: string;
  source: string;
  confidence: number;
  status: "valid" | "review" | "insufficient";
}

export interface AgentArtifact {
  id: string;
  type: "asset-set" | "answer" | "chart" | "sql" | "etl" | "governance-plan" | "runbook";
  label: string;
  summary: string;
  status: "draft" | "ready" | "approved";
  route?: string;
}

export interface AgentPendingAction {
  id: string;
  label: string;
  description: string;
  preview: string[];
  risk: "low" | "medium" | "controlled";
}

export interface AssetCandidate {
  id: string;
  name: string;
  type: string;
  domain: string;
  match: number;
  quality: number;
  freshness: string;
  security: string;
  access: string;
  owner: string;
  reason: string;
}

export interface AnswerMetric {
  label: string;
  value: string;
  delta: string;
  tone: "blue" | "green" | "amber" | "red";
}

export interface ChartPoint {
  label: string;
  value: number;
  compare?: number;
}

export interface GovernanceFinding {
  id: string;
  category: "标准" | "质量" | "元数据" | "安全" | "认责";
  title: string;
  severity: "高" | "中" | "低";
  object: string;
  owner: string;
  status: string;
  impact: string;
  recommendation: string;
}

export interface OperationsEvent {
  time: string;
  status: "success" | "warning" | "failed" | "running";
  title: string;
  detail: string;
}

export interface RootCauseCandidate {
  label: string;
  probability: number;
  evidence: string;
  action: string;
}

export interface AgentWorkspaceData {
  intent?: {
    category: string;
    entities: string[];
    constraints: string[];
    routeReason: string;
  };
  candidates?: AssetCandidate[];
  recommendedCandidateId?: string;
  answer?: {
    headline: string;
    narrative: string;
    metrics: AnswerMetric[];
    chart: ChartPoint[];
    definition: string;
    sqlSummary: string;
  };
  development?: {
    artifactType: "SQL" | "ETL" | "Notebook";
    sourceVersion: string;
    targetVersion: string;
    code: string;
    diff: string[];
    validations: Array<{ label: string; status: "passed" | "warning" | "failed"; detail: string }>;
    previewRows: Array<Record<string, string>>;
  };
  governance?: {
    scope: string[];
    findings: GovernanceFinding[];
    impactObjects: Array<{ id: string; label: string; relation: string }>;
  };
  operations?: {
    nodes: Array<{ id: string; label: string; status: "healthy" | "warning" | "failed"; type: string }>;
    events: OperationsEvent[];
    rootCauses: RootCauseCandidate[];
  };
}

export interface AgentTask {
  id: string;
  caseId: string;
  title: string;
  prompt: string;
  summary: string;
  primaryAgent: AgentKey;
  participantAgents: AgentKey[];
  status: AgentTaskStatus;
  progress: number;
  currentStep: string;
  steps: AgentStep[];
  contextRefs: AgentObjectRef[];
  evidence: AgentEvidence[];
  artifacts: AgentArtifact[];
  pendingAction?: AgentPendingAction;
  workspace: AgentWorkspaceData;
  updatedAt: string;
  createdAt: string;
}

export interface AgentAuditEvent {
  id: string;
  taskId: string;
  action: string;
  actor: string;
  at: string;
  result: string;
}

export interface DataAgentState {
  tasks: AgentTask[];
  auditTrail: AgentAuditEvent[];
}
