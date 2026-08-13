# ADR-0008 · 树形菜单与用户自定义边界

## 状态 · Status

Accepted

## 背景 · Context

平台路由由各 feature 代码定义，Sidebar 同时需要支持树形分组、双语名称、排序和显隐。如果展示配置直接决定路由，会让旧缓存、重命名和配置导入破坏导航。

## 决策 · Decision

- 真实路由只由 `src/features/*/routes.tsx` 和 `src/app/router.tsx` 定义。
- `src/features/settings/menu/registry.ts` 用稳定 `builtinRouteKey` 关联展示节点和路由目标。
- `public/menu.config.json` 与 `data-agent.menu` 只保存展示配置；`normalizeMenuConfig` 补齐新增内置节点并移除废弃节点。
- 隐藏或重命名菜单不影响 URL 直达。
- 自动化测试必须验证所有内置菜单目标均有实际路由。

## 后果 · Consequences

- 产品菜单可编辑而不改变路由身份。
- 新 feature 上线时必须同步注册路由、菜单 key 和一致性测试。
- 旧浏览器配置能够随注册表迁移，不再使用固定的单模块白名单。

