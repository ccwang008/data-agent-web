import { lazy } from "react";
import { Navigate } from "react-router-dom";
import type { RouteObject } from "react-router-dom";

const EtlDevelopmentPage = lazy(() =>
  import("./pages").then((module) => ({ default: module.EtlDevelopmentPage })),
);
const SqlDevelopmentPage = lazy(() =>
  import("./pages").then((module) => ({ default: module.SqlDevelopmentPage })),
);
const NotebookDevelopmentPage = lazy(() =>
  import("./pages").then((module) => ({ default: module.NotebookDevelopmentPage })),
);
const EtlEditorPage = lazy(() =>
  import("./pages").then((module) => ({ default: module.EtlEditorPage })),
);
const SqlEditorPage = lazy(() =>
  import("./pages").then((module) => ({ default: module.SqlEditorPage })),
);
const NotebookEditorPage = lazy(() =>
  import("./pages").then((module) => ({ default: module.NotebookEditorPage })),
);

export const dataDevelopmentRoutes: RouteObject[] = [
  {
    path: "data-development",
    children: [
      { index: true, element: <Navigate to="etl" replace /> },
      { path: "etl", element: <EtlDevelopmentPage /> },
      { path: "etl/new", element: <EtlEditorPage /> },
      { path: "etl/:taskId", element: <EtlEditorPage /> },
      { path: "sql", element: <SqlDevelopmentPage /> },
      { path: "sql/new", element: <SqlEditorPage /> },
      { path: "sql/:scriptId", element: <SqlEditorPage /> },
      { path: "notebook", element: <NotebookDevelopmentPage /> },
      { path: "notebook/new", element: <NotebookEditorPage /> },
      { path: "notebook/:notebookId", element: <NotebookEditorPage /> },
    ],
  },
];
