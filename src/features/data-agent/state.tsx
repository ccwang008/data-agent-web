import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

import { useSqliteState, type SqliteStateMeta } from "@/lib/sqlite-client";

import { createInitialDataAgentState, fixtureTasks } from "./fixtures";
import type { AgentKey, AgentTask, DataAgentState } from "./types";

interface CreateTaskOptions {
  contextType?: string;
  contextId?: string;
  intent?: string;
}

interface DataAgentContextValue {
  state: DataAgentState;
  meta: SqliteStateMeta;
  tasksForAgent: (agent: AgentKey) => AgentTask[];
  getTask: (taskId: string) => AgentTask | undefined;
  createTaskFromPrompt: (agent: AgentKey, prompt: string, options?: CreateTaskOptions) => string;
  patchTask: (taskId: string, updater: (task: AgentTask) => AgentTask) => void;
  advanceTask: (taskId: string) => void;
  confirmAction: (taskId: string) => void;
  replayTask: (taskId: string) => void;
  resetAllCases: () => void;
}

const DataAgentContext = createContext<DataAgentContextValue | null>(null);

function nowLabel() {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date()).replace("/", "-");
}

export function DataAgentProvider({ children }: { children: ReactNode }) {
  const [state, setState, meta] = useSqliteState<DataAgentState>(
    "data-agent.agent-workspace",
    createInitialDataAgentState(),
  );

  const value = useMemo<DataAgentContextValue>(() => {
    const tasksForAgent = (agent: AgentKey) =>
      state.tasks
        .filter((task) => task.participantAgents.includes(agent))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    const getTask = (taskId: string) => state.tasks.find((task) => task.id === taskId);

    const patchTask = (taskId: string, updater: (task: AgentTask) => AgentTask) => {
      setState((current) => ({
        ...current,
        tasks: current.tasks.map((task) => task.id === taskId ? updater(task) : task),
      }));
    };

    const recordAudit = (current: DataAgentState, taskId: string, action: string, result: string): DataAgentState => ({
      ...current,
      auditTrail: [
        {
          id: `audit-${Date.now()}-${current.auditTrail.length}`,
          taskId,
          action,
          actor: "演示用户",
          at: nowLabel(),
          result,
        },
        ...current.auditTrail,
      ],
    });

    const createTaskFromPrompt = (agent: AgentKey, prompt: string, options: CreateTaskOptions = {}) => {
      const base = fixtureTasks.find((task) => task.primaryAgent === agent) ?? fixtureTasks[0];
      const id = `DAT-${agent.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-5)}`;
      const contextRefs = options.contextId
        ? [
            {
              id: options.contextId,
              type: options.contextType ?? "业务对象",
              label: `上下文对象 ${options.contextId}`,
            },
            ...base.contextRefs,
          ]
        : base.contextRefs;
      const newTask: AgentTask = {
        ...JSON.parse(JSON.stringify(base)) as AgentTask,
        id,
        caseId: `custom-${id.toLowerCase()}`,
        title: prompt.trim().slice(0, 42) || options.intent || base.title,
        prompt: prompt.trim() || options.intent || base.prompt,
        summary: "已根据自然语言输入匹配演示任务链，正在读取上下文并生成可见计划。",
        primaryAgent: agent,
        participantAgents: agent === "general" ? base.participantAgents : [agent],
        status: "running",
        progress: 18,
        currentStep: "解析任务上下文",
        contextRefs,
        pendingAction: undefined,
        artifacts: [],
        steps: base.steps.map((step, index) => ({
          ...step,
          id: `${id}-s${index + 1}`,
          status: index === 0 ? "running" : "waiting",
        })),
        createdAt: nowLabel(),
        updatedAt: nowLabel(),
      };

      setState((current) => recordAudit(
        { ...current, tasks: [newTask, ...current.tasks] },
        id,
        "创建 Agent 任务",
        options.contextId ? `已接入 ${options.contextType ?? "业务对象"} ${options.contextId}` : "已匹配演示任务链",
      ));
      return id;
    };

    const advanceTask = (taskId: string) => {
      setState((current) => {
        const tasks = current.tasks.map((task) => {
          if (task.id !== taskId || task.pendingAction) return task;
          const activeIndex = task.steps.findIndex((step) => step.status === "running");
          const nextIndex = activeIndex >= 0
            ? task.steps.findIndex((step, index) => index > activeIndex && step.status === "waiting")
            : task.steps.findIndex((step) => step.status === "waiting");
          const steps = task.steps.map((step, index) => {
            if (index === activeIndex) return { ...step, status: "completed" as const };
            if (index === nextIndex) return { ...step, status: "running" as const };
            return step;
          });
          const completed = nextIndex < 0;
          return {
            ...task,
            steps,
            status: completed ? "completed" as const : "running" as const,
            progress: completed ? 100 : Math.min(92, task.progress + 18),
            currentStep: completed ? "任务结果已生成" : steps[nextIndex]?.label ?? task.currentStep,
            updatedAt: nowLabel(),
          };
        });
        return recordAudit({ ...current, tasks }, taskId, "推进演示步骤", "任务步骤状态已更新");
      });
    };

    const confirmAction = (taskId: string) => {
      setState((current) => {
        const target = current.tasks.find((task) => task.id === taskId);
        const actionLabel = target?.pendingAction?.label ?? "确认动作";
        const tasks = current.tasks.map((task) => {
          if (task.id !== taskId || !task.pendingAction) return task;
          const confirmedIndex = task.steps.findIndex((step) => step.status === "needs-confirmation");
          const nextIndex = task.steps.findIndex((step, index) => index > confirmedIndex && step.status === "waiting");
          const steps = task.steps.map((step, index) => {
            if (index === confirmedIndex) return { ...step, status: "completed" as const };
            if (index === nextIndex) return { ...step, status: "running" as const };
            return step;
          });
          return {
            ...task,
            pendingAction: undefined,
            status: nextIndex < 0 ? "completed" as const : "running" as const,
            progress: nextIndex < 0 ? 100 : Math.min(94, task.progress + 14),
            currentStep: nextIndex < 0 ? "确认动作已执行" : steps[nextIndex]?.label ?? "继续执行",
            artifacts: task.artifacts.map((artifact) => artifact.status === "draft" ? { ...artifact, status: "ready" as const } : artifact),
            updatedAt: nowLabel(),
          };
        });
        return recordAudit({ ...current, tasks }, taskId, actionLabel, "用户已确认，mock 动作已执行");
      });
    };

    const replayTask = (taskId: string) => {
      const fixture = fixtureTasks.find((task) => task.id === taskId);
      if (!fixture) return;
      setState((current) => recordAudit(
        {
          ...current,
          tasks: current.tasks.map((task) => task.id === taskId
            ? JSON.parse(JSON.stringify(fixture)) as AgentTask
            : task),
        },
        taskId,
        "重新演示案例",
        "已恢复案例初始状态",
      ));
    };

    const resetAllCases = () => {
      setState(createInitialDataAgentState());
    };

    return {
      state,
      meta,
      tasksForAgent,
      getTask,
      createTaskFromPrompt,
      patchTask,
      advanceTask,
      confirmAction,
      replayTask,
      resetAllCases,
    };
  }, [setState, state, meta]);

  return <DataAgentContext.Provider value={value}>{children}</DataAgentContext.Provider>;
}

// The provider and its colocated hook form one feature boundary; consumers import both from here.
// eslint-disable-next-line react-refresh/only-export-components
export function useDataAgent() {
  const value = useContext(DataAgentContext);
  if (!value) throw new Error("useDataAgent must be used within DataAgentProvider");
  return value;
}
