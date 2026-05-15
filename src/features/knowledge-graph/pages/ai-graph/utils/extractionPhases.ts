import type { AiGraphExtractionStatus } from "@/features/knowledge-graph/api/mock";
import type { PhaseSpec } from "../components/GleaningProgress";

const phaseOrder = ["running", "summarizing", "embedding", "clustering", "reporting", "reviewing"] as const;

export function computePhaseSpecs(
  currentStatus: AiGraphExtractionStatus,
  gleaningRoundsConfigured: number,
  extractClaims: boolean,
  labels: { [k: string]: string },
  stats?: { vertexCount: number; edgeCount: number },
): PhaseSpec[] {
  const idx = phaseOrder.indexOf(currentStatus as typeof phaseOrder[number]);
  const statusOf = (target: typeof phaseOrder[number]): PhaseSpec["status"] => {
    const tIdx = phaseOrder.indexOf(target);
    if (idx < 0) return "pending";
    if (idx > tIdx) return "done";
    if (idx === tIdx) return "running";
    return "pending";
  };
  const out: PhaseSpec[] = [
    { key: "chunking",    status: "done",                  label: labels["chunking"] },
    { key: "running",     status: statusOf("running"),     label: `${labels["extraction"]}${gleaningRoundsConfigured > 1 ? ` ×${gleaningRoundsConfigured}` : ""}`, detail: stats?.vertexCount ? `${stats.vertexCount} ent · ${stats.edgeCount} rel` : undefined },
    { key: "summarizing", status: statusOf("summarizing"), label: labels["summarization"] },
    { key: "embedding",   status: statusOf("embedding"),   label: labels["embedding"] },
    { key: "clustering",  status: statusOf("clustering"),  label: labels["clustering"] },
    { key: "reporting",   status: statusOf("reporting"),   label: labels["reporting"] },
  ];
  if (extractClaims) {
    out.splice(2, 0, { key: "claims", status: statusOf("running"), label: labels["claims"] });
  }
  return out;
}
