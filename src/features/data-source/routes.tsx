import { lazy } from "react";
import { Navigate } from "react-router-dom";
import type { RouteObject } from "react-router-dom";

const DataSourcesPage = lazy(() =>
  import("./pages").then((module) => ({ default: module.DataSourcesPage })),
);
const DataSyncPage = lazy(() =>
  import("./pages").then((module) => ({ default: module.DataSyncPage })),
);
const DataExchangePage = lazy(() =>
  import("./pages").then((module) => ({ default: module.DataExchangePage })),
);

export const dataSourceRoutes: RouteObject[] = [
  {
    path: "data-source",
    children: [
      { index: true, element: <Navigate to="sources" replace /> },
      { path: "sources", element: <DataSourcesPage /> },
      { path: "sync", element: <DataSyncPage /> },
      { path: "exchange", element: <DataExchangePage /> },
    ],
  },
];
