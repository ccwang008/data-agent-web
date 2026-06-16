import { Navigate } from "react-router-dom";
import type { RouteObject } from "react-router-dom";

import { ModulePlaceholder } from "@/components/layout/ModulePlaceholder";
import { DocumentDetailPage } from "./pages/DocumentDetailPage";
import { KnowledgeBaseDetailPage } from "./pages/KnowledgeBaseDetailPage";
import { KnowledgeBaseGraphPage } from "./pages/KnowledgeBaseGraphPage";
import { KnowledgeBasesPage } from "./pages/KnowledgeBasesPage";
import { KnowledgeVectorsPage } from "./pages/KnowledgeVectorsPage";
import { RecallTestPage } from "./pages/RecallTestPage";

import "./api/mock";

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
