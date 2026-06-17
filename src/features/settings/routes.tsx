import { Navigate } from "react-router-dom";
import type { RouteObject } from "react-router-dom";

import { MenuManagementPage } from "./pages/MenuManagementPage";
import { PreferencesPage } from "./pages/PreferencesPage";
import { SettingsPasswordGate } from "./pages/SettingsPasswordGate";
import { SettingsPlaceholderPage } from "./pages/SettingsPlaceholderPage";

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
