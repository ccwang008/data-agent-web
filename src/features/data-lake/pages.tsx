import { useState } from "react";
import {
  Archive, Boxes, CheckCircle2, ChevronRight, Clock3, Database, FileText,
  Flame, Layers3, Pencil, Plus, RefreshCw, Search, Snowflake, Table2,
  ThermometerSun, Trash2, TrendingUp,
} from "lucide-react";

import {
  ActionButton, InlineNotice, MiniStat, PageTitle, Panel, Pill, ProgressBar,
  WorkspacePage,
} from "@/components/data-platform/WorkspacePrimitives";
import { statusTone } from "@/components/data-platform/workspace-utils";
import { Modal, Field, Select, Input, TextArea } from "@/features/data-asset/components/common";
import { useSqliteState } from "@/lib/sqlite-client";
import { cn } from "@/lib/utils";

type LakeObject = {
  id: string; name: string; type: string; location: string; size: string; tier: string;
  owner: string; status: string; updatedAt: string; retentionPolicyId?: string; lineageId?: string;
};

type LakeTableField = {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: string;
  isPartitionKey?: boolean;
  isSortKey?: boolean;
  comment?: string;
};

type LakeTable = {
  id: string; name: string; format: string; schemaVersion: string; partitions: string;
  acid: string; owner: string; status: string; updatedAt: string;
  fields: LakeTableField[];
  description?: string;
};

const TABLE_FORMATS = [
  { value: "Iceberg", label: "Apache Iceberg" },
  { value: "Delta", label: "Delta Lake" },
  { value: "Hudi", label: "Apache Hudi" },
];

const FIELD_TYPES = [
  "string", "bigint", "integer", "decimal(20,2)", "double", "float",
  "boolean", "date", "timestamp", "array<string>", "map<string,string>", "json",
];

type CapacityTier = {
  id: string; name: string; quota: string; used: string; growth: string; policy: string;
  owner: string; status: string; updatedAt: string;
};

const storageRecords: LakeObject[] = [
  { id: "lake-001", name: "ods_trade_order", type: "数据表", location: "lake://ods/trade_order", size: "2.8 TB", tier: "热", owner: "张敏", status: "正常", updatedAt: "2026-08-13 09:12", retentionPolicyId: "ret-30d", lineageId: "lin-trade" },
  { id: "lake-002", name: "customer-contracts", type: "文档", location: "lake://document/contracts", size: "640 GB", tier: "温", owner: "王雪", status: "正常", updatedAt: "2026-08-13 08:36", retentionPolicyId: "ret-7y" },
  { id: "lake-003", name: "device-video-archive", type: "视频", location: "lake://media/device", size: "18.4 TB", tier: "冷", owner: "李浩", status: "迁移中", updatedAt: "2026-08-13 07:20", retentionPolicyId: "ret-180d" },
  { id: "lake-004", name: "gateway-access-log", type: "日志", location: "lake://log/gateway", size: "8.7 TB", tier: "热", owner: "平台运维", status: "正常", updatedAt: "2026-08-13 09:20", retentionPolicyId: "ret-14d" },
  { id: "lake-005", name: "annual-report-2023", type: "文件", location: "lake://archive/reports/2023", size: "1.2 TB", tier: "归档", owner: "合规团队", status: "只读", updatedAt: "2026-08-11 12:00", retentionPolicyId: "ret-7y" },
];

const tableRecords: LakeTable[] = [
  { id: "table-001", name: "dwd_customer_profile", format: "Iceberg", schemaVersion: "v18", partitions: "dt / region", acid: "启用", owner: "陈晨", status: "已发布", updatedAt: "2026-08-13 08:50", fields: [
    { name: "customer_id", type: "string", required: true, comment: "客户永久标识，全局唯一", defaultValue: "", isSortKey: true },
    { name: "profile_tags", type: "array<string>", required: false, comment: "画像标签集合，由标签引擎每日刷新" },
    { name: "region", type: "string", required: true, comment: "区域分区键", isPartitionKey: true, defaultValue: "CN" },
    { name: "dt", type: "date", required: true, comment: "业务日期分区", isPartitionKey: true },
    { name: "level_code", type: "integer", required: false, comment: "客户等级 1-5", defaultValue: "1" },
    { name: "update_ts", type: "timestamp", required: false, comment: "画像更新时间" },
  ] },
  { id: "table-002", name: "dws_trade_summary", format: "Delta", schemaVersion: "v7", partitions: "month", acid: "启用", owner: "张敏", status: "变更审批", updatedAt: "2026-08-12 17:46", fields: [
    { name: "month", type: "string", required: true, comment: "月份分区 YYYY-MM", isPartitionKey: true },
    { name: "trade_amount", type: "decimal(20,2)", required: true, comment: "交易金额（含税）" },
    { name: "order_count", type: "bigint", required: true, comment: "订单数" },
    { name: "cust_count", type: "bigint", required: false, comment: "付费客户数", defaultValue: "0" },
    { name: "refund_rate", type: "double", required: false, comment: "退款率 0-1", defaultValue: "0" },
  ] },
  { id: "table-003", name: "ads_risk_alert", format: "Hudi", schemaVersion: "v4", partitions: "dt", acid: "启用", owner: "周凯", status: "已发布", updatedAt: "2026-08-12 16:02", fields: [
    { name: "alert_id", type: "string", required: true, comment: "预警唯一标识" },
    { name: "risk_level", type: "string", required: true, comment: "风险等级：low/medium/high/critical", defaultValue: "medium" },
    { name: "dt", type: "date", required: true, comment: "分区日期", isPartitionKey: true },
    { name: "score", type: "double", required: false, comment: "风险评分 0-100" },
    { name: "handled", type: "boolean", required: false, comment: "是否已处置", defaultValue: "false" },
  ] },
];

