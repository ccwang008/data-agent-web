import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Upload, Database as DbIcon, Globe, CheckCircle2, AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { mockClient } from "@/lib/mock-client";
import type { ImportJob } from "../../api/mock";

type Connector = "local" | "database" | "api";
type StepKey = 1 | 2 | 3 | 4;

const STEPS = [1, 2, 3, 4] as const;

export function ImportPage() {
  const { t } = useTranslation("knowledge-graph");
  const [jobs] = useState<ImportJob[]>([
    { id: "job-001", graphId: "hugegraph-demo", schemaSelection: { vertexLabels: ["Person", "Company"], edgeLabels: ["works_at"] }, connector: { kind: "local" }, status: "success", progress: 100, finishedAt: "2026-05-13 08:05", totalRows: 45000, processedRows: 45000 },
    { id: "job-002", graphId: "hugegraph-demo", schemaSelection: { vertexLabels: ["Company"], edgeLabels: ["invests_in"] }, connector: { kind: "database" }, status: "running", progress: 42, totalRows: 12000, processedRows: 5040 },
  ]);
  const [showWizard, setShowWizard] = useState(false);

  if (showWizard) {
    return <ImportWizard onClose={() => setShowWizard(false)} />;
  }

  return (
    <div className="page-shell animate-fade-in">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[20px] font-semibold">{t("import.title")}</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">{t("import.subtitle")}</p>
        </div>
        <button type="button" onClick={() => setShowWizard(true)}
          className="flex h-8 items-center gap-2 rounded border border-primary bg-primary px-3 text-[13px] font-medium text-primary-foreground hover:opacity-90 transition-opacity">
          + {t("import.newImport")}
        </button>
      </div>

      <h2 className="mb-3 text-[13px] font-medium">{t("import.history")}</h2>
      <div className="rounded border border-border overflow-hidden">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-border bg-card">
            <tr>
              {["任务 ID", "连接器", "Schema", "状态", "进度", "行数", "完成时间"].map((h) => (
                <th key={h} className="px-4 py-2.5 font-medium text-[11px] uppercase text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id} className="border-b border-border/50 hover:bg-accent/20 transition-colors">
                <td className="px-4 py-3 font-mono text-[12px] text-muted-foreground">{job.id}</td>
                <td className="px-4 py-3"><ConnectorBadge kind={job.connector.kind} /></td>
                <td className="px-4 py-3 text-[12px]">{job.schemaSelection.vertexLabels.join(", ")}</td>
                <td className="px-4 py-3"><StatusBadge status={job.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${job.progress}%` }} />
                    </div>
                    <span className="font-mono text-[11px] text-muted-foreground">{job.progress}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-[12px] text-muted-foreground">
                  {job.processedRows?.toLocaleString() ?? "—"} / {job.totalRows?.toLocaleString() ?? "—"}
                </td>
                <td className="px-4 py-3 font-mono text-[12px] text-muted-foreground">{job.finishedAt ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ImportWizard({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation("knowledge-graph");
  const [step, setStep] = useState<StepKey>(1);
  const [selectedSchema, setSelectedSchema] = useState<string[]>([]);
  const [connector, setConnector] = useState<Connector>("local");
  const [submitted, setSubmitted] = useState(false);
  const [toast, setToast] = useState("");

  const submit = async () => {
    const result = await mockClient.post<{ id: string }>("/api/knowledge-graph/import/jobs", {
      graphId: "hugegraph-demo", schemaSelection: { vertexLabels: selectedSchema, edgeLabels: [] }, connector: { kind: connector },
    });
    setSubmitted(true);
    setToast(t("import.taskCreated") + ` (${result.id})`);
  };

  if (submitted) {
    return (
      <div className="page-shell flex flex-col items-center justify-center text-center animate-fade-in">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
        <h2 className="mt-4 text-[16px] font-semibold">导入任务已创建</h2>
        <p className="mt-2 text-[13px] text-muted-foreground">{toast}</p>
        <button type="button" onClick={onClose} className="mt-6 rounded border border-primary bg-primary px-5 py-2 text-[13px] font-medium text-primary-foreground hover:opacity-90">
          返回导入列表
        </button>
      </div>
    );
  }

  return (
    <div className="page-shell animate-fade-in">
      {/* Stepper */}
      <div className="mb-8 flex items-center gap-0">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center">
            <div className={cn(
              "flex h-7 w-7 items-center justify-center rounded border font-mono text-[12px] font-medium",
              step === s ? "border-primary bg-primary text-primary-foreground" :
              s < step ? "border-emerald-500 bg-emerald-50 text-emerald-700" :
              "border-border text-muted-foreground",
            )}>
              {s < step ? <CheckCircle2 className="h-4 w-4" /> : s}
            </div>
            <span className={cn("ml-2 text-[12px]", step === s ? "font-medium text-foreground" : "text-muted-foreground")}>
              {t(`import.step${s}`)}
            </span>
            {i < STEPS.length - 1 && <div className="mx-4 h-px w-12 bg-border" />}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="rounded border border-border bg-card p-6">
        {step === 1 && <Step1Schema selected={selectedSchema} onChange={setSelectedSchema} />}
        {step === 2 && <Step2Connector connector={connector} onChange={setConnector} />}
        {step === 3 && <Step3Mapping />}
        {step === 4 && <Step4Execute onSubmit={submit} />}
      </div>

      {/* Nav */}
      <div className="mt-5 flex justify-between">
        <button type="button" onClick={() => step === 1 ? onClose() : setStep((s) => (s - 1) as StepKey)}
          className="h-8 rounded border border-border px-4 text-[13px] text-muted-foreground hover:text-foreground transition-colors">
          {step === 1 ? t("actions.cancel", { ns: "common" }) : "← " + t("import.step" + (step - 1))}
        </button>
        {step < 4 ? (
          <button type="button" onClick={() => setStep((s) => (s + 1) as StepKey)}
            disabled={step === 1 && selectedSchema.length === 0}
            className="h-8 rounded border border-primary bg-primary px-4 text-[13px] font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">
            下一步 →
          </button>
        ) : (
          <button type="button" onClick={() => void submit()}
            className="h-8 rounded border border-primary bg-primary px-4 text-[13px] font-medium text-primary-foreground hover:opacity-90">
            {t("import.execute.start")}
          </button>
        )}
      </div>
    </div>
  );
}

function Step1Schema({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  const options = ["Person", "Company", "Product", "works_at", "invests_in", "produces", "collaborates_with"];
  const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v]);
  return (
    <div>
      <h3 className="text-[14px] font-medium mb-4">选择目标 Schema</h3>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {options.map((opt) => (
          <button key={opt} type="button" onClick={() => toggle(opt)}
            className={cn("flex items-center gap-2 rounded border px-3 py-2 text-[13px] text-left transition-colors",
              selected.includes(opt) ? "border-primary bg-primary/5 text-primary font-medium" : "border-border text-foreground hover:border-primary/40")}>
            <span className={cn("h-3.5 w-3.5 rounded-sm border", selected.includes(opt) ? "border-primary bg-primary" : "border-border")} />
            {opt}
          </button>
        ))}
      </div>
      {selected.length === 0 && <p className="mt-3 text-[12px] text-destructive flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" />请至少选择一个 Label</p>}
    </div>
  );
}

function Step2Connector({ connector, onChange }: { connector: Connector; onChange: (c: Connector) => void }) {
  const { t } = useTranslation("knowledge-graph");
  const opts: { key: Connector; icon: React.ReactNode; label: string; desc: string }[] = [
    { key: "local",    icon: <Upload className="h-5 w-5" />,  label: t("import.connector.local"),    desc: "CSV / JSON 文件拖拽上传" },
    { key: "database", icon: <DbIcon className="h-5 w-5" />,  label: t("import.connector.database"), desc: "JDBC 连接，支持 MySQL / PostgreSQL / Oracle" },
    { key: "api",      icon: <Globe className="h-5 w-5" />,   label: t("import.connector.api"),      desc: "REST API，支持 GET / POST，JSONPath 抽取" },
  ];
  return (
    <div>
      <h3 className="text-[14px] font-medium mb-4">选择数据源类型</h3>
      <div className="grid gap-3 md:grid-cols-3">
        {opts.map((o) => (
          <button key={o.key} type="button" onClick={() => onChange(o.key)}
            className={cn("card-ticks rounded border p-4 text-left transition-all",
              connector === o.key ? "border-primary bg-primary/5" : "border-border hover:border-primary/40")}>
            <div className={cn("mb-2", connector === o.key ? "text-primary" : "text-muted-foreground")}>{o.icon}</div>
            <div className={cn("text-[13px] font-medium", connector === o.key && "text-primary")}>{o.label}</div>
            <div className="mt-1 text-[11px] text-muted-foreground">{o.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function Step3Mapping() {
  const sampleFields = [{ name: "company_name", type: "string" }, { name: "industry", type: "string" }, { name: "founded", type: "number" }];
  const targetProps = ["name", "industry", "founded", "region", "amount"];
  return (
    <div>
      <h3 className="text-[14px] font-medium mb-4">字段映射</h3>
      <div className="rounded border border-border overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="border-b border-border bg-surface">
            <tr>
              <th className="px-4 py-2 text-left text-[11px] uppercase text-muted-foreground">数据源字段</th>
              <th className="px-4 py-2 text-left text-[11px] uppercase text-muted-foreground">推断类型</th>
              <th className="px-4 py-2 text-left text-[11px] uppercase text-muted-foreground">目标属性</th>
              <th className="px-4 py-2 text-left text-[11px] uppercase text-muted-foreground">转换器</th>
            </tr>
          </thead>
          <tbody>
            {sampleFields.map((f) => (
              <tr key={f.name} className="border-b border-border/50">
                <td className="px-4 py-2 font-mono text-[12px]">{f.name}</td>
                <td className="px-4 py-2 font-mono text-[12px] text-muted-foreground">{f.type}</td>
                <td className="px-4 py-2">
                  <select className="h-7 rounded border border-border bg-background px-2 text-[12px] outline-none focus:border-primary">
                    {targetProps.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <select className="h-7 rounded border border-border bg-background px-2 text-[12px] outline-none focus:border-primary">
                    {["none", "trim", "lower", "upper"].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Step4Execute({ onSubmit }: { onSubmit: () => Promise<void> }) {
  const [loading, setLoading] = useState(false);
  return (
    <div className="text-center py-4">
      <h3 className="text-[14px] font-medium mb-2">确认并执行导入</h3>
      <p className="text-[13px] text-muted-foreground mb-6">任务提交后立即返回，在「异步任务」中追踪进度</p>
      <button type="button" onClick={async () => { setLoading(true); await onSubmit(); setLoading(false); }}
        disabled={loading}
        className="flex mx-auto h-9 items-center gap-2 rounded border border-primary bg-primary px-6 text-[13px] font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
        {loading ? "提交中…" : "开始导入"}
      </button>
    </div>
  );
}

function ConnectorBadge({ kind }: { kind: string }) {
  return <span className="rounded border border-border px-2 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">{kind}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "success" ? "badge-success" :
    status === "running" ? "badge-running" :
    status === "failed" ? "badge-offline" :
    "badge-pending";
  return <span className={cn("rounded border px-2 py-0.5 font-mono text-[10px] uppercase", cls)}>{status}</span>;
}
