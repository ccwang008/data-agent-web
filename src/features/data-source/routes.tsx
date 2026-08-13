import { lazy } from "react";
import { Navigate } from "react-router-dom";
import type { RouteObject } from "react-router-dom";

const SourcesPage = lazy(() => import("./pages/SourcesPage").then((m) => ({ default: m.SourcesPage })));
const SyncPage = lazy(() => import("./pages/SyncPage").then((m) => ({ default: m.SyncPage })));
const ExchangePage = lazy(() => import("./pages/ExchangePage").then((m) => ({ default: m.ExchangePage })));

export const dataSourceRoutes: RouteObject[] = [
  {
    path: "data-source",
    children: [
      { index: true, element: <Navigate to="sources" replace /> },
      { path: "sources", element: <SourcesPage /> },
      { path: "sync", element: <SyncPage /> },
      { path: "exchange", element: <ExchangePage /> },
    ],
  },
];
