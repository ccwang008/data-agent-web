import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, ClipboardCheck, Clock, Eye, Handshake, History, PenLine, Plus, Search, ShieldX, X } from "lucide-react";

import { useDataAssetState } from "../store";
import {
  ASSET_TYPE_LABEL,
  CATALOG_STATUS_LABEL,
  MOCK_NOW,
  OWNERSHIP_APPROVAL_STATUS_LABEL,
  RIGHT_STATUS_LABEL,
  daysUntil,
  isExpired,
  uid,
  type Asset,
  type OwnershipApproval,
  type OwnershipRight,
  type OwnershipVersion,
  type RightType,
} from "../api/types";
import { pauseProductsByRights } from "../api/logic";
import {
  Badge,
  EmptyState,
  Field,
  Input,
  KpiCard,
  Modal,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  SectionCard,
  Select,
  TabBar,
  useToast,
  WarnNote,
  type BadgeTone,
} from "../components/common";

const RIGHT_TYPE_TONE: Record<RightType, BadgeTone> = {
  持有权: "blue",
  使用权: "violet",
  经营权: "green",
};

const VERSION_FIELD_LABELS: Record<string, string> = {
  holder: "权属主体",
  holderKind: "主体类型",
  rightType: "权利类型",
  dataScope: "数据范围",
  purpose: "用途",
  effectiveFrom: "有效期起",
  effectiveTo: "有效期止",
  basis: "登记依据",
  status: "状态",
};

function formatVersionValue(key: string, value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  if (key === "status") {
    const map: Record<string, string> = {
      pending: "待确认",
      confirmed: "已确权",
      invalid: "已失效",
    };
    return map[String(value)] ?? String(value);
  }
  return String(value);
}

function computeDiff(before: Partial<OwnershipRight>, after: Partial<OwnershipRight>): { key: string; label: string; beforeVal: string; afterVal: string }[] {
  const allKeys = new Set<string>([...Object.keys(before), ...Object.keys(after)]);
  const changed: { key: string; label: string; beforeVal: string; afterVal: string }[] = [];
  for (const key of allKeys) {
    const bVal = (before as Record<string, unknown>)[key];
    const aVal = (after as Record<string, unknown>)[key];
    const bStr = bVal !== undefined && bVal !== null ? String(bVal) : "";
    const aStr = aVal !== undefined && aVal !== null ? String(aVal) : "";
    if (bStr !== aStr) {
      changed.push({
        key,
        label: VERSION_FIELD_LABELS[key] ?? key,
        beforeVal: formatVersionValue(key, bVal),
        afterVal: formatVersionValue(key, aVal),
      });
    }
  }
  return changed;
}

function VersionDiff({ version }: { version: OwnershipVersion }) {
  const changes = computeDiff(version.before, version.after);
  if (changes.length === 0) {
    return <div className="text-[12px] text-muted-foreground">无字段差异（初始登记或系统生成）</div>;
  }
  return (
    <div className="space-y-1.5">
      {changes.map((c) => (
        <div key={c.key} className="flex items-start gap-2 text-[12px]">
          <span className="shrink-0 w-[72px] font-medium text-slate-600">{c.label}</span>
          <span className="shrink-0 text-red-600 line-through max-w-[160px] truncate" title={c.beforeVal}>{c.beforeVal}</span>
          <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
          <span className="text-emerald-700 max-w-[160px] truncate" title={c.afterVal}>{c.afterVal}</span>
        </div>
      ))}
    </div>
  );
}

