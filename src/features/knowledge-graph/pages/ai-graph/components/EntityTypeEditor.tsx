import { useTranslation } from "react-i18next";
import { X, Plus, Sparkles } from "lucide-react";
import type { EntityTypeDef } from "@/features/knowledge-graph/api/mock";

interface Props {
  value: EntityTypeDef[];
  onChange: (v: EntityTypeDef[]) => void;
  onFillFromTemplate?: () => void;
}

export function EntityTypeEditor({ value, onChange, onFillFromTemplate }: Props) {
  const { t } = useTranslation("knowledge-graph");

  const update = (idx: number, patch: Partial<EntityTypeDef>) =>
    onChange(value.map((v, i) => i === idx ? { ...v, ...patch } : v));

  const add = () =>
    onChange([...value, { label: "", description: "", examples: [""] }]);

  const remove = (idx: number) =>
    onChange(value.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      <div className="rounded border border-border overflow-hidden">
        <table className="w-full text-[12px]">
          <thead className="border-b border-border bg-card">
            <tr>
              <th className="px-3 py-2 text-left text-[10px] uppercase text-muted-foreground w-32">{t("ai-graph.config.entityTypeLabel")}</th>
              <th className="px-3 py-2 text-left text-[10px] uppercase text-muted-foreground">{t("ai-graph.config.entityTypeDescription")}</th>
              <th className="px-3 py-2 text-left text-[10px] uppercase text-muted-foreground w-64">{t("ai-graph.config.entityTypeExamples")}</th>
              <th className="px-3 py-2 w-8" />
            </tr>
          </thead>
          <tbody>
            {value.map((row, idx) => (
              <tr key={idx} className="border-b border-border/50 last:border-b-0">
                <td className="px-3 py-2">
                  <input
                    value={row.label}
                    onChange={(e) => update(idx, { label: e.target.value })}
                    placeholder="Person"
                    className="h-7 w-full rounded border border-border bg-background px-2 text-[12px] font-medium outline-none focus:border-primary"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    value={row.description}
                    onChange={(e) => update(idx, { description: e.target.value })}
                    placeholder="自然人，包括…"
                    className="h-7 w-full rounded border border-border bg-background px-2 text-[12px] outline-none focus:border-primary"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    value={row.examples.join(", ")}
                    onChange={(e) => update(idx, { examples: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                    placeholder="张三, 李四"
                    className="h-7 w-full rounded border border-border bg-background px-2 text-[12px] outline-none focus:border-primary"
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <button type="button" onClick={() => remove(idx)}
                    className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {value.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-[11px] text-muted-foreground">尚未定义实体类型</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={add}
          className="flex h-7 items-center gap-1 rounded border border-border px-2.5 text-[11px] text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors">
          <Plus className="h-3 w-3" />{t("ai-graph.config.addEntityType")}
        </button>
        {onFillFromTemplate && (
          <button type="button" onClick={onFillFromTemplate}
            className="flex h-7 items-center gap-1 rounded border border-border px-2.5 text-[11px] text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors">
            <Sparkles className="h-3 w-3" />{t("ai-graph.config.fillFromTemplate")}
          </button>
        )}
      </div>
    </div>
  );
}
