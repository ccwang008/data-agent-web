/** Data Asset · 资产运营页子组件：产品配置、发布门槛、发布审批、使用授权、API 模拟调用。 */

import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

import { useDataAssetState } from "../store";
import {
  MOCK_NOW,
  PURPOSE_OPTIONS,
  uid,
  type Authorization,
  type DataProduct,
  type ProductApproval,
  type ProductDelivery,
} from "../api/types";
import {
  Field,
  Input,
  Modal,
  PrimaryButton,
  SecondaryButton,
  Select,
  TextArea,
} from "../components/common";

function effectiveRightsFor(state: ReturnType<typeof useDataAssetState>["state"], assetId: string) {
  return state.ownership.rights.filter((right) => right.assetId === assetId && right.status === "confirmed");
}

// ---------------------------------------------------------------- 产品配置

export function ProductModal({
  product,
  onClose,
  onSubmit,
}: {
  product?: DataProduct;
  onClose: () => void;
  onSubmit: (product: DataProduct) => void;
}) {
  const { state } = useDataAssetState();
  const isEdit = Boolean(product);
  const [name, setName] = useState(product?.name ?? "");
  const [delivery, setDelivery] = useState<ProductDelivery>(product?.delivery ?? "API");
  const [description, setDescription] = useState(product?.description ?? "");
  const [targetUsers, setTargetUsers] = useState(product?.targetUsers ?? "");
  const [assetIds, setAssetIds] = useState<string[]>(product?.assets.map((ref) => ref.assetId) ?? []);
  const [path, setPath] = useState(product?.apiConfig?.path ?? "/v1/query");
  const [method, setMethod] = useState(product?.apiConfig?.method ?? "POST");
  const [quota, setQuota] = useState(String(product?.apiConfig?.quotaPerDay ?? 10000));
  const [fields, setFields] = useState<string[]>(product?.apiConfig?.fields ?? []);
  const [fileFormat, setFileFormat] = useState(product?.downloadConfig?.fileFormat ?? "Excel");
  const [maxDownloads, setMaxDownloads] = useState(String(product?.downloadConfig?.maxDownloads ?? 5));
  const [validHours, setValidHours] = useState(String(product?.downloadConfig?.validHours ?? 48));
  const [masking, setMasking] = useState(product?.downloadConfig?.masking ?? "敏感字段脱敏");

  const eligibleAssets = state.catalog.assets.filter((asset) => !asset.voided && effectiveRightsFor(state, asset.id).length > 0);

  const toggleAsset = (assetId: string) => {
    setAssetIds((current) => (current.includes(assetId) ? current.filter((id) => id !== assetId) : [...current, assetId]));
  };

  const toggleField = (field: string) => {
    setFields((current) => (current.includes(field) ? current.filter((item) => item !== field) : [...current, field]));
  };

  const save = () => {
    if (!name.trim() || assetIds.length === 0) return;
    const now = MOCK_NOW;
    const next: DataProduct = {
      id: product?.id ?? uid("p"),
      name: name.trim(),
      delivery,
      serviceVersion: product?.serviceVersion ?? 1,
      description,
      targetUsers,
      assets: assetIds.map((assetId) => {
        const asset = state.catalog.assets.find((item) => item.id === assetId);
        const right = effectiveRightsFor(state, assetId)[0];
        return {
          assetId,
          assetVersion: asset?.version ?? 1,
          usageScope: "产品发布范围",
          rightId: right?.id ?? "",
          purpose: "数据产品交付",
        };
      }),
      status: "草稿",
      gate: undefined,
      apiConfig: delivery === "API" ? { path, method, quotaPerDay: Number(quota), fields } : undefined,
      downloadConfig: delivery === "下载" ? { fileFormat, maxDownloads: Number(maxDownloads), validHours: Number(validHours), masking, dataRange: "全国" } : undefined,
      operator: "运营人员-何运营",
      owner: assetIds[0] ? (state.catalog.assets.find((item) => item.id === assetIds[0])?.owner ?? "资产负责人") : "资产负责人",
      createdAt: product?.createdAt ?? now,
      updatedAt: now,
    };
    onSubmit(next);
  };

  return (
    <Modal
      title={isEdit ? `配置产品 · ${product?.name}` : "新建数据产品"}
      description="一个数据产品可组合多个数据资产，每个关联项记录资产 ID、资产版本、使用范围、经营权记录与用途"
      onClose={onClose}
      width="max-w-3xl"
      footer={
        <>
          <SecondaryButton onClick={onClose}>取消</SecondaryButton>
          <PrimaryButton onClick={save} disabled={!name.trim() || assetIds.length === 0}>{isEdit ? "保存配置" : "保存草稿"}</PrimaryButton>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="产品名称" required><Input value={name} onChange={setName} placeholder="例如：企业风险画像 API" /></Field>
        <Field label="交付方式" required hint="对外提供 API 或下载服务">
          <Select value={delivery} onChange={(value) => setDelivery(value as ProductDelivery)} options={[{ value: "API", label: "API 服务" }, { value: "下载", label: "下载服务" }]} className="w-full" />
        </Field>
        <Field label="目标用户"><Input value={targetUsers} onChange={setTargetUsers} placeholder="例如：风控系统、合作机构" /></Field>
        <Field label="服务版本" required hint="已发布版本保存完整关联快照，不动态读取资产最新版本">
          <span className="inline-flex h-8 items-center rounded-md border border-border bg-surface-raised px-3 text-[12px] text-muted-foreground">v{product?.serviceVersion ?? 1}</span>
        </Field>
      </div>
      <div className="mt-4">
        <Field label="关联数据资产" required hint="仅可选择已登记且存在有效权属的资产">
          <div className="flex flex-wrap gap-2">
            {eligibleAssets.map((asset) => (
              <button
                key={asset.id}
                type="button"
                onClick={() => toggleAsset(asset.id)}
                className={assetIds.includes(asset.id) ? "rounded-md border border-primary bg-primary/5 px-2.5 py-1.5 text-[11px] text-primary" : "rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-[11px] text-muted-foreground hover:border-primary/30"}
              >
                {asset.name} · v{asset.version}
              </button>
            ))}
            {eligibleAssets.length === 0 && <span className="text-[11px] text-muted-foreground">暂无已确权资产可关联</span>}
          </div>
        </Field>
      </div>
      <div className="mt-4 rounded-md border border-border bg-surface-raised p-4">
        <div className="mb-2 text-[12px] font-medium text-foreground">服务配置（{delivery}）</div>
        {delivery === "API" ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="路径"><Input value={path} onChange={setPath} /></Field>
            <Field label="方法"><Select value={method} onChange={setMethod} options={[{ value: "POST", label: "POST" }, { value: "GET", label: "GET" }]} className="w-full" /></Field>
            <Field label="每日配额"><Input type="number" value={quota} onChange={setQuota} /></Field>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="文件格式"><Select value={fileFormat} onChange={setFileFormat} options={[{ value: "Excel", label: "Excel" }, { value: "PDF", label: "PDF" }, { value: "CSV", label: "CSV" }]} className="w-full" /></Field>
            <Field label="最大下载次数"><Input type="number" value={maxDownloads} onChange={setMaxDownloads} /></Field>
            <Field label="有效期（小时）"><Input type="number" value={validHours} onChange={setValidHours} /></Field>
          </div>
        )}
        {delivery === "API" && (
          <div className="mt-3">
            <Field label="可授权字段" hint="授权范围可细化为字段、行范围或业务区域">
              <div className="flex flex-wrap gap-2">
                {["customer_id", "name", "risk_level", "province", "mobile", "label_name", "label_value"].map((field) => (
                  <button key={field} type="button" onClick={() => toggleField(field)} className={fields.includes(field) ? "rounded-md border border-primary bg-primary/5 px-2.5 py-1 text-[11px] font-mono text-primary" : "rounded-md border border-border bg-card px-2.5 py-1 text-[11px] font-mono text-muted-foreground hover:border-primary/30"}>{field}</button>
                ))}
              </div>
            </Field>
          </div>
        )}
        {delivery === "下载" && (
          <div className="mt-3">
            <Field label="脱敏策略"><Input value={masking} onChange={setMasking} /></Field>
          </div>
        )}
      </div>
      <div className="mt-4">
        <Field label="产品说明">
          <TextArea value={description} onChange={setDescription} placeholder="产品用途与数据内容说明" rows={2} />
        </Field>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- 发布门槛结果

export function GateResultModal({ product, onClose }: { product: DataProduct; onClose: () => void }) {
  const gate = product.gate;
  return (
    <Modal
      title={`发布门槛校验 · ${product.name}`}
      description="任一条件不满足时只允许保存草稿和执行模拟测试，不允许产品进入「已发布」；门槛校验结果与未通过原因保留为发布证据"
      onClose={onClose}
      width="max-w-2xl"
      footer={<SecondaryButton onClick={onClose}>关闭</SecondaryButton>}
    >
      {gate ? (
        <div className="space-y-3">
          {gate.checks.map((check) => (
            <div key={check.name} className="flex items-start gap-2.5 rounded-md border border-border p-3">
              {check.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />}
              <div>
                <div className="text-[12px] font-medium text-foreground">{check.name}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">{check.detail}</div>
              </div>
            </div>
          ))}
          <div className={`rounded-md border px-4 py-3 text-[12px] font-medium ${gate.passed ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
            {gate.passed ? "全部条件满足，允许提交发布审批" : "存在未满足条件，禁止发布；仅允许保存草稿与模拟测试"} · 校验时间 {gate.checkedAt}
          </div>
        </div>
      ) : (
        <div className="grid place-items-center py-10 text-[13px] text-muted-foreground">尚未执行门槛校验</div>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------- 发布审批

export function ApprovalModal({
  product,
  approval,
  onClose,
  onSubmit,
}: {
  product: DataProduct;
  approval?: ProductApproval;
  onClose: () => void;
  onSubmit: (action: "通过" | "驳回" | "退回修改", opinion: string) => void;
}) {
  const [opinion, setOpinion] = useState("");
  const currentStep = approval?.steps.find((step) => step.status === "pending");
  const isSecurityStep = currentStep?.name === "安全审批";
  return (
    <Modal
      title={`发布审批 · ${product.name}`}
      description={currentStep ? `当前节点：${currentStep.name}（${currentStep.role}）` : "审批流程已完成"}
      onClose={onClose}
      footer={
        <>
          <SecondaryButton onClick={onClose}>取消</SecondaryButton>
          <SecondaryButton className="text-amber-700 hover:border-amber-200" onClick={() => onSubmit("退回修改", opinion)} disabled={!opinion.trim()}>退回修改</SecondaryButton>
          <SecondaryButton className="text-red-600 hover:border-red-200 hover:text-red-600" onClick={() => onSubmit("驳回", opinion)} disabled={!opinion.trim()}>驳回</SecondaryButton>
          <PrimaryButton onClick={() => onSubmit("通过", opinion)} disabled={!opinion.trim()}>{isSecurityStep ? "安全审批通过" : "确认通过"}</PrimaryButton>
        </>
      }
    >
      <Field label="审批意见" required hint="通过、驳回与退回修改均记录意见、处理人和时间">
        <TextArea value={opinion} onChange={setOpinion} placeholder="填写审批意见（必填）" />
      </Field>
    </Modal>
  );
}

// ---------------------------------------------------------------- 使用授权申请

export function AuthorizationModal({
  products,
  onClose,
  onSubmit,
}: {
  products: DataProduct[];
  onClose: () => void;
  onSubmit: (input: {
    productId: string; applicant: string; applicantKind: "内部" | "外部"; purpose: string; purposeNote: string;
    useSystem: string; fields: string[]; region?: string; quotaPerDay?: number; effectiveFrom: string; effectiveTo: string;
  }) => void;
}) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [applicant, setApplicant] = useState("");
  const [applicantKind, setApplicantKind] = useState<"内部" | "外部">("内部");
  const [purpose, setPurpose] = useState(PURPOSE_OPTIONS[0]);
  const [purposeNote, setPurposeNote] = useState("");
  const [useSystem, setUseSystem] = useState("");
  const [fields, setFields] = useState<string[]>([]);
  const [region, setRegion] = useState("");
  const [quota, setQuota] = useState("1000");
  const [effectiveFrom, setEffectiveFrom] = useState("2026-08-13");
  const [effectiveTo, setEffectiveTo] = useState("2027-08-12");

  const product = products.find((item) => item.id === productId);
  const availableFields = product?.apiConfig?.fields ?? [];
  const isExternal = applicantKind === "外部";

  const toggleField = (field: string) => setFields((current) => (current.includes(field) ? current.filter((item) => item !== field) : [...current, field]));

  return (
    <Modal
      title="申请使用授权"
      description="使用授权审批时必须选择标准目的并填写说明；API 调用和下载自动继承授权目的，调用方只能补充具体场景，不能改写或扩大目的"
      onClose={onClose}
      width="max-w-3xl"
      footer={
        <>
          <SecondaryButton onClick={onClose}>取消</SecondaryButton>
          <PrimaryButton
            onClick={() => onSubmit({ productId, applicant, applicantKind, purpose, purposeNote, useSystem, fields, region: region || undefined, quotaPerDay: Number(quota), effectiveFrom, effectiveTo })}
            disabled={!applicant.trim() || !useSystem.trim()}
          >
            提交申请
          </PrimaryButton>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="数据产品" required>
          <Select value={productId} onChange={setProductId} options={products.map((item) => ({ value: item.id, label: `${item.name}（${item.delivery}）` }))} className="w-full" />
        </Field>
        <Field label="使用方主体" required>
          <div className="flex gap-2">
            <Input value={applicant} onChange={setApplicant} placeholder="人员 / 部门 / 系统 / 外部机构" className="flex-1" />
            <Select value={applicantKind} onChange={(value) => setApplicantKind(value as "内部" | "外部")} options={[{ value: "内部", label: "内部" }, { value: "外部", label: "外部机构" }]} className="w-[110px]" />
          </div>
        </Field>
        <Field label="标准目的" required hint="从统一标准目的列表选择，并允许填写说明">
          <Select value={purpose} onChange={setPurpose} options={PURPOSE_OPTIONS.map((item) => ({ value: item, label: item }))} className="w-full" />
        </Field>
        <Field label="使用系统 / 应用"><Input value={useSystem} onChange={setUseSystem} placeholder="例如：风控决策引擎" /></Field>
        <Field label="目的说明"><Input value={purposeNote} onChange={setPurposeNote} placeholder="补充本次申请的具体场景" /></Field>
        <Field label="有效期（起 / 止）" required>
          <div className="flex items-center gap-2">
            <Input type="date" value={effectiveFrom} onChange={setEffectiveFrom} className="flex-1" />
            <span className="text-muted-foreground">~</span>
            <Input type="date" value={effectiveTo} onChange={setEffectiveTo} className="flex-1" />
          </div>
        </Field>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="授权字段范围" hint={availableFields.length === 0 ? "下载类产品无需字段授权" : "超范围字段请求将被整次拒绝"}>
          <div className="flex flex-wrap gap-2">
            {availableFields.length === 0 ? (
              <span className="text-[11px] text-muted-foreground">全部字段（按数据范围控制）</span>
            ) : availableFields.map((field) => (
              <button key={field} type="button" onClick={() => toggleField(field)} className={fields.includes(field) ? "rounded-md border border-primary bg-primary/5 px-2.5 py-1 text-[11px] font-mono text-primary" : "rounded-md border border-border bg-surface-raised px-2.5 py-1 text-[11px] font-mono text-muted-foreground hover:border-primary/30"}>{field}</button>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="业务区域"><Input value={region} onChange={setRegion} placeholder="例如：华东" /></Field>
          <Field label="每日配额"><Input type="number" value={quota} onChange={setQuota} /></Field>
        </div>
      </div>
      {isExternal && (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
          申请方为外部合作机构：资产负责人通过后还必须由安全审批人批准。
        </div>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------- 授权审批

export function ApproveAuthorizationModal({
  authorization,
  onClose,
  onSubmit,
}: {
  authorization: Authorization;
  onClose: () => void;
  onSubmit: (pass: boolean, opinion: string) => void;
}) {
  const [opinion, setOpinion] = useState("");
  const pendingSecurity = authorization.requiresSecurity && authorization.securityStatus === "待安全审批";
  return (
    <Modal
      title={`使用授权审批 · ${authorization.productName}`}
      description={
        pendingSecurity
          ? "资产负责人已通过，当前为安全审批节点（涉及敏感数据或对外使用）"
          : authorization.requiresSecurity
            ? "当前为资产负责人审批节点；通过后将追加安全审批"
            : "当前为资产负责人审批节点"
      }
      onClose={onClose}
      footer={
        <>
          <SecondaryButton onClick={onClose}>取消</SecondaryButton>
          <SecondaryButton className="text-red-600 hover:border-red-200 hover:text-red-600" onClick={() => onSubmit(false, opinion)} disabled={!opinion.trim()}>驳回</SecondaryButton>
          <PrimaryButton onClick={() => onSubmit(true, opinion)} disabled={!opinion.trim()}>{pendingSecurity ? "安全审批通过" : "审批通过"}</PrimaryButton>
        </>
      }
    >
      <div className="mb-4 rounded-md border border-border bg-surface-raised p-3 text-[12px] text-muted-foreground">
        {authorization.applicant}（{authorization.applicantKind}）· 目的「{authorization.purpose}」· 字段 {authorization.fields.length > 0 ? authorization.fields.join("、") : "全部"} · 有效期 {authorization.effectiveFrom} ~ {authorization.effectiveTo} · 配额 {authorization.quotaPerDay ?? "不限"}/日
      </div>
      <Field label="审批意见" required>
        <TextArea value={opinion} onChange={setOpinion} placeholder="填写审批意见（必填）" />
      </Field>
    </Modal>
  );
}

// ---------------------------------------------------------------- API 模拟调用

export function ApiCallModal({
  authorization,
  onClose,
  onSubmit,
}: {
  authorization: Authorization;
  onClose: () => void;
  onSubmit: (declaredPurpose: string, fields: string[], region: string) => void;
}) {
  const { state } = useDataAssetState();
  const product = state.service.products.find((item) => item.id === authorization.productId);
  const [declaredPurpose, setDeclaredPurpose] = useState(authorization.purpose);
  const [fields, setFields] = useState<string[]>(authorization.fields);
  const [region, setRegion] = useState(authorization.region ?? "");

  const toggleField = (field: string) => setFields((current) => (current.includes(field) ? current.filter((item) => item !== field) : [...current, field]));

  return (
    <Modal
      title={`模拟调用 API · ${authorization.productName}`}
      description="每次模拟调用前校验：产品状态、授权有效期、使用目的、字段/数据范围与配额；任一校验失败将拒绝整次调用并生成资产使用审计"
      onClose={onClose}
      footer={
        <>
          <SecondaryButton onClick={onClose}>取消</SecondaryButton>
          <PrimaryButton onClick={() => onSubmit(declaredPurpose, fields, region)} disabled={fields.length === 0}>发起调用</PrimaryButton>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="本次声明目的" hint="调用方可以补充本次具体场景，但不能覆盖授权目的「{authorization.purpose}」；目的不一致视为越权访问">
          <Select value={declaredPurpose} onChange={setDeclaredPurpose} options={PURPOSE_OPTIONS.map((item) => ({ value: item, label: item }))} className="w-full" />
        </Field>
        <Field label="请求字段" hint="超出授权范围的字段将导致整次调用被拒绝">
          <div className="flex flex-wrap gap-2">
            {(product?.apiConfig?.fields ?? authorization.fields).map((field) => (
              <button key={field} type="button" onClick={() => toggleField(field)} className={fields.includes(field) ? "rounded-md border border-primary bg-primary/5 px-2.5 py-1 text-[11px] font-mono text-primary" : "rounded-md border border-border bg-surface-raised px-2.5 py-1 text-[11px] font-mono text-muted-foreground hover:border-primary/30"}>{field}</button>
            ))}
          </div>
        </Field>
        <Field label="业务区域">
          <Input value={region} onChange={setRegion} placeholder={`授权区域：${authorization.region ?? "不限"}`} />
        </Field>
        <div className="rounded-md border border-border bg-surface-raised p-3 text-[11px] leading-relaxed text-muted-foreground">
          授权目的：{authorization.purpose} · 授权字段：{authorization.fields.join("、") || "全部"} · 授权区域：{authorization.region ?? "不限"} · 配额：{authorization.quotaPerDay ?? "不限"}/日。当前原型不生成真实密钥，也不连接真实 API 网关。
        </div>
      </div>
    </Modal>
  );
}
