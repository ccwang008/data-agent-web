import { lazy } from "react";
import { Navigate } from "react-router-dom";
import type { ComponentType } from "react";
import type { RouteObject } from "react-router-dom";

type DataStandardPages = typeof import("./pages");

function lazyPage(name: keyof DataStandardPages) {
  return lazy(async () => {
    const pages = await import("./pages");
    return { default: pages[name] as ComponentType };
  });
}

const BusinessTermsPage = lazyPage("BusinessTermsPage");
const MasterDataPage = lazyPage("MasterDataPage");
const ReferenceDataPage = lazyPage("ReferenceDataPage");
const DataElementStandardsPage = lazyPage("DataElementStandardsPage");
const MetricDictionaryPage = lazyPage("MetricDictionaryPage");

export const dataStandardRoutes: RouteObject[] = [
  {
    path: "data-standard",
    children: [
      { index: true, element: <Navigate to="business-terms" replace /> },
      { path: "business-terms", element: <BusinessTermsPage /> },
      { path: "master-data", element: <MasterDataPage /> },
      { path: "reference-data", element: <ReferenceDataPage /> },
      { path: "data-element-standards", element: <DataElementStandardsPage /> },
      { path: "metric-dictionary", element: <MetricDictionaryPage /> },
    ],
  },
];
