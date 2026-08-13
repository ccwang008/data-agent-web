/**
 * Data Asset · feature 内共享 UI 组件（不依赖任何其他 feature）。
 * 遵循 Classic Light SaaS：浅色工作区、白色面板、蓝色主色、紧凑表格与清晰状态反馈。
 */

/* eslint-disable react-refresh/only-export-components -- 本文件是 feature 内 UI 工具集，混合导出组件、hook 与类型 */

import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, Loader2, X, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-card px-5 py-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-[16px] font-semibold text-foreground">{title}</h1>
        <p className="mt-1 text-[12px] text-muted-foreground">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </section>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  icon,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-[12px] font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50",
        className,
      )}
    >
      {icon}
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  disabled,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-card px-3 text-[12px] font-medium text-foreground hover:border-primary/30 hover:text-primary disabled:opacity-50",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  icon,
  color = "text-primary",
  bg = "bg-primary/10",
  loading,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon: typeof CheckCircle2;
  color?: string;
  bg?: string;
  loading?: boolean;
}) {
  const Icon = icon;
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-muted-foreground">{label}</span>
        <span className={cn("grid h-7 w-7 place-items-center rounded-md", bg, color)}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
        </span>
      </div>
      <div className="mt-2 text-[22px] font-semibold tabular-nums text-foreground">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("overflow-hidden rounded-lg border border-border bg-card shadow-sm", className)}>
      {(title || actions) && (
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[13px] font-semibold text-foreground">{title}</div>
            {description && <div className="mt-1 text-[11px] text-muted-foreground">{description}</div>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Modal({
  title,
  description,
  onClose,
  children,
  footer,
  width = "max-w-3xl",
}: {
  title: ReactNode;
  description?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/30 p-4 backdrop-blur-[1px]" role="dialog" aria-modal="true">
      <div className={cn("flex max-h-[min(760px,92vh)] w-full flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xl", width)}>
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
            {description && <p className="mt-1 text-[11px] text-muted-foreground">{description}</p>}
          </div>
          <button type="button" onClick={onClose} className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-slate-100 hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function TabBar({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string; count?: number }[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border px-1">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 border-b-2 px-3 text-[12px] font-medium transition-colors",
            active === tab.key
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
          {typeof tab.count === "number" && tab.count > 0 && (
            <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] tabular-nums", active === tab.key ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export type BadgeTone = "blue" | "green" | "amber" | "red" | "slate" | "violet";

export const BADGE_TONE_CLASS: Record<BadgeTone, string> = {
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  red: "border-red-200 bg-red-50 text-red-700",
  slate: "border-slate-200 bg-slate-50 text-slate-600",
  violet: "border-violet-200 bg-violet-50 text-violet-700",
};

export function Badge({ tone = "slate", children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", BADGE_TONE_CLASS[tone], className)}>
      {children}
    </span>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="grid place-items-center px-4 py-12 text-center">
      <div>
        <div className="text-[13px] font-medium text-foreground">{title}</div>
        {description && <div className="mt-1 max-w-sm text-[12px] text-muted-foreground">{description}</div>}
      </div>
    </div>
  );
}

export function Input({
  value,
  onChange,
  placeholder,
  className,
  type = "text",
  step,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  type?: string;
  step?: string | number;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      step={step}
      className={cn(
        "h-8 rounded-md border border-input bg-surface-raised px-2.5 text-[12px] text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-primary",
        className,
      )}
    />
  );
}

export function Select({
  value,
  onChange,
  options,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        "h-8 rounded-md border border-input bg-card px-2.5 text-[12px] text-foreground outline-none focus:border-primary",
        className,
      )}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  );
}

export function Field({ label, required, children, hint }: { label: string; required?: boolean; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function TextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full resize-y rounded-md border border-input bg-surface-raised px-2.5 py-2 text-[12px] text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-primary"
    />
  );
}

// ---------------- 轻量提示（页面内 flash） ----------------

interface ToastItem {
  id: number;
  tone: "success" | "error" | "info";
  text: string;
}

const ToastContext = createContext<{ show: (tone: ToastItem["tone"], text: string) => void } | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context.show;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((tone: ToastItem["tone"], text: string) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, tone, text }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 3200);
  }, []);

  const icons = {
    success: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
    error: <XCircle className="h-4 w-4 text-red-600" />,
    info: <Info className="h-4 w-4 text-blue-600" />,
  };
  const borders = {
    success: "border-emerald-200",
    error: "border-red-200",
    info: "border-blue-200",
  };

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[70] flex w-80 flex-col gap-2">
        {toasts.map((toast) => (
          <div key={toast.id} className={cn("pointer-events-auto flex items-start gap-2.5 rounded-lg border bg-card px-3.5 py-3 shadow-lg animate-fade-in", borders[toast.tone])}>
            <span className="mt-0.5 shrink-0">{icons[toast.tone]}</span>
            <span className="text-[12px] leading-snug text-foreground">{toast.text}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function WarnNote({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{text}</span>
    </div>
  );
}
