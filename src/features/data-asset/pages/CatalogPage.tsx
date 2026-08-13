import { useMemo, useState } from "react";
import {
  AlertTriangle, Archive, Boxes, CheckCircle2, ChevronDown, ChevronRight,
  Database, Edit2, FilePlus, FileText, Folder, Play, Plus, RotateCcw, Search,
  ShieldCheck, Tags, Trash2, X, XCircle,
} from "lucide-react";

import { useDataAssetState } from "../store";
import {
  useDataSourceRegistry,
  type DataSourceRecord,
} from "@/stores/dataSourceRegistry";
import {
  ASSET_TYPE_LABEL, CATALOG_STATUS_LABEL, MOCK_NOW, SCAN_TASK_STATUS_LABEL, uid,
  type Asset, type AssetType, type AssetExt, type AssetField, type Authorization,
  type BusinessDomain, type CatalogStatus, type DataProduct, type ScanTask, type ScanTaskStatus,
} from "../api/types";
import {
  Badge, EmptyState, Field, Input, KpiCard, Modal, PageHeader, PrimaryButton,
  SecondaryButton, SectionCard, Select, TabBar, TextArea, WarnNote, type BadgeTone,
} from "../components/common";

const CATALOG_TONE: Record<CatalogStatus, BadgeTone> = {
  normal: "green", sourceAbnormal: "amber", retiring: "amber", retired: "slate", archived: "slate",
};
const SCAN_TONE: Record<ScanTaskStatus, BadgeTone> = {
  pending: "slate", running: "blue", success: "green", partial: "amber", failed: "red", cancelled: "slate",
};

function assetTypeLabel(asset: Asset): string {
  if (asset.subtype) return `${ASSET_TYPE_LABEL[asset.type]}/${asset.subtype}`;
  return ASSET_TYPE_LABEL[asset.type];
}

function computeDimensionStates(state: ReturnType<typeof useDataAssetState>["state"], asset: Asset) {
  const rights = state.ownership.rights.filter((r) => r.assetId === asset.id);
  const ownership = rights.length === 0 ? "待登记" : rights.some((r) => r.status === "pending") ? "待确认" : rights.every((r) => r.status === "invalid") ? "已失效" : "已确权";
  const evaluations = state.valuation.evaluations.filter((e) => e.assetId === asset.id);
  const valuation = evaluations.length === 0 ? "未评估" : evaluations.some((e) => e.status === "已被替代") ? "待替代" : evaluations.some((e) => e.status === "已生效" && e.validUntil >= MOCK_NOW.slice(0, 10)) ? "有效" : evaluations.some((e) => e.status === "待复核") ? "待复核" : evaluations.some((e) => e.status === "已生效") ? "已过期" : "进行中";
  const products = state.service.products.filter((p) => p.assets.some((ref) => ref.assetId === asset.id));
  const operation = products.length === 0 ? "无产品" : products.some((p) => p.status === "已发布") ? "运营中" : products.some((p) => p.status === "待审批") ? "审批中" : products.some((p) => p.status === "草稿") ? "草稿" : products.some((p) => p.status === "已暂停") ? "已暂停" : "已下线";
  return { ownership, valuation, operation };
}

const DIM_TONE: Record<string, BadgeTone> = {
  正常: "green", 来源异常: "amber", 待退役: "amber", 已退役: "slate", 已归档: "slate",
  待登记: "slate", 待确认: "amber", 已确权: "green", 已失效: "red",
  未评估: "slate", 进行中: "blue", 待复核: "amber", 有效: "green", 待替代: "amber", 已过期: "red",
  无产品: "slate", 草稿: "slate", 审批中: "blue", 运营中: "green", 已暂停: "amber", 已下线: "slate",
};

const ASSET_TYPE_OPTIONS: AssetType[] = ["table", "dataset", "metric", "tag", "service", "document", "model", "json", "xml", "log", "message", "image", "video", "audio", "knowledge"];

function emptyExt(type: AssetType): AssetExt {
  if (type === "table") return { fields: [{ name: "id", type: "varchar(32)", primaryKey: true, sensitive: false, comment: "主键" }] };
  if (type === "service") return { protocol: "HTTPS", method: "POST", path: "/api/v1/resource", apiVersion: "v1", requestParams: [], responseStructure: "" };
  if (type === "document") return { reportFormat: "Excel", updateCycle: "月度", relatedDatasets: [], generateSystem: "", reportVersion: "V1" };
  if (type === "model") return { modelType: "分类", inputOutput: "", trainingData: "", framework: "", modelVersion: "V1", effectMetrics: "" };
  return { relatedDatasets: [], updateCycle: "" };
}

function defaultAssetTypeForSource(source?: DataSourceRecord): AssetType {
  if (source?.type === "数据库") return "table";
  if (source?.type === "消息队列") return "message";
  if (source?.type === "API") return "service";
  if (source?.type === "本地文件") return "document";
  return "dataset";
}

