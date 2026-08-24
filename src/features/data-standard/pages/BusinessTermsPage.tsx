import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, BarChart3, Boxes, Database, GitBranch, Grid3X3, Network,
  RefreshCw, Sparkles,
} from "lucide-react";

import { ActionButton, PageTitle, Panel, WorkspacePage } from "@/components/data-platform/WorkspacePrimitives";
import { cn } from "@/lib/utils";

import { createDefaultBusinessTermsState, DATA_STANDARD_SCOPES } from "../fixtures";
import { useDataStandardState } from "../state";
import type { EntityStatus, OntologyEntity, OntologySchema } from "../types";
import { useWorkbenchCrud } from "../useWorkbenchCrud";

import {
  DiagReport, DiagnosticsTab, DomainTabContent, Drawer, DrawerField,
  EntityTab, MetricTab, RelationTab, SchemaTab, inputCls,
} from "./WorkbenchTables";
import { ForceGraph } from "./WorkbenchGraph";

type BtState = ReturnType<typeof createDefaultBusinessTermsState>;

const TABS = [
  { key: "domains", label: "领域管理", icon: Grid3X3 },
  { key: "schemas", label: "Schema 管理", icon: Database },
  { key: "entities", label: "实体管理", icon: Boxes },
  { key: "relations", label: "关系管理", icon: GitBranch },
  { key: "metrics", label: "指标管理", icon: BarChart3 },
  { key: "visualization", label: "可视化", icon: Network },
  { key: "diagnostics", label: "完整性诊断", icon: Activity },
] as const;
type TabKey = typeof TABS[number]["key"];

