import type { RouteObject } from "react-router-dom";

import { ModulePlaceholder } from "@/components/layout/ModulePlaceholder";

// TODO: implement Insights module
export const insightsRoutes: RouteObject[] = [
  {
    path: "insights",
    element: <ModulePlaceholder featureKey="insights" />,
  },
];
