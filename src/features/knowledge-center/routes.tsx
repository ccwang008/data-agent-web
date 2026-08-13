import { lazy } from "react";
import { Navigate } from "react-router-dom";
import type { RouteObject } from "react-router-dom";

import { ModulePlaceholder } from "@/components/layout/ModulePlaceholder";
const AnalysisReportsPage = lazy(() => withMockRoutes(() =>
  import("./pages/AnalysisReportsPage").then((module) => ({ default: module.AnalysisReportsPage })),
));
const DocumentDetailPage = lazy(() => withMockRoutes(() =>
  import("./pages/DocumentDetailPage").then((module) => ({ default: module.DocumentDetailPage })),
));
const KnowledgeBaseDetailPage = lazy(() => withMockRoutes(() =>
  import("./pages/KnowledgeBaseDetailPage").then((module) => ({ default: module.KnowledgeBaseDetailPage })),
));
const KnowledgeBaseGraphPage = lazy(() => withMockRoutes(() =>
  import("./pages/KnowledgeBaseGraphPage").then((module) => ({ default: module.KnowledgeBaseGraphPage })),
));
const KnowledgeBasesPage = lazy(() => withMockRoutes(() =>
  import("./pages/KnowledgeBasesPage").then((module) => ({ default: module.KnowledgeBasesPage })),
));
const KnowledgeVectorsPage = lazy(() => withMockRoutes(() =>
  import("./pages/KnowledgeVectorsPage").then((module) => ({ default: module.KnowledgeVectorsPage })),
));
const RecallTestPage = lazy(() => withMockRoutes(() =>
  import("./pages/RecallTestPage").then((module) => ({ default: module.RecallTestPage })),
));

async function withMockRoutes<T>(loader: () => Promise<T>) {
  await import("./api/mock");
  return loader();
}

export const knowledgeCenterRoutes: RouteObject[] = [
  {
    path: "knowledge-center",
    children: [
      { index: true, element: <Navigate to="knowledge-bases" replace /> },
      {
        path: "knowledge-bases",
        element: <KnowledgeBasesPage />,
      },
      {
        path: "knowledge-bases/recall-test",
        element: <RecallTestPage />,
      },
      {
        path: "knowledge-bases/:knowledgeBaseId",
        element: <KnowledgeBaseDetailPage />,
      },
      {
        path: "knowledge-bases/:knowledgeBaseId/knowledge-graph",
        element: <KnowledgeBaseGraphPage />,
      },
      {
        path: "knowledge-bases/:knowledgeBaseId/documents/:documentId",
        element: <DocumentDetailPage />,
      },
      {
        path: "documents",
        element: <ModulePlaceholder featureKey="knowledge-center.documents" />,
      },
      {
        path: "reports",
        element: <AnalysisReportsPage />,
      },
      {
        path: "vectors",
        element: <KnowledgeVectorsPage />,
      },
      {
        path: "permissions",
        element: <ModulePlaceholder featureKey="knowledge-center.permissions" />,
      },
    ],
  },
];
