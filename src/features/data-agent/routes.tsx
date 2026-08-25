import { lazy } from "react";
import { Navigate, Outlet } from "react-router-dom";
import type { RouteObject } from "react-router-dom";

import { DataAgentProvider } from "./state";

const AgentHomePage = lazy(() => import("./pages").then((module) => ({ default: module.AgentHomePage })));
const GeneralTaskPage = lazy(() => import("./pages").then((module) => ({ default: module.GeneralTaskPage })));
const DiscoveryTaskPage = lazy(() => import("./pages").then((module) => ({ default: module.DiscoveryTaskPage })));
const QaTaskPage = lazy(() => import("./pages").then((module) => ({ default: module.QaTaskPage })));
const DevelopmentTaskPage = lazy(() => import("./pages").then((module) => ({ default: module.DevelopmentTaskPage })));
const GovernanceTaskPage = lazy(() => import("./pages").then((module) => ({ default: module.GovernanceTaskPage })));
const OperationsTaskPage = lazy(() => import("./pages").then((module) => ({ default: module.OperationsTaskPage })));

export const dataAgentRoutes: RouteObject[] = [
  {
    path: "data-agent",
    element: <DataAgentProvider><Outlet /></DataAgentProvider>,
    children: [
      { index: true, element: <Navigate to="general" replace /> },
      { path: "general", element: <AgentHomePage agent="general" /> },
      { path: "general/tasks/:taskId", element: <GeneralTaskPage /> },
      { path: "discovery", element: <AgentHomePage agent="discovery" /> },
      { path: "discovery/tasks/:taskId", element: <DiscoveryTaskPage /> },
      { path: "qa", element: <AgentHomePage agent="qa" /> },
      { path: "qa/tasks/:taskId", element: <QaTaskPage /> },
      { path: "development", element: <AgentHomePage agent="development" /> },
      { path: "development/tasks/:taskId", element: <DevelopmentTaskPage /> },
      { path: "governance", element: <AgentHomePage agent="governance" /> },
      { path: "governance/tasks/:taskId", element: <GovernanceTaskPage /> },
      { path: "operations", element: <AgentHomePage agent="operations" /> },
      { path: "operations/tasks/:taskId", element: <OperationsTaskPage /> },
    ],
  },
];
