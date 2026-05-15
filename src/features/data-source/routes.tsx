import type { RouteObject } from "react-router-dom";

import { ModulePlaceholder } from "@/components/layout/ModulePlaceholder";

// TODO: implement Data Source module
// - api/mock.ts: connector list, schema preview
// - store.ts: selected connector
// - pages/: list, detail, new
export const dataSourceRoutes: RouteObject[] = [
  {
    path: "data-source",
    element: <ModulePlaceholder featureKey="data-source" />,
  },
];