export function BusinessTermsPage() {
  const [state, update] = useDataStandardState<BtState>(
    DATA_STANDARD_SCOPES.businessTerms, createDefaultBusinessTermsState(),
  );
  const [activeTab, setActiveTab] = useState<TabKey>("domains");
  const [domainFilter, setDomainFilter] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const showNotice = useCallback((msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  }, []);

  const wb = state.workbench;
  const domains = wb.domains;
  const crud = useWorkbenchCrud(state, update, showNotice);

  const domainEntityCount = useCallback((code: string) => wb.entities.filter((e) => e.domainCode === code).length, [wb.entities]);
  const domainRelationCount = useCallback((code: string) => wb.relations.filter((r) => r.domainCode === code).length, [wb.relations]);
  const domainMetricCount = useCallback((code: string) => wb.metrics.filter((m) => m.domainCode === code).length, [wb.metrics]);
  const domainSchemaCount = useCallback((code: string) => wb.schemas.filter((s) => s.domainCode === code).length, [wb.schemas]);

  const goToTab = (tab: TabKey, domainCode?: string) => {
    setActiveTab(tab);
    if (domainCode) setDomainFilter(domainCode);
  };

  // ---- Schema drawer state ----
  const [schemaDrawer, setSchemaDrawer] = useState(false);
  const [editingSchema, setEditingSchema] = useState<OntologySchema | null>(null);
  const [schemaDraft, setSchemaDraft] = useState({ code: "", name: "", domainCode: "ai", description: "", parentSchemaId: "", status: "有效" as "有效" | "草稿" });
  const openSchemaNew = () => { setEditingSchema(null); setSchemaDraft({ code: "", name: "", domainCode: domainFilter || "ai", description: "", parentSchemaId: "", status: "有效" }); setSchemaDrawer(true); };
  const openSchemaEdit = (s: OntologySchema) => { setEditingSchema(s); setSchemaDraft({ code: s.code, name: s.name, domainCode: s.domainCode, description: s.description, parentSchemaId: s.parentSchemaId ?? "", status: s.status }); setSchemaDrawer(true); };

  // ---- Entity drawer state ----
  const [entityDrawer, setEntityDrawer] = useState(false);
  const [editingEntity, setEditingEntity] = useState<OntologyEntity | null>(null);
  const [entityDraft, setEntityDraft] = useState({ name: "", schemaCode: "", confidence: 90, status: "候选" as EntityStatus, domainCode: "ai" });
  const openEntityNew = () => {
    const ds = wb.schemas.filter((s) => s.domainCode === (domainFilter || "ai"));
    setEditingEntity(null); setEntityDraft({ name: "", schemaCode: ds[0]?.code ?? "", confidence: 90, status: "候选", domainCode: domainFilter || "ai" }); setEntityDrawer(true);
  };
  const openEntityEdit = (e: OntologyEntity) => { setEditingEntity(e); setEntityDraft({ name: e.name, schemaCode: e.schemaCode, confidence: e.confidence, status: e.status, domainCode: e.domainCode }); setEntityDrawer(true); };

  // ---- Relation drawer state ----
  const [relationDrawer, setRelationDrawer] = useState(false);
  const [relationDraft, setRelationDraft] = useState({ subject: "", predicate: "", object: "", confidence: 90, domainCode: "ai" });
  const openRelationNew = () => { setRelationDraft({ subject: "", predicate: "", object: "", confidence: 90, domainCode: domainFilter || "ai" }); setRelationDrawer(true); };

  // ---- Metric drawer state ----
  const [metricDrawer, setMetricDrawer] = useState(false);
  const [metricDraft, setMetricDraft] = useState({ name: "", code: "", type: "计数" as "计数" | "平均值" | "比率" | "求和", domainCode: "ai", definition: "" });
  const openMetricNew = () => { setMetricDraft({ name: "", code: "", type: "计数", domainCode: domainFilter || "ai", definition: "" }); setMetricDrawer(true); };

  // ---- Diagnostics ----
  const diagnostics: DiagReport = useMemo(() => {
    const totalEntities = wb.entities.length;
    const totalRelations = wb.relations.length;
    const relatedNames = new Set<string>();
    wb.relations.forEach((r) => { relatedNames.add(r.subject); relatedNames.add(r.object); });
    const orphanEntities = wb.entities.filter((e) => !relatedNames.has(e.name)).length;
    const confirmedEntities = wb.entities.filter((e) => e.status === "已确认").length;
    const coverageRate = totalEntities ? Math.round((confirmedEntities / totalEntities) * 100) : 0;
    const suggestions: DiagReport["suggestions"] = [];
    if (coverageRate < 80) suggestions.push({ level: "warning", text: `实体确认覆盖率 ${coverageRate}%，建议提升至 80% 以上。` });
    else suggestions.push({ level: "ok", text: `实体确认覆盖率 ${coverageRate}%，状态良好。` });
    if (orphanEntities > 0) suggestions.push({ level: "error", text: `孤立实体 ${orphanEntities} 个，无任何关系连接。` });
    else suggestions.push({ level: "ok", text: "无孤立实体。" });
    const uncovered = wb.domains.filter((d) => !wb.schemas.some((s) => s.domainCode === d.code));
    if (uncovered.length > 0) suggestions.push({ level: "warning", text: `Schema 覆盖率不足：${uncovered.map((d) => d.name).join("、")} 尚无 Schema。` });
    const schemaEffRate = wb.schemas.length > 0 ? Math.round((wb.schemas.filter((s) => s.status === "有效").length / wb.schemas.length) * 100) : 0;
    const closureRate = totalRelations > 0 ? Math.round((relatedNames.size / new Set(wb.entities.map((e) => e.name)).size) * 100) : 0;
    suggestions.push({ level: "info", text: `Schema 有效率 ${schemaEffRate}%，关系闭环率 ${closureRate}%。` });
    const score = Math.round((coverageRate + closureRate + Math.min(100, schemaEffRate * 1.2)) / 3);
    return { totalSchemas: wb.schemas.length, totalEntities, totalRelations, orphanEntities, coverageRate, suggestions, score };
  }, [wb]);

  const [diagReport, setDiagReport] = useState(diagnostics);
  useEffect(() => { setDiagReport(diagnostics); }, [diagnostics]);

  return (
    <WorkspacePage>
      <PageTitle
        eyebrow="Data Standard / Ontology"
        title="本体模型"
        description="管理本体 Schema、实体、关系、指标口径，运行完整性诊断"
        actions={<>
          <ActionButton icon={RefreshCw} onClick={crud.refreshWorkbench}>刷新</ActionButton>
          <ActionButton icon={Sparkles} primary onClick={crud.initWorkbench}>一键初始化</ActionButton>
        </>}
      />

      {notice && <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] text-blue-700">{notice}</div>}

      {/* Tab Bar */}
      <div className="flex items-center border-b border-border">
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={cn("relative flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-medium transition", active ? "text-blue-600" : "text-muted-foreground hover:text-foreground")}>
              <Icon className="h-3.5 w-3.5" />{tab.label}
              {active && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t bg-blue-600" />}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "domains" && (
        <DomainTabContent
          domains={domains}
          onOpenSchema={(code) => goToTab("schemas", code)}
          onDelete={crud.deleteDomain}
          entityCount={domainEntityCount}
          relationCount={domainRelationCount}
          metricCount={domainMetricCount}
          schemaCount={domainSchemaCount}
        />
      )}

      {(activeTab === "schemas" || activeTab === "entities" || activeTab === "relations" || activeTab === "metrics") && (
        <Panel className="p-0">
          {activeTab === "schemas" && (
            <SchemaTab
              schemas={wb.schemas.filter((s) => !domainFilter || s.domainCode === domainFilter)}
              domains={domains}
              entities={wb.entities}
              onAdd={openSchemaNew} onEdit={openSchemaEdit}
              onDelete={crud.deleteSchema} onGenerate={crud.generateSchema}
            />
          )}
          {activeTab === "entities" && (
            <EntityTab
              entities={wb.entities.filter((e) => !domainFilter || e.domainCode === domainFilter)}
              schemas={wb.schemas} domains={domains}
              onAdd={openEntityNew} onEdit={openEntityEdit}
              onDelete={crud.deleteEntity} onConfirm={crud.confirmEntities}
            />
          )}
          {activeTab === "relations" && (
            <RelationTab
              relations={wb.relations.filter((r) => !domainFilter || r.domainCode === domainFilter)}
              domains={domains}
              onAdd={openRelationNew} onDelete={crud.deleteRelation}
            />
          )}
          {activeTab === "metrics" && (
            <MetricTab
              metrics={wb.metrics.filter((m) => !domainFilter || m.domainCode === domainFilter)}
              domains={domains}
              onAdd={openMetricNew} onDelete={crud.deleteMetric}
            />
          )}
        </Panel>
      )}

      {activeTab === "visualization" && (
        <Panel title="本体关系图谱" description="基于力导向布局的实体关系可视化">
          <ForceGraph entities={wb.entities} schemas={wb.schemas} relations={wb.relations} domainFilter={domainFilter} />
        </Panel>
      )}

      {activeTab === "diagnostics" && (
        <DiagnosticsTab report={diagReport} onRerun={() => setDiagReport(diagnostics)} />
      )}

      {domainFilter && activeTab !== "domains" && activeTab !== "diagnostics" && (
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>当前域筛选：{domains.find((d) => d.code === domainFilter)?.name}</span>
          <button onClick={() => setDomainFilter("")} className="underline">清除</button>
        </div>
      )}

      {/* ---- Schema Drawer ---- */}
      <Drawer open={schemaDrawer} onClose={() => setSchemaDrawer(false)} title={editingSchema ? "编辑 Schema" : "新建 Schema"}>
        <DrawerField label="类名 (code)" required>
          <input value={schemaDraft.code} onChange={(e) => setSchemaDraft({ ...schemaDraft, code: e.target.value })} className={inputCls} placeholder="如 AIModel" />
        </DrawerField>
        <DrawerField label="中文名" required>
          <input value={schemaDraft.name} onChange={(e) => setSchemaDraft({ ...schemaDraft, name: e.target.value })} className={inputCls} placeholder="如 AI 模型" />
        </DrawerField>
        <DrawerField label="所属域">
          <select value={schemaDraft.domainCode} onChange={(e) => setSchemaDraft({ ...schemaDraft, domainCode: e.target.value })} className={inputCls}>
            {domains.map((d) => <option key={d.code} value={d.code}>{d.name}</option>)}
          </select>
        </DrawerField>
        <DrawerField label="描述">
          <textarea value={schemaDraft.description} onChange={(e) => setSchemaDraft({ ...schemaDraft, description: e.target.value })} rows={3} className={cn(inputCls, "h-auto py-2")} placeholder="Schema 的业务描述" />
        </DrawerField>
        <DrawerField label="父类">
          <select value={schemaDraft.parentSchemaId} onChange={(e) => setSchemaDraft({ ...schemaDraft, parentSchemaId: e.target.value })} className={inputCls}>
            <option value="">无（顶层 Schema）</option>
            {wb.schemas.filter((s) => s.domainCode === schemaDraft.domainCode && s.id !== editingSchema?.id).map((s) => <option key={s.id} value={s.id}>{s.code} ({s.name})</option>)}
          </select>
        </DrawerField>
        <DrawerField label="状态">
          <select value={schemaDraft.status} onChange={(e) => setSchemaDraft({ ...schemaDraft, status: e.target.value as "有效" | "草稿" })} className={inputCls}>
            <option value="有效">有效</option><option value="草稿">草稿</option>
          </select>
        </DrawerField>
        <div className="flex justify-end gap-2 pt-2">
          <ActionButton onClick={() => setSchemaDrawer(false)}>取消</ActionButton>
          <ActionButton icon={Sparkles} primary onClick={() => { crud.saveSchema(schemaDraft, editingSchema); setSchemaDrawer(false); }}>
            {editingSchema ? "保存" : "创建"}
          </ActionButton>
        </div>
      </Drawer>

      {/* ---- Entity Drawer ---- */}
      <Drawer open={entityDrawer} onClose={() => setEntityDrawer(false)} title={editingEntity ? "编辑实体" : "新建实体"}>
        <DrawerField label="实体名" required>
          <input value={entityDraft.name} onChange={(e) => setEntityDraft({ ...entityDraft, name: e.target.value })} className={inputCls} placeholder="如 GPT-4o" />
        </DrawerField>
        <DrawerField label="所属类" required>
          <select value={entityDraft.schemaCode} onChange={(e) => {
            const sch = wb.schemas.find((s) => s.code === e.target.value);
            setEntityDraft({ ...entityDraft, schemaCode: e.target.value, domainCode: sch?.domainCode ?? entityDraft.domainCode });
          }} className={inputCls}>
            <option value="">选择 Schema...</option>
            {wb.schemas.map((s) => <option key={s.id} value={s.code}>{s.code} ({s.name})</option>)}
          </select>
        </DrawerField>
        <DrawerField label="置信度">
          <div className="flex items-center gap-2">
            <input type="range" min={50} max={100} value={entityDraft.confidence} onChange={(e) => setEntityDraft({ ...entityDraft, confidence: Number(e.target.value) })} className="flex-1" />
            <span className="w-12 text-right text-[11px] tabular-nums">{entityDraft.confidence}%</span>
          </div>
        </DrawerField>
        <DrawerField label="状态">
          <select value={entityDraft.status} onChange={(e) => setEntityDraft({ ...entityDraft, status: e.target.value as EntityStatus })} className={inputCls}>
            <option value="候选">候选</option><option value="已确认">已确认</option><option value="已废止">已废止</option>
          </select>
        </DrawerField>
        <div className="flex justify-end gap-2 pt-2">
          <ActionButton onClick={() => setEntityDrawer(false)}>取消</ActionButton>
          <ActionButton icon={Sparkles} primary onClick={() => { crud.saveEntity(entityDraft, editingEntity); setEntityDrawer(false); }}>
            {editingEntity ? "保存" : "创建"}
          </ActionButton>
        </div>
      </Drawer>

      {/* ---- Relation Drawer ---- */}
      <Drawer open={relationDrawer} onClose={() => setRelationDrawer(false)} title="新建关系">
        <DrawerField label="主体" required>
          <input value={relationDraft.subject} onChange={(e) => setRelationDraft({ ...relationDraft, subject: e.target.value })} className={inputCls} placeholder="主体实体名" />
        </DrawerField>
        <DrawerField label="谓词" required>
          <input value={relationDraft.predicate} onChange={(e) => setRelationDraft({ ...relationDraft, predicate: e.target.value })} className={inputCls} placeholder="如 belongsTo / relatesTo" />
        </DrawerField>
        <DrawerField label="客体" required>
          <input value={relationDraft.object} onChange={(e) => setRelationDraft({ ...relationDraft, object: e.target.value })} className={inputCls} placeholder="客体实体名" />
        </DrawerField>
        <DrawerField label="置信度">
          <div className="flex items-center gap-2">
            <input type="range" min={50} max={100} value={relationDraft.confidence} onChange={(e) => setRelationDraft({ ...relationDraft, confidence: Number(e.target.value) })} className="flex-1" />
            <span className="w-12 text-right text-[11px] tabular-nums">{relationDraft.confidence}%</span>
          </div>
        </DrawerField>
        <DrawerField label="所属域">
          <select value={relationDraft.domainCode} onChange={(e) => setRelationDraft({ ...relationDraft, domainCode: e.target.value })} className={inputCls}>
            {domains.map((d) => <option key={d.code} value={d.code}>{d.name}</option>)}
          </select>
        </DrawerField>
        <div className="flex justify-end gap-2 pt-2">
          <ActionButton onClick={() => setRelationDrawer(false)}>取消</ActionButton>
          <ActionButton icon={Sparkles} primary onClick={() => { crud.saveRelation(relationDraft); setRelationDrawer(false); }}>创建</ActionButton>
        </div>
      </Drawer>

      {/* ---- Metric Drawer ---- */}
      <Drawer open={metricDrawer} onClose={() => setMetricDrawer(false)} title="新建指标">
        <DrawerField label="指标名" required>
          <input value={metricDraft.name} onChange={(e) => setMetricDraft({ ...metricDraft, name: e.target.value })} className={inputCls} placeholder="如 模型总量" />
        </DrawerField>
        <DrawerField label="规范名 (code)" required>
          <input value={metricDraft.code} onChange={(e) => setMetricDraft({ ...metricDraft, code: e.target.value })} className={inputCls} placeholder="如 model_count" />
        </DrawerField>
        <DrawerField label="类型">
          <select value={metricDraft.type} onChange={(e) => setMetricDraft({ ...metricDraft, type: e.target.value as "计数" | "平均值" | "比率" | "求和" })} className={inputCls}>
            <option value="计数">计数</option><option value="平均值">平均值</option><option value="比率">比率</option><option value="求和">求和</option>
          </select>
        </DrawerField>
        <DrawerField label="所属域">
          <select value={metricDraft.domainCode} onChange={(e) => setMetricDraft({ ...metricDraft, domainCode: e.target.value })} className={inputCls}>
            {domains.map((d) => <option key={d.code} value={d.code}>{d.name}</option>)}
          </select>
        </DrawerField>
        <DrawerField label="定义">
          <textarea value={metricDraft.definition} onChange={(e) => setMetricDraft({ ...metricDraft, definition: e.target.value })} rows={3} className={cn(inputCls, "h-auto py-2")} placeholder="指标的业务定义" />
        </DrawerField>
        <div className="flex justify-end gap-2 pt-2">
          <ActionButton onClick={() => setMetricDrawer(false)}>取消</ActionButton>
          <ActionButton icon={Sparkles} primary onClick={() => { crud.saveMetric(metricDraft); setMetricDrawer(false); }}>创建</ActionButton>
        </div>
      </Drawer>
    </WorkspacePage>
  );
}
