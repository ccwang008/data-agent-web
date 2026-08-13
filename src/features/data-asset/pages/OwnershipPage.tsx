import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Handshake, PenLine, Plus, ShieldX } from "lucide-react";

import { useDataAssetState } from "../store";
import {
  MOCK_NOW,
  OWNERSHIP_APPROVAL_STATUS_LABEL,
  RIGHT_STATUS_LABEL,
  daysUntil,
  isExpired,
  uid,
  type OwnershipApproval,
  type OwnershipRight,
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

  const rights = state.ownership.rights;
  const pendingApprovals = state.ownership.approvals.filter((approval) => approval.status === "待确认");

  const upcoming = rights.filter((right) => right.status === "confirmed" && !isExpired(right.effectiveTo) && daysUntil(right.effectiveTo) <= 30).length;

  const submitCreate = (input: {
    assetId: string; assetName: string; holder: string; holderKind: "内部部门" | "外部机构";
    rightType: RightType; dataScope: string; purpose: string; effectiveFrom: string; effectiveTo: string; basis: string;
  }) => {
    // 必填校验
    if (!input.assetId || !input.holder || !input.dataScope || !input.purpose || !input.effectiveFrom || !input.effectiveTo || !input.basis) {
      showToast("error", "必填项未完整，请检查表单");
      return;
    }
    // 起止日期校验
    if (input.effectiveFrom >= input.effectiveTo) {
      showToast("error", "开始时间必须早于结束时间");
      return;
    }
    // 明显重复校验：同一资产下主体、权利类型、数据范围和有效期均相同
    const duplicate = rights.some(
      (right) =>
        right.assetId === input.assetId &&
        right.holder === input.holder &&
        right.rightType === input.rightType &&
        right.dataScope === input.dataScope &&
        right.effectiveFrom === input.effectiveFrom &&
        right.effectiveTo === input.effectiveTo,
    );
    if (duplicate) {
      showToast("error", "同一资产下存在主体、权利类型、数据范围与有效期均相同的明显重复记录");
      return;
    }

    const right: OwnershipRight = {
      id: uid("right"),
      assetId: input.assetId,
      assetName: input.assetName,
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
    };
    const approval: OwnershipApproval = {
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
    };
    update((current) => ({
      ...current,
      ownership: {
        ...current.ownership,
        rights: [right, ...current.ownership.rights],
        approvals: [approval, ...current.ownership.approvals],
      },
    }));
    setCreateOpen(false);
    showToast("success", "权属登记已提交，等待对应权属主体确认");
  };

  const approve = (approval: OwnershipApproval, pass: boolean, opinion: string) => {
    // 权属确认人代表持有、使用或经营主体确认；登记提交人不得确认自己提交的登记（职责分离）
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
    const current = state.ownership.rights.find((right) => right.id === rightId);
    if (!current || !input.reason.trim()) return;
    if (input.effectiveTo && current.effectiveFrom >= input.effectiveTo) {
      showToast("error", "有效期结束时间必须晚于开始时间");
      return;
    }
    update((next) => {
      const before = { dataScope: current.dataScope, purpose: current.purpose, effectiveTo: current.effectiveTo };
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
  const versions = useMemo(
    () => [...state.ownership.ownershipVersions].sort((a, b) => (a.changedAt < b.changedAt ? 1 : -1)),
    [state.ownership.ownershipVersions],
  );

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
          <KpiCard label="权属关系总数" value={rights.length} icon={Handshake} color="text-primary" bg="bg-primary/10" />
          <KpiCard label="已确权" value={rights.filter((right) => right.status === "confirmed").length} icon={CheckCircle2} color="text-emerald-600" bg="bg-emerald-50" />
          <KpiCard label="待确认" value={rights.filter((right) => right.status === "pending").length} icon={ClipboardCheck} color="text-blue-600" bg="bg-blue-50" />
          <KpiCard label="30 天内到期" value={upcoming} hint="到期前 30、7、1 天提醒" icon={AlertTriangle} color="text-amber-600" bg="bg-amber-50" />
        </section>

        <SectionCard>
          <TabBar
            tabs={[
              { key: "rights", label: "权属关系", count: rights.length },
              { key: "approvals", label: "变更审批", count: pendingApprovals.length },
              { key: "versions", label: "权属版本", count: versions.length },
            ]}
            active={tab}
            onChange={setTab}
          />
          {tab === "rights" && (
            <div className="overflow-x-auto px-5 py-3">
              <table className="w-full min-w-[1080px] border-separate border-spacing-0 text-left">
                <thead>
                  <tr className="text-[12px] font-medium text-slate-600">
                    {["资产", "主体", "权利类型", "数据范围", "用途", "有效期", "状态", "版本", "操作"].map((label) => <th key={label} className="border-b border-border py-3 pr-4">{label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rights.map((right) => (
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
                      <td className="border-b border-border py-3.5 pr-4"><span className="rounded-md bg-blue-50 px-1.5 py-0.5 font-mono text-[11px] text-blue-700">v{right.version}</span></td>
                      <td className="border-b border-border py-3.5">
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => setChangeRight(right)} className="inline-flex h-7 items-center gap-1 rounded-md border border-input px-2 text-[11px] text-foreground hover:border-primary/30 hover:text-primary"><PenLine className="h-3 w-3" />变更</button>
                          {right.status !== "invalid" && (
                            <button type="button" onClick={() => setRevokeRight(right)} className="inline-flex h-7 items-center gap-1 rounded-md border border-red-200 px-2 text-[11px] text-red-600 hover:bg-red-50"><ShieldX className="h-3 w-3" />撤销</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rights.length === 0 && <EmptyState title="暂无权属关系" description="新建权属登记后，由对应权属主体确认生效" />}
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
            <div className="overflow-x-auto px-5 py-4">
              <table className="w-full min-w-[1000px] border-separate border-spacing-0 text-left">
                <thead>
                  <tr className="text-[12px] font-medium text-slate-600">
                    {["权属版本", "变更内容", "变更原因", "状态", "时间"].map((label) => <th key={label} className="border-b border-border py-3 pr-4">{label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {versions.map((version) => (
                    <tr key={version.id} className="align-top text-[13px] text-foreground">
                      <td className="border-b border-border py-3.5 pr-4">
                        <div className="font-medium">{version.assetName}</div>
                        <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">{version.rightId} · v{version.version}</div>
                      </td>
                      <td className="border-b border-border py-3.5 pr-4">
                        <div className="text-[12px] text-muted-foreground">
                          变更前：{JSON.stringify(version.before)}
                        </div>
                        <div className="mt-1 text-[12px] font-medium text-foreground">
                          变更后：{JSON.stringify(version.after)}
                        </div>
                      </td>
                      <td className="border-b border-border py-3.5 pr-4 text-[12px] text-muted-foreground">{version.reason}</td>
                      <td className="border-b border-border py-3.5 pr-4"><Badge tone={version.status === "已生效" ? "green" : version.status === "待确认" ? "amber" : "red"}>{version.status}</Badge></td>
                      <td className="border-b border-border py-3.5 text-[11px] tabular-nums text-muted-foreground">{version.changedAt}<div className="mt-0.5">{version.changedBy}{version.approvedBy ? ` → ${version.approvedBy}` : ""}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
    </div>
  );
}

function CreateRightModal({
  assets,
  onClose,
  onSubmit,
}: {
  assets: { id: string; name: string; businessDomain: string }[];
  onClose: () => void;
  onSubmit: (input: {
    assetId: string; assetName: string; holder: string; holderKind: "内部部门" | "外部机构";
    rightType: RightType; dataScope: string; purpose: string; effectiveFrom: string; effectiveTo: string; basis: string;
  }) => void;
}) {
  const [assetId, setAssetId] = useState(assets[0]?.id ?? "");
  const [holder, setHolder] = useState("");
  const [holderKind, setHolderKind] = useState<"内部部门" | "外部机构">("内部部门");
  const [rightType, setRightType] = useState<RightType>("使用权");
  const [dataScope, setDataScope] = useState("");
  const [purpose, setPurpose] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("2026-08-13");
  const [effectiveTo, setEffectiveTo] = useState("2027-08-12");
  const [basis, setBasis] = useState("");

  const asset = assets.find((item) => item.id === assetId);

  return (
    <Modal
      title="新建权属登记"
      description="一个资产可同时登记多个持有、使用和经营主体；登记后由对应权属主体确认生效"
      onClose={onClose}
      footer={
        <>
          <SecondaryButton onClick={onClose}>取消</SecondaryButton>
          <PrimaryButton
            onClick={() => onSubmit({ assetId, assetName: asset?.name ?? "", holder, holderKind, rightType, dataScope, purpose, effectiveFrom, effectiveTo, basis })}
          >
            提交登记
          </PrimaryButton>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="关联资产" required>
          <Select value={assetId} onChange={setAssetId} options={assets.map((item) => ({ value: item.id, label: `${item.name}（${item.businessDomain}）` }))} className="w-full" />
        </Field>
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
