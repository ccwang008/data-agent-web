/** Data Asset · 默认状态工厂：组装各领域 mock 数据。 */

import type { DataAssetState } from "./types";
import {
  defaultAssets,
  defaultAssetVersions,
  defaultChanges,
  defaultDomains,
  defaultScanTasks,
} from "./mock-data/catalog";
import {
  defaultOwnershipApprovals,
  defaultOwnershipVersions,
  defaultRights,
} from "./mock-data/ownership";
import { defaultEvaluations, defaultReviews } from "./mock-data/valuation";
import {
  defaultAuthorizations,
  defaultDownloadTasks,
  defaultProductApprovals,
  defaultProducts,
  defaultRetention,
} from "./mock-data/service";
import { defaultAnomalies, defaultAuditEvents, defaultRectifications } from "./mock-data/audit";
import { defaultIndicators, defaultReports } from "./mock-data/reports";
import {
  defaultCirculationApplications,
  defaultIntegrationTasks,
  defaultUsageRecords,
} from "./mock-data/circulation";
import { clone } from "./types";

export const DATA_ASSET_SCHEMA_VERSION = 2;

export function createDefaultState(): DataAssetState {
  return {
    schemaVersion: DATA_ASSET_SCHEMA_VERSION,
    catalog: {
      domains: clone(defaultDomains),
      assets: clone(defaultAssets),
      assetVersions: clone(defaultAssetVersions),
      scanTasks: clone(defaultScanTasks),
      changes: clone(defaultChanges),
    },
    ownership: {
      rights: clone(defaultRights),
      ownershipVersions: clone(defaultOwnershipVersions),
      approvals: clone(defaultOwnershipApprovals),
    },
    valuation: {
      evaluations: clone(defaultEvaluations),
      reviews: clone(defaultReviews),
    },
    service: {
      products: clone(defaultProducts),
      productApprovals: clone(defaultProductApprovals),
      authorizations: clone(defaultAuthorizations),
      downloadTasks: clone(defaultDownloadTasks),
      retention: clone(defaultRetention),
    },
    circulation: {
      applications: clone(defaultCirculationApplications),
      integrationTasks: clone(defaultIntegrationTasks),
      usageRecords: clone(defaultUsageRecords),
    },
    audit: {
      events: clone(defaultAuditEvents),
      anomalies: clone(defaultAnomalies),
      rectifications: clone(defaultRectifications),
    },
    reports: {
      indicators: clone(defaultIndicators),
      reports: clone(defaultReports),
    },
  };
}
