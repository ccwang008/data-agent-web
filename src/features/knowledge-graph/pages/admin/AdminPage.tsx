import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ShieldOff, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { mockClient } from "@/lib/mock-client";
import { useKnowledgeGraphStore } from "../../store";

interface Backup { id: string; graphId: string; size: number; vertexCount: number; edgeCount: number; schemaSnapshot: { vertexLabels: number; edgeLabels: number }; createdAt: string; createdBy: string; }
interface HistoryRecord { id: string; kind: string; status: string; performedBy: string; performedAt: string; }

type DangerOp = "backup" | "restore" | "clear-data" | "clear-all";

export function AdminPage() {
  const { t } = useTranslation("knowledge-graph");
  const currentGraphId = useKnowledgeGraphStore((s) => s.currentGraphId);
  const graphs = [{ id: "hugegraph-demo", name: "供应链知识图谱" }, { id: "risk-graph", name: "风险关系图谱" }];
  const graphName = graphs.find((g) => g.id === currentGraphId)?.name ?? currentGraphId ?? "—";

  const [backups, setBackups] = useState<Backup[]>([]);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [confirmOp, setConfirmOp] = useState<DangerOp | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    void mockClient.get<Backup[]>("/api/knowledge-graph/admin/backups").then(setBackups);
    void mockClient.get<HistoryRecord[]>("/api/knowledge-graph/admin/history").then(setHistory);
  }, []);

  const handleOp = async (op: DangerOp) => {
    const endpoint = `/api/knowledge-graph/admin/${op}`;
    const body = op === "restore" ? { backupId: backups[0]?.id } : {};
    const result = await mockClient.post<{ taskId: string }>(endpoint, body);
    setConfirmOp(null);
    setToast(`操作已提交: ${result.taskId}`);
    setTimeout(() => setToast(""), 5000);
  };

  return (
    <div className="page-shell animate-fade-in">
      {/* Warning banner */}
      <div className="mb-6 flex items-center gap-3 rounded border border-destructive/30 bg-destructive/5 px-5 py-3 text-[13px] text-destructive">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        {t("admin.warning")}
      </div>

      <div className="mb-6">
        <h1 className="text-[20px] font-semibold">{t("admin.title")}</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">{t("admin.subtitle")}</p>
      </div>

      {toast && (
        <div className="mb-4 flex items-center gap-2 rounded border border-emerald-500/30 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />{toast}
        </div>
      )}

      {/* Danger Zone */}
      <div className="space-y-5">
        {/* Backup section */}
        <DangerSection
          title={t("admin.backup.title")}
          desc={t("admin.backup.desc")}
          action={<button type="button" onClick={() => setConfirmOp("backup")} className={dangerBtnCls}>{t("admin.backup.create")}</button>}
        >
          {backups.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="eyebrow">{t("admin.backup.list")}</div>
              {backups.map((b) => (
                <div key={b.id} className="flex items-center gap-3 rounded border border-border bg-background px-3 py-2 text-[12px]">
                  <span className="font-mono text-muted-foreground">{b.id}</span>
                  <span className="text-muted-foreground">{b.createdAt}</span>
                  <span className="ml-auto font-mono">{b.vertexCount.toLocaleString()} V / {b.edgeCount.toLocaleString()} E</span>
                  <span className="text-muted-foreground">{(b.size / 1024 / 1024).toFixed(1)} MB</span>
                </div>
              ))}
            </div>
          )}
        </DangerSection>

        {/* Restore section */}
        <DangerSection
          title={t("admin.restore.title")}
          desc={t("admin.restore.desc")}
          action={<button type="button" onClick={() => setConfirmOp("restore")} disabled={backups.length === 0} className={dangerBtnCls + " disabled:opacity-40"}>{t("admin.restore.select")}</button>}
        />

        {/* Clear data */}
        <DangerSection
          title={t("admin.clear.title")}
          desc=""
          action={
            <div className="flex flex-col gap-2">
              <button type="button" onClick={() => setConfirmOp("clear-data")} className={dangerBtnCls}>{t("admin.clear.data")}</button>
              <button type="button" onClick={() => setConfirmOp("clear-all")} className={dangerBtnCls + " border-destructive bg-destructive/5 text-destructive hover:bg-destructive/10"}>{t("admin.clear.all")}</button>
            </div>
          }
        />
      </div>

      {/* Operation History */}
      <div className="mt-8">
        <h2 className="mb-3 text-[14px] font-semibold">{t("admin.history.title")}</h2>
        {history.length === 0 ? (
          <div className="rounded border border-dashed border-border py-8 text-center text-[13px] text-muted-foreground">{t("admin.history.empty")}</div>
        ) : (
          <div className="rounded border border-border overflow-hidden">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-border bg-card">
                <tr>
                  {["ID", "操作类型", "状态", "操作人", "时间"].map((h) => (
                    <th key={h} className="px-4 py-2.5 font-medium text-[11px] uppercase text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((r) => (
                  <tr key={r.id} className="border-b border-border/50">
                    <td className="px-4 py-2 font-mono text-[11px] text-muted-foreground">{r.id}</td>
                    <td className="px-4 py-2">{r.kind}</td>
                    <td className="px-4 py-2"><span className={cn("rounded border px-2 py-0.5 font-mono text-[10px] uppercase", r.status === "success" ? "badge-success" : "badge-offline")}>{r.status}</span></td>
                    <td className="px-4 py-2 text-muted-foreground">{r.performedBy}</td>
                    <td className="px-4 py-2 font-mono text-[11px] text-muted-foreground">{r.performedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm dialog */}
      {confirmOp && (
        <DangerConfirmDialog
          op={confirmOp}
          graphName={graphName}
          onClose={() => setConfirmOp(null)}
          onConfirm={() => void handleOp(confirmOp)}
        />
      )}
    </div>
  );
}

function DangerSection({ title, desc, action, children }: { title: string; desc: string; action: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="rounded border border-destructive/20 bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[14px] font-semibold text-destructive">
            <ShieldOff className="h-4 w-4" />{title}
          </div>
          {desc && <p className="mt-1 text-[12px] text-muted-foreground">{desc}</p>}
          {children}
        </div>
        <div className="shrink-0">{action}</div>
      </div>
    </div>
  );
}

function DangerConfirmDialog({ graphName, onClose, onConfirm }: { op?: DangerOp; graphName: string; onClose: () => void; onConfirm: () => void }) {
  const { t } = useTranslation("knowledge-graph");
  const [input, setInput] = useState("");
  const matched = input === graphName;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm">
      <div className="w-full max-w-md rounded border border-border bg-background p-6 shadow-sm animate-fade-in">
        <div className="flex items-center gap-2 text-[15px] font-semibold text-destructive mb-4">
          <AlertTriangle className="h-5 w-5" />危险操作确认
        </div>
        <p className="text-[13px] text-foreground mb-1">{t("admin.confirm.placeholder")}</p>
        <code className="text-[13px] font-mono text-primary">{graphName}</code>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="mt-3 h-8 w-full rounded border border-border bg-background px-3 text-[13px] outline-none focus:border-primary"
          placeholder={graphName}
        />
        {input && !matched && <p className="mt-1 text-[11px] text-destructive">{t("admin.confirm.mismatch")}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-8 rounded border border-border px-4 text-[13px] text-muted-foreground hover:text-foreground transition-colors">取消</button>
          <button type="button" onClick={onConfirm} disabled={!matched}
            className="h-8 rounded border border-destructive bg-destructive px-4 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-40 transition-opacity">
            确认执行
          </button>
        </div>
      </div>
    </div>
  );
}

const dangerBtnCls = "flex h-8 items-center gap-2 rounded border border-destructive/30 bg-destructive/5 px-4 text-[12px] text-destructive hover:bg-destructive/10 transition-colors";
