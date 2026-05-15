# Data Sources · Tasks

> ID 规范: `T-data-source-NN`。完成后将 `[ ]` 改为 `[x]` 并附 PR/Commit 链接。

## P0 · 基础脚手架 · Bootstrap
- [ ] T-data-source-01 创建 `pages/DataSourcePage.tsx`, 替换当前 `routes.tsx` 中的 `ModulePlaceholder`
- [ ] T-data-source-02 创建 `api/mock.ts`, 注册 `/api/data-source/list` fixture
- [ ] T-data-source-03 在 `src/lib/i18n.ts` 注册命名空间 `data-source`, 补 zh-CN / en-US 最小文案
- [ ] T-data-source-04 在 `src/components/layout/Sidebar.tsx` 把 `data-source` 项状态从 `todo` 改为 `ready`

## P1 · 核心能力 · Core
- [ ] T-data-source-05 TODO 列表渲染 + 状态徽标
- [ ] T-data-source-06 TODO 详情面板 / Drawer
- [ ] T-data-source-07 TODO Schema 预览

## P2 · 增强体验 · Polish
- [ ] T-data-source-08 TODO 列表搜索与过滤
- [ ] T-data-source-09 TODO 同步状态可视化时间线

## 持续项 · Ongoing
- [ ] 单元测试覆盖关键纯函数
- [ ] a11y: 关键交互可键盘操作
- [ ] i18n 文案 review

## 历史 · Changelog
- 2026-05-12 · 初始化占位 spec
