# Settings · Tasks

> ID 规范: `T-settings-NN`。完成后将 `[ ]` 改为 `[x]` 并附 PR/Commit 链接。

## P0 · 基础脚手架 · Bootstrap
- [x] T-settings-18 新增 `public/settings-access.md`, 作为设置门禁密码的唯一明文来源
- [x] T-settings-19 新增 `SettingsPasswordGate`, 覆盖 `/settings/*`、运行时解析 Markdown、处理错误密码与加载失败
- [ ] T-settings-20 使用 `data-agent.settings-access` 持久化授权, 并验证刷新及重新打开浏览器后仍有效
- [x] T-settings-21 补充中英文门禁 UI 文案, 确保 locale 文件中不出现密码明文
- [x] T-settings-01 创建 `pages/SettingsLayout.tsx` + `PreferencesPage.tsx`
- [x] T-settings-02 创建设置嵌套路由
- [ ] T-settings-03 在 `src/lib/i18n.ts` 注册命名空间 `settings`, 补 zh-CN / en-US 最小文案
- [x] T-settings-04 在菜单注册表中将 `settings` 标记为 `ready`

## P1 · 核心能力 · Core
- [x] T-settings-05 PreferencesPage: 语言与应用壳偏好
- [ ] T-settings-06 UsersPage: 列表 + 搜索 + 角色徽标
- [ ] T-settings-07 PermissionsPage: 角色 → 权限矩阵
- [ ] T-settings-08 AuditPage: 日志列表 + 过滤
- [ ] T-settings-09 创建 `api/mock.ts` fixture (users / roles / audit)
- [x] **T-settings-13 MenuManagementPage**: 路由 `/settings/menu` + 树形菜单编辑器
- [x] **T-settings-14 useMenuStore**: Zustand 持久化、公开默认配置加载和 Sidebar 读取
- [x] T-settings-15 `MenuRegistry` 完整内置路由 key 清单
- [x] T-settings-22 完整产品菜单：旧缓存补齐新增路由并移除废弃节点
- [x] T-settings-23 路由与菜单一致性自动化测试
- [x] T-settings-24 菜单配置接入 SQLite：保存、重置和启动恢复使用 `data-agent.settings.menu` scope

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
- 2026-06-17 · 新增设置页面 Markdown 密码门禁设计
- 2026-05-12 · 初始化占位 spec
