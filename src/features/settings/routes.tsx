import { lazy } from "react";
import { Navigate } from "react-router-dom";
import type { RouteObject } from "react-router-dom";

const MenuManagementPage = lazy(() =>
  import("./pages/MenuManagementPage").then((module) => ({ default: module.MenuManagementPage })),
);
const PreferencesPage = lazy(() =>
  import("./pages/PreferencesPage").then((module) => ({ default: module.PreferencesPage })),
);
const SettingsPasswordGate = lazy(() =>
  import("./pages/SettingsPasswordGate").then((module) => ({ default: module.SettingsPasswordGate })),
);
const SettingsPlaceholderPage = lazy(() =>
  import("./pages/SettingsPlaceholderPage").then((module) => ({ default: module.SettingsPlaceholderPage })),
);

export const settingsRoutes: RouteObject[] = [
  {
    path: "settings",
    element: <SettingsPasswordGate />,
    children: [
      { index: true, element: <Navigate to="menu" replace /> },
      { path: "menu", element: <MenuManagementPage /> },
      {
        path: "preferences",
        element: <PreferencesPage />,
      },
      { path: "users", element: <SettingsPlaceholderPage titleKey="settings.nav.users" /> },
      {
        path: "permissions",
        element: <SettingsPlaceholderPage titleKey="settings.nav.permissions" />,
      },
      { path: "audit", element: <SettingsPlaceholderPage titleKey="settings.nav.audit" /> },
      { path: "flags", element: <SettingsPlaceholderPage titleKey="settings.nav.flags" /> },
    ],
  },
];
