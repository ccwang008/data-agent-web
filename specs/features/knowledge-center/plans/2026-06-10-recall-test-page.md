# 知识库召回测试页面改造

## Summary
- 删除知识库详情页内的“召回测试”按钮和旧弹窗能力。
- 在知识库列表页顶部新增“召回测试”按钮，进入独立页面 `/knowledge-center/knowledge-bases/recall-test`。
- 新页面包含测试设置、召回结果、详细召回链路、测试历史。
- 实施前先把本计划写入 `specs/features/knowledge-center/{requirements.md,design.md,tasks.md}`，再改代码。

## Key Changes
- 新增 `RecallTestPage.tsx`：
  - 测试问题：文本输入，默认示例“PostgreSQL 支持哪些索引类型？”
  - 测试数据集：技术文档问答集、云原生运维问答集、统计指标问答集、自定义临时问题。
  - 选择知识库：支持多选 `DEFAULT_BASES`，默认选中生效中的知识库。
  - 检索方式：向量检索、关键字检索、图谱检索、混合检索，默认混合检索。
- 召回结果：
  - 展示排名、得分、知识库、来源标题、片段内容、记录类型、命中原因。
- 召回链路：
  - 每一步展示步骤名、状态、耗时、输入摘要、输出摘要、命中数量或关键指标，方便排查卡点。
  - 不同检索方式使用不同链路，不共用简单步骤。
- 测试历史：
  - 列表展示时间、问题、数据集、知识库数量、检索方式、命中数。
  - 点击历史项可回填测试设置并展示当次结果。

## Recall Pipeline
- 向量检索：
  1. Query
  2. Query 向量化
  3. 向量相似度计算
  4. 检索 Chunks
  5. Rerank TopK
  6. Send LLM
  7. Response
- 关键字检索：
  1. Query
  2. Query 清洗与分词
  3. 关键词扩展
  4. 倒排索引 / BM25 匹配
  5. 检索 Chunks
  6. Rerank TopK
  7. Send LLM
  8. Response
- 图谱检索：
  1. Query
  2. 实体识别与意图识别
  3. 实体链接到图谱节点
  4. 图谱邻域 / 路径扩展
  5. 图谱证据片段召回
  6. Rerank TopK
  7. Send LLM
  8. Response
- 混合检索：
  1. Query
  2. Query 分析与检索路由
  3. 并行执行 Query 向量化、关键词分词、实体识别
  4. 向量相似度计算、BM25 匹配、图谱扩展
  5. 多路结果合并去重
  6. 检索 Chunks / 证据聚合
  7. Rerank TopK
  8. Send LLM
  9. Response

## Interfaces / Routes
- 新增路由 `knowledge-bases/recall-test`，放在 `knowledge-bases/:knowledgeBaseId` 前。
- 不加入左侧菜单，只从知识库列表页顶部按钮进入。
- 新增 mock 接口 `POST /api/knowledge-center/recall-test`。
- 请求字段：`query`、`datasetId`、`knowledgeBaseIds`、`method`。
- 返回字段：`results`、`steps`、`historyItem`。
- 复用现有 `vectorRecords` 作为 mock 数据来源，支持多知识库过滤。

## Cleanup
- 从 `KnowledgeBaseDetailPage.tsx` 删除：
  - `showRecallTest` state
  - 详情页“召回测试”按钮
  - `RecallTestDialog`
  - `RecallResult`
  - 仅服务旧弹窗的无用 import
- 保留详情页上传、批量解析、批量向量化、文档级解析器等现有能力。

## Test Plan
- 运行 `npm run build`。
- 验证知识库列表页顶部可进入召回测试页面。
- 验证知识库详情页不再有召回测试入口。
- 分别测试 4 种检索方式，确认召回链路步骤按策略变化。
- 验证未输入问题或未选择知识库时不能开始测试。
- 验证测试后展示结果、链路和历史记录，点击历史可回填。

## Assumptions
- 本次仍为前端 mock，不接真实后端。
- “测试数据集”仅作为 mock 场景选择，不支持上传真实评测集。
- LLM 步骤只做链路展示和 mock 响应，不调用真实模型。
