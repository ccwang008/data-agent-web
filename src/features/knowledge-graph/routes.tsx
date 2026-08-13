import { lazy } from "react";
import { Navigate } from "react-router-dom";
import type { RouteObject } from "react-router-dom";

const KnowledgeGraphHub = lazy(() => withMockRoutes(() =>
  import("./pages/KnowledgeGraphHub").then((module) => ({ default: module.KnowledgeGraphHub })),
));
const GraphsListPage = lazy(() => withMockRoutes(() =>
  import("./pages/graphs/GraphsListPage").then((module) => ({ default: module.GraphsListPage })),
));
const GraphDetailPage = lazy(() => withMockRoutes(() =>
  import("./pages/graphs/GraphDetailPage").then((module) => ({ default: module.GraphDetailPage })),
));
const MetadataPage = lazy(() => withMockRoutes(() =>
  import("./pages/metadata/MetadataPage").then((module) => ({ default: module.MetadataPage })),
));
const ImportPage = lazy(() => withMockRoutes(() =>
  import("./pages/import/ImportPage").then((module) => ({ default: module.ImportPage })),
));
const AnalysisPage = lazy(() => withMockRoutes(() =>
  import("./pages/analysis/AnalysisPage").then((module) => ({ default: module.AnalysisPage })),
));
const VisualizationPage = lazy(() => withMockRoutes(() =>
  import("./pages/visualization/VisualizationPage").then((module) => ({ default: module.VisualizationPage })),
));
const AsyncTasksPage = lazy(() => withMockRoutes(() =>
  import("./pages/async-tasks/AsyncTasksPage").then((module) => ({ default: module.AsyncTasksPage })),
));
const ComputerPage = lazy(() => withMockRoutes(() =>
  import("./pages/computer/ComputerPage").then((module) => ({ default: module.ComputerPage })),
));
const AiPage = lazy(() => withMockRoutes(() =>
  import("./pages/ai/AiPage").then((module) => ({ default: module.AiPage })),
));
const AiGraphPage = lazy(() => withMockRoutes(() =>
  import("./pages/ai-graph/AiGraphPage").then((module) => ({ default: module.AiGraphPage })),
));
const AdminPage = lazy(() => withMockRoutes(() =>
  import("./pages/admin/AdminPage").then((module) => ({ default: module.AdminPage })),
));
const HelpPage = lazy(() => withMockRoutes(() =>
  import("./pages/help/HelpPage").then((module) => ({ default: module.HelpPage })),
));

async function withMockRoutes<T>(loader: () => Promise<T>) {
  await import("./api/mock");
  return loader();
}

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
