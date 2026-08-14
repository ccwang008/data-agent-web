import { createInitialDomainState } from "./catalog";
import type {
  SecurityDomain,
  SecurityDomainState,
  SecurityPageKey,
  SecurityRecord,
} from "./types";

type LegacyClassificationRecord = {
  id?: string;
  name?: string;
  category?: string;
  level?: string;
  scope?: string;
  evidence?: string;
  owner?: string;
  status?: string;
  updatedAt?: string;
};

type LegacyMaskingRecord = {
  id?: string;
  name?: string;
  method?: string;
  scope?: string;
  coverage?: string;
  encryption?: string;
  owner?: string;
  status?: string;
  updatedAt?: string;
};

export function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function deterministicEvidenceRef(pageKey: SecurityPageKey, recordId: string, version: number) {
  return `EV-${pageKey.toUpperCase()}-${stableHash(`${recordId}:${version}`).slice(0, 6).toUpperCase()}`;
}

export function suggestCrossBorderPath(record: SecurityRecord) {
  const country = String(record.fields.接收地 ?? "");
  const scale = String(record.fields.个人信息规模 ?? "");
  const gaps = String(record.fields.材料缺口 ?? "");

  if (!country || /未知|待配置/.test(scale) || /保存期限|敏感个人信息数量/.test(gaps)) {
    return "信息不足";
  }
  if (/豁免|临时且必要/.test(String(record.summary))) return "可能适用豁免（建议）";
  if (/重要|核心|关键信息基础设施/.test(`${record.summary}${record.fields.建议等级 ?? ""}`)) {
    return "安全评估（建议）";
  }
  return "标准合同或认证（建议）";
}

const INCIDENT_PHASES = ["研判", "处置", "恢复", "通知", "复盘"] as const;

export function nextIncidentPhase(current: string) {
  const index = INCIDENT_PHASES.indexOf(current as (typeof INCIDENT_PHASES)[number]);
  return INCIDENT_PHASES[Math.min(Math.max(index + 1, 0), INCIDENT_PHASES.length - 1)];
}

export function calculateEvidenceCompleteness(record: SecurityRecord): number | null {
  if (record.evidenceState === "采集失败" || !record.evidenceRefs.length) return null;
  const total = Object.keys(record.fields).length + 1;
  const missing = Object.values(record.fields).filter((value) =>
    /未知|待补充|待配置|待生成/.test(Array.isArray(value) ? value.join(" ") : String(value ?? "")),
  ).length;
  return Math.round(((total - missing) / total) * 100);
}

function migrateLegacyClassification(records: LegacyClassificationRecord[]): SecurityRecord[] {
  return records.map((record, index) => ({
    id: `legacy-class-${record.id ?? index + 1}`,
    name: record.name ?? `旧版分类记录 ${index + 1}`,
    summary: "由旧版分类页面迁移；旧 L1–L4 与“重要数据”标签不作为生效结论，需人工映射后形成新版本。",
    status: "旧版待复核",
    owner: record.owner ?? "待指定",
    updatedAt: record.updatedAt ?? "迁移导入",
    version: 1,
    risk: /L4|重要/.test(`${record.level ?? ""}${record.category ?? ""}`) ? "高" : "中",
    evidenceState: record.evidence && record.evidence !== "待补充" ? "待核验" : "缺失",
    evidenceRefs: [],
    fields: {
      分类标签: record.category ? [record.category] : ["待映射"],
      监管等级: "legacy_pending_review",
      原等级: record.level ?? "未知",
      覆盖范围: record.scope ?? "未知",
      原证据说明: record.evidence ?? "待补充",
    },
    legacySourceId: record.id ?? `legacy-${index + 1}`,
    mock: true,
  }));
}

export function migrateLegacyMaskingRecords(value: unknown): SecurityRecord[] {
  if (!Array.isArray(value)) return [];

  return (value as LegacyMaskingRecord[]).map((record, index) => ({
    id: `legacy-mask-${record.id ?? index + 1}`,
    name: record.name ?? `旧版脱敏策略 ${index + 1}`,
    summary: "从旧版只读 scope 复制的脱敏草稿；原记录保留且不会被删除。",
    status: "旧版迁移草稿",
    owner: record.owner ?? "待指定",
    updatedAt: record.updatedAt ?? "迁移导入",
    version: 1,
    risk: "中",
    evidenceState: "待核验",
    evidenceRefs: [],
    fields: {
      脱敏方式: record.method ?? "待映射",
      适用范围: record.scope ?? "待映射",
      覆盖字段: record.coverage ?? "未知",
      原加密说明: record.encryption ?? "无",
    },
    legacySourceId: record.id ?? `legacy-${index + 1}`,
    mock: true,
  }));
}

function isDomainState(value: unknown): value is SecurityDomainState {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      "collections" in value &&
      typeof (value as SecurityDomainState).collections === "object",
  );
}

export function normalizeDomainState(value: unknown, domain: SecurityDomain): SecurityDomainState {
  const initial = createInitialDomainState(domain);

  if (domain === "classification" && Array.isArray(value)) {
    return {
      ...initial,
      updatedAt: new Date().toISOString(),
      collections: {
        ...initial.collections,
        classification: migrateLegacyClassification(value as LegacyClassificationRecord[]),
      },
      activity: [
        {
          id: `migration-${Date.now()}`,
          pageKey: "classification",
          action: "迁移旧版分类记录",
          actor: "系统迁移",
          result: `${value.length} 条记录转为待复核`,
          occurredAt: new Date().toISOString(),
        },
      ],
    };
  }

  if (!isDomainState(value)) return initial;

  const merged: SecurityDomainState = {
    ...initial,
    ...value,
    schemaVersion: 2,
    domain,
    collections: {
      ...initial.collections,
      ...value.collections,
    },
    activity: Array.isArray(value.activity) ? value.activity : [],
  };

  if (domain === "classification") {
    const legacyFields: Record<string, string> = {
      扫描范围: "待配置",
      范围类型: "数据源",
      识别模式: "增量扫描",
      触发方式: "手动",
    };
    merged.collections.classification = (merged.collections.classification ?? []).map((record) => {
      const fields = { ...record.fields };
      let patched = false;
      for (const [key, defaultValue] of Object.entries(legacyFields)) {
        if (fields[key] === undefined || fields[key] === null || fields[key] === "") {
          fields[key] = defaultValue;
          patched = true;
        }
      }
      return patched ? { ...record, fields } : record;
    });
  }

  return merged;
}

export function hasCurrentDomainSchema(value: unknown, domain: SecurityDomain) {
  if (!isDomainState(value) || value.schemaVersion !== 2 || value.domain !== domain) return false;
  const requiredKeys = domain === "overview"
    ? ["overview"]
    : Object.keys(createInitialDomainState(domain).collections);
  return requiredKeys.every((key) => Array.isArray(value.collections[key as SecurityPageKey]));
}
