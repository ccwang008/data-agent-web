import { Navigate, createBrowserRouter } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { productMatrixRoutes } from "@/features/product-matrix/routes";
import { solutionsRoutes } from "@/features/solutions/routes";
import { knowledgeGraphRoutes } from "@/features/knowledge-graph/routes";
import { knowledgeCenterRoutes } from "@/features/knowledge-center/routes";
import { dataSourceRoutes } from "@/features/data-source/routes";
import { dataLakeRoutes } from "@/features/data-lake/routes";
import { dataGovernanceRoutes } from "@/features/data-governance/routes";
import { dataDevelopmentRoutes } from "@/features/data-development/routes";
import { schedulerRoutes } from "@/features/scheduler/routes";
import { dataAssetRoutes } from "@/features/data-asset/routes";
import { opsMonitorRoutes } from "@/features/ops-monitor/routes";
import { dataSecurityRoutes } from "@/features/data-security/routes";
import { metricsRoutes } from "@/features/metrics/routes";
import { agentsRoutes } from "@/features/agents/routes";
import { workflowRoutes } from "@/features/workflow/routes";
import { insightsRoutes } from "@/features/insights/routes";
import { settingsRoutes } from "@/features/settings/routes";

export const appFeatureRoutes = [
  ...productMatrixRoutes,
  ...solutionsRoutes,
  ...knowledgeGraphRoutes,
  ...knowledgeCenterRoutes,
  ...dataSourceRoutes,
  ...dataLakeRoutes,
  ...dataGovernanceRoutes,
  ...dataDevelopmentRoutes,
  ...schedulerRoutes,
  ...dataAssetRoutes,
  ...opsMonitorRoutes,
  ...dataSecurityRoutes,
  ...metricsRoutes,
  ...agentsRoutes,
  ...workflowRoutes,
  ...insightsRoutes,
  ...settingsRoutes,
];

export const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <AppShell />,
      children: [
        ...appFeatureRoutes,
        { path: "*", element: <Navigate to="/" replace /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL.replace(/\/$/, "") || "/" },
);
