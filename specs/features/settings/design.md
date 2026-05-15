# Settings · Design

> 关注 **HOW**: 在 [requirements.md](./requirements.md) 确认的目标下, 如何在代码中落地。

## 架构概览 · Architecture
TODO. 多 tab 容器, 每个 tab 是一个子页面。

```mermaid
flowchart LR
  Page --> Store
  Page --> MockAPI
```

## 路由 · Routes
| Path | Page Component | 说明 |
|---|---|---|
| `/settings` | `SettingsLayout` | 多 tab 入口, 默认重定向 `/settings/preferences` |
| `/settings/preferences` | `PreferencesPage` | 个人偏好(语言 / 通知) |
| `/settings/menu` | `MenuCustomizerPage` | **菜单自定义(P1, 本期重点)** |
| `/settings/users` | `UsersPage` | 用户与角色 (P1) |
| `/settings/permissions` | `PermissionsPage` | 权限策略 (P1) |
| `/settings/audit` | `AuditPage` | 审计日志 (P1) |
| `/settings/flags` | `FlagsPage` | 功能开关 (P2) |

注册位置: `src/features/settings/routes.tsx`, 当前仅占位 `ModulePlaceholder`。

## 数据模型 · Data Model
```ts
export interface User { id: string; name: string; email: string; roles: string[]; }
export interface Role { id: string; name: string; permissions: string[]; }
export interface AuditEvent { id: string; actor: string; action: string; target: string; at: string; }
export interface FeatureFlag { key: string; enabled: boolean; description?: string; }

// 菜单自定义 · Menu Customization (P1 本期重点)
export interface MenuNode {
  id: string;                    // 'kg' / 'kg.graphs' 稳定 key, 不可改
  builtinRouteKey?: string;       // 与代码绑定的内置路由 key; customGroup 时为 undefined
  label: { 'zh-CN': string; 'en-US': string };
  icon?: string;                  // lucide icon key
  children?: MenuNode[];
  hidden?: boolean;
  customGroup?: boolean;          // true = 用户自建分组(无路由)
}

export interface MenuConfig {
  version: number;                 // schema 版本, 后续迁移用
  root: MenuNode[];                // 树根, 通常含 'Workspace' / 'Platform' 两个内置分组
  updatedAt: string;
}
```

约束:
- `builtinRouteKey` 由代码侧 `MenuRegistry` 注册, 用户不可编辑或删除对应节点(只能 `hidden: true`)
- 任何代码侧的 sub-nav / breadcrumb / programmatic navigation 必须**只用 `builtinRouteKey`**, 不用用户 `label`
- 切换语言时按 `label[currentLocale]` 渲染

## Mock API · Endpoints
| Method | Path | Response | 说明 |
|---|---|---|---|
| GET | `/api/settings/users` | `User[]` | 用户列表 |
| GET | `/api/settings/roles` | `Role[]` | 角色与权限 |
| GET | `/api/settings/audit` | `AuditEvent[]` | 审计日志 |
| GET | `/api/settings/flags` | `FeatureFlag[]` | 功能开关 |
| GET | `/api/settings/menu/get` | `MenuConfig` | 取菜单配置(默认 + 用户覆盖合并) |
| POST | `/api/settings/menu/save` | `{ ok: boolean }` | 保存菜单配置 (body: `MenuConfig`) |
| POST | `/api/settings/menu/reset` | `MenuConfig` | 重置为默认结构 |
| POST | `/api/settings/menu/validate` | `{ ok: boolean; issues?: string[] }` | 校验配置(builtinRouteKey 完整性 / 循环引用) |

注册位置: `src/features/settings/api/mock.ts`。

## 状态管理 · State (Zustand)
- 偏好设置直接复用全局 `useLocaleStore` / `useUIStore`, **不在本模块再起 store**
- 子页面内部 state 用 React local state
- **菜单自定义状态**: 新增 `useMenuStore`(持久化 key `data-agent.menu`), 字段:
  ```ts
  interface MenuStoreState {
    config: MenuConfig;                  // 当前生效配置
    draft: MenuConfig | null;            // 编辑中的草稿
    setDraft: (config: MenuConfig) => void;
    commitDraft: () => Promise<void>;     // 调用 /api/settings/menu/save
    resetDraft: () => void;
    resetToDefault: () => Promise<void>;
  }
  ```
- `Sidebar.tsx` 读取 `useMenuStore.config` 渲染, 不直接拉 mock

## 组件分解 · Component Tree
- `SettingsLayout` (左侧 sub-nav + outlet)
  - `PreferencesPage`
  - `MenuCustomizerPage` (P1 本期重点)
    - `MenuTreeEditor` (可拖拽树形组件)
      - 节点拖拽改顺序 / 嵌套
      - 行内重命名(zh-CN + en-US 双输入框)
      - "隐藏"切换
      - "添加自定义分组"按钮
    - `MenuPreviewPanel` (右侧实时预览左侧 Sidebar 渲染效果)
    - `MenuToolbar` (撤销 / 重做 / 重置为默认 / 保存)
  - `UsersPage`
  - `PermissionsPage`
  - `AuditPage`
  - `FlagsPage`

### MenuCustomizer 交互细节
- **拖拽**: 用 HTML5 drag-drop API; 拖拽中显示插入指示线
- **撤销 / 重做**: 维护 `useMenuStore.draft` 的本地历史栈(P2 可放后续)
- **校验**: 保存前调用 `/api/settings/menu/validate` 防止循环引用; 失败给行内提示
- **预览**: `MenuPreviewPanel` 复用 `Sidebar` 组件渲染 `draft`(若有) 否则 `config`
- **a11y**: 树节点可键盘操作(↑↓ 移焦点, Space 切换 hidden, Enter 重命名, ←→ 折叠展开)

## 交互细节 · Interaction Details
- 偏好修改 optimistic, 立即生效
- 用户表格按 name / email 搜索
- 审计日志按 actor / action / 时间范围过滤

## i18n · Namespaces
- 命名空间: `settings`
- 文件: `src/features/settings/locales/{zh-CN,en-US}.json`
- 关键 key: TODO

## 性能与可观测性 · Performance & Observability
- 审计日志虚拟化或分页
- TODO

## 开放问题 · Open Questions
- ❓ 偏好是否包含暗/亮主题切换 (当前强制 dark)
- ❓ 审计日志的查询粒度 (天 / 小时 / 分钟)
