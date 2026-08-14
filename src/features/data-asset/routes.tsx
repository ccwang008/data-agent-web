import { lazy } from "react";
import { Navigate, Outlet } from "react-router-dom";
import type { RouteObject } from "react-router-dom";

import { ToastProvider } from "./components/common";
const AuditPage = lazy(() => import("./pages/AuditPage"));
const CatalogPage = lazy(() => import("./pages/CatalogPage"));
const CirculationPage = lazy(() => import("./pages/CirculationPage"));
const OwnershipPage = lazy(() => import("./pages/OwnershipPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const ServicePage = lazy(() => import("./pages/ServicePage"));
const ValuePage = lazy(() => import("./pages/ValuePage"));

export const dataAssetRoutes: RouteObject[] = [
  {
    path: "data-asset",
    element: (
      <ToastProvider>
        <Outlet />
      </ToastProvider>
    ),
    children: [
      { index: true, element: <Navigate to="catalog" replace /> },
      { path: "catalog", element: <CatalogPage /> },
      { path: "circulation", element: <CirculationPage /> },
      { path: "ownership", element: <OwnershipPage /> },
      { path: "value", element: <ValuePage /> },
      { path: "service", element: <ServicePage /> },
      { path: "audit", element: <AuditPage /> },
      { path: "reports", element: <ReportsPage /> },
    ],
  },
];
