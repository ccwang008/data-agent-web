# Settings · 系统设置

| 元数据 · Meta | 值 |
|---|---|
| 路径 · Path | `src/features/settings/` |
| 路由 · Route | `/settings` |
| 状态 · Status | 🔨 菜单管理、偏好设置与访问门禁 |
| 负责人 · Owner | _未指派_ |
| 创建日期 · Created | 2026-05-12 |

## 概述 · Overview
平台级配置入口: 用户与角色、权限、审计日志、连接凭证、环境与功能开关、品牌定制。

## 当前实现 · Current Implementation
- `/settings/menu`：编辑产品菜单的顺序、显隐和双语名称，保存与重置默认写入 SQLite `data-agent.settings.menu`；旧缓存通过注册表自动补齐新增路由。
- `/settings/preferences`：语言、Sidebar 和 TopBar 偏好。
- 全部 `/settings/*` 路由由 `SettingsPasswordGate` 包裹；用户、权限、审计和功能开关当前仍是占位子页。

## 关联文档 · Related Docs
- [需求 · Requirements](./requirements.md)
- [设计 · Design](./design.md)
- [任务 · Tasks](./tasks.md)

## 关键决策 · Key Decisions
- 菜单身份使用稳定 `builtinRouteKey`；展示配置不能修改真实路由。
- Markdown 密码门禁只减少误入，不是安全鉴权。
