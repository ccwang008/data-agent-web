import { useCallback } from "react";

import { createDefaultBusinessTermsState } from "./fixtures";
import { makeId } from "./state";
import type {
  DomainMetricType, EntityStatus,
  OntologyEntity, OntologySchema,
} from "./types";

type BtState = ReturnType<typeof createDefaultBusinessTermsState>;

export function useWorkbenchCrud(
  state: BtState,
  update: (updater: (cur: BtState) => BtState) => void,
  showNotice: (msg: string) => void,
) {
  const wb = state.workbench;

  const deleteDomain = useCallback((code: string) => {
    const hasEntities = wb.entities.some((e) => e.domainCode === code);
    if (hasEntities) {
      showNotice(`删除失败：该域下仍有实体绑定，无法删除。`); return;
    }
    update((cur) => ({
      ...cur,
      workbench: {
        ...cur.workbench,
        domains: cur.workbench.domains.filter((d) => d.code !== code),
        schemas: cur.workbench.schemas.filter((s) => s.domainCode !== code),
        relations: cur.workbench.relations.filter((r) => r.domainCode !== code),
        metrics: cur.workbench.metrics.filter((m) => m.domainCode !== code),
      },
      updatedAt: new Date().toISOString(),
    }));
    showNotice("域已删除。");
  }, [wb, update, showNotice]);

  const saveSchema = useCallback((
    draft: { code: string; name: string; domainCode: string; description: string; parentSchemaId: string; status: "有效" | "草稿" },
    editingSchema: OntologySchema | null,
  ) => {
    if (!draft.code.trim() || !draft.name.trim()) { showNotice("类名和中文名不能为空。"); return; }
    if (editingSchema) {
      update((cur) => ({
        ...cur,
        workbench: {
          ...cur.workbench,
          schemas: cur.workbench.schemas.map((s) =>
            s.id === editingSchema.id
              ? { ...s, code: draft.code, name: draft.name, domainCode: draft.domainCode, description: draft.description, parentSchemaId: draft.parentSchemaId || null, status: draft.status }
              : s,
          ),
        },
        updatedAt: new Date().toISOString(),
      }));
      showNotice("Schema 已更新。");
    } else {
      update((cur) => ({
        ...cur,
        workbench: {
          ...cur.workbench,
          schemas: [
            ...cur.workbench.schemas,
            {
              id: makeId("S"), code: draft.code, name: draft.name,
              domainCode: draft.domainCode, description: draft.description,
              parentSchemaId: draft.parentSchemaId || null,
              attributes: [{ id: makeId("ATTR"), code: "description", label: "描述", dataType: "string" as const, required: false, unique: false }],
              status: draft.status,
            },
          ],
        },
        updatedAt: new Date().toISOString(),
      }));
      showNotice("Schema 已创建。");
    }
  }, [update, showNotice]);

  const deleteSchema = useCallback((id: string) => {
    const schema = wb.schemas.find((s) => s.id === id);
    const hasEntities = wb.entities.some((e) => e.schemaCode === schema?.code);
    if (hasEntities) { showNotice("删除失败：该 Schema 下仍有实体，无法删除。"); return; }
    update((cur) => ({
      ...cur,
      workbench: { ...cur.workbench, schemas: cur.workbench.schemas.filter((s) => s.id !== id) },
      updatedAt: new Date().toISOString(),
    }));
    showNotice("Schema 已删除。");
  }, [wb, update, showNotice]);

  const generateSchema = useCallback(() => {
    const aiSchemas = wb.schemas.filter((s) => s.domainCode === "ai");
    const existingCodes = new Set(aiSchemas.map((s) => s.code));
    const templates = [
      { code: "VectorStore", name: "向量存储", description: "用于存储和检索嵌入向量的基础设施。" },
      { code: "EmbeddingModel", name: "嵌入模型", description: "将文本转换为向量表示的模型。" },
      { code: "PromptTemplate", name: "提示模板", description: "LLM 推理的提示模板。" },
      { code: "FineTuningJob", name: "微调任务", description: "模型微调的任务配置。" },
    ];
    const next = templates.find((t) => !existingCodes.has(t.code));
    if (!next) { showNotice("AI 生成完成：所有建议的 Schema 均已存在。"); return; }
    update((cur) => ({
      ...cur,
      workbench: {
        ...cur.workbench,
        schemas: [
          ...cur.workbench.schemas,
          {
            id: makeId("S"), code: next.code, name: next.name, domainCode: "ai",
            description: next.description, parentSchemaId: null,
            attributes: [{ id: makeId("ATTR"), code: "description", label: "描述", dataType: "string", required: false, unique: false }],
            status: "草稿",
          },
        ],
      },
      updatedAt: new Date().toISOString(),
    }));
    showNotice(`AI 生成建议：${next.name}（草稿），请完善后保存。`);
  }, [wb, update, showNotice]);

  const saveEntity = useCallback((
    draft: { name: string; schemaCode: string; confidence: number; status: EntityStatus; domainCode: string },
    editingEntity: OntologyEntity | null,
  ) => {
    if (!draft.name.trim() || !draft.schemaCode) { showNotice("名称和所属类不能为空。"); return; }
    const schema = wb.schemas.find((s) => s.code === draft.schemaCode);
    const domainCode = schema?.domainCode ?? draft.domainCode;
    if (editingEntity) {
      update((cur) => ({
        ...cur,
        workbench: {
          ...cur.workbench,
          entities: cur.workbench.entities.map((e) =>
            e.id === editingEntity.id
              ? { ...e, name: draft.name, schemaCode: draft.schemaCode, confidence: draft.confidence, status: draft.status, domainCode }
              : e,
          ),
        },
        updatedAt: new Date().toISOString(),
      }));
      showNotice("实体已更新。");
    } else {
      update((cur) => ({
        ...cur,
        workbench: {
          ...cur.workbench,
          entities: [
            ...cur.workbench.entities,
            { id: makeId("E"), name: draft.name, schemaCode: draft.schemaCode, confidence: draft.confidence, status: draft.status, domainCode, boundTermIds: [] },
          ],
        },
        updatedAt: new Date().toISOString(),
      }));
      showNotice("实体已创建。");
    }
  }, [wb, update, showNotice]);

  const deleteEntity = useCallback((id: string) => {
    const ent = wb.entities.find((e) => e.id === id);
    update((cur) => ({
      ...cur,
      workbench: {
        ...cur.workbench,
        entities: cur.workbench.entities.filter((e) => e.id !== id),
        relations: cur.workbench.relations.filter((r) => r.subject !== ent?.name && r.object !== ent?.name),
      },
      updatedAt: new Date().toISOString(),
    }));
    showNotice("实体已删除。");
  }, [wb, update, showNotice]);

  const confirmEntities = useCallback((ids: string[]) => {
    update((cur) => ({
      ...cur,
      workbench: {
        ...cur.workbench,
        entities: cur.workbench.entities.map((e) =>
          ids.includes(e.id) ? { ...e, status: "已确认" as EntityStatus } : e,
        ),
      },
      updatedAt: new Date().toISOString(),
    }));
    showNotice(`${ids.length} 个实体已确认为"已确认"状态。`);
  }, [update, showNotice]);

  const saveRelation = useCallback((
    draft: { subject: string; predicate: string; object: string; confidence: number; domainCode: string },
  ) => {
    if (!draft.subject.trim() || !draft.predicate.trim() || !draft.object.trim()) {
      showNotice("主体、谓词、客体均不能为空。"); return;
    }
    update((cur) => ({
      ...cur,
      workbench: {
        ...cur.workbench,
        relations: [
          ...cur.workbench.relations,
          { id: makeId("R"), subject: draft.subject, predicate: draft.predicate, object: draft.object, confidence: draft.confidence, domainCode: draft.domainCode },
        ],
      },
      updatedAt: new Date().toISOString(),
    }));
    showNotice("关系已创建。");
  }, [update, showNotice]);

  const deleteRelation = useCallback((id: string) => {
    update((cur) => ({
      ...cur,
      workbench: { ...cur.workbench, relations: cur.workbench.relations.filter((r) => r.id !== id) },
      updatedAt: new Date().toISOString(),
    }));
    showNotice("关系已删除。");
  }, [update, showNotice]);

  const saveMetric = useCallback((
    draft: { name: string; code: string; type: DomainMetricType; domainCode: string; definition: string },
  ) => {
    if (!draft.name.trim() || !draft.code.trim()) { showNotice("指标名和规范名不能为空。"); return; }
    update((cur) => ({
      ...cur,
      workbench: {
        ...cur.workbench,
        metrics: [
          ...cur.workbench.metrics,
          { id: makeId("M"), name: draft.name, code: draft.code, type: draft.type, domainCode: draft.domainCode, definition: draft.definition },
        ],
      },
      updatedAt: new Date().toISOString(),
    }));
    showNotice("指标已创建。");
  }, [update, showNotice]);

  const deleteMetric = useCallback((id: string) => {
    update((cur) => ({
      ...cur,
      workbench: { ...cur.workbench, metrics: cur.workbench.metrics.filter((m) => m.id !== id) },
      updatedAt: new Date().toISOString(),
    }));
    showNotice("指标已删除。");
  }, [update, showNotice]);

  const refreshWorkbench = useCallback(() => {
    update(() => createDefaultBusinessTermsState());
    showNotice("工作台已刷新。");
  }, [update, showNotice]);

  const initWorkbench = useCallback(() => {
    update(() => createDefaultBusinessTermsState());
    showNotice("本体模型一键初始化完成。");
  }, [update, showNotice]);

  return {
    deleteDomain, saveSchema, deleteSchema, generateSchema,
    saveEntity, deleteEntity, confirmEntities,
    saveRelation, deleteRelation,
    saveMetric, deleteMetric,
    refreshWorkbench, initWorkbench,
  };
}

export type WorkbenchCrud = ReturnType<typeof useWorkbenchCrud>;
