import { lazy } from "react";
import { Navigate } from "react-router-dom";
import type { ComponentType } from "react";
import type { RouteObject } from "react-router-dom";

type SecurityPages = typeof import("./pages");

function lazySecurityPage(name: keyof SecurityPages) {
  return lazy(async () => {
    const pages = await import("./pages");
    return { default: pages[name] as ComponentType };
  });
}

const SecurityOverviewPage = lazySecurityPage("SecurityOverviewPage");
const ComplianceChecklistPage = lazySecurityPage("ComplianceChecklistPage");
const ComplianceReviewsPage = lazySecurityPage("ComplianceReviewsPage");
const PersonalInformationPage = lazySecurityPage("PersonalInformationPage");
const ImportantDataPage = lazySecurityPage("ImportantDataPage");
const CrossBorderAssessmentPage = lazySecurityPage("CrossBorderAssessmentPage");
const ClassificationPage = lazySecurityPage("ClassificationPage");
const ClassificationReviewsPage = lazySecurityPage("ClassificationReviewsPage");
const ClassificationRulesPage = lazySecurityPage("ClassificationRulesPage");
const ClassificationReportsPage = lazySecurityPage("ClassificationReportsPage");
const ProtectionPoliciesPage = lazySecurityPage("ProtectionPoliciesPage");
const AccessControlPage = lazySecurityPage("AccessControlPage");
const MaskingPage = lazySecurityPage("MaskingPage");
const EncryptionPage = lazySecurityPage("EncryptionPage");
const WatermarkPage = lazySecurityPage("WatermarkPage");
const SecurityRiskPage = lazySecurityPage("SecurityRiskPage");
const AuditPlansPage = lazySecurityPage("AuditPlansPage");
const AuditExecutionsPage = lazySecurityPage("AuditExecutionsPage");
const AuditEvidencePage = lazySecurityPage("AuditEvidencePage");
const AuditReportsPage = lazySecurityPage("AuditReportsPage");
const AuditFindingsPage = lazySecurityPage("AuditFindingsPage");
const IncidentsPage = lazySecurityPage("IncidentsPage");
const IncidentSopPage = lazySecurityPage("IncidentSopPage");
const IncidentNotificationsPage = lazySecurityPage("IncidentNotificationsPage");
const IncidentDrillsPage = lazySecurityPage("IncidentDrillsPage");

export const dataSecurityRoutes: RouteObject[] = [
  {
    path: "data-security",
    children: [
      { index: true, element: <Navigate to="overview" replace /> },
      { path: "overview", element: <SecurityOverviewPage /> },
      { path: "compliance", element: <ComplianceChecklistPage /> },
      { path: "compliance/reviews", element: <ComplianceReviewsPage /> },
      { path: "compliance/personal-information", element: <PersonalInformationPage /> },
      { path: "compliance/important-data", element: <ImportantDataPage /> },
      { path: "cross-border", element: <CrossBorderAssessmentPage /> },
      { path: "classification", element: <ClassificationPage /> },
      { path: "classification/reviews", element: <ClassificationReviewsPage /> },
      { path: "classification/rules", element: <ClassificationRulesPage /> },
      { path: "classification/reports", element: <ClassificationReportsPage /> },
      { path: "protection", element: <ProtectionPoliciesPage /> },
      { path: "access-control", element: <AccessControlPage /> },
      { path: "masking", element: <MaskingPage /> },
      { path: "encryption", element: <EncryptionPage /> },
      { path: "watermark", element: <WatermarkPage /> },
      { path: "risk", element: <SecurityRiskPage /> },
      { path: "audit", element: <AuditPlansPage /> },
      { path: "audit/executions", element: <AuditExecutionsPage /> },
      { path: "audit/evidence", element: <AuditEvidencePage /> },
      { path: "audit/reports", element: <AuditReportsPage /> },
      { path: "audit/findings", element: <AuditFindingsPage /> },
      { path: "incidents", element: <IncidentsPage /> },
      { path: "incidents/sop", element: <IncidentSopPage /> },
      { path: "incidents/notifications", element: <IncidentNotificationsPage /> },
      { path: "incidents/drills", element: <IncidentDrillsPage /> },
    ],
  },
];
