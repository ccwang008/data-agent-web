import { FormEvent, useMemo, useState } from "react";
import {
  ArrowRight,
  Clock3,
  CornerDownLeft,
  Layers3,
  Play,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import {
  InlineNotice,
  PageTitle,
  Panel,
  Pill,
  WorkspacePage,
} from "@/components/data-platform/WorkspacePrimitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { fixtureTasks } from "../fixtures";
import { agentProfiles } from "../profiles";
import { useDataAgent } from "../state";
import type { AgentKey, AgentTaskStatus } from "../types";
import { TaskProgress, TaskStatusPill } from "../components/TaskPrimitives";

const filters: Array<{ key: "all" | AgentTaskStatus; label: string }> = [
  { key: "all", label: "全部" },
  { key: "running", label: "执行中" },
  { key: "needs-confirmation", label: "待确认" },
  { key: "blocked", label: "受阻" },
  { key: "completed", label: "已完成" },
];

export function AgentHomePage({ agent }: { agent: AgentKey }) {
  const profile = agentProfiles[agent];
  const Icon = profile.icon;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const contextType = searchParams.get("contextType") ?? undefined;
  const contextId = searchParams.get("contextId") ?? undefined;
  const intent = searchParams.get("intent") ?? undefined;
  const [prompt, setPrompt] = useState(intent ?? "");
  const [filter, setFilter] = useState<"all" | AgentTaskStatus>("all");
  const { meta, tasksForAgent, createTaskFromPrompt, replayTask, resetAllCases } = useDataAgent();
  const tasks = tasksForAgent(agent);
  const visibleTasks = filter === "all" ? tasks : tasks.filter((task) => task.status === filter);

  const cases = useMemo(() => fixtureTasks
    .filter((task) => task.id === "DAT-1001" || task.primaryAgent === agent)
    .slice(0, 3), [agent]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!prompt.trim() && !intent) return;
    const taskId = createTaskFromPrompt(agent, prompt, { contextType, contextId, intent });
    navigate(`${profile.route}/tasks/${taskId}`);
  }

  function openCase(taskId: string) {
    replayTask(taskId);
    navigate(`${profile.route}/tasks/${taskId}`);
  }

  function resetEverything() {
    if (window.confirm("恢复全部 Data Agent 演示案例？其他产品域的数据不会被修改。")) resetAllCases();
  }

  return (
    <WorkspacePage>
      <PageTitle
        eyebrow={`Data Agent / ${profile.englishName}`}
        title={profile.name}
        description={profile.description}
        actions={
          <Button variant="outline" size="sm" onClick={resetEverything}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />恢复全部案例
          </Button>
        }
      />
      <InlineNotice error={meta.error} loading={!meta.hydrated} />

      {(contextId || intent) && (
        <section className="flex flex-col gap-2 rounded-lg border border-blue-200 bg-blue-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <Layers3 className="mt-0.5 h-4 w-4 text-blue-700" />
            <div>
              <div className="text-[11px] font-semibold text-blue-900">已接入业务上下文</div>
              <div className="mt-0.5 text-[10px] text-blue-700">
                {contextType ?? "业务对象"} · <span className="font-mono">{contextId ?? "当前页面"}</span>{intent ? ` · ${intent}` : ""}
              </div>
            </div>
          </div>
          <Pill tone="blue">只传稳定 ID，不复制业务正文</Pill>
        </section>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,.95fr)]">
        <div className="space-y-4">
          <Panel className="border-blue-100">
            <form onSubmit={submit} className="p-5">
              <div className="flex items-center gap-3">
                <span className={cn("grid h-10 w-10 place-items-center rounded-lg", profile.soft, profile.accent)}><Icon className="h-5 w-5" /></span>
                <div>
                  <h2 className="text-[14px] font-semibold text-foreground">发起 {profile.name} 任务</h2>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">自然语言会匹配预设 mock 任务链，不声称运行真实模型。</p>
                </div>
              </div>
              <div className="mt-4 rounded-lg border border-input bg-background p-3 shadow-inner focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100">
                <textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  rows={4}
                  placeholder={profile.prompt}
                  className="w-full resize-none bg-transparent text-[12px] leading-6 text-foreground outline-none placeholder:text-muted-foreground/70"
                />
                <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                  <span className="flex items-center gap-1 text-[9px] text-muted-foreground"><CornerDownLeft className="h-3 w-3" />Enter 发起 · Shift+Enter 换行</span>
                  <Button type="submit" size="sm"><Sparkles className="mr-1.5 h-3.5 w-3.5" />生成任务计划</Button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.suggestions.map((suggestion) => (
                  <button key={suggestion} type="button" onClick={() => setPrompt(suggestion)} className="rounded-full border border-border bg-muted/20 px-2.5 py-1 text-[9px] text-muted-foreground hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
                    {suggestion}
                  </button>
                ))}
              </div>
            </form>
          </Panel>

          <Panel title="可交互案例" description="一个贯穿式主案例 + 两个专项案例；可以反复重放">
            <div className="grid gap-3 p-4 md:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
              {cases.map((item, index) => (
                <button key={item.id} type="button" onClick={() => openCase(item.id)} className="group flex min-h-[166px] flex-col rounded-lg border border-border bg-card p-3 text-left hover:border-blue-200 hover:bg-blue-50/30 hover:shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <Pill tone={index === 0 ? "blue" : "slate"} size="sm">{index === 0 ? "贯穿案例" : `专项案例 ${index}`}</Pill>
                    <Play className="h-3.5 w-3.5 text-muted-foreground group-hover:text-blue-600" />
                  </div>
                  <div className="mt-3 text-[11px] font-semibold leading-5 text-foreground">{item.title}</div>
                  <p className="mt-1 line-clamp-3 text-[9px] leading-5 text-muted-foreground">{item.summary}</p>
                  <div className="mt-auto flex items-center justify-between pt-3 text-[9px] text-muted-foreground">
                    <span>{item.participantAgents.length} 个参与 Agent</span>
                    <span className="font-medium text-blue-700">开始演示 →</span>
                  </div>
                </button>
              ))}
            </div>
          </Panel>
        </div>

        <Panel
          title={`${profile.name} · 任务 List`}
          description="共享任务按参与 Agent 展示，不复制任务记录"
          actions={<Pill tone="slate">{visibleTasks.length} 项</Pill>}
        >
          <div className="flex flex-wrap gap-1.5 border-b border-border px-4 py-3">
            {filters.map((item) => (
              <button key={item.key} type="button" onClick={() => setFilter(item.key)} className={cn("rounded-md px-2 py-1 text-[9px] font-medium", filter === item.key ? "bg-blue-600 text-white" : "bg-muted/40 text-muted-foreground hover:text-foreground")}>{item.label}</button>
            ))}
          </div>
          <div className="max-h-[720px] divide-y divide-border overflow-y-auto">
            {visibleTasks.map((task) => (
              <Link key={task.id} to={`${profile.route}/tasks/${task.id}`} className="group block px-4 py-4 hover:bg-muted/25">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <TaskStatusPill status={task.status} />
                      <span className="font-mono text-[9px] text-muted-foreground">{task.id}</span>
                    </div>
                    <h3 className="mt-2 text-[11px] font-semibold leading-5 text-foreground group-hover:text-blue-700">{task.title}</h3>
                    <p className="mt-1 line-clamp-2 text-[9px] leading-5 text-muted-foreground">{task.summary}</p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 group-hover:text-blue-600" />
                </div>
                <div className="mt-3">
                  <TaskProgress value={task.progress} status={task.status} />
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-[9px] text-muted-foreground">
                  <span className="truncate">当前：{task.currentStep}</span>
                  <span className="flex shrink-0 items-center gap-1"><Clock3 className="h-3 w-3" />{task.updatedAt}</span>
                </div>
              </Link>
            ))}
            {visibleTasks.length === 0 && <div className="grid h-40 place-items-center text-[10px] text-muted-foreground">当前筛选下没有任务</div>}
          </div>
        </Panel>
      </div>
    </WorkspacePage>
  );
}
