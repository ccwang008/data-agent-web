import { lazy } from "react";
import { Navigate } from "react-router-dom";
import type { RouteObject } from "react-router-dom";

const ClassificationPage = lazy(() =>
  import("./pages").then((module) => ({ default: module.ClassificationPage })),
);
const MaskingPage = lazy(() =>
  import("./pages").then((module) => ({ default: module.MaskingPage })),
);

export const dataSecurityRoutes: RouteObject[] = [
  {
    path: "data-security",
    children: [
      { index: true, element: <Navigate to="classification" replace /> },
      { path: "classification", element: <ClassificationPage /> },
      { path: "masking", element: <MaskingPage /> },
    ],
  },
];
