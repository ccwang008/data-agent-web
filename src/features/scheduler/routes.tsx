import { lazy } from "react";
import { Navigate } from "react-router-dom";
import type { RouteObject } from "react-router-dom";

const SchedulerEditorPage = lazy(() => withMockRoutes(() => import("./pages/SchedulerEditorPage")));
const SchedulerMonitorPage = lazy(() => withMockRoutes(() => import("./pages/SchedulerMonitorPage")));
const SchedulerTasksPage = lazy(() => withMockRoutes(() => import("./pages/SchedulerTasksPage")));

async function withMockRoutes<T>(loader: () => Promise<T>) {
  await import("./api/mock");
  return loader();
}

export const schedulerRoutes: RouteObject[] = [
  {
    path: "scheduler",
    children: [
      { index: true, element: <Navigate to="tasks" replace /> },
      { path: "tasks", element: <SchedulerTasksPage /> },
      { path: "editor", element: <SchedulerEditorPage /> },
      { path: "monitor", element: <SchedulerMonitorPage /> },
    ],
  },
];
