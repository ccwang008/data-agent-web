import { lazy } from "react";
import type { RouteObject } from "react-router-dom";

const ProductMatrixHomePage = lazy(() => import("./pages/ProductMatrixHomePage"));

export const productMatrixRoutes: RouteObject[] = [
  {
    index: true,
    element: <ProductMatrixHomePage />,
  },
];