const capacityRecords: CapacityTier[] = [
  { id: "capacity-hot", name: "热数据层", quota: "40 TB", used: "31.2 TB", growth: "+8.2% / 月", policy: "30 天转温", owner: "平台运维", status: "正常", updatedAt: "2026-08-13 09:00" },
  { id: "capacity-warm", name: "温数据层", quota: "80 TB", used: "52.8 TB", growth: "+4.1% / 月", policy: "180 天转冷", owner: "平台运维", status: "正常", updatedAt: "2026-08-13 09:00" },
  { id: "capacity-cold", name: "冷数据层", quota: "240 TB", used: "188.5 TB", growth: "+2.8% / 月", policy: "7 年转归档", owner: "合规与运维", status: "容量预警", updatedAt: "2026-08-13 09:00" },
  { id: "capacity-archive", name: "归档层", quota: "500 TB", used: "264 TB", growth: "+1.2% / 月", policy: "到期受控清理", owner: "合规与运维", status: "正常", updatedAt: "2026-08-13 09:00" },
];

const tiers = [
  { key: "热", label: "热数据", icon: Flame, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" },
  { key: "温", label: "温数据", icon: ThermometerSun, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  { key: "冷", label: "冷数据", icon: Snowflake, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  { key: "归档", label: "归档", icon: Archive, color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200" },
];

function sizeInTb(value?: string) {
  const normalized = value ?? "0 TB";
  const number = Number.parseFloat(normalized) || 0;
  return normalized.includes("GB") ? number / 1024 : number;
}

function percent(used?: string, quota?: string) {
  return Math.round((sizeInTb(used) / Math.max(sizeInTb(quota), 0.1)) * 100);
}

export function DataLakeStoragePage() {
  const [objects, setObjects, meta] = useSqliteState<LakeObject[]>("data-agent.data-lake.storage", storageRecords);
  const [tier, setTier] = useState("全部");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(objects[0]?.id ?? "");
  const selected = objects.find((item) => item.id === selectedId) ?? objects[0];
  const filtered = objects.filter((item) => (tier === "全部" || item.tier === tier) && `${item.name} ${item.type} ${item.location}`.toLowerCase().includes(query.toLowerCase()));

  function validateLifecycle(id: string) {
    setObjects((current) => current.map((item) => item.id === id ? { ...item, status: "校验中", updatedAt: "刚刚" } : item));
    window.setTimeout(() => setObjects((current) => current.map((item) => item.id === id ? { ...item, status: "正常", updatedAt: "刚刚" } : item)), 650);
  }

  return (
    <WorkspacePage>
      <PageTitle eyebrow="Data Lake / Object Storage" title="统一数据存储" description="从对象分布和生命周期视角管理结构化与非结构化数据，而不是只维护一张对象清单。" actions={<ActionButton icon={RefreshCw} onClick={() => selected && validateLifecycle(selected.id)}>校验当前对象</ActionButton>} />
      <InlineNotice error={meta.error} loading={!meta.hydrated} />

      <section className="grid gap-3 lg:grid-cols-4">
        {tiers.map((item) => {
          const Icon = item.icon;
          const values = objects.filter((object) => object.tier === item.key);
          const active = tier === item.key;
          return <button key={item.key} type="button" onClick={() => setTier(active ? "全部" : item.key)} className={cn("rounded-lg border bg-card p-4 text-left shadow-sm transition", active ? `${item.border} ring-2 ring-primary/10` : "border-border hover:border-primary/30")}><div className="flex items-center justify-between"><span className={cn("grid h-8 w-8 place-items-center rounded-md", item.bg, item.color)}><Icon className="h-4 w-4" /></span><span className="text-[10px] text-muted-foreground">{values.length} 个对象</span></div><div className="mt-3 text-[13px] font-semibold text-foreground">{item.label}</div><div className="mt-1 text-[20px] font-semibold tabular-nums text-foreground">{values.reduce((sum, value) => sum + sizeInTb(value.size), 0).toFixed(1)} TB</div><div className="mt-1 text-[10px] text-muted-foreground">{item.key === "热" ? "高频访问 · 30 天" : item.key === "温" ? "近线分析 · 180 天" : item.key === "冷" ? "低频访问 · 7 年" : "只读保留 · 受控清理"}</div></button>;
        })}
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_360px]">
        <Panel title="存储对象浏览器" description={tier === "全部" ? "全部层级" : `${tier}数据层`} actions={<label className="relative"><Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索对象或位置" className="h-8 w-52 rounded-md border border-input bg-background pl-8 pr-3 text-[11px] outline-none focus:border-primary" /></label>}>
          <div className="grid grid-cols-[1.3fr_.7fr_.8fr_.55fr] border-b border-border bg-muted/40 px-4 py-2 text-[10px] font-medium text-muted-foreground"><span>对象</span><span>类型</span><span>层级 / 容量</span><span>状态</span></div>
          <div className="divide-y divide-border">
            {filtered.map((item) => <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={cn("grid w-full grid-cols-[1.3fr_.7fr_.8fr_.55fr] items-center px-4 py-3 text-left text-[11px] transition hover:bg-muted/30", selected?.id === item.id && "bg-blue-50/60")}><span className="min-w-0"><span className="block truncate font-medium text-foreground">{item.name}</span><span className="mt-0.5 block truncate font-mono text-[9px] text-muted-foreground">{item.location}</span></span><span className="text-muted-foreground">{item.type}</span><span><span className="font-medium text-foreground">{item.tier}</span><span className="ml-2 text-muted-foreground">{item.size}</span></span><Pill tone={statusTone(item.status)}>{item.status}</Pill></button>)}
          </div>
        </Panel>

        <Panel title="对象生命周期" description="当前对象的策略、血缘和迁移路径">
          {selected ? <div className="p-4">
            <div className="flex items-start justify-between gap-3"><div><div className="text-[14px] font-semibold text-foreground">{selected.name}</div><div className="mt-1 font-mono text-[10px] text-muted-foreground">{selected.id}</div></div><Pill tone={statusTone(selected.status)}>{selected.status}</Pill></div>
            <div className="mt-4 space-y-3 text-[11px]">{[["责任人", selected.owner], ["保留策略", selected.retentionPolicyId ?? "未绑定"], ["血缘引用", selected.lineageId ?? "暂无"], ["最近变更", selected.updatedAt]].map(([label, value]) => <div key={label} className="flex justify-between gap-4 border-b border-border pb-2"><span className="text-muted-foreground">{label}</span><span className="text-right text-foreground">{value}</span></div>)}</div>
            <div className="mt-5"><div className="mb-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Lifecycle path</div><div className="flex items-center gap-1">{tiers.map((item, index) => <div key={item.key} className="flex min-w-0 flex-1 items-center"><div className={cn("flex-1 rounded-md border px-2 py-2 text-center text-[10px]", selected.tier === item.key ? `${item.bg} ${item.border} ${item.color} font-semibold` : "border-border bg-muted/30 text-muted-foreground")}>{item.key}</div>{index < tiers.length - 1 && <ChevronRight className="h-3 w-3 shrink-0 text-slate-300" />}</div>)}</div></div>
            <ActionButton primary icon={CheckCircle2} onClick={() => validateLifecycle(selected.id)}>运行生命周期校验</ActionButton>
          </div> : <div className="p-8 text-center text-[11px] text-muted-foreground">选择一个存储对象</div>}
        </Panel>
      </div>
    </WorkspacePage>
  );
}

export function DataLakeTablesPage() {
  const [tables, setTables, meta] = useSqliteState<LakeTable[]>("data-agent.data-lake.tables", tableRecords);
  const [selectedId, setSelectedId] = useState(tables[0]?.id ?? "");
  const [editing, setEditing] = useState<LakeTable | null>(null);
  const [fieldEditor, setFieldEditor] = useState<{ tableId: string; index: number; field: LakeTableField } | null>(null);

  const selected = tables.find((table) => table.id === selectedId) ?? tables[0];
  const schema = selected?.fields ?? [];

  function openCreate() {
    setEditing(newLakeTable());
  }

  function saveTable(table: LakeTable) {
    setTables((current) => {
      const idx = current.findIndex((t) => t.id === table.id);
      if (idx >= 0) {
        const next = [...current];
        next[idx] = { ...table, updatedAt: "刚刚" };
        return next;
      }
      return [{ ...table, updatedAt: "刚刚" }, ...current];
    });
    setEditing(null);
  }

  function deleteTable(id: string) {
    if (!window.confirm("确认删除该湖表？关联的任务和血缘关系将断开。")) return;
    setTables((current) => current.filter((t) => t.id !== id));
    if (selectedId === id) setSelectedId(tables[0]?.id ?? "");
  }

  function openAddField(tableId: string) {
    setFieldEditor({ tableId, index: -1, field: blankField() });
  }
  function openEditField(tableId: string, index: number) {
    setFieldEditor({ tableId, index, field: { ...tables.find((t) => t.id === tableId)!.fields[index] } });
  }
  function saveField(updated: LakeTableField) {
    if (!fieldEditor) return;
    const { tableId, index } = fieldEditor;
    setTables((current) => current.map((t) => {
      if (t.id !== tableId) return t;
      const fields = index >= 0
        ? t.fields.map((f, i) => i === index ? updated : f)
        : [...t.fields, updated];
      return { ...t, fields, updatedAt: "刚刚" };
    }));
    setFieldEditor(null);
  }

  function removeFieldFromTable(tableId: string, fieldName: string) {
    setTables((current) => current.map((t) => t.id === tableId
      ? { ...t, fields: t.fields.filter((f) => f.name !== fieldName), updatedAt: "刚刚" }
      : t));
  }

  function submitVersion() {
    if (!selected) return;
    setTables((current) => current.map((table) => table.id === selected.id ? { ...table, status: "变更审批", updatedAt: "刚刚" } : table));
  }

  return (
    <WorkspacePage>
      <PageTitle eyebrow="Data Lake / Table Modeling" title="湖表建模工作台" description="围绕表、Schema、分区和版本演进组织工作区；选中湖表后在右侧完成结构审查。" actions={<ActionButton primary icon={Plus} onClick={openCreate}>新建表</ActionButton>} />
      <InlineNotice error={meta.error} loading={!meta.hydrated} />
      <div className="grid min-h-[650px] gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <Panel title="湖表目录" description={`${tables.length} 张表 · 3 种开放表格式`}>
          <div className="divide-y divide-border">
            {tables.map((table) => <button key={table.id} type="button" onClick={() => setSelectedId(table.id)} className={cn("w-full p-4 text-left transition hover:bg-muted/30", selected?.id === table.id && "border-l-2 border-primary bg-blue-50/60 pl-[14px]")}><div className="flex items-start justify-between gap-2"><span className="font-mono text-[11px] font-semibold text-foreground">{table.name}</span><Pill tone={statusTone(table.status)}>{table.status}</Pill></div><div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground"><span>{table.format}</span><span>{table.schemaVersion}</span><span>{table.owner}</span></div></button>)}
          </div>
        </Panel>
        {selected && <div className="space-y-4">
          <Panel>
            <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex items-center gap-2"><Table2 className="h-5 w-5 text-primary" /><h2 className="font-mono text-[17px] font-semibold text-foreground">{selected.name}</h2></div><div className="mt-2 flex flex-wrap gap-2"><Pill tone="blue">{selected.format}</Pill><Pill tone="green">ACID {selected.acid}</Pill><Pill>{selected.partitions}</Pill></div>{selected.description && <p className="mt-2 text-[12px] text-muted-foreground">{selected.description}</p>}</div><div className="flex gap-2"><ActionButton onClick={() => setEditing(selected)}><Pencil className="h-3.5 w-3.5" /> 编辑表</ActionButton><ActionButton onClick={() => setTables((current) => current.map((table) => table.id === selected.id ? { ...table, status: "草稿", updatedAt: "刚刚" } : table))}>创建草稿</ActionButton><ActionButton primary onClick={submitVersion}>提交版本</ActionButton></div></div>
          </Panel>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <Panel title={`Schema ${selected.schemaVersion}`} description={`${schema.length} 个字段 · 分区 ${selected.partitions}`} actions={<ActionButton icon={Plus} onClick={() => openAddField(selected.id)}>添加字段</ActionButton>}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] text-left text-[11px]">
                  <thead className="bg-muted/40 text-[10px] text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2.5 min-w-[140px]">字段</th>
                      <th className="px-3 py-2.5 w-32">类型</th>
                      <th className="px-3 py-2.5 w-20">约束</th>
                      <th className="px-3 py-2.5 w-24">默认值</th>
                      <th className="px-3 py-2.5 w-20">角色</th>
                      <th className="px-3 py-2.5">字段注释</th>
                      <th className="px-3 py-2.5 w-20"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {schema.map((field, idx) => (
                      <tr key={field.name} className="group hover:bg-muted/20">
                        <td className="px-3 py-3">
                          <span className="font-mono font-medium text-foreground">{field.name}</span>
                        </td>
                        <td className="px-3 py-3 font-mono text-blue-700">{field.type}</td>
                        <td className="px-3 py-3">
                          {field.required ? <Pill tone="amber">NOT NULL</Pill> : <span className="text-muted-foreground">可空</span>}
                        </td>
                        <td className="px-3 py-3 font-mono text-muted-foreground">{field.defaultValue !== undefined && field.defaultValue !== "" ? field.defaultValue : <span className="text-slate-300">—</span>}</td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1">
                            {field.isPartitionKey && <span className="rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">分区</span>}
                            {field.isSortKey && <span className="rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">排序</span>}
                            {!field.isPartitionKey && !field.isSortKey && <span className="text-slate-300">—</span>}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">{field.comment ?? <span className="text-slate-300">—</span>}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openEditField(selected.id, idx)} className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-blue-50 hover:text-blue-600" aria-label="编辑字段"><Pencil className="h-3 w-3" /></button>
                            <button onClick={() => removeFieldFromTable(selected.id, field.name)} className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-red-50 hover:text-red-600" aria-label="删除字段"><Trash2 className="h-3 w-3" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {schema.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">暂无字段，点击右上角"添加字段"</td></tr>}
                  </tbody>
                </table>
              </div>
            </Panel>
            <div className="space-y-4">
              <Panel title="版本轨迹"><div className="space-y-0 p-4">{[selected.schemaVersion, `v${Math.max(1, Number(selected.schemaVersion.slice(1)) - 1)}`, "v1"].filter((value, index, values) => values.indexOf(value) === index).map((version, index) => <div key={version} className="relative flex gap-3 pb-5 last:pb-0"><div className={cn("mt-0.5 h-3 w-3 rounded-full border-2", index === 0 ? "border-primary bg-primary" : "border-slate-300 bg-white")} />{index < 2 && <div className="absolute left-[5px] top-3 h-full w-px bg-border" />}<div><div className="font-mono text-[11px] font-semibold text-foreground">{version}</div><div className="mt-0.5 text-[10px] text-muted-foreground">{index === 0 ? "当前发布版本" : index === 1 ? "字段定义调整" : "首次建表"}</div></div></div>)}</div></Panel>
              <Panel title="表属性"><div className="space-y-2 p-4 text-[11px]">{[["负责人", selected.owner], ["表格式", selected.format], ["事务能力", selected.acid], ["更新时间", selected.updatedAt]].map(([label, value]) => <div key={label} className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className="text-foreground">{value}</span></div>)}</div></Panel>
              <Panel title="危险操作"><div className="p-3"><button onClick={() => deleteTable(selected.id)} className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 text-[12px] font-medium text-red-700 hover:bg-red-100"><Trash2 className="h-3.5 w-3.5" /> 删除表</button></div></Panel>
            </div>
          </div>
        </div>}
      </div>

      {editing && <CreateTableModal table={editing} onChange={setEditing} onSave={saveTable} onCancel={() => setEditing(null)} />}
      {fieldEditor && <FieldEditorModal field={fieldEditor.field} isEdit={fieldEditor.index >= 0} onSave={saveField} onCancel={() => setFieldEditor(null)} />}
    </WorkspacePage>
  );
}

function blankField(): LakeTableField {
  return { name: "", type: "string", required: false, defaultValue: undefined, isPartitionKey: false, isSortKey: false, comment: "" };
}

function newLakeTable(): LakeTable {
  return {
    id: `table-new-${Date.now()}`,
    name: "",
    format: "Iceberg",
    schemaVersion: "v1",
    partitions: "dt",
    acid: "启用",
    owner: "",
    status: "草稿",
    updatedAt: "",
    fields: [{ name: "id", type: "string", required: true, comment: "主键" }],
    description: "",
  };
}

function CreateTableModal({
  table, onChange, onSave, onCancel,
}: {
  table: LakeTable;
  onChange: (t: LakeTable) => void;
  onSave: (t: LakeTable) => void;
  onCancel: () => void;
}) {
  const isNew = table.id.startsWith("table-new-");

  function update<K extends keyof LakeTable>(key: K, v: LakeTable[K]) {
    onChange({ ...table, [key]: v });
  }
  function updateField(idx: number, patch: Partial<LakeTableField>) {
    onChange({ ...table, fields: table.fields.map((f, i) => i === idx ? { ...f, ...patch } : f) });
  }
  function addRow() {
    onChange({ ...table, fields: [...table.fields, blankField()] });
  }
  function removeRow(idx: number) {
    onChange({ ...table, fields: table.fields.filter((_, i) => i !== idx) });
  }

  const missingFields: string[] = [];
  if (!table.name.trim()) missingFields.push("表名");
  if (!table.owner.trim()) missingFields.push("负责人");
  const invalidFields = table.fields.filter((f) => !f.name.trim()).map((_, i) => `第 ${i + 1} 行字段名`);
  missingFields.push(...invalidFields);
  const valid = missingFields.length === 0;

  return (
    <Modal
      title={isNew ? "新建湖表" : "编辑湖表"}
      description={isNew ? "填写表的基本属性并设计初始 Schema，保存后表状态为草稿。" : "可修改表属性和 Schema 字段，保存后自动进入草稿状态。"}
      width="max-w-5xl"
      onClose={onCancel}
      footer={
        <div className="flex flex-1 items-center justify-end gap-2">
          {!valid && <span className="text-[11px] text-amber-600">请填写：{missingFields.join("、")}</span>}
          <button type="button" onClick={onCancel} className="h-8 rounded-md border border-input px-3 text-[12px] font-medium">取消</button>
          <button
            type="button"
            disabled={!valid}
            onClick={() => onSave(table)}
            className="h-8 rounded-md bg-primary px-3 text-[12px] font-medium text-primary-foreground disabled:opacity-50">
            {isNew ? "创建表" : "保存修改"}
          </button>
        </div>
      }
    >
      <div className="space-y-5 text-[12px]">
        <div className="rounded-md border border-border bg-muted/20 p-4">
          <h3 className="mb-3 text-[12px] font-semibold text-foreground">基本信息</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="表名" required hint="建议使用 snake_case，如 dwd_xxx">
              <Input value={table.name} onChange={(v) => update("name", v)} placeholder="dwd_customer_profile" className="font-mono" />
            </Field>
            <Field label="负责人" required>
              <Input value={table.owner} onChange={(v) => update("owner", v)} placeholder="如：陈晨" />
            </Field>
            <Field label="表格式" required>
              <Select value={table.format} onChange={(v) => update("format", v)} options={TABLE_FORMATS} className="w-full" />
            </Field>
            <Field label="ACID 事务">
              <Select value={table.acid} onChange={(v) => update("acid", v)} options={[
                { value: "启用", label: "启用" },
                { value: "部分启用", label: "部分启用" },
                { value: "关闭", label: "关闭" },
              ]} className="w-full" />
            </Field>
            <Field label="分区策略" hint="多个分区用 / 分隔，如 dt / region">
              <Input value={table.partitions} onChange={(v) => update("partitions", v)} placeholder="dt" />
            </Field>
            <Field label="Schema 版本">
              <Input value={table.schemaVersion} onChange={(v) => update("schemaVersion", v)} className="font-mono" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="描述">
                <TextArea value={table.description ?? ""} onChange={(v) => update("description", v)} placeholder="表的用途、来源、更新频率等" rows={2} />
              </Field>
            </div>
          </div>
        </div>

        <div className="rounded-md border border-border bg-muted/20 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[12px] font-semibold text-foreground">Schema 字段定义</h3>
            <button type="button" onClick={addRow} className="inline-flex h-7 items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-2 text-[11px] font-medium text-primary hover:bg-primary/10">
              <Plus className="h-3 w-3" /> 新增字段
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-[11px]">
              <thead className="bg-muted/50 text-[10px] text-muted-foreground">
                <tr>
                  <th className="px-2 py-2 min-w-[130px]">字段名</th>
                  <th className="px-2 py-2 w-28">类型</th>
                  <th className="px-2 py-2 w-14">非空</th>
                  <th className="px-2 py-2 w-24">默认值</th>
                  <th className="px-2 py-2 w-28">角色</th>
                  <th className="px-2 py-2">字段注释</th>
                  <th className="px-1 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-background">
                {table.fields.map((field, idx) => (
                  <tr key={idx}>
                    <td className="px-2 py-1.5">
                      <input value={field.name} onChange={(e) => updateField(idx, { name: e.target.value })} placeholder="field_name"
                        className="h-8 w-full rounded border border-input bg-card px-2 font-mono text-[11px] outline-none focus:border-primary" />
                    </td>
                    <td className="px-2 py-1.5">
                      <select value={field.type} onChange={(e) => updateField(idx, { type: e.target.value })}
                        className="h-8 w-full rounded border border-input bg-card px-1.5 font-mono text-[11px] outline-none focus:border-primary">
                        {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <label className="flex h-8 items-center">
                        <input type="checkbox" checked={field.required} onChange={(e) => updateField(idx, { required: e.target.checked })} />
                      </label>
                    </td>
                    <td className="px-2 py-1.5">
                      <input value={field.defaultValue ?? ""} onChange={(e) => updateField(idx, { defaultValue: e.target.value })} placeholder="默认值"
                        className="h-8 w-full rounded border border-input bg-card px-2 font-mono text-[11px] outline-none focus:border-primary" />
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-2 pt-1">
                        <label className="flex items-center gap-1 text-[10px]">
                          <input type="checkbox" checked={!!field.isPartitionKey} onChange={(e) => updateField(idx, { isPartitionKey: e.target.checked })} />
                          分区
                        </label>
                        <label className="flex items-center gap-1 text-[10px]">
                          <input type="checkbox" checked={!!field.isSortKey} onChange={(e) => updateField(idx, { isSortKey: e.target.checked })} />
                          排序
                        </label>
                      </div>
                    </td>
                    <td className="px-2 py-1.5">
                      <input value={field.comment ?? ""} onChange={(e) => updateField(idx, { comment: e.target.value })} placeholder="字段业务含义"
                        className="h-8 w-full rounded border border-input bg-card px-2 text-[11px] outline-none focus:border-primary" />
                    </td>
                    <td className="px-1 py-1.5">
                      <button type="button" onClick={() => removeRow(idx)} disabled={table.fields.length <= 1}
                        className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-red-50 hover:text-red-600 disabled:opacity-30" aria-label="删除">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function FieldEditorModal({
  field, isEdit, onSave, onCancel,
}: {
  field: LakeTableField;
  isEdit: boolean;
  onSave: (f: LakeTableField) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<LakeTableField>(field);
  const valid = draft.name.trim().length > 0;
  return (
    <Modal
      title={isEdit ? "编辑字段" : "添加字段"}
      description={isEdit ? "修改 Schema 字段的属性配置" : "为当前湖表追加一个新的 Schema 字段"}
      width="max-w-xl"
      onClose={onCancel}
      footer={
        <>
          <button type="button" onClick={onCancel} className="h-8 rounded-md border border-input px-3 text-[12px] font-medium">取消</button>
          <button type="button" disabled={!valid} onClick={() => onSave(draft)} className="h-8 rounded-md bg-primary px-3 text-[12px] font-medium text-primary-foreground disabled:opacity-50">
            {isEdit ? "保存修改" : "确认添加"}
          </button>
        </>
      }
    >
      <div className="space-y-4 text-[12px]">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="字段名" required hint="建议使用 snake_case">
            <Input value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} placeholder="new_field" className="font-mono" />
          </Field>
          <Field label="类型" required>
            <Select value={draft.type} onChange={(v) => setDraft({ ...draft, type: v })} options={FIELD_TYPES.map((t) => ({ value: t, label: t }))} className="w-full" />
          </Field>
          <Field label="默认值">
            <Input value={draft.defaultValue ?? ""} onChange={(v) => setDraft({ ...draft, defaultValue: v })} placeholder="留空表示无默认值" className="font-mono" />
          </Field>
          <Field label="约束与角色">
            <div className="mt-1 space-y-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={draft.required} onChange={(e) => setDraft({ ...draft, required: e.target.checked })} />
                <span>NOT NULL（非空约束）</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={!!draft.isPartitionKey} onChange={(e) => setDraft({ ...draft, isPartitionKey: e.target.checked })} />
                <span>分区键（Partition Key）</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={!!draft.isSortKey} onChange={(e) => setDraft({ ...draft, isSortKey: e.target.checked })} />
                <span>排序键（Sort Key / Z-Order）</span>
              </label>
            </div>
          </Field>
          <div className="sm:col-span-2">
            <Field label="字段注释" hint="推荐填写字段的业务含义、取值范围、计算逻辑等">
              <TextArea value={draft.comment ?? ""} onChange={(v) => setDraft({ ...draft, comment: v })} placeholder="如：客户等级 1-5，由标签引擎每日计算" rows={2} />
            </Field>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function DataLakeCapacityPage() {
  const [capacity, setCapacity, meta] = useSqliteState<CapacityTier[]>("data-agent.data-lake.capacity", capacityRecords);
  const capacityView = capacity.map((tier, index) => ({ ...capacityRecords[index % capacityRecords.length], ...tier }));
  const totalUsed = capacityView.reduce((sum, tier) => sum + sizeInTb(tier.used), 0);
  const totalQuota = capacityView.reduce((sum, tier) => sum + sizeInTb(tier.quota), 0);
  const totalPercent = Math.round(totalQuota > 0 ? (totalUsed / totalQuota) * 100 : 0);
  const trend = [42, 45, 48, 52, 56, 61, 64, 69, 73, 78, 82, 86];

  function applyPolicy(id: string) {
    setCapacity((current) => current.map((tier) => tier.id === id ? { ...tier, status: "应用中", updatedAt: "刚刚" } : tier));
    window.setTimeout(() => setCapacity((current) => current.map((tier) => tier.id === id ? { ...tier, status: "生效", updatedAt: "刚刚" } : tier)), 650);
  }

  return (
    <WorkspacePage>
      <PageTitle eyebrow="Data Lake / Capacity Planning" title="容量与生命周期策略" description="以容量预测、冷热分布和策略链路为核心，辅助运维判断何时扩容、迁移或归档。" actions={<ActionButton icon={RefreshCw} onClick={() => setCapacity((current) => [...current])}>刷新预测</ActionButton>} />
      <InlineNotice error={meta.error} loading={!meta.hydrated} />
      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Panel className="min-h-[310px]"><div className="flex h-full flex-col items-center justify-center p-6"><div className="relative grid h-44 w-44 place-items-center rounded-full" style={{ background: `conic-gradient(rgb(37 99 235) ${totalPercent}%, rgb(226 232 240) 0)` }}><div className="grid h-36 w-36 place-items-center rounded-full bg-card text-center"><div><div className="text-[34px] font-semibold tabular-nums text-foreground">{totalPercent}%</div><div className="text-[10px] text-muted-foreground">全湖容量占用</div></div></div></div><div className="mt-5 text-center"><div className="text-[14px] font-semibold text-foreground">{totalUsed.toFixed(1)} / {totalQuota.toFixed(0)} TB</div><div className="mt-1 text-[10px] text-muted-foreground">按当前增速预计 7.4 个月后达到 80%</div></div></div></Panel>
        <Panel title="12 个月容量走势" description="本地 mock 趋势，不代表真实资源采集结果" actions={<Pill tone="amber"><TrendingUp className="mr-1 h-3 w-3" />月均 +4.1%</Pill>}><div className="flex h-[250px] items-end gap-3 px-6 pb-5 pt-8">{trend.map((value, index) => <div key={index} className="flex h-full flex-1 flex-col justify-end gap-2"><div className="relative flex-1"><div className="absolute bottom-0 w-full rounded-t bg-blue-100 transition hover:bg-blue-200" style={{ height: `${value}%` }}><div className="absolute inset-x-0 top-0 h-1 rounded-t bg-blue-500" /></div></div><span className="text-center text-[9px] text-muted-foreground">{index + 1}月</span></div>)}</div></Panel>
      </div>
      <section className="grid gap-3 lg:grid-cols-4">{capacityView.map((tier, index) => { const value = percent(tier.used, tier.quota); const tone = value > 85 ? "red" : value > 75 ? "amber" : "blue"; return <div key={tier.id} className="rounded-lg border border-border bg-card p-4 shadow-sm"><div className="flex items-center justify-between"><span className="text-[12px] font-semibold text-foreground">{tier.name}</span><Pill tone={statusTone(tier.status)}>{tier.status}</Pill></div><div className="mt-4 flex items-end justify-between"><span className="text-[22px] font-semibold tabular-nums text-foreground">{value}%</span><span className="text-[10px] text-muted-foreground">{tier.used} / {tier.quota}</span></div><ProgressBar value={value} tone={tone} className="mt-2" /><div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground"><span>{tier.growth}</span><span>{index === 0 ? "高频" : index === 1 ? "近线" : index === 2 ? "低频" : "只读"}</span></div></div>; })}</section>
      <Panel title="生命周期策略链" description="迁移与清理均为确定性 mock；生产操作需要权限、二次确认和恢复窗口">
        <div className="grid gap-0 p-4 lg:grid-cols-4">{capacityView.map((tier, index) => <div key={tier.id} className="relative flex items-stretch"><div className="w-full rounded-lg border border-border bg-background p-4"><div className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-md bg-primary/10 text-primary">{index === 3 ? <Archive className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}</span><div className="text-[11px] font-semibold text-foreground">{tier.name}</div></div><div className="mt-3 text-[12px] font-medium text-primary">{tier.policy}</div><div className="mt-1 text-[10px] text-muted-foreground">责任人：{tier.owner}</div><div className="mt-4"><ActionButton onClick={() => applyPolicy(tier.id)} disabled={tier.status === "应用中"}>{tier.status === "应用中" ? "应用中…" : "应用策略"}</ActionButton></div></div>{index < capacityView.length - 1 && <ChevronRight className="absolute -right-2.5 top-1/2 z-10 h-5 w-5 -translate-y-1/2 rounded-full bg-card text-slate-400" />}</div>)}</div>
      </Panel>
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4"><MiniStat label="存储层" value={capacityView.length} hint="热 / 温 / 冷 / 归档" icon={Layers3} /><MiniStat label="已用容量" value={`${totalUsed.toFixed(1)} TB`} hint="全湖逻辑容量" icon={Database} tone="green" /><MiniStat label="对象估算" value="28.6 M" hint="文件与表分区" icon={Boxes} tone="violet" /><MiniStat label="策略预警" value={capacityView.filter((item) => /预警/.test(item.status)).length} hint="需要扩容评估" icon={FileText} tone="amber" /></section>
    </WorkspacePage>
  );
}
