# Agents · Tasks

> ID 规范: `T-agents-NN`。完成后将 `[ ]` 改为 `[x]` 并附 PR/Commit 链接。

## P0 · 基础脚手架 · Bootstrap
- [ ] T-agents-01 创建 `pages/AgentsPage.tsx`, 替换 `routes.tsx` 中的 `ModulePlaceholder`
- [ ] T-agents-02 创建 `api/mock.ts`, 注册 `/api/agents/list` fixture
- [ ] T-agents-03 在 `src/lib/i18n.ts` 注册命名空间 `agents`, 补 zh-CN / en-US 最小文案
- [ ] T-agents-04 在 `src/components/layout/Sidebar.tsx` 把 `agents` 项状态从 `todo` 改为 `ready`

## P1 · 核心能力 · Core
- [ ] T-agents-05 TODO 列表 + 状态徽标
- [ ] T-agents-06 TODO 详情面板 (skills / 最近运行)
- [ ] T-agents-07 TODO 创建 / 编辑表单
- [ ] T-agents-08 TODO 触发能力 + 状态反馈

## P2 · 增强体验 · Polish
- [ ] T-agents-09 TODO 实时状态推送 (轮询或 SSE)
- [ ] T-agents-10 TODO 运行历史时间线

## 持续项 · Ongoing
- [ ] 单元测试覆盖关键纯函数
- [ ] a11y: 表单可键盘填写
- [ ] i18n 文案 review

## 历史 · Changelog
- 2026-05-12 · 初始化占位 spec
