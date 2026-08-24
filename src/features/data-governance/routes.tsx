import { lazy } from "react";
import { Navigate } from "react-router-dom";
import type { ComponentType } from "react";
import type { RouteObject } from "react-router-dom";

type DataGovernancePages = typeof import("./pages");

function lazyPage(name: keyof DataGovernancePages) {
  return lazy(async () => {
    const pages = await import("./pages");
    return { default: pages[name] as ComponentType };
  });
}

const GovernanceCenterPage = lazyPage("GovernanceCenterPage");
const GovernanceOrganizationPage = lazyPage("GovernanceOrganizationPage");
const GovernanceRegulationPage = lazyPage("GovernanceRegulationPage");
const GovernanceCulturePage = lazyPage("GovernanceCulturePage");
const MetadataMapPage = lazyPage("MetadataMapPage");
const MetaModelPage = lazyPage("MetaModelPage");
const MetadataQualityPage = lazyPage("MetadataQualityPage");
const MetadataReportPage = lazyPage("MetadataReportPage");
const QualityOverviewPage = lazyPage("QualityOverviewPage");
const QualityRequirementPage = lazyPage("QualityRequirementPage");
const QualityRulePage = lazyPage("QualityRulePage");
const QualityIssuePage = lazyPage("QualityIssuePage");
const QualityAnalysisPage = lazyPage("QualityAnalysisPage");
const QualityImprovementPage = lazyPage("QualityImprovementPage");

export const dataGovernanceRoutes: RouteObject[] = [
  {
    path: "data-governance",
    children: [
      { index: true, element: <Navigate to="center" replace /> },
      // 治理中心（DCMM 7 数据治理域）
      { path: "center", element: <GovernanceCenterPage /> },
      { path: "center/organization", element: <GovernanceOrganizationPage /> },
      { path: "center/regulation", element: <GovernanceRegulationPage /> },
      { path: "center/culture", element: <GovernanceCulturePage /> },
      // 元数据与血缘（DCMM 8.4 数据架构域）
      { path: "metadata", element: <MetadataMapPage /> },
      { path: "metadata/model", element: <MetaModelPage /> },
      { path: "metadata/quality", element: <MetadataQualityPage /> },
      { path: "metadata/reports", element: <MetadataReportPage /> },
      // 数据质量（DCMM 11 数据质量域）
      { path: "quality", element: <QualityOverviewPage /> },
      { path: "quality/requirements", element: <QualityRequirementPage /> },
      { path: "quality/rules", element: <QualityRulePage /> },
      { path: "quality/issues", element: <QualityIssuePage /> },
      { path: "quality/analysis", element: <QualityAnalysisPage /> },
      { path: "quality/improvement", element: <QualityImprovementPage /> },
    ],
  },
];
