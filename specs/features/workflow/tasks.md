# Workflows · Tasks

> ID 规范: `T-workflow-NN`。完成后将 `[ ]` 改为 `[x]` 并附 PR/Commit 链接。

## P0 · 基础脚手架 · Bootstrap
- [ ] T-workflow-01 创建 `pages/WorkflowListPage.tsx`, 替换 `routes.tsx` 中的 `ModulePlaceholder`
- [ ] T-workflow-02 创建 `api/mock.ts`, 注册 `/api/workflow/list` fixture
- [ ] T-workflow-03 在 `src/lib/i18n.ts` 注册命名空间 `workflow`, 补 zh-CN / en-US 最小文案
- [ ] T-workflow-04 在 `src/components/layout/Sidebar.tsx` 把 `workflow` 项状态从 `todo` 改为 `ready`

## P1 · 核心能力 · Core
- [ ] T-workflow-05 TODO 列表 + 上次运行状态
- [ ] T-workflow-06 TODO 详情页 DAG 渲染(只读)
- [ ] T-workflow-07 TODO 触发流水线 + 状态轮询
- [ ] T-workflow-08 TODO 节点配置抽屉

## P2 · 增强体验 · Polish
- [ ] T-workflow-09 TODO DAG 编辑器(拖拽 / 连线)
- [ ] T-workflow-10 TODO 运行回放时间线 + 日志流
- [ ] T-workflow-11 TODO 部分重跑

## 持续项 · Ongoing
- [ ] DAG 渲染性能 (节点 ≥ 200)
- [ ] a11y: 关键交互可键盘操作
- [ ] i18n 文案 review

## 历史 · Changelog
- 2026-05-12 · 初始化占位 spec
