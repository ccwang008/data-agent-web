import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { mockClient } from "@/lib/mock-client";
import type { DomainTemplate, DomainKey, SchemaMode, ExtractionConfig, EntityTypeDef, ClaimTypeDef, EmbeddingModel } from "@/features/knowledge-graph/api/mock";
import { EntityTypeEditor } from "../components/EntityTypeEditor";

export type { ExtractionConfig };

const GLEANING_OPTIONS = [0, 1, 2, 3];
const PROMPT_TABS = ["extraction", "gleaning", "summarization", "report"] as const;
type PromptTab = typeof PROMPT_TABS[number];

interface Props {
  config: ExtractionConfig;
  onChange: (c: ExtractionConfig) => void;
}

export function Step2ExtractionConfig({ config, onChange }: Props) {
  const { t } = useTranslation("knowledge-graph");
  const [templates, setTemplates] = useState<DomainTemplate[]>([]);
  const [llmModels, setLlmModels] = useState<Array<{ key: string; label: string; family: string }>>([]);
  const [embeddingModels, setEmbeddingModels] = useState<Array<{ key: string; label: string; family: string; dimensions: number }>>([]);
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptTab, setPromptTab] = useState<PromptTab>("extraction");
  const [schemaLabels] = useState(["Person", "Company", "Product"]);

  useEffect(() => {
    void mockClient.get<DomainTemplate[]>("/api/knowledge-graph/ai-graph/templates").then(setTemplates);
    void mockClient.get<typeof llmModels>("/api/knowledge-graph/ai-graph/llm-models").then(setLlmModels);
    void mockClient.get<typeof embeddingModels>("/api/knowledge-graph/ai-graph/embedding-models").then(setEmbeddingModels);
  }, []);

  const set = <K extends keyof ExtractionConfig>(key: K, val: ExtractionConfig[K]) =>
    onChange({ ...config, [key]: val });

  const toggleLockedLabel = (label: string) => {
    const cur = config.lockedVertexLabels ?? [];
    const next = cur.includes(label) ? cur.filter((l) => l !== label) : [...cur, label];
    set("lockedVertexLabels", next);
  };

  const fillEntityTypesFromDomain = async () => {
    const types = await mockClient.get<EntityTypeDef[]>(`/api/knowledge-graph/ai-graph/entity-types/suggested?domain=${config.domain}`, { latencyMs: 60 });
    set("entityTypes", types);
  };

  const fillClaimTypesFromDomain = async () => {
    const types = await mockClient.get<ClaimTypeDef[]>(`/api/knowledge-graph/ai-graph/claim-types/suggested?domain=${config.domain}`, { latencyMs: 60 });
    set("claimTypes", types);
  };

  // Auto-fill on domain change if entityTypes is empty
  useEffect(() => {
    if ((config.entityTypes?.length ?? 0) === 0) void fillEntityTypesFromDomain();
  }, [config.domain]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      {/* Schema mode */}
      <div>
        <div className="eyebrow mb-2">{t("ai-graph.config.schemaMode")}</div>
        <div className="flex rounded border border-border overflow-hidden w-fit">
          {(["free", "locked"] as const).map((m: SchemaMode) => (
            <button key={m} type="button" onClick={() => set("schemaMode", m)}
              className={cn("px-4 py-1.5 text-[13px] transition-colors",
                config.schemaMode === m ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:text-foreground")}>
              {t(`ai-graph.config.${m}`)}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          {config.schemaMode === "free" ? t("ai-graph.config.freeHint") : t("ai-graph.config.lockedHint")}
        </p>
        {config.schemaMode === "locked" && (
          <div className="mt-3 flex flex-wrap gap-2">
            {schemaLabels.map((label) => (
              <button key={label} type="button" onClick={() => toggleLockedLabel(label)}
                className={cn("rounded border px-2.5 py-1 text-[12px] transition-colors",
                  (config.lockedVertexLabels ?? []).includes(label)
                    ? "border-primary bg-primary/5 text-primary font-medium"
                    : "border-border text-muted-foreground hover:border-primary/40")}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Domain templates */}
      <div>
        <div className="eyebrow mb-2">{t("ai-graph.config.domain")}</div>
        <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
          {templates.map((tpl) => (
            <button key={tpl.key} type="button" onClick={() => set("domain", tpl.key as DomainKey)}
              className={cn("card-ticks rounded border p-3 text-left transition-all",
                config.domain === tpl.key ? "border-primary bg-primary/5" : "border-border hover:border-primary/40")}>
              <div className={cn("text-[13px]", config.domain === tpl.key ? "text-primary font-medium" : "text-foreground")}>
                {tpl.label["zh-CN"]}
              </div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">{tpl.fewShotCount} few-shot</div>
            </button>
          ))}
        </div>
      </div>

      {/* Entity types editor */}
      <div>
        <div className="eyebrow mb-2">{t("ai-graph.config.entityTypes")}</div>
        <EntityTypeEditor
          value={config.entityTypes ?? []}
          onChange={(v) => set("entityTypes", v)}
          onFillFromTemplate={fillEntityTypesFromDomain}
        />
      </div>

      {/* Gleaning rounds */}
      <div>
        <div className="eyebrow mb-2">{t("ai-graph.config.gleaningRounds")}</div>
        <div className="flex items-center gap-2">
          <div className="flex rounded border border-border overflow-hidden">
            {GLEANING_OPTIONS.map((n) => (
              <button key={n} type="button" onClick={() => set("gleaningRounds", n)}
                className={cn("px-3 py-1 text-[12px] transition-colors",
                  (config.gleaningRounds ?? 1) === n ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:text-foreground")}>
                {t("ai-graph.config.roundLabel", { count: n })}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">{t("ai-graph.config.gleaningHint")}</p>
        </div>
      </div>

      {/* Claims extraction */}
      <div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={config.extractClaims ?? false}
              onChange={(e) => set("extractClaims", e.target.checked)}
              className="h-3.5 w-3.5 accent-primary" />
            <span className="eyebrow !mb-0">{t("ai-graph.config.claims")}</span>
          </label>
          <span className="text-[11px] text-muted-foreground">{t("ai-graph.config.claimsHint")}</span>
        </div>
        {config.extractClaims && (
          <div className="mt-3 space-y-2">
            <ClaimTypeEditor value={config.claimTypes ?? []} onChange={(v) => set("claimTypes", v)} onFillFromTemplate={fillClaimTypesFromDomain} />
          </div>
        )}
      </div>

      {/* LLM & Embedding & Parallelism */}
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <div className="eyebrow mb-1.5">{t("ai-graph.config.llmModel")}</div>
          <select value={config.llmModel} onChange={(e) => set("llmModel", e.target.value)}
            className="h-8 w-full rounded border border-border bg-background px-3 text-[12px] outline-none focus:border-primary">
            {llmModels.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
        </div>
        <div>
          <div className="eyebrow mb-1.5">{t("ai-graph.config.embeddingModel")}</div>
          <select value={config.embeddingModel ?? "text-embedding-3-large"} onChange={(e) => set("embeddingModel", e.target.value as EmbeddingModel)}
            className="h-8 w-full rounded border border-border bg-background px-3 text-[12px] outline-none focus:border-primary">
            {embeddingModels.map((m) => <option key={m.key} value={m.key}>{m.label} · {m.dimensions}d</option>)}
          </select>
        </div>
        <div>
          <div className="eyebrow mb-1.5">{t("ai-graph.config.parallelism")} — {config.parallelism ?? 4}</div>
          <input type="range" min={1} max={8}
            value={config.parallelism ?? 4}
            onChange={(e) => set("parallelism", parseInt(e.target.value))}
            className="w-full accent-primary" />
          <div className="flex justify-between text-[10px] text-muted-foreground font-mono mt-0.5">
            <span>1</span><span>4</span><span>8</span>
          </div>
        </div>
      </div>

      {/* Prompt preview */}
      <div>
        <button type="button" onClick={() => setPromptOpen((v) => !v)}
          className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-primary transition-colors">
          {promptOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {t("ai-graph.config.previewPrompt")}
        </button>
        {promptOpen && (
          <div className="mt-2 rounded border border-border bg-card overflow-hidden">
            <div className="flex border-b border-border bg-background">
              {PROMPT_TABS.map((tb) => (
                <button key={tb} type="button" onClick={() => setPromptTab(tb)}
                  className={cn("px-3 py-2 text-[11px] transition-colors border-b-2",
                    promptTab === tb ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground")}>
                  {t(`ai-graph.config.promptTab.${tb}`)}
                </button>
              ))}
            </div>
            <pre className="p-4 text-[11px] font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
              {renderPrompt(promptTab, config, templates)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

function ClaimTypeEditor({ value, onChange, onFillFromTemplate }: {
  value: ClaimTypeDef[]; onChange: (v: ClaimTypeDef[]) => void; onFillFromTemplate?: () => void;
}) {
  const { t } = useTranslation("knowledge-graph");
  const update = (idx: number, patch: Partial<ClaimTypeDef>) =>
    onChange(value.map((v, i) => i === idx ? { ...v, ...patch } : v));
  const add = () => onChange([...value, { type: "", description: "" }]);
  const remove = (idx: number) => onChange(value.filter((_, i) => i !== idx));

  return (
    <div className="rounded border border-border overflow-hidden">
      <table className="w-full text-[12px]">
        <thead className="border-b border-border bg-card">
          <tr>
            <th className="px-3 py-2 text-left text-[10px] uppercase text-muted-foreground w-40">{t("ai-graph.config.claimType")}</th>
            <th className="px-3 py-2 text-left text-[10px] uppercase text-muted-foreground">{t("ai-graph.config.claimDescription")}</th>
            <th className="px-3 py-2 w-8" />
          </tr>
        </thead>
        <tbody>
          {value.map((row, idx) => (
            <tr key={idx} className="border-b border-border/50 last:border-b-0">
              <td className="px-3 py-1.5">
                <input value={row.type} onChange={(e) => update(idx, { type: e.target.value })} placeholder="acquired"
                  className="h-7 w-full rounded border border-border bg-background px-2 text-[12px] font-mono outline-none focus:border-primary" />
              </td>
              <td className="px-3 py-1.5">
                <input value={row.description} onChange={(e) => update(idx, { description: e.target.value })} placeholder="收购关系"
                  className="h-7 w-full rounded border border-border bg-background px-2 text-[12px] outline-none focus:border-primary" />
              </td>
              <td className="px-3 py-1.5 text-right">
                <button type="button" onClick={() => remove(idx)}
                  className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors text-[12px]">×</button>
              </td>
            </tr>
          ))}
          <tr>
            <td colSpan={3} className="px-3 py-2 text-right">
              <button type="button" onClick={add} className="text-[11px] text-primary hover:underline mr-3">+ 新增</button>
              {onFillFromTemplate && (
                <button type="button" onClick={onFillFromTemplate} className="text-[11px] text-muted-foreground hover:text-primary">
                  从领域模板填充
                </button>
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function renderPrompt(tab: PromptTab, c: ExtractionConfig, templates: DomainTemplate[]): string {
  const tpl = templates.find(t => t.key === c.domain);
  const types = (c.entityTypes ?? []).map(et => `- ${et.label}: ${et.description}${et.examples.length ? ` [例: ${et.examples.join(", ")}]` : ""}`).join("\n") || "（无定义）";
  switch (tab) {
    case "extraction":
      return `System: 你是一个知识图谱构建专家。请从以下文本中抽取实体和关系。
领域: ${c.domain}（${tpl?.label["zh-CN"] ?? c.domain}）  模式: ${c.schemaMode}
${c.schemaMode === "locked" ? `约束 Labels: ${(c.lockedVertexLabels ?? []).join(", ") || "（未选）"}\n` : ""}
实体类型定义:
${types}

Few-shot (${tpl?.fewShotCount ?? 3} 条):
输入: "张三是 ABC 公司的 CEO"
输出: { vertices:[{label:"Person",name:"张三"},{label:"Company",name:"ABC公司"}], edges:[{label:"works_at",source:"张三",target:"ABC公司",properties:{role:"CEO"}}] }

请抽取以下文本：{{chunk}}`;
    case "gleaning":
      return `System: 上次抽取可能遗漏了部分实体或关系。请仔细回扫并补充。
之前已抽取（部分）: {{previous_partial}}
原文: {{chunk}}

要求：
1. 只输出之前未抽取的实体/关系
2. 标注每条结果的置信度
3. 当前为第 ${c.gleaningRounds ?? 1} / ${c.gleaningRounds ?? 1} 轮`;
    case "summarization":
      return `System: 同一实体可能在不同切片有不同表述。请将多源描述合并成一段统一的实体描述。
实体: {{entity_name}}（label: {{entity_label}}）
来源描述:
{{descriptions}}

输出格式: 一段 50–100 字的统一描述，保留所有信息。`;
    case "report":
      return `System: 你是一名行业分析师。请根据以下社区中的实体与关系生成一份社区报告。
社区: {{community_title}}
成员: {{members}}
关系: {{edges}}

报告格式（JSON）：
{
  "title": "...",
  "summary": "200 字摘要",
  "rating": 0-10,
  "rating_explanation": "评分依据",
  "findings": [{ "headline": "...", "explanation": "..." }, ...]
}`;
  }
}
