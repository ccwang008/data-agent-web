import { Navigate, createBrowserRouter } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { productMatrixRoutes } from "@/features/product-matrix/routes";
import { solutionsRoutes } from "@/features/solutions/routes";
import { dataSourceRoutes } from "@/features/data-source/routes";
import { dataLakeRoutes } from "@/features/data-lake/routes";
import { dataGovernanceRoutes } from "@/features/data-governance/routes";
import { dataStandardRoutes } from "@/features/data-standard/routes";
import { dataDevelopmentRoutes } from "@/features/data-development/routes";
import { schedulerRoutes } from "@/features/scheduler/routes";
import { dataAssetRoutes } from "@/features/data-asset/routes";
import { opsMonitorRoutes } from "@/features/ops-monitor/routes";
import { dataSecurityRoutes } from "@/features/data-security/routes";
import { metricsRoutes } from "@/features/metrics/routes";
import { dataAgentRoutes } from "@/features/data-agent/routes";
import { settingsRoutes } from "@/features/settings/routes";

export const appFeatureRoutes = [
  ...productMatrixRoutes,
  ...solutionsRoutes,
  ...dataSourceRoutes,
  ...dataLakeRoutes,
  ...dataGovernanceRoutes,
  ...dataStandardRoutes,
  ...dataDevelopmentRoutes,
  ...schedulerRoutes,
  ...dataAssetRoutes,
  ...opsMonitorRoutes,
  ...dataSecurityRoutes,
  ...metricsRoutes,
  ...dataAgentRoutes,
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
