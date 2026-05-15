import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, CheckCircle2 } from "lucide-react";

import { mockClient } from "@/lib/mock-client";
import type { AlgorithmDescriptor } from "../../api/mock";

export function ComputerPage() {
  const { t } = useTranslation("knowledge-graph");
  const [algorithms, setAlgorithms] = useState<AlgorithmDescriptor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AlgorithmDescriptor | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    setLoading(true);
    void mockClient.get<AlgorithmDescriptor[]>("/api/knowledge-graph/computer/algorithms")
      .then(setAlgorithms)
      .finally(() => setLoading(false));
  }, []);

  const categories: AlgorithmDescriptor["category"][] = ["centrality", "community", "path"];

  return (
    <div className="page-shell animate-fade-in">
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold">{t("computer.title")}</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">{t("computer.subtitle")}</p>
      </div>

      {toast && (
        <div className="mb-4 flex items-center gap-2 rounded border border-emerald-500/30 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />{toast}
          <button type="button" onClick={() => setToast("")} className="ml-auto text-emerald-600 hover:text-emerald-800"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded border border-border bg-card" />)}
        </div>
      ) : (
        <div className="space-y-8">
          {categories.map((cat) => {
            const algos = algorithms.filter((a) => a.category === cat);
            if (!algos.length) return null;
            return (
              <div key={cat}>
                <div className="mb-3 eyebrow">{t(`computer.category.${cat}`)}</div>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {algos.map((algo) => (
                    <AlgorithmCard key={algo.key} algo={algo} onSubmit={() => setSelected(algo)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <AlgorithmParamDrawer
          algo={selected}
          onClose={() => setSelected(null)}
          onSubmit={async (params) => {
            const { taskId } = await mockClient.post<{ taskId: string }>("/api/knowledge-graph/computer/jobs", { algorithmKey: selected.key, graphId: "hugegraph-demo", params, output: "write-back" });
            setSelected(null);
            setToast(`${t("computer.taskCreated")} (${taskId})`);
          }}
        />
      )}
    </div>
  );
}

function AlgorithmCard({ algo, onSubmit }: { algo: AlgorithmDescriptor; onSubmit: () => void }) {
  const { t } = useTranslation("knowledge-graph");
  return (
    <article className="card-ticks rounded border border-border bg-card p-4 hover:border-primary/40 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[13px] font-semibold">{algo.name}</div>
          <div className="mt-1 text-[11px] text-muted-foreground">{algo.description}</div>
        </div>
      </div>
      {algo.outputProperty && (
        <div className="mt-2 font-mono text-[10px] text-muted-foreground">输出属性: {algo.outputProperty}</div>
      )}
      <button type="button" onClick={onSubmit}
        className="mt-4 flex h-7 w-full items-center justify-center rounded border border-primary bg-primary text-[12px] font-medium text-primary-foreground hover:opacity-90 transition-opacity">
        {t("computer.submit")}
      </button>
    </article>
  );
}

function AlgorithmParamDrawer({
  algo, onClose, onSubmit,
}: {
  algo: AlgorithmDescriptor;
  onClose: () => void;
  onSubmit: (params: Record<string, unknown>) => Promise<void>;
}) {
  const { t } = useTranslation("knowledge-graph");
  const [params, setParams] = useState<Record<string, unknown>>(
    Object.fromEntries(algo.paramSchema.map((p) => [p.key, p.default ?? ""])),
  );
  const [output, setOutput] = useState<"write-back" | "download" | "both">("write-back");
  const [submitting, setSubmitting] = useState(false);

  const setParam = (key: string, value: unknown) => setParams((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-[380px] flex-col border-l border-border bg-background shadow-sm animate-slide-in-right">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div>
          <div className="text-[14px] font-semibold">{algo.name}</div>
          <div className="text-[11px] text-muted-foreground">{algo.description}</div>
        </div>
        <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X className="h-4 w-4" /></button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-4">
        {/* Common params */}
        <div>
          <div className="eyebrow mb-3">通用参数</div>
          <div className="space-y-3">
            <Field label="目标 VertexLabel 范围">
              <select className={inputCls} defaultValue="all">
                <option value="all">全部</option>
                <option value="Person">Person</option>
                <option value="Company">Company</option>
              </select>
            </Field>
            <Field label="结果输出方式">
              {(["write-back", "download", "both"] as const).map((o) => (
                <label key={o} className="flex items-center gap-2 text-[12px] cursor-pointer">
                  <input type="radio" checked={output === o} onChange={() => setOutput(o)} className="accent-primary" />
                  {t(`computer.output.${o}`)}
                </label>
              ))}
            </Field>
          </div>
        </div>

        {/* Algorithm-specific params */}
        {algo.paramSchema.length > 0 && (
          <div>
            <div className="eyebrow mb-3">算法参数</div>
            <div className="space-y-3">
              {algo.paramSchema.map((param) => (
                <Field key={param.key} label={param.label}>
                  {param.type === "enum" ? (
                    <select
                      className={inputCls}
                      value={String(params[param.key] ?? "")}
                      onChange={(e) => setParam(param.key, e.target.value)}
                    >
                      {(param.options ?? []).map((o) => <option key={o}>{o}</option>)}
                    </select>
                  ) : param.type === "boolean" ? (
                    <input
                      type="checkbox"
                      checked={Boolean(params[param.key])}
                      onChange={(e) => setParam(param.key, e.target.checked)}
                      className="accent-primary"
                    />
                  ) : (
                    <input
                      type={param.type === "number" ? "number" : "text"}
                      value={String(params[param.key] ?? "")}
                      min={param.min}
                      max={param.max}
                      onChange={(e) => setParam(param.key, param.type === "number" ? Number(e.target.value) : e.target.value)}
                      className={inputCls}
                    />
                  )}
                </Field>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border p-5">
        <button
          type="button"
          disabled={submitting}
          onClick={async () => { setSubmitting(true); await onSubmit({ ...params, output }); setSubmitting(false); }}
          className="flex h-8 w-full items-center justify-center rounded border border-primary bg-primary text-[13px] font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity"
        >
          {submitting ? "提交中…" : t("computer.submit")}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[12px] font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "h-7 w-full rounded border border-border bg-background px-3 text-[12px] outline-none focus:border-primary transition-colors";
