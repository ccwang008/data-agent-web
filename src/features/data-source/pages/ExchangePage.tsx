import { useMemo, useState } from "react";
import {
  Activity, AlertTriangle, CheckCircle2, Download, Eye, FileText,
  Pencil, Play, Plus, Search, Send, Server, ShieldCheck, SlidersHorizontal, Trash2, X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Field, Modal, Select } from "@/features/data-asset/components/common";

import { useExchanges } from "../store";
import {
  EXCHANGE_CHANNEL_LABEL, EXCHANGE_STATUS_LABEL,
  type ExchangeChannel, type ExchangeStatus, type ExchangeItem,
  type ExchangeFrequency,
} from "../api/types";

const STATUS_TONE: Record<ExchangeStatus, string> = {
  draft: "border-slate-200 bg-slate-50 text-slate-600",
  submitted: "border-violet-200 bg-violet-50 text-violet-700",
  approved: "border-blue-200 bg-blue-50 text-blue-700",
  published: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-red-200 bg-red-50 text-red-700",
  suspended: "border-amber-200 bg-amber-50 text-amber-700",
};

const CHANNEL_ICON: Record<ExchangeChannel, typeof Server> = {
  api: Send, file: Download, table: Server, message: Activity,
};

export function ExchangePage() {
  const [exchanges, setExchanges] = useExchanges();
  const [query, setQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<ExchangeChannel | "all">("all");
  const [statusFilter, setStatusFilter] = useState<ExchangeStatus | "all">("all");
  const [selected, setSelected] = useState<ExchangeItem | null>(null);
  const [editing, setEditing] = useState<ExchangeItem | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exchanges.filter((e) => {
      if (channelFilter !== "all" && e.channel !== channelFilter) return false;
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (q && !(e.name.toLowerCase().includes(q) || e.consumerDept.toLowerCase().includes(q) || e.sourceSystem.toLowerCase().includes(q) || e.owner.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [exchanges, channelFilter, statusFilter, query]);

  const kpis = [
    { label: "交换通道", value: exchanges.length, icon: Send, hint: "API / 文件 / 库表 / 消息" },
    { label: "已发布", value: exchanges.filter((e) => e.status === "published").length, icon: CheckCircle2, hint: "已对外提供" },
    { label: "审批中", value: exchanges.filter((e) => e.status === "submitted").length, icon: FileText, hint: "待审批" },
    { label: "异常/暂停", value: exchanges.filter((e) => e.status === "rejected" || e.status === "suspended").length, icon: AlertTriangle, hint: "需处理" },
  ];

  function submit(e: ExchangeItem) {
    setExchanges((cur) => cur.map((x) => x.id === e.id ? { ...x, status: "submitted", updatedAt: "刚刚" } : x));
  }

  function publish(e: ExchangeItem) {
    setExchanges((cur) => cur.map((x) => x.id === e.id ? { ...x, status: "published", publishedAt: new Date().toISOString().slice(0, 10), updatedAt: "刚刚" } : x));
  }

  function suspend(e: ExchangeItem) {
    setExchanges((cur) => cur.map((x) => x.id === e.id ? { ...x, status: "suspended", updatedAt: "刚刚" } : x));
  }

  function remove(e: ExchangeItem) {
    if (!window.confirm(`确认删除交换通道"${e.name}"？`)) return;
    setExchanges((cur) => cur.filter((x) => x.id !== e.id));
  }

  return (
    <div className="h-full overflow-y-auto bg-background p-5">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4">
        <Header onCreate={() => setEditing(newExchange())} />

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((k) => <Kpi key={k.label} {...k} />)}
        </section>

        <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
            <Search className="ml-1 h-3.5 w-3.5 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索通道名、消费方、源端或负责人"
              className="h-8 min-w-[240px] flex-1 rounded-md border border-input bg-background px-2 text-[12px] outline-none focus:border-primary" />
            <div className="flex items-center gap-1">
              <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
              <Select value={channelFilter} onChange={(v) => setChannelFilter(v as ExchangeChannel | "all")} options={[
                { value: "all", label: "全部方式" },
                { value: "api", label: "API" }, { value: "file", label: "文件" },
                { value: "table", label: "库表" }, { value: "message", label: "消息" },
              ]} className="w-24" />
              <Select value={statusFilter} onChange={(v) => setStatusFilter(v as ExchangeStatus | "all")} options={[
                { value: "all", label: "全部状态" },
                { value: "draft", label: "草稿" }, { value: "submitted", label: "审批中" },
                { value: "approved", label: "已审批" }, { value: "published", label: "已发布" },
                { value: "suspended", label: "已暂停" }, { value: "rejected", label: "已驳回" },
              ]} className="w-28" />
            </div>
            <span className="ml-auto text-[11px] text-muted-foreground">{filtered.length} 条</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-[12px]">
              <thead className="bg-muted/60 text-[11px] font-medium text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5">通道</th>
                  <th className="px-3 py-2.5">交换方式</th>
                  <th className="px-3 py-2.5">消费方</th>
                  <th className="px-3 py-2.5">源端</th>
                  <th className="px-3 py-2.5">频率 / SLA</th>
                  <th className="px-3 py-2.5">状态</th>
                  <th className="px-3 py-2.5">负责人</th>
                  <th className="px-3 py-2.5">审计</th>
                  <th className="px-4 py-2.5 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-14 text-center text-muted-foreground">无匹配交换通道</td></tr>
                )}
                {filtered.map((e) => {
                  const recent = e.auditLogs.slice(0, 5);
                  const failedCount = e.auditLogs.filter((a) => a.result === "失败").length;
                  return (
                    <tr key={e.id} className="hover:bg-muted/35">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{e.name}</div>
                        {e.rejectReason && e.status === "rejected" && (
                          <div className="mt-0.5 text-[10px] text-red-600">已驳回：{e.rejectReason}</div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium">
                          {(() => { const I = CHANNEL_ICON[e.channel]; return <I className="h-3 w-3" />; })()}
                          {EXCHANGE_CHANNEL_LABEL[e.channel]}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        <div>{e.consumerDept}</div>
                        <div className="text-[11px]">{e.consumerContact}</div>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        <div>{e.sourceSystem}</div>
                        {e.sourceTable && <div className="font-mono text-[10px] text-muted-foreground/70">{e.sourceTable}</div>}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        <div>{EXCHANGE_FREQ_LABEL[e.frequency]}</div>
                        <div className="text-[11px]">{e.sla}</div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium", STATUS_TONE[e.status])}>
                          {EXCHANGE_STATUS_LABEL[e.status]}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">{e.owner}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-0.5">
                          {recent.length === 0 ? <span className="text-[11px] text-muted-foreground">—</span> :
                            recent.map((a) => (
                              <div key={a.id} className="flex items-center gap-1 text-[10px]">
                                <span className={cn("h-1.5 w-1.5 rounded-full", a.result === "成功" ? "bg-emerald-500" : "bg-red-500")} />
                                <span className="text-muted-foreground">{a.time.slice(11)}</span>
                                <span className="text-muted-foreground/80">{a.action}</span>
                              </div>
                            ))}
                          {failedCount > 0 && <div className="mt-0.5 text-[10px] text-red-600">失败 {failedCount} 次</div>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {e.status === "draft" && (
                            <button onClick={() => submit(e)} className="inline-flex h-7 items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-2 text-[11px] font-medium text-violet-700 hover:bg-violet-100">
                              <FileText className="h-3 w-3" /> 提交审批
                            </button>
                          )}
                          {e.status === "approved" && (
                            <button onClick={() => publish(e)} className="inline-flex h-7 items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100">
                              <Play className="h-3 w-3" /> 发布
                            </button>
                          )}
                          {e.status === "published" && (
                            <button onClick={() => suspend(e)} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-amber-50 hover:text-amber-600" aria-label="暂停">
                              <AlertTriangle className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button onClick={() => setSelected(e)} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-primary" aria-label="详情">
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setEditing(e)} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-primary" aria-label="编辑">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => remove(e)} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-600" aria-label="删除">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {selected && <ExchangeDetailDrawer item={selected} onClose={() => setSelected(null)} />}
      {editing && <ExchangeEditModal item={editing} onChange={setEditing} onSave={(e) => {
        setExchanges((cur) => {
          const idx = cur.findIndex((x) => x.id === e.id);
          if (idx >= 0) { const c = [...cur]; c[idx] = e; return c; }
          return [{ ...e, updatedAt: "刚刚" }, ...cur];
        });
        setEditing(null);
      }} onCancel={() => setEditing(null)} />}
    </div>
  );
}

const EXCHANGE_FREQ_LABEL: Record<ExchangeFrequency, string> = {
  realtime: "实时", hourly: "每小时", daily: "每日", weekly: "每周", monthly: "每月", manual: "手动",
};

// ------------------ Helpers ------------------

function newExchange(): ExchangeItem {
  const now = new Date().toLocaleString("zh-CN", { hour12: false });
  return {
    id: "ex-new-" + Date.now(),
    name: "新建交换通道",
    channel: "api", consumerDept: "", consumerContact: "",
    sourceSystem: "", sourceTable: "", frequency: "realtime", sla: "",
    dataFormat: "JSON", encryption: "TLS", owner: "平台团队",
    status: "draft", auditLogs: [], updatedAt: now,
  };
}

function Header({ onCreate }: { onCreate: () => void }) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-card px-5 py-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-[17px] font-semibold text-foreground">共享交换</h1>
        <p className="mt-1 text-[12px] text-muted-foreground">
          管理 API、文件、库表和消息交换通道。记录消费方、SLA、频率、加密方式、审批状态与 mock 审计日志。
        </p>
      </div>
      <button onClick={onCreate} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-[12px] font-medium text-primary-foreground hover:opacity-90">
        <Plus className="h-3.5 w-3.5" /> 新建交换通道
      </button>
    </section>
  );
}

function Kpi({ label, value, hint, icon: Icon }: { label: string; value: string | number; hint: string; icon: typeof Send }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-muted-foreground">{label}</span>
        <span className="grid h-7 w-7 place-items-center rounded-md bg-primary/10 text-primary"><Icon className="h-3.5 w-3.5" /></span>
      </div>
      <div className="mt-2 text-[22px] font-semibold tabular-nums text-foreground">{value}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>
    </div>
  );
}

// ------------------ Detail Drawer ------------------

function ExchangeDetailDrawer({ item, onClose }: { item: ExchangeItem; onClose: () => void }) {
  const totalAudit = item.auditLogs.length;
  const failed = item.auditLogs.filter((a) => a.result === "失败").length;
  const successRate = totalAudit > 0 ? Math.round((totalAudit - failed) / totalAudit * 100) : 100;
  const totalRecords = item.auditLogs.reduce((s, a) => s + a.records, 0);
  const avgLatency = totalAudit > 0 ? Math.round(item.auditLogs.reduce((s, a) => s + a.latencyMs, 0) / totalAudit) : 0;

  return (
    <div className="fixed inset-0 z-40 bg-slate-900/20" onClick={onClose}>
      <aside className="absolute right-0 top-0 flex h-full w-[640px] flex-col border-l border-border bg-card shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-foreground">{item.name}</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {EXCHANGE_CHANNEL_LABEL[item.channel]} → {item.consumerDept} · {EXCHANGE_STATUS_LABEL[item.status]}
            </p>
          </div>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 text-[12px]">
          <div className="grid gap-3 sm:grid-cols-4">
            <MiniCard label="成功率" value={successRate + "%"} icon={CheckCircle2} />
            <MiniCard label="调用次数" value={totalAudit + ""} icon={Activity} />
            <MiniCard label="数据量" value={totalRecords.toLocaleString()} icon={FileText} />
            <MiniCard label="平均延迟" value={avgLatency + "ms"} icon={ShieldCheck} />
          </div>

          <DetailSection title="通道配置">
            <KV label="交换方式" value={EXCHANGE_CHANNEL_LABEL[item.channel]} />
            <KV label="消费方" value={`${item.consumerDept} (${item.consumerContact})`} />
            <KV label="源系统" value={item.sourceSystem} />
            {item.sourceTable && <KV label="源表" value={item.sourceTable} mono />}
            <KV label="频率" value={EXCHANGE_FREQ_LABEL[item.frequency]} />
            <KV label="SLA" value={item.sla} />
            <KV label="数据格式" value={item.dataFormat ?? "—"} />
            <KV label="加密方式" value={item.encryption ?? "—"} />
            <KV label="负责人" value={item.owner} />
            {item.publishedAt && <KV label="发布日期" value={item.publishedAt} />}
            {item.rejectReason && item.status === "rejected" && <KV label="驳回原因" value={item.rejectReason} />}
          </DetailSection>

          <DetailSection title="审计日志（最近 {item.auditLogs.length} 条）">
            {item.auditLogs.length === 0 ? (
              <p className="text-muted-foreground">暂无审计记录</p>
            ) : (
              <table className="w-full text-[11px]">
                <thead className="bg-muted/50 text-muted-foreground"><tr>
                  <th className="px-2 py-1 text-left">时间</th>
                  <th className="px-2 py-1 text-left">操作</th>
                  <th className="px-2 py-1 text-right">记录数</th>
                  <th className="px-2 py-1 text-right">耗时</th>
                  <th className="px-2 py-1 text-right">结果</th>
                </tr></thead>
                <tbody className="divide-y divide-border">
                  {item.auditLogs.slice(0, 15).map((a) => (
                    <tr key={a.id}>
                      <td className="px-2 py-1 font-mono">{a.time}</td>
                      <td className="px-2 py-1">{a.action}</td>
                      <td className="px-2 py-1 text-right tabular-nums">{a.records.toLocaleString()}</td>
                      <td className="px-2 py-1 text-right tabular-nums">{a.latencyMs} ms</td>
                      <td className={cn("px-2 py-1 text-right font-medium", a.result === "成功" ? "text-emerald-600" : "text-red-600")}>{a.result}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </DetailSection>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button onClick={onClose} className="h-8 rounded-md border border-input px-3 text-[12px] font-medium">关闭</button>
        </div>
      </aside>
    </div>
  );
}

function MiniCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Activity }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-3">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-1 text-[15px] font-semibold tabular-nums text-foreground">{value}</div>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <h3 className="mb-2 border-b border-border/70 pb-1 text-[12px] font-semibold text-foreground">{title}</h3>
      <div>{children}</div>
    </div>
  );
}

function KV({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-3">
      <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
      <span className={cn("flex-1 text-foreground", mono && "font-mono text-[11px]")}>{value || "—"}</span>
    </div>
  );
}

// ------------------ Edit Modal ------------------

function ExchangeEditModal({
  item, onChange, onSave, onCancel,
}: {
  item: ExchangeItem; onChange: (e: ExchangeItem) => void;
  onSave: (e: ExchangeItem) => void; onCancel: () => void;
}) {
  const isNew = item.id.startsWith("ex-new-");
  function update<K extends keyof ExchangeItem>(key: K, v: ExchangeItem[K]) {
    onChange({ ...item, [key]: v });
  }

  return (
    <Modal title={isNew ? "新建交换通道" : "编辑交换通道"} description="配置交换方式、消费方、频率、SLA 和加密方式。"
      onClose={onCancel}
      footer={
        <>
          <button onClick={onCancel} className="h-8 rounded-md border border-input px-3 text-[12px] font-medium">取消</button>
          <button disabled={!item.name || !item.consumerDept}
            onClick={() => onSave({ ...item, updatedAt: "刚刚" })}
            className="h-8 rounded-md bg-primary px-3 text-[12px] font-medium text-primary-foreground disabled:opacity-50">
            保存
          </button>
        </>
      }>
      <div className="grid gap-4 text-[12px]">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="通道名称" required>
            <input value={item.name} onChange={(e) => update("name", e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-[12px] outline-none focus:border-primary" />
          </Field>
          <Field label="交换方式" required>
            <Select value={item.channel} onChange={(v) => update("channel", v as ExchangeChannel)} options={Object.entries(EXCHANGE_CHANNEL_LABEL).map(([v, l]) => ({ value: v, label: l }))} />
          </Field>
          <Field label="消费方部门" required>
            <input value={item.consumerDept} onChange={(e) => update("consumerDept", e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-[12px] outline-none focus:border-primary" />
          </Field>
          <Field label="消费方联系人">
            <input value={item.consumerContact} onChange={(e) => update("consumerContact", e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-[12px] outline-none focus:border-primary" />
          </Field>
          <Field label="源系统">
            <input value={item.sourceSystem} onChange={(e) => update("sourceSystem", e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-[12px] outline-none focus:border-primary" />
          </Field>
          <Field label="源表（可选）">
            <input value={item.sourceTable ?? ""} onChange={(e) => update("sourceTable", e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-[11px] outline-none focus:border-primary" />
          </Field>
          <Field label="频率">
            <Select value={item.frequency} onChange={(v) => update("frequency", v as ExchangeFrequency)} options={Object.entries(EXCHANGE_FREQ_LABEL).map(([v, l]) => ({ value: v, label: l }))} />
          </Field>
          <Field label="SLA">
            <input value={item.sla} onChange={(e) => update("sla", e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-[12px] outline-none focus:border-primary" placeholder="如 99.9% / 500ms 或 每月 3 日前" />
          </Field>
          <Field label="数据格式">
            <Select value={item.dataFormat ?? "JSON"} onChange={(v) => update("dataFormat", v)} options={[
              { value: "JSON", label: "JSON" }, { value: "XML", label: "XML" },
              { value: "CSV", label: "CSV" }, { value: "Parquet", label: "Parquet" },
              { value: "Avro", label: "Avro" }, { value: "只读视图", label: "只读视图" },
            ]} />
          </Field>
          <Field label="加密方式">
            <Select value={item.encryption ?? "TLS"} onChange={(v) => update("encryption", v)} options={[
              { value: "TLS", label: "传输层 TLS" }, { value: "mTLS", label: "双向 TLS" },
              { value: "AES-256 + 签名", label: "AES-256 + 签名" }, { value: "—", label: "无加密" },
            ]} />
          </Field>
          <Field label="负责人">
            <input value={item.owner} onChange={(e) => update("owner", e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-[12px] outline-none focus:border-primary" />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
