import { lazy } from "react";
import { Navigate } from "react-router-dom";
import type { RouteObject } from "react-router-dom";

const DataLakeStoragePage = lazy(() =>
  import("./pages").then((module) => ({ default: module.DataLakeStoragePage })),
);
const DataLakeTablesPage = lazy(() =>
  import("./pages").then((module) => ({ default: module.DataLakeTablesPage })),
);
const DataLakeCapacityPage = lazy(() =>
  import("./pages").then((module) => ({ default: module.DataLakeCapacityPage })),
);

export const dataLakeRoutes: RouteObject[] = [
  {
    path: "data-lake",
    children: [
      { index: true, element: <Navigate to="storage" replace /> },
      { path: "storage", element: <DataLakeStoragePage /> },
      { path: "tables", element: <DataLakeTablesPage /> },
      { path: "capacity", element: <DataLakeCapacityPage /> },
    ],
  },
];
