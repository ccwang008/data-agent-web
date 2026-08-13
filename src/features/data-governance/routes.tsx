import { lazy } from "react";
import { Navigate } from "react-router-dom";
import type { RouteObject } from "react-router-dom";

const GovernanceMetadataPage = lazy(() =>
  import("./pages").then((module) => ({ default: module.GovernanceMetadataPage })),
);
const DataQualityPage = lazy(() =>
  import("./pages").then((module) => ({ default: module.DataQualityPage })),
);
const DataStandardsPage = lazy(() =>
  import("./pages").then((module) => ({ default: module.DataStandardsPage })),
);

export const dataGovernanceRoutes: RouteObject[] = [
  {
    path: "data-governance",
    children: [
      { index: true, element: <Navigate to="metadata" replace /> },
      { path: "metadata", element: <GovernanceMetadataPage /> },
      { path: "quality", element: <DataQualityPage /> },
      { path: "standards", element: <DataStandardsPage /> },
    ],
  },
];
