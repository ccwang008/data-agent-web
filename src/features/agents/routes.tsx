import type { RouteObject } from "react-router-dom";

import { ModulePlaceholder } from "@/components/layout/ModulePlaceholder";

// TODO: implement Agents module
export const agentsRoutes: RouteObject[] = [
  {
    path: "agents",
    element: <ModulePlaceholder featureKey="agents" />,
  },
];
