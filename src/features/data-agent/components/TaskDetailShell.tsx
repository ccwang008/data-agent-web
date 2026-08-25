import { useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Play,
  RotateCcw,
} from "lucide-react";
import { Link } from "react-router-dom";

import {
  InlineNotice,
  PageTitle,
  Panel,
  Pill,
  WorkspacePage,
} from "@/components/data-platform/WorkspacePrimitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { agentProfiles } from "../profiles";
import { useDataAgent } from "../state";
import type { AgentKey, AgentTask } from "../types";
import { TaskProgress, TaskStatusPill } from "./TaskPrimitives";

export function TaskDetailShell({
  agent,
  task,
  children,
}: {
  agent: AgentKey;
  task: AgentTask;
  children: ReactNode;
}) {
  const [railOpen, setRailOpen] = useState(true);
  const { meta, tasksForAgent, advanceTask, replayTask } = useDataAgent();
  const profile = agentProfiles[agent];
  const tasks = tasksForAgent(agent);
  const Icon = profile.icon;

  return (
    <WorkspacePage className="p-4">
      <PageTitle
        eyebrow={`Data Agent / ${profile.englishName}`}
        title={task.title}
        description={task.summary}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link to={profile.route}><ArrowLeft className="mr-1.5 h-3.5 w-3.5" />任务 List</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => replayTask(task.id)} disabled={!task.id.startsWith("DAT-")}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />重新演示
            </Button>
            {!task.pendingAction && task.status !== "completed" && (
              <Button size="sm" onClick={() => advanceTask(task.id)}>
                <Play className="mr-1.5 h-3.5 w-3.5" />推进下一步
              </Button>
            )}
          </>
        }
      />
      <InlineNotice error={meta.error} loading={!meta.hydrated} />

      <section className="rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_240px] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("grid h-7 w-7 place-items-center rounded-md", profile.soft, profile.accent)}><Icon className="h-3.5 w-3.5" /></span>
              <TaskStatusPill status={task.status} />
              <span className="font-mono text-[10px] text-muted-foreground">{task.id}</span>
              <span className="text-[10px] text-muted-foreground">当前：{task.currentStep}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {task.participantAgents.map((participant) => {
                const participantProfile = agentProfiles[participant];
                const ParticipantIcon = participantProfile.icon;
                return (
                  <Link
                    key={participant}
                    to={`${participantProfile.route}/tasks/${task.id}`}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-medium transition-colors",
                      participant === agent
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-border bg-white text-muted-foreground hover:border-blue-200 hover:text-blue-700",
                    )}
                  >
                    <ParticipantIcon className="h-3 w-3" />{participantProfile.name}
                  </Link>
                );
              })}
            </div>
          </div>
          <TaskProgress value={task.progress} status={task.status} />
        </div>
      </section>

      <div className={cn("grid gap-4", railOpen ? "xl:grid-cols-[260px_minmax(0,1fr)]" : "xl:grid-cols-[44px_minmax(0,1fr)]")}>
        <aside>
          {railOpen ? (
            <Panel
              title="当前 Agent 任务"
              description={`${tasks.length} 项共享或直接任务`}
              actions={<button type="button" onClick={() => setRailOpen(false)} className="rounded p-1 text-muted-foreground hover:bg-muted"><ChevronLeft className="h-3.5 w-3.5" /></button>}
              className="xl:sticky xl:top-4"
            >
              <div className="max-h-[640px] divide-y divide-border overflow-y-auto">
                {tasks.map((item) => (
                  <Link
                    key={item.id}
                    to={`${profile.route}/tasks/${item.id}`}
                    className={cn("block px-3 py-3 hover:bg-muted/30", item.id === task.id && "bg-blue-50/70")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[10px] font-semibold text-foreground">{item.title}</span>
                      <TaskStatusPill status={item.status} />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[9px] text-muted-foreground">
                      <span className="font-mono">{item.id}</span>
                      <span>{item.progress}%</span>
                    </div>
                  </Link>
                ))}
              </div>
            </Panel>
          ) : (
            <button type="button" onClick={() => setRailOpen(true)} className="sticky top-4 grid h-10 w-10 place-items-center rounded-lg border border-border bg-card text-muted-foreground shadow-sm hover:text-blue-700" title="展开任务列表">
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </aside>
        <main className="min-w-0 space-y-4">{children}</main>
      </div>

      <section className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 text-[9px] text-muted-foreground">
        <Pill tone="slate" size="sm">Demo mock</Pill>
        <span>页面展示计划、动作和证据，不展示模拟思维链。</span>
        <span>最近更新 {task.updatedAt}</span>
      </section>
    </WorkspacePage>
  );
}