function VersionTimelineModal({
  right,
  versions,
  onClose,
}: {
  right: OwnershipRight;
  versions: OwnershipVersion[];
  onClose: () => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(versions[0]?.id ?? null);

  return (
    <Modal
      title={`版本历史 · ${right.assetName}`}
      description={`主体：${right.holder} · ${right.rightType} · 当前版本 v${right.version} · 共 ${versions.length} 个版本`}
      onClose={onClose}
      footer={<SecondaryButton onClick={onClose}>关闭</SecondaryButton>}
      width="max-w-3xl"
    >
      <div className="relative">
        <div className="absolute left-[11px] top-1 bottom-1 w-px bg-border" />
        <div className="space-y-4">
          {versions.map((v, idx) => {
            const isLatest = idx === 0;
            const isExpanded = expandedId === v.id;
            return (
              <div key={v.id} className="relative pl-7">
                <div className={`absolute left-0 top-1 h-6 w-6 rounded-full border-2 flex items-center justify-center ${isLatest ? "border-primary bg-primary text-white" : "border-border bg-card"}`}>
                  <History className={`h-3 w-3 ${isLatest ? "" : "text-muted-foreground"}`} />
                </div>
                <div className="rounded-md border border-border p-3">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 text-left"
                    onClick={() => setExpandedId(isExpanded ? null : v.id)}
                  >
                    {isExpanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                    <span className="font-mono text-[12px] font-medium text-foreground">v{v.version}</span>
                    {isLatest && <Badge tone="blue">当前版本</Badge>}
                    <Badge tone={v.status === "已生效" ? "green" : v.status === "待确认" ? "amber" : "red"}>{v.status}</Badge>
                    <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">{v.changedAt}</span>
                  </button>
                  {isExpanded && (
                    <div className="mt-3 space-y-3 border-t border-border pt-3">
                      <div className="text-[12px]">
                        <span className="font-medium text-slate-600">变更原因：</span>
                        <span className="text-foreground">{v.reason}</span>
                      </div>
                      <div className="text-[12px] flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                        <span>操作人：{v.changedBy}</span>
                        {v.approvedBy && <span>审批人：{v.approvedBy}</span>}
                      </div>
                      <div>
                        <div className="mb-1 text-[11px] font-medium text-slate-500">字段变更</div>
                        <VersionDiff version={v} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

function ExpiryBadge({ right }: { right: OwnershipRight }) {
  if (right.status === "invalid") return <Badge tone="red">已失效</Badge>;
  const days = daysUntil(right.effectiveTo);
  if (isExpired(right.effectiveTo)) return <Badge tone="red">已到期</Badge>;
  if (days <= 1) return <Badge tone="red">1 天后到期</Badge>;
  if (days <= 7) return <Badge tone="amber">7 天内到期</Badge>;
  if (days <= 30) return <Badge tone="amber">{days} 天后到期 · 30 天提醒已发</Badge>;
  return <Badge tone="slate">有效期至 {right.effectiveTo}</Badge>;
}

export default function OwnershipPage() {
  const { state, update, meta } = useDataAssetState();
  const showToast = useToast();
  const [tab, setTab] = useState("rights");
  const [createOpen, setCreateOpen] = useState(false);
  const [changeRight, setChangeRight] = useState<OwnershipRight | null>(null);
  const [revokeRight, setRevokeRight] = useState<OwnershipRight | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [timelineRight, setTimelineRight] = useState<OwnershipRight | null>(null);

  const [rightSearch, setRightSearch] = useState("");
  const [rightTypeFilter, setRightTypeFilter] = useState<string>("all");
  const [rightStatusFilter, setRightStatusFilter] = useState<string>("all");

  const [versionAssetFilter, setVersionAssetFilter] = useState<string>("all");
  const [versionDateFrom, setVersionDateFrom] = useState("");
  const [versionDateTo, setVersionDateTo] = useState("");

  const allRights = state.ownership.rights;
  const rights = useMemo(() => {
    const q = rightSearch.trim().toLowerCase();
    return allRights.filter((r) => {
      if (rightTypeFilter !== "all" && r.rightType !== rightTypeFilter) return false;
      if (rightStatusFilter !== "all" && r.status !== rightStatusFilter) return false;
      if (!q) return true;
      return (
        r.assetName.toLowerCase().includes(q) ||
        r.holder.toLowerCase().includes(q) ||
        r.dataScope.toLowerCase().includes(q) ||
        r.purpose.toLowerCase().includes(q)
      );
    });
  }, [allRights, rightSearch, rightTypeFilter, rightStatusFilter]);

  const pendingApprovals = state.ownership.approvals.filter((approval) => approval.status === "待确认");

  const upcoming = allRights.filter((right) => right.status === "confirmed" && !isExpired(right.effectiveTo) && daysUntil(right.effectiveTo) <= 30).length;

  const allAssetsWithRights = useMemo(() => {
    const set = new Set<string>();
    state.ownership.ownershipVersions.forEach((v) => set.add(v.assetName));
    allRights.forEach((r) => set.add(r.assetName));
    return Array.from(set).sort();
  }, [state.ownership.ownershipVersions, allRights]);

  const submitCreate = (input: {
    assets: Asset[]; holder: string; holderKind: "内部部门" | "外部机构";
    rightType: RightType; dataScope: string; purpose: string; effectiveFrom: string; effectiveTo: string; basis: string;
  }) => {
    if (input.assets.length === 0 || !input.holder || !input.dataScope || !input.purpose || !input.effectiveFrom || !input.effectiveTo || !input.basis) {
      showToast("error", "必填项未完整，请检查表单");
      return;
    }
    if (input.effectiveFrom >= input.effectiveTo) {
      showToast("error", "开始时间必须早于结束时间");
      return;
    }

    const conflicts: string[] = [];
    const toCreate: Asset[] = [];
    for (const asset of input.assets) {
      const dup = allRights.some(
        (right) =>
          right.assetId === asset.id &&
          right.holder === input.holder &&
          right.rightType === input.rightType &&
          right.dataScope === input.dataScope &&
          right.effectiveFrom === input.effectiveFrom &&
          right.effectiveTo === input.effectiveTo,
      );
      if (dup) conflicts.push(asset.name);
      else toCreate.push(asset);
    }

    if (toCreate.length === 0) {
      showToast("error", `全部 ${input.assets.length} 项资产均存在重复登记，未提交`);
      return;
    }

    const newRights: OwnershipRight[] = toCreate.map((asset) => ({
      id: uid("right"),
      assetId: asset.id,
      assetName: asset.name,
      holder: input.holder,
      holderKind: input.holderKind,
      rightType: input.rightType,
      dataScope: input.dataScope,
      purpose: input.purpose,
      effectiveFrom: input.effectiveFrom,
      effectiveTo: input.effectiveTo,
      status: "pending",
      basis: input.basis,
      version: 1,
      registeredBy: "权属登记员-赵敏",
      createdAt: MOCK_NOW,
      updatedAt: MOCK_NOW,
    }));
    const newApprovals: OwnershipApproval[] = newRights.map((right) => ({
      id: uid("oa"),
      rightId: right.id,
      assetId: right.assetId,
      assetName: right.assetName,
      applicant: right.registeredBy,
      applicantKind: "登记",
      rightType: right.rightType,
      holder: right.holder,
      status: "待确认",
      submittedAt: MOCK_NOW,
    }));

    update((current) => ({
      ...current,
      ownership: {
        ...current.ownership,
        rights: [...newRights, ...current.ownership.rights],
        approvals: [...newApprovals, ...current.ownership.approvals],
      },
    }));

    setCreateOpen(false);
    if (conflicts.length > 0) {
      showToast("success", `已提交 ${toCreate.length} 项权属登记（${conflicts.length} 项存在重复已跳过：${conflicts.join("、")}）`);
    } else {
      showToast("success", `${toCreate.length} 项权属登记已提交，等待对应权属主体确认`);
    }
  };

  const approve = (approval: OwnershipApproval, pass: boolean, opinion: string) => {
    update((current) => ({
      ...current,
      ownership: {
        ...current.ownership,
        rights: current.ownership.rights.map((right) =>
          right.id === approval.rightId
            ? {
                ...right,
                status: pass ? "confirmed" : "pending",
                confirmedBy: pass ? "数据中心-王芳" : undefined,
                updatedAt: MOCK_NOW,
              }
            : right,
        ),
        approvals: current.ownership.approvals.map((item) =>
          item.id === approval.id
            ? {
                ...item,
                status: pass ? "已通过" : "已驳回",
                processedBy: pass ? "数据中心-王芳" : "数据中心-王芳",
                processedAt: MOCK_NOW,
                opinion,
              }
            : item,
        ),
      },
    }));
    showToast(pass ? "success" : "error", pass ? "权属已确认生效" : "权属登记已驳回");
  };

  const submitChange = (rightId: string, input: { dataScope: string; purpose: string; effectiveTo: string; reason: string }) => {
    const current = allRights.find((right) => right.id === rightId);
    if (!current || !input.reason.trim()) return;
    if (input.effectiveTo && current.effectiveFrom >= input.effectiveTo) {
      showToast("error", "有效期结束时间必须晚于开始时间");
      return;
    }
    update((next) => {
      const before: Partial<OwnershipRight> = { dataScope: current.dataScope, purpose: current.purpose, effectiveTo: current.effectiveTo };
      const after: Partial<OwnershipRight> = {
        dataScope: input.dataScope,
        purpose: input.purpose,
        effectiveTo: input.effectiveTo,
      };
      const version = current.version + 1;
      return {
        ...next,
        ownership: {
          ...next.ownership,
          rights: next.ownership.rights.map((right) =>
            right.id === rightId
              ? {
                  ...right,
                  dataScope: input.dataScope,
                  purpose: input.purpose,
                  effectiveTo: input.effectiveTo,
                  version,
                  updatedAt: MOCK_NOW,
                }
              : right,
          ),
          ownershipVersions: [
            {
              id: uid("ov"),
              rightId,
              assetId: current.assetId,
              assetName: current.assetName,
              version,
              changedAt: MOCK_NOW,
              changedBy: "权属登记员-赵敏",
              reason: input.reason,
              before,
              after,
              status: "已生效",
              approvedBy: "数据中心-王芳",
            },
            ...next.ownership.ownershipVersions,
          ],
          approvals: [
            {
              id: uid("oa"),
              rightId,
              assetId: current.assetId,
              assetName: current.assetName,
              applicant: "权属登记员-赵敏",
              applicantKind: "变更",
              rightType: current.rightType,
              holder: current.holder,
              status: "已通过",
              submittedAt: MOCK_NOW,
              processedBy: "数据中心-王芳",
              processedAt: MOCK_NOW,
              opinion: input.reason,
            },
            ...next.ownership.approvals,
          ],
        },
      };
    });
    setChangeRight(null);
    showToast("success", "权属变更已生效，已生成新的权属版本");
  };

  const revoke = (right: OwnershipRight) => {
    if (!revokeReason.trim()) return;
    update((current) => {
      const next = pauseProductsByRights(
        {
          ...current,
          ownership: {
            ...current.ownership,
            rights: current.ownership.rights.map((item) =>
              item.id === right.id ? { ...item, status: "invalid", updatedAt: MOCK_NOW } : item,
            ),
            ownershipVersions: [
              {
                id: uid("ov"),
                rightId: right.id,
                assetId: right.assetId,
                assetName: right.assetName,
                version: right.version + 1,
                changedAt: MOCK_NOW,
                changedBy: "权属登记员-赵敏",
                reason: revokeReason,
                before: { status: "confirmed", effectiveTo: right.effectiveTo },
                after: { status: "invalid" },
                status: "已生效",
                approvedBy: "数据中心-王芳",
              },
              ...current.ownership.ownershipVersions,
            ],
            approvals: [
              {
                id: uid("oa"),
                rightId: right.id,
                assetId: right.assetId,
                assetName: right.assetName,
                applicant: "权属登记员-赵敏",
                applicantKind: "撤销",
                rightType: right.rightType,
                holder: right.holder,
                status: "已通过",
                submittedAt: MOCK_NOW,
                processedBy: "数据中心-王芳",
                processedAt: MOCK_NOW,
                opinion: revokeReason,
              },
              ...current.ownership.approvals,
            ],
          },
        },
        [right.id],
        `权属撤销：${right.holder} 的${right.rightType}（${revokeReason}）`,
      );
      return next;
    });
    setRevokeRight(null);
    setRevokeReason("");
    showToast("success", "权属已失效，覆盖的数据产品已立即暂停");
  };

  const assets = state.catalog.assets.filter((asset) => !asset.voided && asset.catalogStatus !== "retired" && asset.catalogStatus !== "archived");

  const versions = useMemo(() => {
    let list = [...state.ownership.ownershipVersions].sort((a, b) => (a.changedAt < b.changedAt ? 1 : -1));
    if (versionAssetFilter !== "all") {
      list = list.filter((v) => v.assetName === versionAssetFilter);
    }
    if (versionDateFrom) {
      list = list.filter((v) => v.changedAt >= `${versionDateFrom} 00:00:00`);
    }
    if (versionDateTo) {
      list = list.filter((v) => v.changedAt <= `${versionDateTo} 23:59:59`);
    }
    return list;
  }, [state.ownership.ownershipVersions, versionAssetFilter, versionDateFrom, versionDateTo]);

  const rightVersionsMap = useMemo(() => {
    const map = new Map<string, OwnershipVersion[]>();
    for (const v of state.ownership.ownershipVersions) {
      const list = map.get(v.rightId) ?? [];
      list.push(v);
      map.set(v.rightId, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => b.version - a.version);
    }
    return map;
  }, [state.ownership.ownershipVersions]);

  const timelineVersions = timelineRight ? (rightVersionsMap.get(timelineRight.id) ?? []) : [];

  return (
    <div className="page-shell animate-fade-in">
      <div className="space-y-4">
        <PageHeader
          title="权属登记"
          description="记录数据持有权、使用权与经营权及其主体、范围和有效期；采用「登记人提交 → 对应权属主体确认」固定流程"
          actions={<PrimaryButton icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setCreateOpen(true)}>新建权属登记</PrimaryButton>}
        />

        {meta.error && <WarnNote text={`SQLite 状态读写异常：${meta.error.message}`} />}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard label="权属关系总数" value={allRights.length} icon={Handshake} color="text-primary" bg="bg-primary/10" />
          <KpiCard label="已确权" value={allRights.filter((right) => right.status === "confirmed").length} icon={CheckCircle2} color="text-emerald-600" bg="bg-emerald-50" />
          <KpiCard label="待确认" value={allRights.filter((right) => right.status === "pending").length} icon={ClipboardCheck} color="text-blue-600" bg="bg-blue-50" />
          <KpiCard label="30 天内到期" value={upcoming} hint="到期前 30、7、1 天提醒" icon={AlertTriangle} color="text-amber-600" bg="bg-amber-50" />
        </section>

        <SectionCard>
          <TabBar
            tabs={[
              { key: "rights", label: "权属关系", count: allRights.length },
              { key: "approvals", label: "变更审批", count: pendingApprovals.length },
              { key: "versions", label: "权属版本", count: versions.length },
            ]}
            active={tab}
            onChange={setTab}
          />
          {tab === "rights" && (
            <div>
              <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-2.5">
                <div className="flex items-center gap-1.5 rounded-md border border-input bg-transparent px-2 h-7 min-w-[240px]">
                  <Search className="h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    value={rightSearch}
                    onChange={(e) => setRightSearch(e.target.value)}
                    placeholder="搜索资产、主体、数据范围或用途"
                    className="h-6 w-full bg-transparent text-[12px] text-foreground outline-none placeholder:text-muted-foreground"
                  />
                </div>
                <Select value={rightTypeFilter} onChange={setRightTypeFilter} options={[{ value: "all", label: "全部权利类型" }, ...Object.entries(RIGHT_TYPE_TONE).map(([k]) => ({ value: k, label: k }))]} className="w-[120px]" />
                <Select
                  value={rightStatusFilter}
                  onChange={setRightStatusFilter}
                  options={[
                    { value: "all", label: "全部状态" },
                    { value: "confirmed", label: "已确权" },
                    { value: "pending", label: "待确认" },
                    { value: "invalid", label: "已失效" },
                  ]}
                  className="w-[110px]"
                />
                <span className="ml-auto text-[11px] text-muted-foreground">共 {rights.length} 条 / 总数 {allRights.length}</span>
              </div>
              <div className="overflow-x-auto px-5 py-3">
                <table className="w-full min-w-[1080px] border-separate border-spacing-0 text-left">
                  <thead>
                    <tr className="text-[12px] font-medium text-slate-600">
                      {["资产", "主体", "权利类型", "数据范围", "用途", "有效期", "状态", "版本", "操作"].map((label) => <th key={label} className="border-b border-border py-3 pr-4">{label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {rights.map((right) => {
                      const versionCount = rightVersionsMap.get(right.id)?.length ?? 0;
                      return (
                        <tr key={right.id} className="text-[13px] text-foreground">
                          <td className="border-b border-border py-3.5 pr-4"><div className="font-medium">{right.assetName}</div><div className="mt-0.5 font-mono text-[11px] text-muted-foreground">{right.assetId}</div></td>
                          <td className="border-b border-border py-3.5 pr-4">
                            <div>{right.holder}</div>
                            <div className="mt-0.5 text-[11px] text-muted-foreground">{right.holderKind}</div>
                          </td>
                          <td className="border-b border-border py-3.5 pr-4"><Badge tone={RIGHT_TYPE_TONE[right.rightType]}>{right.rightType}</Badge></td>
                          <td className="border-b border-border py-3.5 pr-4 max-w-[180px] text-[12px] text-muted-foreground">{right.dataScope}</td>
                          <td className="border-b border-border py-3.5 pr-4 text-[12px] text-muted-foreground">{right.purpose}</td>
                          <td className="border-b border-border py-3.5 pr-4"><ExpiryBadge right={right} /><div className="mt-1 text-[11px] text-muted-foreground">{right.effectiveFrom} ~ {right.effectiveTo}</div></td>
                          <td className="border-b border-border py-3.5 pr-4"><Badge tone={right.status === "confirmed" ? "green" : right.status === "pending" ? "amber" : "red"}>{RIGHT_STATUS_LABEL[right.status]}</Badge></td>
                          <td className="border-b border-border py-3.5 pr-4">
                            <button
                              type="button"
                              onClick={() => setTimelineRight(right)}
                              className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-1.5 py-0.5 font-mono text-[11px] text-blue-700 hover:bg-blue-100"
                              title={`查看版本历史（${versionCount} 条版本记录）`}
                            >
                              <History className="h-3 w-3" />
                              v{right.version}
                              {versionCount > 0 && <span className="text-blue-500">({versionCount})</span>}
                            </button>
                          </td>
                          <td className="border-b border-border py-3.5">
                            <div className="flex items-center gap-1">
                              <button type="button" onClick={() => setChangeRight(right)} className="inline-flex h-7 items-center gap-1 rounded-md border border-input px-2 text-[11px] text-foreground hover:border-primary/30 hover:text-primary"><PenLine className="h-3 w-3" />变更</button>
                              <button type="button" onClick={() => setTimelineRight(right)} className="inline-flex h-7 items-center gap-1 rounded-md border border-input px-2 text-[11px] text-foreground hover:border-primary/30 hover:text-primary"><Eye className="h-3 w-3" />历史</button>
                              {right.status !== "invalid" && (
                                <button type="button" onClick={() => setRevokeRight(right)} className="inline-flex h-7 items-center gap-1 rounded-md border border-red-200 px-2 text-[11px] text-red-600 hover:bg-red-50"><ShieldX className="h-3 w-3" />撤销</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {rights.length === 0 && <EmptyState title="暂无权属关系" description={rightSearch || rightTypeFilter !== "all" || rightStatusFilter !== "all" ? "当前筛选条件下无匹配记录" : "新建权属登记后，由对应权属主体确认生效"} />}
              </div>
            </div>
          )}
          {tab === "approvals" && (
            <div className="space-y-3 px-5 py-4">
              {state.ownership.approvals.length === 0 ? (
                <EmptyState title="暂无审批记录" />
              ) : (
                state.ownership.approvals.map((approval) => (
                  <div key={approval.id} className="rounded-md border border-border p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={approval.applicantKind === "登记" ? "blue" : approval.applicantKind === "变更" ? "violet" : "red"}>{approval.applicantKind}</Badge>
                      <span className="text-[13px] font-medium text-foreground">{approval.assetName} · {approval.rightType} · {approval.holder}</span>
                      <Badge tone={approval.status === "已通过" ? "green" : approval.status === "待确认" ? "amber" : "red"}>{OWNERSHIP_APPROVAL_STATUS_LABEL[approval.status]}</Badge>
                      <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">提交：{approval.submittedAt} · {approval.applicant}</span>
                    </div>
                    {approval.processedBy && <div className="mt-2 text-[11px] text-muted-foreground">处理人：{approval.processedBy} · {approval.processedAt}{approval.opinion ? ` · 意见：${approval.opinion}` : ""}</div>}
                    {approval.status === "待确认" && (
                      <div className="mt-3 flex items-center gap-2">
                        <PrimaryButton onClick={() => approve(approval, true, "权属主体确认通过")} className="h-7 px-2.5">确认通过</PrimaryButton>
                        <SecondaryButton onClick={() => approve(approval, false, "登记信息需补充，驳回")} className="h-7 px-2.5 text-red-600 hover:border-red-200 hover:text-red-600">驳回</SecondaryButton>
                        <span className="text-[11px] text-muted-foreground">由对应权属主体确认，登记提交人不得确认自己的登记</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
          {tab === "versions" && (
            <div>
              <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-2.5">
                <Select value={versionAssetFilter} onChange={setVersionAssetFilter} options={[{ value: "all", label: "全部资产" }, ...allAssetsWithRights.map((name) => ({ value: name, label: name }))]} className="w-[180px]" />
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <Input type="date" value={versionDateFrom} onChange={setVersionDateFrom} className="h-7 w-[130px]" />
                  <span>至</span>
                  <Input type="date" value={versionDateTo} onChange={setVersionDateTo} className="h-7 w-[130px]" />
                </div>
                {(versionAssetFilter !== "all" || versionDateFrom || versionDateTo) && (
                  <button
                    type="button"
                    onClick={() => { setVersionAssetFilter("all"); setVersionDateFrom(""); setVersionDateTo(""); }}
                    className="text-[11px] text-primary hover:underline"
                  >
                    清除筛选
                  </button>
                )}
                <span className="ml-auto text-[11px] text-muted-foreground">共 {versions.length} 条版本记录</span>
              </div>
              <div className="overflow-x-auto px-5 py-3">
                <table className="w-full min-w-[1100px] border-separate border-spacing-0 text-left">
                  <thead>
                    <tr className="text-[12px] font-medium text-slate-600">
                      {["权属版本", "变更详情", "变更原因", "状态", "时间与操作人"].map((label) => <th key={label} className="border-b border-border py-3 pr-4">{label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {versions.map((version) => (
                      <tr key={version.id} className="align-top text-[13px] text-foreground">
                        <td className="border-b border-border py-3.5 pr-4">
                          <div className="font-medium">{version.assetName}</div>
                          <div className="mt-0.5 flex items-center gap-1.5">
                            <span className="font-mono text-[11px] text-muted-foreground">{version.rightId}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const right = allRights.find((r) => r.id === version.rightId);
                                if (right) setTimelineRight(right);
                              }}
                              className="inline-flex items-center gap-0.5 rounded bg-blue-50 px-1 py-0.5 font-mono text-[10px] text-blue-700 hover:bg-blue-100"
                            >
                              <History className="h-2.5 w-2.5" />v{version.version}
                            </button>
                          </div>
                        </td>
                        <td className="border-b border-border py-3.5 pr-4 max-w-[320px]">
                          <VersionDiff version={version} />
                        </td>
                        <td className="border-b border-border py-3.5 pr-4 text-[12px] text-muted-foreground max-w-[180px]">{version.reason}</td>
                        <td className="border-b border-border py-3.5 pr-4"><Badge tone={version.status === "已生效" ? "green" : version.status === "待确认" ? "amber" : "red"}>{version.status}</Badge></td>
                        <td className="border-b border-border py-3.5 text-[11px] tabular-nums text-muted-foreground">
                          {version.changedAt}
                          <div className="mt-0.5">{version.changedBy}{version.approvedBy ? ` → ${version.approvedBy}` : ""}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {versions.length === 0 && <EmptyState title="暂无权属版本记录" description="变更或撤销权属关系时将自动生成版本记录" />}
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      {createOpen && (
        <CreateRightModal
          assets={assets}
          onClose={() => setCreateOpen(false)}
          onSubmit={submitCreate}
        />
      )}

      {changeRight && (
        <ChangeRightModal
          right={changeRight}
          onClose={() => setChangeRight(null)}
          onSubmit={(input) => submitChange(changeRight.id, input)}
        />
      )}

      {revokeRight && (
        <Modal
          title="撤销权属"
          description={`撤销将生成新的权属版本并保留原记录；持有权或经营权撤销后，系统立即暂停其覆盖的数据产品。目标：${revokeRight.holder} 的${revokeRight.rightType}（${revokeRight.assetName}）`}
          onClose={() => { setRevokeRight(null); setRevokeReason(""); }}
          footer={
            <>
              <SecondaryButton onClick={() => { setRevokeRight(null); setRevokeReason(""); }}>取消</SecondaryButton>
              <PrimaryButton onClick={() => revoke(revokeRight)} disabled={!revokeReason.trim()} className="bg-red-600 hover:opacity-90">确认撤销</PrimaryButton>
            </>
          }
        >
          <Field label="撤销原因" required>
            <Input value={revokeReason} onChange={setRevokeReason} placeholder="例如：合作终止，撤销华东区域经营权" />
          </Field>
        </Modal>
      )}

      {timelineRight && (
        <VersionTimelineModal
          right={timelineRight}
          versions={timelineVersions}
          onClose={() => setTimelineRight(null)}
        />
      )}
    </div>
  );
}

function CreateRightModal({
  assets,
  onClose,
  onSubmit,
}: {
  assets: Asset[];
  onClose: () => void;
  onSubmit: (input: {
    assets: Asset[]; holder: string; holderKind: "内部部门" | "外部机构";
    rightType: RightType; dataScope: string; purpose: string; effectiveFrom: string; effectiveTo: string; basis: string;
  }) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [holder, setHolder] = useState("");
  const [holderKind, setHolderKind] = useState<"内部部门" | "外部机构">("内部部门");
  const [rightType, setRightType] = useState<RightType>("使用权");
  const [dataScope, setDataScope] = useState("");
  const [purpose, setPurpose] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("2026-08-13");
  const [effectiveTo, setEffectiveTo] = useState("2027-08-12");
  const [basis, setBasis] = useState("");
  const [assetQuery, setAssetQuery] = useState("");
  const [assetTypeFilter, setAssetTypeFilter] = useState<string>("all");
  const [assetStatusFilter, setAssetStatusFilter] = useState<string>("all");

  const toggleAsset = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedAssets = assets.filter((a) => selectedIds.has(a.id));

  const filteredAssets = useMemo(() => {
    const q = assetQuery.trim().toLowerCase();
    return assets.filter((a) => {
      if (assetTypeFilter !== "all" && a.type !== assetTypeFilter) return false;
      if (assetStatusFilter !== "all" && a.catalogStatus !== assetStatusFilter) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        a.businessDomain.toLowerCase().includes(q) ||
        a.owner.toLowerCase().includes(q) ||
        a.sourceSystem.toLowerCase().includes(q)
      );
    });
  }, [assets, assetQuery, assetTypeFilter, assetStatusFilter]);

  if (assets.length === 0) {
    return (
      <Modal title="新建权属登记" description="需要先在「数据资产 → 资产目录」中添加或扫描数据资产" onClose={onClose}>
        <EmptyState title="暂无可登记的数据资产" description="请先在资产目录中扫描或人工添加资产后，再进行权属登记。" />
        <div className="mt-4 flex justify-end">
          <SecondaryButton onClick={onClose}>关闭</SecondaryButton>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title="新建权属登记"
      description="支持批量选择多个数据资产，为同一主体登记相同权利类型与范围"
      onClose={onClose}
      footer={
        <>
          <SecondaryButton onClick={onClose}>取消</SecondaryButton>
          <PrimaryButton
            onClick={() => onSubmit({ assets: selectedAssets, holder, holderKind, rightType, dataScope, purpose, effectiveFrom, effectiveTo, basis })}
            disabled={selectedIds.size === 0}
          >
            提交登记（{selectedIds.size}）
          </PrimaryButton>
        </>
      }
    >
      <Field label="关联资产" required hint={`共 ${assets.length} 项可登记资产，已选 ${selectedIds.size} 项`}>
        <div className="rounded-md border border-input">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={assetQuery}
              onChange={(e) => setAssetQuery(e.target.value)}
              placeholder="搜索资产名称、业务域、负责人或来源系统"
              className="h-7 flex-1 bg-transparent text-[12px] text-foreground outline-none placeholder:text-muted-foreground"
            />
            <Select value={assetTypeFilter} onChange={setAssetTypeFilter} options={[{ value: "all", label: "全部类型" }, ...Object.entries(ASSET_TYPE_LABEL).map(([k, v]) => ({ value: k, label: v }))]} className="w-[100px]" />
            <Select value={assetStatusFilter} onChange={setAssetStatusFilter} options={[{ value: "all", label: "全部状态" }, ...Object.entries(CATALOG_STATUS_LABEL).map(([k, v]) => ({ value: k, label: v }))]} className="w-[110px]" />
          </div>
          <div className="max-h-[220px] overflow-y-auto">
            {filteredAssets.length === 0 ? (
              <div className="px-3 py-6 text-center text-[12px] text-muted-foreground">无匹配资产</div>
            ) : (
              filteredAssets.map((a) => {
                const selected = selectedIds.has(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => toggleAsset(a.id)}
                    className={`flex w-full items-start gap-2 border-b border-border px-3 py-2.5 text-left transition-colors last:border-b-0 ${selected ? "bg-blue-50" : "hover:bg-surface-raised"}`}
                  >
                    <div className={`mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${selected ? "border-primary bg-primary" : "border-input"}`}>
                      {selected && <CheckCircle2 className="h-3 w-3 text-white" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-[13px] font-medium text-foreground">{a.name}</span>
                        <Badge tone="slate">{ASSET_TYPE_LABEL[a.type]}</Badge>
                        <Badge tone={a.catalogStatus === "normal" ? "green" : a.catalogStatus === "sourceAbnormal" ? "red" : a.catalogStatus === "retiring" ? "amber" : "slate"}>
                          {CATALOG_STATUS_LABEL[a.catalogStatus]}
                        </Badge>
                        <Badge tone="violet">{a.securityLevel}</Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
                        <span>业务域：{a.businessDomain}</span>
                        <span>来源：{a.sourceSystem}</span>
                        <span>负责人：{a.owner}</span>
                        <span>v{a.version}</span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </Field>

      {selectedIds.size > 0 && (
        <div className="mt-3 rounded-md border border-border bg-surface-raised p-3">
          <div className="flex items-center justify-between">
            <div className="text-[12px] font-medium text-foreground">已选资产（{selectedIds.size}）</div>
            <button type="button" onClick={() => setSelectedIds(new Set())} className="text-[11px] text-muted-foreground hover:text-primary">清空</button>
          </div>
          <div className="mt-2 max-h-[140px] space-y-1.5 overflow-y-auto pr-1">
            {selectedAssets.map((asset) => (
              <div key={asset.id} className="flex items-center gap-2 rounded border border-border bg-card px-2.5 py-1.5">
                <span className="min-w-0 flex-1 truncate text-[12px] text-foreground">{asset.name}</span>
                <Badge tone="slate">{ASSET_TYPE_LABEL[asset.type]}</Badge>
                <button type="button" onClick={() => toggleAsset(asset.id)} className="grid h-5 w-5 place-items-center rounded text-muted-foreground hover:bg-slate-200 hover:text-red-600">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="权属主体" required hint={holderKind === "外部机构" ? "对外使用将联动安全审批" : "内部部门主体"}>
          <div className="flex gap-2">
            <Input value={holder} onChange={setHolder} placeholder="主体名称" className="flex-1" />
            <Select value={holderKind} onChange={(value) => setHolderKind(value as "内部部门" | "外部机构")} options={[{ value: "内部部门", label: "内部部门" }, { value: "外部机构", label: "外部机构" }]} className="w-[110px]" />
          </div>
        </Field>
        <Field label="权利类型" required>
          <Select value={rightType} onChange={(value) => setRightType(value as RightType)} options={[{ value: "持有权", label: "持有权" }, { value: "使用权", label: "使用权" }, { value: "经营权", label: "经营权" }]} className="w-full" />
        </Field>
        <Field label="数据范围" required>
          <Input value={dataScope} onChange={setDataScope} placeholder="例如：华东区域经营数据" />
        </Field>
        <Field label="用途" required>
          <Input value={purpose} onChange={setPurpose} placeholder="例如：区域联合经营" />
        </Field>
        <Field label="有效期（起 / 止）" required>
          <div className="flex items-center gap-2">
            <Input type="date" value={effectiveFrom} onChange={setEffectiveFrom} className="flex-1" />
            <span className="text-muted-foreground">~</span>
            <Input type="date" value={effectiveTo} onChange={setEffectiveTo} className="flex-1" />
          </div>
        </Field>
        <Field label="登记依据" required hint="到期前 30、7、1 天将生成提醒">
          <Input value={basis} onChange={setBasis} placeholder="登记依据 / 协议编号" />
        </Field>
      </div>
      <div className="mt-4 rounded-md border border-border bg-surface-raised p-3 text-[11px] leading-relaxed text-muted-foreground">
        权属登记仅校验必填项、开始时间早于结束时间，以及同一主体/权利类型/数据范围/有效期的明显重复；其他权属判断（如冲突）由权属确认人在审批时负责。本期不实现独占权、上下级权利链或自动冲突推断。
      </div>
    </Modal>
  );
}

function ChangeRightModal({
  right,
  onClose,
  onSubmit,
}: {
  right: OwnershipRight;
  onClose: () => void;
  onSubmit: (input: { dataScope: string; purpose: string; effectiveTo: string; reason: string }) => void;
}) {
  const [dataScope, setDataScope] = useState(right.dataScope);
  const [purpose, setPurpose] = useState(right.purpose);
  const [effectiveTo, setEffectiveTo] = useState(right.effectiveTo);
  const [reason, setReason] = useState("");

  return (
    <Modal
      title={`变更权属 · ${right.assetName}`}
      description={`主体：${right.holder} · ${right.rightType} · 当前 v${right.version}；变更将保留变更前后内容并生成新的权属版本`}
      onClose={onClose}
      footer={
        <>
          <SecondaryButton onClick={onClose}>取消</SecondaryButton>
          <PrimaryButton onClick={() => onSubmit({ dataScope, purpose, effectiveTo, reason })} disabled={!reason.trim()}>提交变更</PrimaryButton>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="数据范围" required>
          <Input value={dataScope} onChange={setDataScope} />
        </Field>
        <Field label="用途" required>
          <Input value={purpose} onChange={setPurpose} />
        </Field>
        <Field label="有效期至" required>
          <Input type="date" value={effectiveTo} onChange={setEffectiveTo} />
        </Field>
        <Field label="变更原因" required>
          <Input value={reason} onChange={setReason} placeholder="例如：数据范围调整、续期" />
        </Field>
      </div>
    </Modal>
  );
}
