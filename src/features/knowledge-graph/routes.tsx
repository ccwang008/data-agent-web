import { Navigate } from "react-router-dom";
import type { RouteObject } from "react-router-dom";

import { KnowledgeGraphHub } from "./pages/KnowledgeGraphHub";
import { GraphsListPage } from "./pages/graphs/GraphsListPage";
import { GraphDetailPage } from "./pages/graphs/GraphDetailPage";
import { MetadataPage } from "./pages/metadata/MetadataPage";
import { ImportPage } from "./pages/import/ImportPage";
import { AnalysisPage } from "./pages/analysis/AnalysisPage";
import { VisualizationPage } from "./pages/visualization/VisualizationPage";
import { AsyncTasksPage } from "./pages/async-tasks/AsyncTasksPage";
import { ComputerPage } from "./pages/computer/ComputerPage";
import { AiPage } from "./pages/ai/AiPage";
import { AiGraphPage } from "./pages/ai-graph/AiGraphPage";
import { AdminPage } from "./pages/admin/AdminPage";
import { HelpPage } from "./pages/help/HelpPage";

// Side-effect import: registers all mock routes before any page mounts.
import "./api/mock";

export const knowledgeGraphRoutes: RouteObject[] = [
  {
    path: "knowledge-graph",
    element: <KnowledgeGraphHub />,
    children: [
      { index: true, element: <Navigate to="graphs" replace /> },
      { path: "graphs",       element: <GraphsListPage /> },
      { path: "graphs/:id",   element: <GraphDetailPage /> },
      { path: "metadata",     element: <MetadataPage /> },
      { path: "import",       element: <ImportPage /> },
      { path: "analysis",     element: <AnalysisPage /> },
      { path: "visualization", element: <VisualizationPage /> },
      { path: "async-tasks",  element: <AsyncTasksPage /> },
      { path: "computer",     element: <ComputerPage /> },
      { path: "ai",           element: <AiPage /> },
      { path: "ai-graph",     element: <AiGraphPage /> },
      { path: "admin",        element: <AdminPage /> },
      { path: "help",         element: <HelpPage /> },
    ],
  },
];
