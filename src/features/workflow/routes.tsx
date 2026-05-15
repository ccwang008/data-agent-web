import type { RouteObject } from "react-router-dom";

import { ModulePlaceholder } from "@/components/layout/ModulePlaceholder";

// TODO: implement Workflow module
export const workflowRoutes: RouteObject[] = [
  {
    path: "workflow",
    element: <ModulePlaceholder featureKey="workflow" />,
  },
];