export default function CatalogPage() {
  const { state, update, meta } = useDataAssetState();
  const { sources: registeredSources, meta: sourceMeta } = useDataSourceRegistry();
  const [tab, setTab] = useState<"scan" | "catalog">("catalog");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | AssetType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | CatalogStatus>("all");
  const [selected, setSelected] = useState<Asset | null>(null);
  const [retireModal, setRetireModal] = useState<Asset | null>(null);
  const [voidModal, setVoidModal] = useState<Asset | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [addModal, setAddModal] = useState<"dataSource" | "manual" | null>(null);

  const [scanSearch, setScanSearch] = useState("");
  const [scanStatusFilter, setScanStatusFilter] = useState<"all" | ScanTaskStatus>("all");
  const [scanModal, setScanModal] = useState(false);
  const [scanSourceId, setScanSourceId] = useState("");
  const [scanMode, setScanMode] = useState<"incremental" | "full">("incremental");
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [scanLogsOpen, setScanLogsOpen] = useState<ScanTask | null>(null);

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["domain-customer", "domain-risk"]));
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [domainModal, setDomainModal] = useState<{ id: string; name: string; parentId: string | null; order: number } | null>(null);
  const [deleteDomainConfirm, setDeleteDomainConfirm] = useState<{ domain: BusinessDomain; hasChildren: boolean; assetCount: number } | null>(null);

  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchOwner, setBatchOwner] = useState("");

  const domainNameMap = useMemo(() => {
    const m = new Map<string, string>();
    state.catalog.domains.forEach((d) => m.set(d.id, d.name));
    return m;
  }, [state.catalog.domains]);

  const domainChildrenMap = useMemo(() => {
    const m = new Map<string, BusinessDomain[]>();
    state.catalog.domains.forEach((d) => {
      const key = d.parentId ?? "__root__";
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(d);
    });
    m.forEach((arr) => arr.sort((a, b) => a.order - b.order));
    return m;
  }, [state.catalog.domains]);

  const domainCounts = useMemo(() => {
    const map = new Map<string, number>();
    state.catalog.assets.forEach((a) => {
      const domainId = state.catalog.domains.find((d) => d.name === a.businessDomain)?.id ?? "domain-uncategorized";
      map.set(domainId, (map.get(domainId) ?? 0) + 1);
    });
    return map;
  }, [state.catalog.assets, state.catalog.domains]);

  const domainWithChildrenCount = useMemo(() => {
    const m = new Map<string, number>();
    const countRecursive = (id: string): number => {
      const direct = domainCounts.get(id) ?? 0;
      const children = domainChildrenMap.get(id) ?? [];
      const total = direct + children.reduce((sum, c) => sum + countRecursive(c.id), 0);
      m.set(id, total);
      return total;
    };
    state.catalog.domains.forEach((d) => countRecursive(d.id));
    return m;
  }, [domainCounts, domainChildrenMap, state.catalog.domains]);

  const domainChildMap = useMemo(() => {
    const m = new Map<string, number>();
    state.catalog.domains.forEach((d) => {
      if (d.parentId) m.set(d.parentId, (m.get(d.parentId) ?? 0) + 1);
    });
    return m;
  }, [state.catalog.domains]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const selectedId = selectedGroup;
    const collectDescendants = (id: string): string[] => {
      const result = [id];
      const children = domainChildrenMap.get(id) ?? [];
      children.forEach((c) => result.push(...collectDescendants(c.id)));
      return result;
    };
    const allowedNames = selectedId ? new Set(collectDescendants(selectedId).map((id) => domainNameMap.get(id)).filter(Boolean) as string[]) : null;
    return state.catalog.assets.filter((asset) => {
      const k = !keyword || `${asset.name} ${asset.id} ${asset.businessDomain} ${asset.owner} ${asset.tags.join(" ")}`.toLowerCase().includes(keyword);
      const t = typeFilter === "all" || asset.type === typeFilter;
      const s = statusFilter === "all" || asset.catalogStatus === statusFilter;
      const g = !allowedNames || allowedNames.has(asset.businessDomain);
      return k && t && s && g;
    });
  }, [search, state.catalog.assets, statusFilter, typeFilter, selectedGroup, domainNameMap, domainChildrenMap]);

  const pendingCount = state.catalog.assets.filter((a) => { const d = computeDimensionStates(state, a); return a.catalogStatus === "normal" && d.ownership === "待登记"; }).length;
  const sourceAbnormalCount = state.catalog.assets.filter((a) => a.catalogStatus === "sourceAbnormal").length;
  const retiringCount = state.catalog.assets.filter((a) => a.catalogStatus === "retiring").length;
  const updateTimely = 92;

  const toggleGroup = (id: string) => {
    const next = new Set(expandedGroups);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedGroups(next);
  };

  const openAddDomain = (parentId: string | null = null) => {
    setDomainModal({ id: "", name: "", parentId, order: state.catalog.domains.filter((d) => d.parentId === parentId).length + 1 });
  };

  const saveDomain = () => {
    if (!domainModal || !domainModal.name.trim()) return;
    const name = domainModal.name.trim();
    const exists = state.catalog.domains.some((d) => d.name === name && d.id !== domainModal.id);
    if (exists) return;
    if (domainModal.id) {
      const oldName = state.catalog.domains.find((d) => d.id === domainModal.id)?.name;
      update((c) => ({
        ...c,
        catalog: {
          ...c.catalog,
          domains: c.catalog.domains.map((d) => d.id === domainModal.id ? { ...d, name, parentId: domainModal.parentId, order: domainModal.order } : d),
          assets: c.catalog.assets.map((a) => (oldName && a.businessDomain === oldName) ? { ...a, businessDomain: name } : a),
        },
      }));
    } else {
      const newDomain: BusinessDomain = { id: uid("domain"), name, parentId: domainModal.parentId, order: domainModal.order };
      update((c) => ({ ...c, catalog: { ...c.catalog, domains: [...c.catalog.domains, newDomain] } }));
    }
    setDomainModal(null);
  };

  const confirmDeleteDomain = (domain: BusinessDomain) => {
    const childCount = domainChildMap.get(domain.id) ?? 0;
    const assetCount = domainCounts.get(domain.id) ?? 0;
    if (childCount > 0 || assetCount > 0) {
      setDeleteDomainConfirm({ domain, hasChildren: childCount > 0, assetCount });
    } else {
      update((c) => ({ ...c, catalog: { ...c.catalog, domains: c.catalog.domains.filter((d) => d.id !== domain.id) } }));
      if (selectedGroup === domain.id) setSelectedGroup(null);
    }
  };

  const doDeleteDomain = (domain: BusinessDomain) => {
    const fallbackName = state.catalog.domains.find((d) => d.id === "domain-uncategorized")?.name ?? "未分类";
    const idsToDelete = new Set<string>();
    const collectIds = (id: string) => {
      idsToDelete.add(id);
      (domainChildrenMap.get(id) ?? []).forEach((c) => collectIds(c.id));
    };
    collectIds(domain.id);
    const namesToReassign = new Set(state.catalog.domains.filter((d) => idsToDelete.has(d.id)).map((d) => d.name));
    update((c) => ({
      ...c,
      catalog: {
        ...c.catalog,
        domains: c.catalog.domains.filter((d) => !idsToDelete.has(d.id)),
        assets: c.catalog.assets.map((a) => namesToReassign.has(a.businessDomain) ? { ...a, businessDomain: fallbackName } : a),
      },
    }));
    if (selectedGroup && idsToDelete.has(selectedGroup)) setSelectedGroup(null);
    setDeleteDomainConfirm(null);
  };

  const scanFiltered = useMemo(() => {
    const kw = scanSearch.trim().toLowerCase();
    return state.catalog.scanTasks.filter((task) => {
      const k = !kw || `${task.name} ${task.sourceSystem}`.toLowerCase().includes(kw);
      return k && (scanStatusFilter === "all" || task.status === scanStatusFilter);
    });
  }, [scanSearch, state.catalog.scanTasks, scanStatusFilter]);

  const openScanModal = () => { setScanSourceId(registeredSources[0]?.id ?? ""); setScanMode("incremental"); setScanModal(true); };

  const runScanTask = (task: ScanTask) => {
    if (task.status === "running") return;
    setBusyTaskId(task.id);
    update((c) => ({ ...c, catalog: { ...c.catalog, scanTasks: c.catalog.scanTasks.map((it) => it.id === task.id ? { ...it, status: "running", startedAt: MOCK_NOW, triggeredBy: tab === "scan" ? "手动扫描" : "目录页扫描" } : it) } }));
    window.setTimeout(() => {
      update((c) => ({ ...c, catalog: { ...c.catalog, scanTasks: c.catalog.scanTasks.map((it) => it.id === task.id ? { ...it, status: "success", finishedAt: MOCK_NOW, found: 12, added: 1, changed: 2, abnormal: 0, logs: [{ time: MOCK_NOW, level: "INFO", text: "扫描启动（mock）：发现 12 个对象" }, { time: MOCK_NOW, level: "INFO", text: "新增 1、变更 2、异常 0，全部入库" }] } : it) } }));
      setBusyTaskId(null);
    }, 1800);
  };

  const retryFailedObjects = (task: ScanTask) => {
    setBusyTaskId(task.id);
    update((c) => ({ ...c, catalog: { ...c.catalog, scanTasks: c.catalog.scanTasks.map((it) => it.id === task.id ? { ...it, status: "running", logs: [...it.logs, { time: MOCK_NOW, level: "INFO", text: `重试 ${it.failedObjects.length} 个失败对象` }] } : it) } }));
    window.setTimeout(() => {
      update((c) => ({ ...c, catalog: { ...c.catalog, scanTasks: c.catalog.scanTasks.map((it) => it.id === task.id ? { ...it, status: "success", finishedAt: MOCK_NOW, abnormal: it.abnormal, failedObjects: it.failedObjects.map((o) => ({ ...o, retried: true })), logs: [...it.logs, { time: MOCK_NOW, level: "INFO", text: "重试完成：失败对象已成功，已成功对象未重复处理" }] } : it) } }));
      setBusyTaskId(null);
    }, 1500);
  };

  const createManualScan = () => {
    const s = registeredSources.find((i) => i.id === scanSourceId);
    if (!s) return;
    const task: ScanTask = { id: uid("scan"), name: `${s?.name ?? "未知数据源"}扫描`, sourceSystem: s?.name ?? scanSourceId, mode: scanMode, range: "全部对象", status: "pending", triggeredBy: "手动触发", found: 0, added: 0, changed: 0, abnormal: 0, logs: [], failedObjects: [] };
    update((c) => ({ ...c, catalog: { ...c.catalog, scanTasks: [task, ...c.catalog.scanTasks] } }));
    setScanModal(false);
  };

  const scanStats = useMemo(() => {
    const total = state.catalog.scanTasks.length;
    const success = state.catalog.scanTasks.filter((t) => t.status === "success").length;
    const partial = state.catalog.scanTasks.filter((t) => t.status === "partial").length;
    const failed = state.catalog.scanTasks.filter((t) => t.status === "failed").length;
    const running = state.catalog.scanTasks.filter((t) => t.status === "running").length;
    return { total, success, partial, failed, running };
  }, [state.catalog.scanTasks]);

  const blocksForRetire = (asset: Asset) => {
    const products = state.service.products.filter((p) => p.assets.some((ref) => ref.assetId === asset.id) && (p.status === "已发布" || p.status === "草稿" || p.status === "待审批"));
    const authorizations = state.service.authorizations.filter((a) => a.productId && products.some((p) => p.id === a.productId) && a.status === "已授权");
    const anomalies = state.audit.anomalies.filter((a) => a.status !== "已关闭" && a.status !== "已排除" && a.productName && products.some((p) => p.name === a.productName));
    return { products, authorizations, anomalies };
  };

  const markRetiring = (asset: Asset) => {
    const b = blocksForRetire(asset);
    if (b.products.length > 0 || b.authorizations.length > 0 || b.anomalies.length > 0) { setRetireModal(asset); return; }
    update((c) => ({ ...c, catalog: { ...c.catalog, assets: c.catalog.assets.map((it) => it.id === asset.id ? { ...it, catalogStatus: "retiring", updatedAt: MOCK_NOW } : it), changes: [{ id: uid("chg"), assetId: asset.id, at: MOCK_NOW, actor: "资产管理员", kind: "退役申请", before: "正常", after: "待退役", reason: "手动标记退役，无关联产品/授权/异常" }, ...c.catalog.changes] } }));
  };

  const retire = (asset: Asset) => {
    update((c) => ({ ...c, catalog: { ...c.catalog, assets: c.catalog.assets.map((it) => it.id === asset.id ? { ...it, catalogStatus: "retired", updatedAt: MOCK_NOW } : it), changes: [{ id: uid("chg"), assetId: asset.id, at: MOCK_NOW, actor: "资产管理员", kind: "退役", before: "待退役", after: "已退役", reason: "关联产品与授权已处理完毕，允许退役" }, ...c.catalog.changes] } }));
    setRetireModal(null);
  };

  const archive = (asset: Asset) => {
    update((c) => ({ ...c, catalog: { ...c.catalog, assets: c.catalog.assets.map((it) => it.id === asset.id ? { ...it, catalogStatus: "archived", updatedAt: MOCK_NOW } : it), changes: [{ id: uid("chg"), assetId: asset.id, at: MOCK_NOW, actor: "资产管理员", kind: "归档", before: "已退役", after: "已归档", reason: "退役完成，转只读归档" }, ...c.catalog.changes] } }));
  };

  const voidAsset = (asset: Asset) => {
    if (!voidReason.trim()) return;
    update((c) => ({ ...c, catalog: { ...c.catalog, assets: c.catalog.assets.map((it) => it.id === asset.id ? { ...it, voided: { at: MOCK_NOW, by: "资产管理员", reason: voidReason }, updatedAt: MOCK_NOW } : it), changes: [{ id: uid("chg"), assetId: asset.id, at: MOCK_NOW, actor: "资产管理员", kind: "误录作废", before: "正常", after: "已作废（留痕）", reason: voidReason }, ...c.catalog.changes] } }));
    setVoidModal(null); setVoidReason("");
  };

  const applyBatchOwner = () => {
    if (!batchOwner.trim() || selectedIds.size === 0) return;
    update((c) => ({ ...c, catalog: { ...c.catalog, assets: c.catalog.assets.map((it) => selectedIds.has(it.id) ? { ...it, owner: batchOwner, updatedAt: MOCK_NOW } : it), changes: [...Array.from(selectedIds).map((id) => ({ id: uid("chg"), assetId: id, at: MOCK_NOW, actor: "资产管理员", kind: "负责人变更", before: "", after: batchOwner, reason: `批量指派负责人：${batchOwner}` })), ...c.catalog.changes] } }));
    setBatchMode(false); setSelectedIds(new Set()); setBatchOwner("");
  };

  const selectedDetails = selected ? computeDimensionStates(state, selected) : null;

  return (
    <div className="page-shell animate-fade-in">
      <div className="space-y-4">
        <PageHeader title="资产目录" description="统一管理数据表、API、报告、模型等各类数据资产；支持自动扫描编目和人工补录，保持稳定资产身份" />

        {meta.error && <WarnNote text={`SQLite 状态读写异常：${meta.error.message}，当前为浏览器临时数据`} />}
        {sourceMeta.error && <WarnNote text={`数据源状态读取异常：${sourceMeta.error.message}，暂时无法从数据源添加或创建扫描任务`} />}
        {meta.hydrated === false && <WarnNote text="正在从 SQLite 恢复数据资产状态..." />}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <KpiCard label="资产总数" value={state.catalog.assets.length} hint={`数据表 / 数据服务 / 文档 / 模型 等`} icon={Boxes} color="text-primary" bg="bg-primary/10" />
          <KpiCard label="待确权" value={pendingCount} hint="扫描新发现对象自动入目录" icon={Tags} color="text-blue-600" bg="bg-blue-50" />
          <KpiCard label="来源异常" value={sourceAbnormalCount} hint="来源暂不可用，不删除历史资产" icon={AlertTriangle} color="text-amber-600" bg="bg-amber-50" />
          <KpiCard label="待退役" value={retiringCount} hint="需处理完关联产品与授权" icon={Archive} color="text-violet-600" bg="bg-violet-50" />
          <KpiCard label="更新及时率" value={`${updateTimely}%`} hint="目标 ≥ 95% · 2026-08" icon={CheckCircle2} color="text-emerald-600" bg="bg-emerald-50" />
        </section>

        <TabBar tabs={[{ key: "catalog", label: "资产目录", count: state.catalog.assets.length }, { key: "scan", label: "扫描任务", count: state.catalog.scanTasks.length }]} active={tab} onChange={(key) => setTab(key as "catalog" | "scan")} />

        {tab === "catalog" && (
          <>
            <SectionCard title="待办" description="集中展示需要关注的资产，点击可打开详情">
              <div className="grid gap-3 px-5 sm:grid-cols-2 lg:grid-cols-4">
                <TodoBlock label="待确权" count={pendingCount} color="text-blue-600" bg="bg-blue-50" assets={state.catalog.assets.filter((a) => { const d = computeDimensionStates(state, a); return a.catalogStatus === "normal" && d.ownership === "待登记"; })} onOpen={setSelected} />
                <TodoBlock label="来源异常" count={sourceAbnormalCount} color="text-amber-600" bg="bg-amber-50" assets={state.catalog.assets.filter((a) => a.catalogStatus === "sourceAbnormal")} onOpen={setSelected} />
                <TodoBlock label="待退役" count={retiringCount} color="text-violet-600" bg="bg-violet-50" assets={state.catalog.assets.filter((a) => a.catalogStatus === "retiring")} onOpen={setSelected} />
                <TodoBlock label="已作废" count={state.catalog.assets.filter((a) => a.voided).length} color="text-red-600" bg="bg-red-50" assets={state.catalog.assets.filter((a) => a.voided)} onOpen={setSelected} />
              </div>
            </SectionCard>

            <SectionCard
              title="资产目录"
              description="资产 ID 跨版本不变；扫描发现新对象自动入目录、结构变化生成新版本、疑似重复标记待合并"
              actions={<>
                <PrimaryButton icon={<Database className="h-3.5 w-3.5" />} onClick={() => setAddModal("dataSource")}>从数据源添加</PrimaryButton>
                <SecondaryButton onClick={openScanModal}><Play className="h-3.5 w-3.5" />新建扫描任务</SecondaryButton>
                <SecondaryButton onClick={() => setAddModal("manual")}><FilePlus className="h-3.5 w-3.5" />人工补录</SecondaryButton>
              </>}
            >
              <div className="grid gap-0 lg:grid-cols-[220px_1fr]">
                <aside className="border-b border-border px-4 py-3 lg:border-b-0 lg:border-r">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">业务域</span>
                    <button type="button" onClick={() => openAddDomain(null)} className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-surface-raised hover:text-primary" title="新增根业务域"><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                  <TreeItem label="全部" count={state.catalog.assets.length} active={selectedGroup === null} onClick={() => setSelectedGroup(null)} />
                  <DomainTreeNodes
                    domains={domainChildrenMap.get("__root__") ?? []}
                    level={0}
                    expanded={expandedGroups}
                    selected={selectedGroup}
                    counts={domainWithChildrenCount}
                    childrenMap={domainChildrenMap}
                    onToggle={toggleGroup}
                    onSelect={setSelectedGroup}
                    onAddChild={(pid: string) => openAddDomain(pid)}
                    onEdit={(d) => setDomainModal({ id: d.id, name: d.name, parentId: d.parentId, order: d.order })}
                    onDelete={confirmDeleteDomain}
                    protectedIds={new Set(["domain-uncategorized"])}
                  />
                </aside>

                <div className="flex min-w-0 flex-col">
                  <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
                    <div className="flex h-8 w-full min-w-0 items-center gap-2 rounded-md border border-input bg-surface-raised px-3 text-[12px] text-muted-foreground sm:w-[220px]">
                      <Search className="h-3.5 w-3.5 shrink-0" />
                      <input value={search} onChange={(e) => setSearch(e.target.value)} className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground/70" placeholder="搜索资产名称 / ID / 业务域" />
                    </div>
                    <Select value={typeFilter} onChange={(v) => setTypeFilter(v as "all" | AssetType)} options={[{ value: "all", label: "全部类型" }, ...Object.entries(ASSET_TYPE_LABEL).map(([value, label]) => ({ value, label }))]} />
                    <Select value={statusFilter} onChange={(v) => setStatusFilter(v as "all" | CatalogStatus)} options={[{ value: "all", label: "全部目录状态" }, ...Object.entries(CATALOG_STATUS_LABEL).map(([value, label]) => ({ value, label }))]} />
                    {!batchMode ? (
                      <SecondaryButton onClick={() => { setBatchMode(true); setSelectedIds(new Set()); }} className="ml-auto">批量指派负责人</SecondaryButton>
                    ) : (
                      <div className="ml-auto flex items-center gap-2">
                        <Input value={batchOwner} onChange={setBatchOwner} placeholder="负责人姓名" className="w-32" />
                        <PrimaryButton disabled={!batchOwner.trim() || selectedIds.size === 0} onClick={applyBatchOwner}>应用（{selectedIds.size}）</PrimaryButton>
                        <SecondaryButton onClick={() => { setBatchMode(false); setSelectedIds(new Set()); }}>取消</SecondaryButton>
                      </div>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left">
                      <thead>
                        <tr className="text-[12px] font-medium text-slate-600">
                          {batchMode && <th className="w-8 border-b border-border py-3 pl-4"><input type="checkbox" className="h-3.5 w-3.5" checked={selectedIds.size === filtered.length && filtered.length > 0} onChange={(e) => setSelectedIds(e.target.checked ? new Set(filtered.map((a) => a.id)) : new Set())} /></th>}
                          {["资产名称", "资产 ID", "类型", "来源系统", "业务域", "负责人", "目录状态", "版本", "更新时间", "操作"].map((l, idx) => <th key={l} className={`border-b border-border py-3 pr-4 ${idx === 0 ? "pl-4" : ""}`}>{l}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((asset) => (
                          <tr key={asset.id} className="text-[13px] text-foreground hover:bg-surface-raised/60">
                            {batchMode && <td className="border-b border-border py-3.5 pl-4"><input type="checkbox" className="h-3.5 w-3.5" checked={selectedIds.has(asset.id)} onChange={(e) => { const next = new Set(selectedIds); if (e.target.checked) next.add(asset.id); else next.delete(asset.id); setSelectedIds(next); }} /></td>}
                            <td className="border-b border-border py-3.5 pl-4 pr-4">
                              <button type="button" onClick={() => setSelected(asset)} className="text-left font-medium text-primary hover:underline">{asset.name}</button>
                              {asset.voided && <Badge tone="red" className="ml-2">已作废</Badge>}
                              <div className="mt-0.5 text-[11px] text-muted-foreground">{asset.description}</div>
                            </td>
                            <td className="border-b border-border py-3.5 pr-4 font-mono text-[11px] text-muted-foreground">{asset.id}</td>
                            <td className="border-b border-border py-3.5 pr-4"><span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] text-slate-700">{assetTypeLabel(asset)}</span></td>
                            <td className="border-b border-border py-3.5 pr-4 text-[12px] text-muted-foreground">{asset.sourceSystem}</td>
                            <td className="border-b border-border py-3.5 pr-4 text-[12px] text-muted-foreground">{asset.businessDomain}</td>
                            <td className="border-b border-border py-3.5 pr-4 text-[12px] text-muted-foreground">{asset.owner}</td>
                            <td className="border-b border-border py-3.5 pr-4"><Badge tone={CATALOG_TONE[asset.catalogStatus]}>{CATALOG_STATUS_LABEL[asset.catalogStatus]}</Badge></td>
                            <td className="border-b border-border py-3.5 pr-4"><span className="rounded-md bg-blue-50 px-1.5 py-0.5 font-mono text-[11px] text-blue-700">v{asset.version}</span></td>
                            <td className="border-b border-border py-3.5 pr-4 text-[11px] tabular-nums text-muted-foreground">{asset.updatedAt.slice(0, 10)}</td>
                            <td className="border-b border-border py-3.5">
                              <div className="flex items-center gap-1">
                                <button type="button" onClick={() => setSelected(asset)} className="inline-flex h-7 items-center rounded-md border border-input px-2 text-[11px] text-foreground hover:border-primary/30 hover:text-primary">详情</button>
                                {!asset.voided && asset.catalogStatus === "normal" && (
                                  <button type="button" onClick={() => markRetiring(asset)} className="inline-flex h-7 items-center rounded-md border border-input px-2 text-[11px] text-foreground hover:border-primary/30 hover:text-primary">退役</button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filtered.length === 0 && <EmptyState title="暂无匹配的资产" description="调整筛选条件或点击右上角新建扫描任务 / 人工添加" />}
                  </div>
                  <div className="flex items-center justify-between border-t border-border px-5 py-2.5 text-[11px] text-muted-foreground">
                    <span>共 {state.catalog.assets.length} 项资产 · {filtered.length} 项匹配当前筛选</span>
                    <span className="flex items-center gap-1"><Database className="h-3 w-3" />资产 ID 为跨版本永久身份</span>
                  </div>
                </div>
              </div>
            </SectionCard>
          </>
        )}

        {tab === "scan" && (
          <SectionCard
            title="扫描任务"
            description="复用数据集成模块已登记的数据源，默认增量扫描；扫描匹配优先级：来源系统稳定对象 ID → 类型专属来源定位键；部分成功任务可只重试失败对象"
            actions={<>
              <PrimaryButton icon={<Play className="h-3.5 w-3.5" />} onClick={openScanModal}>手动扫描</PrimaryButton>
              <div className="flex h-8 w-full min-w-0 items-center gap-2 rounded-md border border-input bg-surface-raised px-3 text-[12px] text-muted-foreground sm:w-[220px]">
                <Search className="h-3.5 w-3.5 shrink-0" />
                <input value={scanSearch} onChange={(e) => setScanSearch(e.target.value)} className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground/70" placeholder="搜索任务名称 / 来源系统" />
              </div>
              <Select value={scanStatusFilter} onChange={(v) => setScanStatusFilter(v as "all" | ScanTaskStatus)} options={[{ value: "all", label: "全部状态" }, ...Object.entries(SCAN_TASK_STATUS_LABEL).map(([value, label]) => ({ value, label }))]} />
            </>}
          >
            <div className="overflow-x-auto px-5">
              <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left">
                <thead>
                  <tr className="text-[12px] font-medium text-slate-600">{["任务", "状态", "模式", "发现/新增/变更/异常", "错误摘要", "时间", "操作"].map((l) => <th key={l} className="border-b border-border py-3 pr-4">{l}</th>)}</tr>
                </thead>
                <tbody>
                  {scanFiltered.map((task) => (
                    <tr key={task.id} className="text-[13px] text-foreground hover:bg-surface-raised/60">
                      <td className="border-b border-border py-3.5 pr-4"><div className="font-medium">{task.name}</div><div className="mt-0.5 text-[11px] text-muted-foreground">{task.sourceSystem} · {task.triggeredBy}</div></td>
                      <td className="border-b border-border py-3.5 pr-4"><Badge tone={SCAN_TONE[task.status]}>{SCAN_TASK_STATUS_LABEL[task.status]}</Badge></td>
                      <td className="border-b border-border py-3.5 pr-4 text-[12px] text-muted-foreground">{task.mode === "full" ? "全量" : "增量"}</td>
                      <td className="border-b border-border py-3.5 pr-4 tabular-nums text-[12px] text-muted-foreground"><span className="font-medium text-foreground">{task.found}</span> / {task.added} / {task.changed} / <span className={task.abnormal > 0 ? "text-amber-600" : ""}>{task.abnormal}</span></td>
                      <td className="border-b border-border py-3.5 pr-4 max-w-[260px]">{task.errorSummary ? <span className="text-[11px] text-amber-700">{task.errorSummary}</span> : task.status === "running" ? <span className="text-[11px] text-blue-600">执行中...</span> : <span className="text-[11px] text-muted-foreground">—</span>}</td>
                      <td className="border-b border-border py-3.5 pr-4 text-[11px] tabular-nums text-muted-foreground">{task.finishedAt ?? task.startedAt ?? "未开始"}</td>
                      <td className="border-b border-border py-3.5">
                        <div className="flex items-center gap-1">
                          <button type="button" disabled={busyTaskId === task.id || task.status === "running"} onClick={() => runScanTask(task)} className="inline-flex h-7 items-center gap-1 rounded-md border border-input px-2 text-[11px] text-foreground hover:border-primary/30 hover:text-primary disabled:opacity-50"><Play className="h-3 w-3" />{task.status === "running" ? "运行中" : "运行"}</button>
                          {task.status === "partial" && <button type="button" disabled={busyTaskId === task.id} onClick={() => retryFailedObjects(task)} className="inline-flex h-7 items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 text-[11px] text-amber-700 hover:bg-amber-100 disabled:opacity-50"><RotateCcw className="h-3 w-3" />重试失败对象</button>}
                          <button type="button" onClick={() => setScanLogsOpen(task)} className="inline-flex h-7 items-center gap-1 rounded-md border border-input px-2 text-[11px] text-foreground hover:border-primary/30 hover:text-primary"><FileText className="h-3 w-3" />日志</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {scanFiltered.length === 0 && <EmptyState title="暂无扫描任务" description="点击右上角手动扫描或等待周期任务执行" />}
            </div>
            <div className="flex items-center justify-between border-t border-border px-5 py-2.5 text-[11px] text-muted-foreground">
              <span>共 {state.catalog.scanTasks.length} 项 · 成功 {scanStats.success} · 部分成功 {scanStats.partial} · 失败 {scanStats.failed} · 运行中 {scanStats.running}</span>
              <span>匹配优先级：来源系统稳定对象 ID → 类型专属来源定位键</span>
            </div>
          </SectionCard>
        )}
      </div>

      {selected && selectedDetails && (
        <AssetDetailDrawer asset={selected} dimensions={selectedDetails} onClose={() => setSelected(null)} onVoid={() => setVoidModal(selected)} onRetire={() => selected.catalogStatus === "retiring" ? setRetireModal(selected) : markRetiring(selected)} onArchive={() => archive(selected)} state={state} />
      )}

      {retireModal && <RetireCheckModal asset={retireModal} blockers={blocksForRetire(retireModal)} onClose={() => setRetireModal(null)} onRetire={() => retire(retireModal)} />}

      {voidModal && (
        <Modal title="作废误录资产" description={`作废动作本身必须留痕；仅允许作废未关联任何后续记录的误录资产。目标：${voidModal.name}`} onClose={() => { setVoidModal(null); setVoidReason(""); }} footer={<>
          <SecondaryButton onClick={() => { setVoidModal(null); setVoidReason(""); }}>取消</SecondaryButton>
          <PrimaryButton onClick={() => voidAsset(voidModal)} disabled={!voidReason.trim()}>确认作废并留痕</PrimaryButton>
        </>}>
          <Field label="作废原因" required hint="将记录作废人、原因和时间，不执行业务硬删除"><Input value={voidReason} onChange={setVoidReason} placeholder="例如：扫描重复误建，无任何关联记录" /></Field>
        </Modal>
      )}

      {scanModal && (
        <Modal title="手动扫描" description="复用数据集成模块已登记的数据源 ID，不在资产模块重复保存密码或连接配置" onClose={() => setScanModal(false)} footer={<>
          <SecondaryButton onClick={() => setScanModal(false)}>取消</SecondaryButton>
          <PrimaryButton onClick={createManualScan} disabled={!scanSourceId}>创建并运行扫描</PrimaryButton>
        </>}>
          {registeredSources.length === 0 ? (
            <EmptyState title="暂无可用数据源" description="请先在“数据集成 → 数据源管理”中新增数据源。" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="扫描数据源" required hint="引用数据集成模块登记的数据源"><Select value={scanSourceId} onChange={(v) => setScanSourceId(v)} options={registeredSources.map((s) => ({ value: s.id, label: `${s.name}（${s.type} · ${s.status}）` }))} className="w-full" /></Field>
              <Field label="扫描模式" required hint="默认增量，可执行全量"><Select value={scanMode} onChange={(v) => setScanMode(v as "incremental" | "full")} options={[{ value: "incremental", label: "增量扫描" }, { value: "full", label: "全量扫描" }]} className="w-full" /></Field>
            </div>
          )}
          <div className="mt-4 rounded-md border border-border bg-surface-raised p-3 text-[11px] leading-relaxed text-muted-foreground">
            扫描匹配优先级：来源系统稳定对象 ID → 类型专属来源定位键（数据表：数据源 ID + 数据库 + Schema + 表名；API：来源系统 ID + HTTP 方法 + 路径；报告：来源系统 ID + 报告 ID；模型：来源系统 ID + 模型注册 ID）。无法可靠匹配时创建待合并资产，不自动合并或覆盖。
          </div>
        </Modal>
      )}

      {scanLogsOpen && (
        <Modal title={`执行日志 · ${scanLogsOpen.name}`} description={`批次 ${scanLogsOpen.id} · ${scanLogsOpen.mode === "full" ? "全量" : "增量"}模式`} onClose={() => setScanLogsOpen(null)} width="max-w-2xl">
          {scanLogsOpen.logs.length === 0 ? <EmptyState title="暂无执行日志" description="任务尚未开始运行" /> : (
            <div className="space-y-1.5 rounded-md border border-slate-800 bg-slate-950 p-3 font-mono text-[11px] leading-5">
              {scanLogsOpen.logs.map((line, i) => (
                <div key={i} className={line.level === "ERROR" ? "text-red-300" : line.level === "WARN" ? "text-amber-300" : "text-slate-300"}>
                  <span className="mr-2 text-slate-500">{line.time}</span>[{line.level}] {line.text}
                </div>
              ))}
            </div>
          )}
          {scanLogsOpen.failedObjects.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 text-[12px] font-medium text-foreground">失败对象（{scanLogsOpen.failedObjects.length}）</div>
              <table className="w-full border-separate border-spacing-0 text-left">
                <thead><tr className="text-[11px] text-slate-500">{[["对象", "w-1/3"], ["失败原因", "w-1/3"], ["状态", ""]].map(([l]) => <th key={l} className="border-b border-border py-2 pr-3">{l}</th>)}</tr></thead>
                <tbody>
                  {scanLogsOpen.failedObjects.map((o) => (
                    <tr key={o.id} className="text-[12px] text-foreground">
                      <td className="border-b border-border py-2 pr-3 font-mono text-[11px]">{o.name}</td>
                      <td className="border-b border-border py-2 pr-3 text-muted-foreground">{o.reason}</td>
                      <td className="border-b border-border py-2"><Badge tone={o.retried ? "green" : "amber"}>{o.retried ? "已重试" : "待重试"}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      )}

      {addModal && (
        <AddAssetModal mode={addModal} sources={registeredSources} onClose={() => setAddModal(null)} onCreate={(asset) => {
          const fromSource = Boolean(asset.dataSourceId);
          update((c) => ({ ...c, catalog: { ...c.catalog, assets: [asset, ...c.catalog.assets], changes: [{ id: uid("chg"), assetId: asset.id, at: MOCK_NOW, actor: "资产管理员", kind: fromSource ? "从数据源添加" : "人工补录", before: "", after: "待确权", reason: fromSource ? `引用数据源 ${asset.dataSourceId} 创建，需权属登记` : "人工补录，需权属登记" }, ...c.catalog.changes] } }));
          setAddModal(null);
        }} />
      )}

      {domainModal && (
        <Modal title={domainModal.id ? "编辑业务域" : "新增业务域"} onClose={() => setDomainModal(null)} footer={<>
          <SecondaryButton onClick={() => setDomainModal(null)}>取消</SecondaryButton>
          <PrimaryButton disabled={!domainModal.name.trim()} onClick={saveDomain}>保存</PrimaryButton>
        </>}>
          <div className="space-y-4">
            <Field label="名称" required><Input value={domainModal.name} onChange={(v) => setDomainModal({ ...domainModal, name: v })} /></Field>
            <Field label="父级">
              <Select
                value={domainModal.parentId ?? ""}
                onChange={(v) => setDomainModal({ ...domainModal, parentId: v || null })}
                options={[{ value: "", label: "— 根级 —" }, ...state.catalog.domains.filter((d) => !domainModal.id || d.id !== domainModal.id).map((d) => ({ value: d.id, label: d.name }))]}
              />
            </Field>
            <Field label="排序"><Input type="number" value={String(domainModal.order)} onChange={(v) => setDomainModal({ ...domainModal, order: Number(v) || 99 })} /></Field>
          </div>
        </Modal>
      )}

      {deleteDomainConfirm && (
        <Modal title="删除业务域" description={
          deleteDomainConfirm.hasChildren
            ? `业务域「${deleteDomainConfirm.domain.name}」下还有子业务域，删除将级联删除全部子域并将 ${deleteDomainConfirm.assetCount} 项资产归入「未分类」`
            : `业务域「${deleteDomainConfirm.domain.name}」下有 ${deleteDomainConfirm.assetCount} 项资产，删除后将自动归入「未分类」`
        } onClose={() => setDeleteDomainConfirm(null)} footer={<>
          <SecondaryButton onClick={() => setDeleteDomainConfirm(null)}>取消</SecondaryButton>
          <PrimaryButton onClick={() => doDeleteDomain(deleteDomainConfirm.domain)}>确认删除</PrimaryButton>
        </>}>
          <WarnNote text="删除操作不可恢复，但不会删除资产本身，只会将其业务域归属调整为未分类" />
        </Modal>
      )}
    </div>
  );
}

// ---------- 子组件 ----------
function TodoBlock({ label, count, color, bg, assets, onOpen }: { label: string; count: number; color: string; bg: string; assets: Asset[]; onOpen: (a: Asset) => void }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-center gap-2">
        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md ${bg}`}><span className={`text-[12px] font-semibold tabular-nums ${color}`}>{count}</span></span>
        <span className="text-[12px] font-medium text-foreground">{label}</span>
      </div>
      <div className="mt-2 max-h-28 space-y-1 overflow-y-auto">
        {assets.length === 0 ? <div className="text-[11px] text-muted-foreground">— 暂无 —</div> : assets.slice(0, 5).map((a) => (
          <button key={a.id} type="button" onClick={() => onOpen(a)} className="block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] text-primary hover:bg-primary/5">{a.name}</button>
        ))}
      </div>
    </div>
  );
}

function DomainTreeNodes({
  domains, level, expanded, selected, counts, childrenMap,
  onToggle, onSelect, onAddChild, onEdit, onDelete, protectedIds,
}: {
  domains: BusinessDomain[];
  level: number;
  expanded: Set<string>;
  selected: string | null;
  counts: Map<string, number>;
  childrenMap: Map<string, BusinessDomain[]>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onEdit: (d: BusinessDomain) => void;
  onDelete: (d: BusinessDomain) => void;
  protectedIds: Set<string>;
}) {
  return (
    <>
      {domains.map((d) => {
        const children = childrenMap.get(d.id) ?? [];
        const hasChildren = children.length > 0;
        const isExpanded = expanded.has(d.id);
        const isActive = selected === d.id;
        const count = counts.get(d.id) ?? 0;
        return (
          <div key={d.id}>
            <div className="group flex items-center" style={{ paddingLeft: level * 12 }}>
              <button type="button" onClick={() => hasChildren && onToggle(d.id)} className="grid h-6 w-5 shrink-0 place-items-center text-muted-foreground hover:text-foreground disabled:opacity-30" disabled={!hasChildren}>
                {hasChildren ? (isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />) : <span className="h-3 w-3" />}
              </button>
              <button type="button" onClick={() => onSelect(d.id)} className={`flex min-w-0 flex-1 items-center justify-between rounded px-2 py-1 text-[12px] ${isActive ? "bg-primary/10 text-primary" : "text-foreground hover:bg-surface-raised"}`}>
                <span className="truncate">{d.name}</span>
                <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] tabular-nums">{count}</span>
              </button>
              <div className="ml-0.5 hidden items-center gap-0.5 group-hover:flex">
                <button type="button" onClick={() => onAddChild(d.id)} className="grid h-5 w-5 place-items-center rounded text-muted-foreground hover:bg-surface-raised hover:text-primary" title="添加子域"><Plus className="h-3 w-3" /></button>
                <button type="button" onClick={() => onEdit(d)} className="grid h-5 w-5 place-items-center rounded text-muted-foreground hover:bg-surface-raised hover:text-primary" title="编辑"><Edit2 className="h-3 w-3" /></button>
                {!protectedIds.has(d.id) && (
                  <button type="button" onClick={() => onDelete(d)} className="grid h-5 w-5 place-items-center rounded text-muted-foreground hover:bg-red-50 hover:text-red-600" title="删除"><Trash2 className="h-3 w-3" /></button>
                )}
              </div>
            </div>
            {hasChildren && isExpanded && (
              <DomainTreeNodes
                domains={children}
                level={level + 1}
                expanded={expanded}
                selected={selected}
                counts={counts}
                childrenMap={childrenMap}
                onToggle={onToggle}
                onSelect={onSelect}
                onAddChild={onAddChild}
                onEdit={onEdit}
                onDelete={onDelete}
                protectedIds={protectedIds}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

function TreeItem({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`flex w-full items-center justify-between rounded px-2 py-1 text-[12px] ${active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-surface-raised"}`}>
      <span className="flex items-center gap-1.5"><Folder className="h-3.5 w-3.5" />{label}</span>
      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] tabular-nums">{count}</span>
    </button>
  );
}

function AddAssetModal({ mode, sources, onClose, onCreate }: {
  mode: "dataSource" | "manual";
  sources: DataSourceRecord[];
  onClose: () => void;
  onCreate: (asset: Asset) => void;
}) {
  const initialType = mode === "dataSource" ? defaultAssetTypeForSource(sources[0]) : "document";
  const [type, setType] = useState<AssetType>(initialType);
  const [name, setName] = useState("");
  const [dataSourceId, setDataSourceId] = useState(sources[0]?.id ?? "");
  const [sourceSystem, setSourceSystem] = useState("");
  const [sourceObjectId, setSourceObjectId] = useState("");
  const [businessDomain, setBusinessDomain] = useState("");
  const [owner, setOwner] = useState("");
  const [securityLevel, setSecurityLevel] = useState("内部");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [ext, setExt] = useState<AssetExt>(() => emptyExt(initialType));
  const selectedSource = sources.find((source) => source.id === dataSourceId);

  const changeDataSource = (id: string) => {
    const source = sources.find((item) => item.id === id);
    const nextType = defaultAssetTypeForSource(source);
    setDataSourceId(id);
    setType(nextType);
    setExt(emptyExt(nextType));
  };

  const create = () => {
    if (!name.trim() || (mode === "dataSource" && !selectedSource)) return;
    const asset: Asset = {
      id: uid("asset"), name: name.trim(), type,
      subtype: type === "service" ? "API" : type === "document" ? "报告" : undefined,
      sourceSystem: (selectedSource?.name ?? sourceSystem.trim()) || "人工登记",
      ...(selectedSource ? { dataSourceId: selectedSource.id } : {}),
      ...(sourceObjectId.trim() ? { sourceObjectId: sourceObjectId.trim() } : {}),
      businessDomain: businessDomain.trim() || "未分类",
      description: description.trim(),
      tags: tagsInput.split(/[,，\s]+/).filter(Boolean),
      owner: owner.trim() || "待指定", securityLevel, catalogStatus: "normal",
      version: 1, updatedAt: MOCK_NOW, ext,
    };
    onCreate(asset);
  };

  const fromDataSource = mode === "dataSource";

  return (
    <Modal title={fromDataSource ? "从数据源添加资产" : "人工补录资产"} description={fromDataSource ? "选择数据集成模块已登记的数据源，并填写来源对象信息；保存后引用稳定数据源 ID，不复制连接配置。" : "用于无法自动扫描的报告、文档、模型等资产；来源系统可按实际产生系统补录。"} onClose={onClose} footer={<>
      <SecondaryButton onClick={onClose}>取消</SecondaryButton>
      <PrimaryButton onClick={create} disabled={!name.trim() || (fromDataSource && !selectedSource)}>保存并进入待确权</PrimaryButton>
    </>} width="max-w-3xl">
      <div className="space-y-4">
        {fromDataSource && sources.length === 0 ? (
          <EmptyState title="暂无可用数据源" description="请先在“数据集成 → 数据源管理”中新增数据源，再返回添加资产。" />
        ) : null}
        <div className="grid gap-3 rounded-md border border-border bg-surface-raised p-4 sm:grid-cols-2">
          <Field label="资产类型" required><Select value={type} onChange={(v) => { const nt = v as AssetType; setType(nt); setExt(emptyExt(nt)); }} options={ASSET_TYPE_OPTIONS.map((t) => ({ value: t, label: ASSET_TYPE_LABEL[t] }))} className="w-full" /></Field>
          <Field label="资产名称" required hint="建议使用业务可读名 + 英文标识"><Input value={name} onChange={setName} placeholder="客户画像 API" /></Field>
          {fromDataSource ? (
            <Field label="数据源" required hint="直接读取数据源管理中的 SQLite 记录"><Select value={dataSourceId} onChange={changeDataSource} options={sources.map((source) => ({ value: source.id, label: `${source.name}（${source.type} · ${source.status}）` }))} className="w-full" /></Field>
          ) : (
            <Field label="来源系统" hint="填写实际产生该资产的业务系统或平台"><Input value={sourceSystem} onChange={setSourceSystem} placeholder="例如：BI 报表平台" /></Field>
          )}
          <Field label="来源对象 ID" hint={fromDataSource ? "稳定对象 ID；没有时使用下方类型定位信息" : "报告 ID、模型注册 ID 等，选填"}><Input value={sourceObjectId} onChange={setSourceObjectId} placeholder="例如：obj-customer-001" /></Field>
          <Field label="业务域" hint="客户 / 订单 / 财务 / 风险"><Input value={businessDomain} onChange={setBusinessDomain} placeholder="客户" /></Field>
          <Field label="负责人"><Input value={owner} onChange={setOwner} placeholder="张三" /></Field>
          <Field label="安全分类"><Select value={securityLevel} onChange={setSecurityLevel} options={["公开", "内部", "敏感", "高度敏感"].map((v) => ({ value: v, label: v }))} className="w-full" /></Field>
          <Field label="标签" hint="多个用逗号或空格分隔"><Input value={tagsInput} onChange={setTagsInput} placeholder="客户, 画像, API" /></Field>
          <Field label="描述" hint="选填"><TextArea value={description} onChange={setDescription} placeholder="资产用途、更新频率、下游使用方" rows={2} /></Field>
        </div>
        {fromDataSource && selectedSource ? (
          <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] text-blue-700">
            已引用数据源 {selectedSource.id} · {selectedSource.type} · {selectedSource.endpoint}。这里只保存数据源 ID 和脱敏摘要，不复制连接配置。
          </div>
        ) : null}
        <TypeExtForm type={type} ext={ext} setExt={setExt} />
      </div>
    </Modal>
  );
}

function TypeExtForm({ type, ext, setExt }: { type: AssetType; ext: AssetExt; setExt: (e: AssetExt) => void }) {
  if (type === "table") {
    const rows = ext.fields ?? [];
    const updateRow = (idx: number, patch: Partial<AssetField>) => {
      const next = rows.map((row, index) => (index === idx ? { ...row, ...patch } : row));
      setExt({ ...ext, fields: next });
    };
    return (
      <div className="rounded-md border border-border p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[12px] font-medium text-foreground">数据表专属信息</div>
          <button type="button" onClick={() => setExt({ ...ext, fields: [...rows, { name: "", type: "varchar(64)", sensitive: false, comment: "" }] })} className="text-[11px] text-primary hover:underline">+ 添加字段</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="数据库"><Input value={ext.database ?? ""} onChange={(v) => setExt({ ...ext, database: v })} placeholder="crm" /></Field>
          <Field label="Schema"><Input value={ext.schema ?? ""} onChange={(v) => setExt({ ...ext, schema: v })} placeholder="public" /></Field>
          <Field label="表名"><Input value={ext.table ?? ""} onChange={(v) => setExt({ ...ext, table: v })} placeholder="customer" /></Field>
        </div>
        <div className="mt-3 space-y-1.5">
          {rows.map((row, idx) => (
            <div key={idx} className="flex flex-wrap items-center gap-2 rounded border border-border bg-surface-raised px-2 py-1.5">
              <Input value={row.name} onChange={(v) => updateRow(idx, { name: v })} placeholder="字段名" className="min-w-[110px] flex-1" />
              <Input value={row.type} onChange={(v) => updateRow(idx, { type: v })} placeholder="类型" className="w-28" />
              <label className="flex items-center gap-1 text-[11px] text-muted-foreground"><input type="checkbox" checked={row.primaryKey ?? false} onChange={(e) => updateRow(idx, { primaryKey: e.target.checked })} className="h-3.5 w-3.5" />PK</label>
              <label className="flex items-center gap-1 text-[11px] text-muted-foreground"><input type="checkbox" checked={row.sensitive} onChange={(e) => updateRow(idx, { sensitive: e.target.checked })} className="h-3.5 w-3.5" />敏感</label>
              <Input value={row.comment ?? ""} onChange={(v) => updateRow(idx, { comment: v })} placeholder="说明" className="min-w-[120px] flex-1" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === "service") {
    return (
      <div className="grid gap-3 rounded-md border border-border p-4 sm:grid-cols-2">
        <Field label="协议"><Input value={ext.protocol ?? "HTTPS"} onChange={(v) => setExt({ ...ext, protocol: v })} /></Field>
        <Field label="方法"><Select value={ext.method ?? "POST"} onChange={(v) => setExt({ ...ext, method: v })} options={["GET", "POST", "PUT", "DELETE"].map((v) => ({ value: v, label: v }))} className="w-full" /></Field>
        <Field label="路径"><Input value={ext.path ?? ""} onChange={(v) => setExt({ ...ext, path: v })} placeholder="/api/v1/resource" /></Field>
        <Field label="接口版本"><Input value={ext.apiVersion ?? "v1"} onChange={(v) => setExt({ ...ext, apiVersion: v })} /></Field>
        <Field label="请求参数（逗号分隔）"><Input value={(ext.requestParams ?? []).join(", ")} onChange={(v) => setExt({ ...ext, requestParams: v.split(",").map((s) => s.trim()).filter(Boolean) })} placeholder="id, name, status" /></Field>
        <Field label="响应结构"><Input value={ext.responseStructure ?? ""} onChange={(v) => setExt({ ...ext, responseStructure: v })} /></Field>
      </div>
    );
  }

  if (type === "document") {
    return (
      <div className="grid gap-3 rounded-md border border-border p-4 sm:grid-cols-2">
        <Field label="报告格式"><Select value={ext.reportFormat ?? "Excel"} onChange={(v) => setExt({ ...ext, reportFormat: v })} options={["Excel", "PDF", "Word", "HTML", "CSV"].map((v) => ({ value: v, label: v }))} className="w-full" /></Field>
        <Field label="更新周期"><Select value={ext.updateCycle ?? "月度"} onChange={(v) => setExt({ ...ext, updateCycle: v })} options={["每日", "每周", "月度", "季度", "年度"].map((v) => ({ value: v, label: v }))} className="w-full" /></Field>
        <Field label="生成系统"><Input value={ext.generateSystem ?? ""} onChange={(v) => setExt({ ...ext, generateSystem: v })} placeholder="BI 系统" /></Field>
        <Field label="报告版本"><Input value={ext.reportVersion ?? "V1"} onChange={(v) => setExt({ ...ext, reportVersion: v })} /></Field>
        <Field label="关联数据集（逗号分隔）"><Input value={(ext.relatedDatasets ?? []).join(", ")} onChange={(v) => setExt({ ...ext, relatedDatasets: v.split(",").map((s) => s.trim()).filter(Boolean) })} /></Field>
      </div>
    );
  }

  if (type === "model") {
    return (
      <div className="grid gap-3 rounded-md border border-border p-4 sm:grid-cols-2">
        <Field label="模型类型"><Select value={ext.modelType ?? "分类"} onChange={(v) => setExt({ ...ext, modelType: v })} options={["分类", "回归", "推荐", "聚类", "LLM", "多模态"].map((v) => ({ value: v, label: v }))} className="w-full" /></Field>
        <Field label="算法或框架"><Input value={ext.framework ?? ""} onChange={(v) => setExt({ ...ext, framework: v })} placeholder="PyTorch / XGBoost" /></Field>
        <Field label="输入输出"><Input value={ext.inputOutput ?? ""} onChange={(v) => setExt({ ...ext, inputOutput: v })} /></Field>
        <Field label="训练数据来源"><Input value={ext.trainingData ?? ""} onChange={(v) => setExt({ ...ext, trainingData: v })} /></Field>
        <Field label="模型版本"><Input value={ext.modelVersion ?? "V1"} onChange={(v) => setExt({ ...ext, modelVersion: v })} /></Field>
        <Field label="效果指标"><Input value={ext.effectMetrics ?? ""} onChange={(v) => setExt({ ...ext, effectMetrics: v })} placeholder="AUC 0.92, F1 0.88" /></Field>
      </div>
    );
  }

  return (
    <div className="grid gap-3 rounded-md border border-border p-4 sm:grid-cols-2">
      <Field label="更新周期"><Select value={ext.updateCycle ?? "月度"} onChange={(v) => setExt({ ...ext, updateCycle: v })} options={["每日", "每周", "月度", "季度", "年度"].map((v) => ({ value: v, label: v }))} className="w-full" /></Field>
      <Field label="关联数据集（逗号分隔）"><Input value={(ext.relatedDatasets ?? []).join(", ")} onChange={(v) => setExt({ ...ext, relatedDatasets: v.split(",").map((s) => s.trim()).filter(Boolean) })} /></Field>
    </div>
  );
}

function AssetDetailDrawer({ asset, dimensions, onClose, onVoid, onRetire, onArchive, state }: {
  asset: Asset;
  dimensions: { ownership: string; valuation: string; operation: string };
  onClose: () => void; onVoid: () => void; onRetire: () => void; onArchive: () => void;
  state: ReturnType<typeof useDataAssetState>["state"];
}) {
  const [tab, setTab] = useState<"basic" | "type" | "ownership" | "versions" | "valuation" | "products" | "audit" | "changes">("basic");
  const versions = state.catalog.assetVersions.filter((v) => v.assetId === asset.id).sort((a, b) => b.version - a.version);
  const changes = state.catalog.changes.filter((c) => c.assetId === asset.id).sort((a, b) => (a.at < b.at ? 1 : -1));
  const rights = state.ownership.rights.filter((r) => r.assetId === asset.id);
  const evaluations = state.valuation.evaluations.filter((e) => e.assetId === asset.id);
  const products = state.service.products.filter((p) => p.assets.some((ref) => ref.assetId === asset.id));
  const auditEvents = state.audit.events.filter((e) => e.assetId === asset.id);

  const drawerTabs: Array<{ key: typeof tab; label: string; count?: number }> = [
    { key: "basic", label: "基本信息" },
    { key: "type", label: "类型信息" },
    { key: "ownership", label: "权属信息", count: rights.length },
    { key: "versions", label: "版本历史", count: versions.length },
    { key: "valuation", label: "价值评估", count: evaluations.length },
    { key: "products", label: "关联产品", count: products.length },
    { key: "audit", label: "使用审计", count: auditEvents.length },
    { key: "changes", label: "变更历史", count: changes.length },
  ];

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/25 backdrop-blur-[1px]" role="dialog" aria-modal="true">
      <div className="flex h-full w-full max-w-[820px] flex-col overflow-hidden bg-card shadow-2xl animate-[slideInRight_180ms_ease-out]">
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[16px] font-semibold text-foreground">{asset.name}</h2>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">{assetTypeLabel(asset)}</span>
              {asset.voided && <Badge tone="red">已作废</Badge>}
            </div>
            <div className="mt-1 font-mono text-[11px] text-muted-foreground">{asset.id} · v{asset.version} · {asset.sourceSystem}</div>
          </div>
          <button type="button" onClick={onClose} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-slate-100 hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="border-b border-border px-6 pt-2">
          <TabBar tabs={drawerTabs.map((t) => ({ key: t.key, label: t.label, count: t.count }))} active={tab} onChange={(k) => setTab(k as typeof tab)} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="mb-4 grid gap-3 rounded-lg border border-border bg-surface-raised p-4 sm:grid-cols-4">
            {[["目录", asset.catalogStatus === "normal" ? "正常" : CATALOG_STATUS_LABEL[asset.catalogStatus]], ["权属", dimensions.ownership], ["评估", dimensions.valuation], ["运营", dimensions.operation]].map(([label, value]) => (
              <div key={label}><div className="text-[11px] text-muted-foreground">{label}</div><div className="mt-1"><Badge tone={DIM_TONE[value as string]}>{value as string}</Badge></div></div>
            ))}
          </div>

          {tab === "basic" && (
            <section className="space-y-5">
              <div className="grid gap-3 rounded-md border border-border p-4 text-[12px] sm:grid-cols-2">
                {[["业务域", asset.businessDomain], ["资产负责人", asset.owner], ["安全分类", asset.securityLevel], ["标签", asset.tags.join("、")], ["数据源 ID", asset.dataSourceId ?? "—"], ["来源对象 ID", asset.sourceObjectId ?? "—"], ["更新时间", asset.updatedAt], ["描述", asset.description]].map(([label, value]) => (
                  <div key={label as string}><div className="text-[11px] text-muted-foreground">{label}</div><div className="mt-0.5 text-foreground">{value}</div></div>
                ))}
              </div>
            </section>
          )}

          {tab === "type" && <AssetExtInfo asset={asset} />}

          {tab === "ownership" && (
            <section>
              <div className="mb-2 text-[13px] font-semibold text-foreground">权属登记</div>
              {rights.length === 0 ? <EmptyState title="暂无权属登记" description="前往权属登记页面登记持有权、使用权或经营权" /> : (
                <div className="space-y-2">
                  {rights.map((r) => (
                    <div key={r.id} className="rounded-md border border-border p-3 text-[12px]">
                      <div className="flex items-center gap-2 font-medium text-foreground"><span>{r.holder}</span><Badge tone={r.status === "confirmed" ? "green" : r.status === "pending" ? "amber" : "slate"}>{r.status === "confirmed" ? "已确权" : r.status === "pending" ? "待确认" : "已失效"}</Badge><span className="text-muted-foreground">· {r.rightType}</span></div>
                      <div className="mt-1 grid gap-1 text-[11px] text-muted-foreground sm:grid-cols-2">
                        <div>数据范围：{r.dataScope}</div><div>用途：{r.purpose}</div>
                        <div>有效期：{r.effectiveFrom} ~ {r.effectiveTo}</div><div>依据：{r.basis}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {tab === "versions" && (
            <section>
              <div className="mb-2 text-[13px] font-semibold text-foreground">版本历史</div>
              {versions.length === 0 ? <EmptyState title="暂无版本记录" description="首次编目自动生成 v1；扫描发现结构变化时自动生成新版本" /> : (
                <div className="space-y-2">
                  {versions.map((v) => (
                    <div key={v.id} className="rounded-md border border-border p-3 text-[12px]">
                      <div className="flex items-center gap-2 font-medium text-foreground">
                        <span className="rounded bg-blue-50 px-1.5 py-0.5 font-mono text-[11px] text-blue-700">v{v.version}</span>
                        <span className="text-muted-foreground">· {v.changedAt}</span>
                        <span className="text-muted-foreground">· {v.changedBy}</span>
                      </div>
                      <div className="mt-1 text-[11px] text-muted-foreground">{v.reason}</div>
                      {v.diff.length > 0 && (
                        <ul className="mt-2 space-y-0.5 rounded bg-slate-50 p-2 font-mono text-[11px] text-slate-700">
                          {v.diff.map((d, i) => <li key={i}>· {d}</li>)}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {tab === "valuation" && (
            <section>
              <div className="mb-2 text-[13px] font-semibold text-foreground">价值评估</div>
              {evaluations.length === 0 ? <EmptyState title="暂无评估记录" description="评估模块创建后自动关联资产并定期重估" /> : (
                <div className="space-y-2">
                  {evaluations.map((e) => (
                    <div key={e.id} className="rounded-md border border-border p-3 text-[12px]">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{e.basisDate}</span>
                        <Badge tone={e.status === "已生效" ? "green" : e.status === "已过期" ? "red" : e.status === "已被替代" ? "amber" : "slate"}>{e.status}</Badge>
                        <span className="ml-auto text-[13px] font-semibold text-primary">{e.finalValue?.toLocaleString() ?? "—"} 万元</span>
                      </div>
                      <div className="mt-1 text-[11px] text-muted-foreground">评估人：{e.appraiser} · 有效期至 {e.validUntil}</div>
                      {e.methods.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {e.methods.map((m) => <span key={m.method} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">{m.method}：{m.result} 万元</span>)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {tab === "products" && (
            <section>
              <div className="mb-2 text-[13px] font-semibold text-foreground">关联产品</div>
              {products.length === 0 ? <EmptyState title="暂无关联产品" description="可在数据服务页面基于此资产创建数据产品" /> : (
                <div className="overflow-x-auto">
                  <table className="w-full border-separate border-spacing-0 text-[12px]">
                    <thead><tr className="text-[11px] text-slate-500">{["产品", "交付方式", "服务版本", "状态", "负责人"].map((l) => <th key={l} className="border-b border-border py-2 pr-3 text-left">{l}</th>)}</tr></thead>
                    <tbody>
                      {products.map((p) => (
                        <tr key={p.id} className="text-foreground">
                          <td className="border-b border-border py-2 pr-3 font-medium">{p.name}</td>
                          <td className="border-b border-border py-2 pr-3 text-muted-foreground">{p.delivery}</td>
                          <td className="border-b border-border py-2 pr-3"><span className="rounded bg-blue-50 px-1.5 py-0.5 font-mono text-[11px] text-blue-700">v{p.serviceVersion}</span></td>
                          <td className="border-b border-border py-2 pr-3"><Badge tone={p.status === "已发布" ? "green" : p.status === "已暂停" ? "amber" : p.status === "已下线" ? "slate" : "blue"}>{p.status}</Badge></td>
                          <td className="border-b border-border py-2 pr-3 text-muted-foreground">{p.owner}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {tab === "audit" && (
            <section>
              <div className="mb-2 text-[13px] font-semibold text-foreground">使用审计</div>
              {auditEvents.length === 0 ? <EmptyState title="暂无访问记录" description="资产被数据产品发布后，访问会在此留痕" /> : (
                <div className="overflow-x-auto">
                  <table className="w-full border-separate border-spacing-0 text-[12px]">
                    <thead><tr className="text-[11px] text-slate-500">{["时间", "访问方", "渠道", "结果", "记录数", "耗时"].map((l) => <th key={l} className="border-b border-border py-2 pr-3 text-left">{l}</th>)}</tr></thead>
                    <tbody>
                      {auditEvents.slice(0, 20).map((ev) => (
                        <tr key={ev.id} className="text-foreground">
                          <td className="border-b border-border py-2 pr-3 font-mono text-[11px] tabular-nums text-muted-foreground">{ev.at}</td>
                          <td className="border-b border-border py-2 pr-3">{ev.principal} <span className="text-muted-foreground">· {ev.principalKind}</span></td>
                          <td className="border-b border-border py-2 pr-3 text-muted-foreground">{ev.channel}</td>
                          <td className="border-b border-border py-2 pr-3"><Badge tone={ev.result === "成功" ? "green" : ev.result === "失败" ? "red" : ev.result === "拒绝" ? "amber" : "slate"}>{ev.result}</Badge></td>
                          <td className="border-b border-border py-2 pr-3 text-muted-foreground">{ev.recordCount ?? "—"}</td>
                          <td className="border-b border-border py-2 pr-3 text-muted-foreground">{ev.durationMs ? `${ev.durationMs}ms` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {tab === "changes" && (
            <section>
              <div className="mb-2 text-[13px] font-semibold text-foreground">变更历史</div>
              {changes.length === 0 ? <EmptyState title="暂无变更记录" description="任何变更都会自动留痕，不做业务硬删除" /> : (
                <div className="space-y-1.5">
                  {changes.map((c) => (
                    <div key={c.id} className="flex items-start gap-2 rounded-md border border-border p-2.5 text-[12px]">
                      <div className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded bg-primary/10 text-primary">
                        <ShieldCheck className="h-3 w-3" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{c.kind}</span>
                          <span className="text-muted-foreground">· {c.actor}</span>
                          <span className="ml-auto font-mono text-[11px] tabular-nums text-muted-foreground">{c.at}</span>
                        </div>
                        {(c.before || c.after) && <div className="mt-0.5 text-[11px] text-muted-foreground">{c.before || "—"} → {c.after || "—"}</div>}
                        {c.reason && <div className="mt-0.5 text-[11px] text-muted-foreground">原因：{c.reason}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-4">
            {asset.catalogStatus !== "retired" && asset.catalogStatus !== "archived" && !asset.voided && (
              <button type="button" onClick={onRetire} className="inline-flex h-8 items-center gap-1 rounded-md border border-input px-3 text-[12px] text-foreground hover:border-primary/30 hover:text-primary"><Archive className="h-3.5 w-3.5" />{asset.catalogStatus === "retiring" ? "继续退役流程" : "申请退役"}</button>
            )}
            {asset.catalogStatus === "retired" && (
              <button type="button" onClick={onArchive} className="inline-flex h-8 items-center gap-1 rounded-md border border-input px-3 text-[12px] text-foreground hover:border-primary/30 hover:text-primary"><Archive className="h-3.5 w-3.5" />归档（只读）</button>
            )}
            {!asset.voided && asset.catalogStatus === "normal" && (
              <button type="button" onClick={onVoid} className="inline-flex h-8 items-center gap-1 rounded-md border border-input px-3 text-[12px] text-foreground hover:border-primary/30 hover:text-primary"><XCircle className="h-3.5 w-3.5" />误录作废</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AssetExtInfo({ asset }: { asset: Asset }) {
  const ext = asset.ext;
  if (asset.type === "table") {
    return (
      <section>
        <div className="mb-2 text-[13px] font-semibold text-foreground">数据表信息</div>
        <div className="mb-3 grid gap-3 rounded-md border border-border p-3 text-[12px] sm:grid-cols-3">
          <div><div className="text-[11px] text-muted-foreground">数据库</div><div className="mt-0.5">{ext.database ?? "—"}</div></div>
          <div><div className="text-[11px] text-muted-foreground">Schema</div><div className="mt-0.5">{ext.schema ?? "—"}</div></div>
          <div><div className="text-[11px] text-muted-foreground">表名</div><div className="mt-0.5 font-mono">{ext.table ?? "—"}</div></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0 text-[12px]">
            <thead><tr className="text-[11px] text-slate-500">{["字段", "类型", "PK", "敏感", "说明"].map((l) => <th key={l} className="border-b border-border py-2 pr-3 text-left">{l}</th>)}</tr></thead>
            <tbody>
              {(ext.fields ?? []).map((f, i) => (
                <tr key={i} className="text-foreground">
                  <td className="border-b border-border py-2 pr-3 font-mono">{f.name}</td>
                  <td className="border-b border-border py-2 pr-3 font-mono text-muted-foreground">{f.type}</td>
                  <td className="border-b border-border py-2 pr-3">{f.primaryKey ? <span className="text-amber-600">●</span> : "—"}</td>
                  <td className="border-b border-border py-2 pr-3">{f.sensitive ? <Badge tone="red">敏感</Badge> : "—"}</td>
                  <td className="border-b border-border py-2 pr-3 text-muted-foreground">{f.comment ?? "—"}</td>
                </tr>
              ))}
              {(!ext.fields || ext.fields.length === 0) && <tr><td colSpan={5} className="py-6 text-center text-[12px] text-muted-foreground">暂未登记字段</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    );
  }
  if (asset.type === "service") {
    return (
      <section className="space-y-3">
        <div className="mb-2 text-[13px] font-semibold text-foreground">API 定义</div>
        <div className="grid gap-3 rounded-md border border-border p-3 text-[12px] sm:grid-cols-2">
          <div><div className="text-[11px] text-muted-foreground">协议</div><div className="mt-0.5">{ext.protocol}</div></div>
          <div><div className="text-[11px] text-muted-foreground">方法</div><div className="mt-0.5 font-mono">{ext.method}</div></div>
          <div className="sm:col-span-2"><div className="text-[11px] text-muted-foreground">路径</div><div className="mt-0.5 font-mono">{ext.path}</div></div>
          <div><div className="text-[11px] text-muted-foreground">接口版本</div><div className="mt-0.5 font-mono">{ext.apiVersion}</div></div>
          <div><div className="text-[11px] text-muted-foreground">请求参数</div><div className="mt-0.5">{(ext.requestParams ?? []).join(", ") || "—"}</div></div>
          <div className="sm:col-span-2"><div className="text-[11px] text-muted-foreground">响应结构</div><div className="mt-0.5 text-muted-foreground">{ext.responseStructure || "—"}</div></div>
        </div>
      </section>
    );
  }
  if (asset.type === "document") {
    return (
      <section className="space-y-3">
        <div className="mb-2 text-[13px] font-semibold text-foreground">报告信息</div>
        <div className="grid gap-3 rounded-md border border-border p-3 text-[12px] sm:grid-cols-2">
          <div><div className="text-[11px] text-muted-foreground">格式</div><div className="mt-0.5">{ext.reportFormat}</div></div>
          <div><div className="text-[11px] text-muted-foreground">更新周期</div><div className="mt-0.5">{ext.updateCycle}</div></div>
          <div><div className="text-[11px] text-muted-foreground">生成系统</div><div className="mt-0.5">{ext.generateSystem || "—"}</div></div>
          <div><div className="text-[11px] text-muted-foreground">报告版本</div><div className="mt-0.5 font-mono">{ext.reportVersion}</div></div>
          <div className="sm:col-span-2"><div className="text-[11px] text-muted-foreground">关联数据集</div><div className="mt-0.5">{(ext.relatedDatasets ?? []).join(", ") || "—"}</div></div>
        </div>
      </section>
    );
  }
  if (asset.type === "model") {
    return (
      <section className="space-y-3">
        <div className="mb-2 text-[13px] font-semibold text-foreground">模型信息</div>
        <div className="grid gap-3 rounded-md border border-border p-3 text-[12px] sm:grid-cols-2">
          <div><div className="text-[11px] text-muted-foreground">模型类型</div><div className="mt-0.5">{ext.modelType}</div></div>
          <div><div className="text-[11px] text-muted-foreground">算法 / 框架</div><div className="mt-0.5">{ext.framework || "—"}</div></div>
          <div className="sm:col-span-2"><div className="text-[11px] text-muted-foreground">输入 / 输出</div><div className="mt-0.5 text-muted-foreground">{ext.inputOutput || "—"}</div></div>
          <div className="sm:col-span-2"><div className="text-[11px] text-muted-foreground">训练数据来源</div><div className="mt-0.5 text-muted-foreground">{ext.trainingData || "—"}</div></div>
          <div><div className="text-[11px] text-muted-foreground">模型版本</div><div className="mt-0.5 font-mono">{ext.modelVersion}</div></div>
          <div><div className="text-[11px] text-muted-foreground">效果指标</div><div className="mt-0.5 text-muted-foreground">{ext.effectMetrics || "—"}</div></div>
        </div>
      </section>
    );
  }
  return <EmptyState title={`暂未登记 ${ASSET_TYPE_LABEL[asset.type]} 专属信息`} description="在资产详情中补充后会在下次扫描时同步" />;
}

function RetireCheckModal({ asset, blockers, onClose, onRetire }: { asset: Asset; blockers: { products: DataProduct[]; authorizations: Authorization[]; anomalies: { id: string }[] }; onClose: () => void; onRetire: () => void }) {
  const hasBlockers = blockers.products.length > 0 || blockers.authorizations.length > 0 || blockers.anomalies.length > 0;
  return (
    <Modal title="退役前需处理的关联项" description={`资产 ${asset.name} 存在未处理关联，退役前必须先解除`} onClose={onClose} footer={<>
      <SecondaryButton onClick={onClose}>{hasBlockers ? "知道了" : "取消"}</SecondaryButton>
      {!hasBlockers && <PrimaryButton onClick={onRetire}>确认退役</PrimaryButton>}
    </>}>
      {hasBlockers ? (
        <div className="space-y-3">
          {blockers.products.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-[12px]">
              <div className="font-medium text-amber-800">关联中产品（{blockers.products.length}）</div>
              <div className="mt-1 space-y-0.5 text-amber-700">{blockers.products.map((p) => <div key={p.id}>· {p.name}（{p.status}）</div>)}</div>
            </div>
          )}
          {blockers.authorizations.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-[12px]">
              <div className="font-medium text-amber-800">有效授权（{blockers.authorizations.length}）</div>
              <div className="mt-1 space-y-0.5 text-amber-700">{blockers.authorizations.map((a) => <div key={a.id}>· {a.productName} → {a.applicant}（{a.status}）</div>)}</div>
            </div>
          )}
          {blockers.anomalies.length > 0 && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-[12px]">
              <div className="font-medium text-red-800">未关闭异常（{blockers.anomalies.length}）</div>
              <div className="mt-1 text-red-700">需先关闭异常再退役</div>
            </div>
          )}
        </div>
      ) : (
        <WarnNote text="已无关联产品、有效授权和未关闭异常，可执行退役" />
      )}
    </Modal>
  );
}
