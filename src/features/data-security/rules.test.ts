import { describe, expect, it } from "vitest";

import { SECURITY_PAGE_CONFIGS } from "./catalog";
import {
  calculateEvidenceCompleteness,
  deterministicEvidenceRef,
  migrateLegacyMaskingRecords,
  nextIncidentPhase,
  normalizeDomainState,
  stableHash,
  suggestCrossBorderPath,
} from "./rules";

describe("data security deterministic rules", () => {
  it("returns stable evidence references for the same input", () => {
    expect(stableHash("classification:class-001")).toBe(stableHash("classification:class-001"));
    expect(deterministicEvidenceRef("classification", "class-001", 1)).toBe(
      deterministicEvidenceRef("classification", "class-001", 1),
    );
  });

  it("keeps cross-border output as a suggestion and reports missing facts", () => {
    const incomplete = SECURITY_PAGE_CONFIGS["cross-border"].seedRecords[1];
    const complete = SECURITY_PAGE_CONFIGS["cross-border"].seedRecords[0];

    expect(suggestCrossBorderPath(incomplete)).toBe("信息不足");
    expect(suggestCrossBorderPath(complete)).toContain("建议");
  });

  it("moves incidents through the five lightweight phases", () => {
    expect(nextIncidentPhase("研判")).toBe("处置");
    expect(nextIncidentPhase("通知")).toBe("复盘");
    expect(nextIncidentPhase("复盘")).toBe("复盘");
  });

  it("returns unknown completeness when evidence is absent", () => {
    const draft = {
      ...SECURITY_PAGE_CONFIGS["audit-reports"].seedRecords[0],
      evidenceRefs: [],
      evidenceState: "缺失" as const,
    };
    expect(calculateEvidenceCompleteness(draft)).toBeNull();
  });

  it("migrates legacy classification values to pending review instead of conclusions", () => {
    const state = normalizeDomainState([
      {
        id: "class-old",
        name: "企业风险评分",
        category: "重要数据",
        level: "L4 高敏感",
        scope: "风险域",
        owner: "周凯",
      },
    ], "classification");

    const migrated = state.collections.classification?.[0];
    expect(migrated?.status).toBe("旧版待复核");
    expect(migrated?.fields.监管等级).toBe("legacy_pending_review");
    expect(migrated?.legacySourceId).toBe("class-old");
  });

  it("copies legacy masking policies without deleting or exposing key material", () => {
    const migrated = migrateLegacyMaskingRecords([
      {
        id: "mask-old",
        name: "手机号遮盖",
        method: "保留前 3 后 4",
        scope: "客服页面",
        encryption: "密钥引用 kms-***",
      },
    ]);

    expect(migrated).toHaveLength(1);
    expect(migrated[0].status).toBe("旧版迁移草稿");
    expect(migrated[0].legacySourceId).toBe("mask-old");
    expect(String(migrated[0].fields.原加密说明)).not.toMatch(/private|secret/i);
  });
});
