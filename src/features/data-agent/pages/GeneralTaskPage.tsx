import { ArrowRight, Bot, Boxes, GitBranch, Sparkles } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";

import { Panel, Pill } from "@/components/data-platform/WorkspacePrimitives";

import { EvidenceStack, ObjectReferenceList, PendingActionCard, StepTimeline } from "../components/TaskPrimitives";
import { TaskDetailShell } from "../components/TaskDetailShell";
import { agentProfiles } from "../profiles";
import { useDataAgent } from "../state";

export function GeneralTaskPage() {
  const { taskId = "" } = useParams();
  const { getTask, confirmAction } = useDataAgent();
  const task = getTask(taskId);
  if (!task) return <Navigate to="/data-agent/general" replace />;
  const intent = task.workspace.intent;

  return (
    <TaskDetailShell agent="general" task={task}>
      {intent && (
        <Panel className="border-blue-100">
          <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,.75fr)]">
            <div>
              <div className="flex items-center gap-2 text-[12px] font-semibold text-foreground"><Sparkles className="h-4 w-4 text-blue-600" />意图识别</div>
              <div className="mt-3 rounded-lg bg-blue-50/70 p-3">
                <div className="text-[10px] font-semibold text-blue-900">{intent.category}</div>
                <p className="mt-1 text-[10px] leading-5 text-blue-800">{intent.routeReason}</p>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">识别实体</div>
                  <div className="flex flex-wrap gap-1.5">{intent.entities.map((item) => <Pill key={item} tone="blue" size="sm">{item}</Pill>)}</div>
                </div>
                <div>
                  <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">约束条件</div>
                  <div className="flex flex-wrap gap-1.5">{intent.constraints.map((item) => <Pill key={item} tone="amber" size="sm">{item}</Pill>)}</div>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <div className="flex items-center gap-2 text-[10px] font-semibold text-foreground"><GitBranch className="h-3.5 w-3.5 text-blue-600" />Agent 路由</div>
              <div className="mt-3 space-y-2">
                {task.participantAgents.filter((agent) => agent !== "general").map((agent, index, agents) => {
                  const profile = agentProfiles[agent];
                  const Icon = profile.icon;
                  return (
                    <div key={agent} className="flex items-center gap-2">
                      <Link to={`${profile.route}/tasks/${task.id}`} className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-white px-2.5 py-2 hover:border-blue-200">
                        <span className={`grid h-6 w-6 place-items-center rounded ${profile.soft} ${profile.accent}`}><Icon className="h-3 w-3" /></span>
                        <span className="truncate text-[10px] font-medium text-foreground">{profile.name}</span>
                      </Link>
                      {index < agents.length - 1 && <ArrowRight className="h-3 w-3 text-slate-300" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Panel>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,.75fr)]">
        <Panel title="多 Agent 协作步骤" description="展示可验证计划、对象引用和产物，不展示思维链">
          <div className="p-4"><StepTimeline steps={task.steps} /></div>
        </Panel>
        <div className="space-y-4">
          <Panel title="上下文对象" description="跨产品域只引用稳定 ID">
            <div className="p-3"><ObjectReferenceList refs={task.contextRefs} /></div>
          </Panel>
          <Panel title="证据摘要" description="模型输出需绑定来源与置信度">
            <div className="p-3"><EvidenceStack evidence={task.evidence} /></div>
          </Panel>
        </div>
      </div>

      {task.pendingAction && <PendingActionCard action={task.pendingAction} onConfirm={() => confirmAction(task.id)} />}

      <Panel title="跨域汇总产物" description="每项产物仍由所属专业工作台持有">
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
          {task.artifacts.map((artifact) => {
            const content = (
              <div className="h-full rounded-lg border border-border bg-muted/15 p-3 hover:border-blue-200 hover:bg-blue-50/30">
                <div className="flex items-center justify-between gap-2"><Boxes className="h-4 w-4 text-blue-600" /><Pill tone={artifact.status === "approved" ? "green" : artifact.status === "ready" ? "blue" : "amber"} size="sm">{artifact.status}</Pill></div>
                <div className="mt-3 text-[11px] font-semibold text-foreground">{artifact.label}</div>
                <div className="mt-1 text-[9px] leading-5 text-muted-foreground">{artifact.summary}</div>
                <div className="mt-3 font-mono text-[9px] text-blue-700">{artifact.id}</div>
              </div>
            );
            return artifact.route ? <Link key={artifact.id} to={artifact.route}>{content}</Link> : <div key={artifact.id}>{content}</div>;
          })}
          {task.artifacts.length === 0 && <div className="col-span-full py-8 text-center text-[10px] text-muted-foreground"><Bot className="mx-auto mb-2 h-5 w-5" />任务仍在生成跨域产物</div>}
        </div>
      </Panel>
    </TaskDetailShell>
  );
}
