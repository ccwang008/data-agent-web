# Platform · 路由 · Routing

## 框架 · Stack
`react-router-dom` v6 + `createBrowserRouter` + `RouterProvider`。

## 组装方式 · Composition
每个 feature 在 `src/features/<key>/routes.tsx` 导出 `RouteObject[]`, 由 `src/app/router.tsx` 统一组装到根 `AppShell` 的 children。

```ts
// src/features/<key>/routes.tsx
import type { RouteObject } from "react-router-dom";
import { XxxPage } from "./pages/XxxPage";
import "./api/mock"; // 副作用: 注册 mock fixture

export const xxxRoutes: RouteObject[] = [
  { path: "<key>", element: <XxxPage /> },
];
```

```ts
// src/app/router.tsx
export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      ...productMatrixRoutes, // index route: /
      ...solutionsRoutes,
      ...dataSourceRoutes,
      // ... 其他 feature routes
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
```

## 命名约定 · Path Conventions
- 顶级 path = feature key, 全小写 kebab-case (例: `/data-source`)
- 嵌套路由放在 `routes.tsx` 里的 `children` 字段
- 详情页用动态段: `:id`, 例: `/data-sources/:id`
- 操作型: `/scheduler/tasks/:id/run`
- 兜底: 未匹配的路径回到产品矩阵首页 `/`

## 默认路由 · Default Route
应用首屏是产品矩阵首页 `/`；行业方案位于 `/solutions`。进入具体产品工作台后显示全局 Sidebar 与 TopBar。

## Mock fixtures 路由级注册 · Route-scoped Registration

大型 feature 使用 `React.lazy` 拆分页面代码；其 lazy loader 先动态导入 `./api/mock`，再加载页面组件，保证 fixture 在页面 effect 发起 `mockClient` 请求前注册，同时避免把所有 mock 数据打进首屏 bundle。小型 feature 也可使用顶部副作用 import，但必须保持同样的先注册边界。

## 反模式 · Anti-Patterns
- ❌ 在 `app/router.tsx` 内直接 import feature 页面 (绕过了 feature 边界)
- ❌ feature 之间互相 `<Link to>` 硬编码路径 → 后续引入路径常量统一管理
- ❌ 在路由级别做权限判断(预留 `settings` 模块统一接管)
- ❌ 使用 `HashRouter` 或 `MemoryRouter` (除非测试环境)

## 侧栏树菜单 + 用户自定义 · Sidebar Tree Menu & User Customization
全局左侧 `Sidebar` 是路由的可视入口, 用树形菜单展示所有 feature 与子模块(每个有子路由的产品域以二级 children 展示子模块)。

### 关键边界 · Boundaries
**路由与展示解耦**: 用户可在 `/settings/menu` 自定义菜单的展示(顺序 / 嵌套 / 显隐 / 重命名), 但**不**能修改路由本身。
- 路由地址永远由代码定义(各 `routes.tsx`); 用户配置只影响 Sidebar 渲染
- 隐藏的菜单项: URL 仍可直达, 不锁路由
- 用户的自定义 label 不进入代码逻辑; 任何 sub-nav / breadcrumb / breadcrumbs / programmatic navigation 必须**用 `builtinRouteKey` 作为锚点**, 不用用户 label
- 详细 ADR: [ADR-0008 树形菜单与用户自定义边界](../adr/0008-tree-menu-and-user-customization.md)

### MenuNode 数据模型
```ts
interface MenuNode {
  id: string;                       // 'data-source' / 'data-source.sources' 稳定 key
  builtinRouteKey?: string;          // 与代码绑定, 不可改
  label: { 'zh-CN': string; 'en-US': string };
  icon?: string;                    // lucide icon key
  children?: MenuNode[];
  hidden?: boolean;
  customGroup?: boolean;             // true = 用户自建分组(无路由)
}
```

### 默认菜单结构 · Default Menu

默认菜单由 `src/features/settings/menu/registry.ts` 的稳定 `builtinRouteKey` 清单定义，`public/menu.config.json` 保存可编辑的默认展示配置。当前根节点覆盖量化看板、Data Agent、数据集成、数据湖、数据标准、数据治理、数据开发、数据资产、调度引擎、运维与监控、数据安全和系统设置；每个有子路由的产品域以树形 children 展示。产品矩阵和行业解决方案不进入侧栏菜单。旧智能体、编排流水线和洞察分析 feature 已移除，旧 `agents`、`workflow`、`insights` 继续列入 `DEPRECATED_MENU_KEYS`；新 Data Agent 使用 `data-agent` 与 `data-agent.*` 稳定 key，不复用旧缓存身份。

Data Agent 一级菜单包含 `data-agent.general`、`data-agent.discovery`、`data-agent.qa`、`data-agent.development`、`data-agent.governance` 和 `data-agent.operations` 六个二级入口；`/data-agent` 默认重定向至 `/data-agent/general`。每个 Agent 首页展示自己的任务 List，任务详情使用 `/data-agent/<agent>/tasks/:taskId`。不配置统一任务中心路由，同一个跨 Agent 任务 ID 可以从不同 Agent 详情路由查看。

数据标准为一级产品域，下设业务术语、主数据、参考数据、数据元标准和指标字典，分别使用 `/data-standard/business-terms`、`/master-data`、`/reference-data`、`/data-element-standards` 和 `/metric-dictionary`。路由和菜单 key 已实现，稳定 key 使用 `data-standard.*`。原 `/data-governance/standards` 和旧 key 删除，不提供兼容重定向。

数据安全已注册一级“数据安全”→ 六个二级能力域 → 25 个三级功能页的递归菜单；`/data-security` 默认进入 `/overview`，旧 `classification`、`masking` 路径和稳定 key 保持兼容。完整映射见 [`features/data-security/design.md`](../features/data-security/design.md)。

SQLite scope `data-agent.settings.menu` 保存用户提交后的菜单配置；旧浏览器中的 `data-agent.menu` 仅作为迁移回退，并会通过 `normalizeMenuConfig` 补齐新增内置路由、移除废弃节点。自动化测试 `src/app/route-menu-consistency.test.tsx` 保证每个菜单目标都有实际路由。

### 展开 / 折叠状态持久化
`useUIStore.sidebarExpandedKeys: string[]` (持久化 key `data-agent.ui`), 默认全部折叠。

## 关联文件 · Files
- `src/app/router.tsx`
- `src/components/layout/AppShell.tsx`
- `src/components/layout/Sidebar.tsx`(M0 改造为树菜单)
- `src/features/*/routes.tsx`
- `src/features/settings/pages/MenuCustomizerPage.tsx`(新增, M0 + ADR-0008 落地后)

## 关联 ADR · Related ADRs
- [ADR-0008 树形菜单与用户自定义边界](../adr/0008-tree-menu-and-user-customization.md)
- [ADR-0020 数据标准一级产品域](../adr/0020-finalize-data-standard-as-top-level-product.md)
