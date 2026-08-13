import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function WorkspacePage({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("h-full overflow-y-auto bg-background p-5", className)}><div className="mx-auto w-full max-w-[1600px] space-y-4">{children}</div></div>;
}

export function PageTitle({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description: string; actions?: ReactNode }) {
  return (
    <header className="flex flex-col gap-3 border-b border-border pb-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        {eyebrow && <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</div>}
        <h1 className="text-[20px] font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mt-1 max-w-4xl text-[12px] leading-5 text-muted-foreground">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Panel({ title, description, actions, children, className }: { title?: string; description?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("overflow-hidden rounded-lg border border-border bg-card shadow-sm", className)}>
      {(title || description || actions) && (
        <div className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div><div className="text-[13px] font-semibold text-foreground">{title}</div>{description && <div className="mt-0.5 text-[11px] text-muted-foreground">{description}</div>}</div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

const tones: Record<string, string> = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  red: "border-red-200 bg-red-50 text-red-700",
  slate: "border-slate-200 bg-slate-50 text-slate-600",
  violet: "border-violet-200 bg-violet-50 text-violet-700",
};

export function Pill({ children, tone = "slate", className }: { children: ReactNode; tone?: keyof typeof tones; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium", tones[tone], className)}>{children}</span>;
}

export function ProgressBar({ value, tone = "blue", className }: { value: number; tone?: "blue" | "green" | "amber" | "red" | "violet"; className?: string }) {
  const colors = { blue: "bg-blue-500", green: "bg-emerald-500", amber: "bg-amber-500", red: "bg-red-500", violet: "bg-violet-500" };
  return <div className={cn("h-1.5 overflow-hidden rounded-full bg-slate-100", className)}><div className={cn("h-full rounded-full transition-all", colors[tone])} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>;
}

export function ActionButton({ children, onClick, icon: Icon, primary = false, disabled = false }: { children: ReactNode; onClick?: () => void; icon?: LucideIcon; primary?: boolean; disabled?: boolean }) {
  return <button type="button" disabled={disabled} onClick={onClick} className={cn("inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-3 text-[11px] font-medium transition disabled:cursor-not-allowed disabled:opacity-50", primary ? "bg-primary text-primary-foreground hover:opacity-90" : "border border-input bg-card text-foreground hover:border-primary/40 hover:text-primary")}>{Icon && <Icon className="h-3.5 w-3.5" />}{children}</button>;
}

export function InlineNotice({ error, loading }: { error?: Error | null; loading?: boolean }) {
  if (!error && !loading) return null;
  return <div className={cn("rounded-md border px-3 py-2 text-[11px]", error ? "border-red-200 bg-red-50 text-red-700" : "border-blue-200 bg-blue-50 text-blue-700")}>{error ? "SQLite 状态服务不可用，当前展示本地初始数据。" : "正在从 SQLite 恢复状态…"}</div>;
}

export function MiniStat({ label, value, hint, icon: Icon, tone = "blue" }: { label: string; value: ReactNode; hint?: string; icon?: LucideIcon; tone?: "blue" | "green" | "amber" | "red" | "violet" }) {
  const colors = { blue: "bg-blue-50 text-blue-600", green: "bg-emerald-50 text-emerald-600", amber: "bg-amber-50 text-amber-600", red: "bg-red-50 text-red-600", violet: "bg-violet-50 text-violet-600" };
  return <div className="rounded-lg border border-border bg-card p-3 shadow-sm"><div className="flex items-center justify-between"><span className="text-[11px] text-muted-foreground">{label}</span>{Icon && <span className={cn("grid h-7 w-7 place-items-center rounded-md", colors[tone])}><Icon className="h-3.5 w-3.5" /></span>}</div><div className="mt-1 text-[20px] font-semibold tabular-nums text-foreground">{value}</div>{hint && <div className="mt-0.5 text-[10px] text-muted-foreground">{hint}</div>}</div>;
}
