import { Navigate, createBrowserRouter } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { knowledgeGraphRoutes } from "@/features/knowledge-graph/routes";
import { knowledgeCenterRoutes } from "@/features/knowledge-center/routes";
import { dataSourceRoutes } from "@/features/data-source/routes";
import { agentsRoutes } from "@/features/agents/routes";
import { workflowRoutes } from "@/features/workflow/routes";
import { insightsRoutes } from "@/features/insights/routes";
import { settingsRoutes } from "@/features/settings/routes";

export const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <AppShell />,
      children: [
        { index: true, element: <Navigate to="/knowledge-graph" replace /> },
        ...knowledgeGraphRoutes,
        ...knowledgeCenterRoutes,
        ...dataSourceRoutes,
        ...agentsRoutes,
        ...workflowRoutes,
        ...insightsRoutes,
        ...settingsRoutes,
        { path: "*", element: <Navigate to="/knowledge-graph" replace /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL.replace(/\/$/, "") || "/" },
);
