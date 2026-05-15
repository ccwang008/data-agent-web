# Settings · Tasks

> ID 规范: `T-settings-NN`。完成后将 `[ ]` 改为 `[x]` 并附 PR/Commit 链接。

## P0 · 基础脚手架 · Bootstrap
- [ ] T-settings-01 创建 `pages/SettingsLayout.tsx` + `PreferencesPage.tsx`, 替换 `routes.tsx` 中的 `ModulePlaceholder`
- [ ] T-settings-02 创建嵌套路由(`children` 列出 5 个子页面)
- [ ] T-settings-03 在 `src/lib/i18n.ts` 注册命名空间 `settings`, 补 zh-CN / en-US 最小文案
- [ ] T-settings-04 在 `src/components/layout/Sidebar.tsx` 把 `settings` 项状态从 `todo` 改为 `ready`

## P1 · 核心能力 · Core
- [ ] T-settings-05 PreferencesPage: 语言 / 通知偏好
- [ ] T-settings-06 UsersPage: 列表 + 搜索 + 角色徽标
- [ ] T-settings-07 PermissionsPage: 角色 → 权限矩阵
- [ ] T-settings-08 AuditPage: 日志列表 + 过滤
- [ ] T-settings-09 创建 `api/mock.ts` fixture (users / roles / audit)
- [ ] **T-settings-13 MenuCustomizerPage 骨架**: 路由 `/settings/menu` + 树形可拖拽编辑器(zh-CN/en-US 双输入 / 显隐切换 / 重排 / 嵌套 / 自定义分组) + 右侧 Sidebar 预览(与 `T-kg-G-07` 并行, 走 ADR-0008)
- [ ] **T-settings-14 useMenuStore + mock 端点**: `/api/settings/menu/{get,save,reset,validate}` + Zustand 持久化 + Sidebar 读取
- [ ] T-settings-15 `MenuRegistry` 内置路由 key 清单(由 features/*/routes.tsx 注册, 含 KG 10 子模块)

## P2 · 增强体验 · Polish
- [ ] T-settings-10 FlagsPage: 功能开关
- [ ] T-settings-11 审计日志虚拟化
- [ ] T-settings-12 暗/亮主题切换 (需平台层支持; 注: 已选定 Classic Light SaaS Admin, 暗色暂不提供)
- [ ] T-settings-16 MenuCustomizer 撤销 / 重做历史栈
- [ ] T-settings-17 MenuCustomizer 导入 / 导出菜单配置 JSON

## 持续项 · Ongoing
- [ ] 权限决策记录到 ADR
- [ ] a11y: 表格可键盘导航
- [ ] i18n 文案 review

## 历史 · Changelog
- 2026-05-12 · 初始化占位 spec
