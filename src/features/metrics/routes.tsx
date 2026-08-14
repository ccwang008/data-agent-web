import { MetricsLayout } from "./components";
import {
  ApplicationCirculationMetricsPage,
  ArchitectureMetricsPage,
  AssetsMetricsPage,
  GovernanceMetricsPage,
  LifecycleMetricsPage,
  OverviewMetricsPage,
  QualityMetricsPage,
  SecurityMetricsPage,
  StandardsMetricsPage,
  StrategyMetricsPage,
} from "./pages";
import { MetricsProvider } from "./store";

export const metricsRoutes = [
  {
    path: "metrics",
    element: (
      <MetricsProvider>
        <MetricsLayout />
      </MetricsProvider>
    ),
    children: [
      { index: true, element: <OverviewMetricsPage /> },
      { path: "strategy", element: <StrategyMetricsPage /> },
      { path: "governance", element: <GovernanceMetricsPage /> },
      { path: "architecture", element: <ArchitectureMetricsPage /> },
      { path: "assets", element: <AssetsMetricsPage /> },
      { path: "standards", element: <StandardsMetricsPage /> },
      { path: "quality", element: <QualityMetricsPage /> },
      { path: "security", element: <SecurityMetricsPage /> },
      { path: "lifecycle", element: <LifecycleMetricsPage /> },
      { path: "application-circulation", element: <ApplicationCirculationMetricsPage /> },
    ],
  },
];
