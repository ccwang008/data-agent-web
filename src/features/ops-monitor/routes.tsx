import { lazy } from "react";
import { Navigate } from "react-router-dom";
import type { RouteObject } from "react-router-dom";

const OpsTasksPage = lazy(() =>
  import("./pages").then((module) => ({ default: module.OpsTasksPage })),
);
const OpsLineagePage = lazy(() =>
  import("./pages").then((module) => ({ default: module.OpsLineagePage })),
);
const OpsQualityPage = lazy(() =>
  import("./pages").then((module) => ({ default: module.OpsQualityPage })),
);
const OpsResourcePage = lazy(() =>
  import("./pages").then((module) => ({ default: module.OpsResourcePage })),
);

export const opsMonitorRoutes: RouteObject[] = [
  {
    path: "ops-monitor",
    children: [
      { index: true, element: <Navigate to="tasks" replace /> },
      { path: "tasks", element: <OpsTasksPage /> },
      { path: "lineage", element: <OpsLineagePage /> },
      { path: "quality", element: <OpsQualityPage /> },
      { path: "resource", element: <OpsResourcePage /> },
    ],
  },
];
