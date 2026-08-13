import { lazy } from "react";
import type { RouteObject } from "react-router-dom";

const SolutionsHomePage = lazy(() => import("./pages/SolutionsHomePage"));

export const solutionsRoutes: RouteObject[] = [
  {
    path: "solutions",
    element: <SolutionsHomePage />,
  },
];
