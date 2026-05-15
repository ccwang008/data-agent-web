# Insights · Tasks

> ID 规范: `T-insights-NN`。完成后将 `[ ]` 改为 `[x]` 并附 PR/Commit 链接。

## P0 · 基础脚手架 · Bootstrap
- [ ] T-insights-01 创建 `pages/InsightsPage.tsx`, 替换 `routes.tsx` 中的 `ModulePlaceholder`
- [ ] T-insights-02 创建 `api/mock.ts`, 注册 `/api/insights/list` fixture
- [ ] T-insights-03 在 `src/lib/i18n.ts` 注册命名空间 `insights`, 补 zh-CN / en-US 最小文案
- [ ] T-insights-04 在 `src/components/layout/Sidebar.tsx` 把 `insights` 项状态从 `todo` 改为 `ready`

## P1 · 核心能力 · Core
- [ ] T-insights-05 TODO 列表 + 卡片
- [ ] T-insights-06 TODO 详情页 + 反链 KG 节点
- [ ] T-insights-07 TODO 归档 / 取消归档
- [ ] T-insights-08 TODO 按来源 / 状态过滤

## P2 · 增强体验 · Polish
- [ ] T-insights-09 TODO 订阅(RSS / 邮件)
- [ ] T-insights-10 TODO 评论 / 协作标注
- [ ] T-insights-11 TODO 列表虚拟化

## 持续项 · Ongoing
- [ ] 单元测试覆盖关键纯函数
- [ ] a11y: 卡片可键盘聚焦
- [ ] i18n 文案 review

## 历史 · Changelog
- 2026-05-12 · 初始化占位 spec
