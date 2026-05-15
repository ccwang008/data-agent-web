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
      { index: true, element: <Navigate to="/knowledge-graph" replace /> },
      ...knowledgeGraphRoutes,
      ...dataSourceRoutes,
      // ... 其他 feature
      { path: "*", element: <Navigate to="/knowledge-graph" replace /> },
    ],
  },
]);
```

## 命名约定 · Path Conventions
- 顶级 path = feature key, 全小写 kebab-case (例: `/knowledge-graph`)
- 嵌套路由放在 `routes.tsx` 里的 `children` 字段
- 详情页用动态段: `:id`, 例: `/agents/:id`
- 操作型: `/agents/:id/trigger`
- 兜底: 未匹配的路径回到 `/knowledge-graph`

## 默认路由 · Default Route
应用首屏重定向到 `/knowledge-graph` (当前唯一已实现入口)。随业务推进调整。

## Mock fixtures 早注册 · Eager Mock Registration
`routes.tsx` 内 `import "./api/mock"` 顶部副作用 import, 确保路由挂载前 fixture 已注册。这避免了首屏 `mockClient.get` 时 fixture 尚未存在的竞态。

## 反模式 · Anti-Patterns
- ❌ 在 `app/router.tsx` 内直接 import feature 页面 (绕过了 feature 边界)
- ❌ feature 之间互相 `<Link to>` 硬编码路径 → 后续引入路径常量统一管理
- ❌ 在路由级别做权限判断(预留 `settings` 模块统一接管)
- ❌ 使用 `HashRouter` 或 `MemoryRouter` (除非测试环境)

## 侧栏树菜单 + 用户自定义 · Sidebar Tree Menu & User Customization
全局左侧 `Sidebar` 是路由的可视入口, 用树形菜单展示所有 feature 与子模块(KG hub 的 10 个子模块作为 `knowledge-graph` 节点的二级 children)。

### 关键边界 · Boundaries
**路由与展示解耦**: 用户可在 `/settings/menu` 自定义菜单的展示(顺序 / 嵌套 / 显隐 / 重命名), 但**不**能修改路由本身。
- 路由地址永远由代码定义(各 `routes.tsx`); 用户配置只影响 Sidebar 渲染
- 隐藏的菜单项: URL 仍可直达, 不锁路由
- 用户的自定义 label 不进入代码逻辑; 任何 sub-nav / breadcrumb / breadcrumbs / programmatic navigation 必须**用 `builtinRouteKey` 作为锚点**, 不用用户 label
- 详细 ADR: [ADR-0008 树形菜单与用户自定义边界](../adr/0008-tree-menu-and-user-customization.md)(待写)

### MenuNode 数据模型
```ts
interface MenuNode {
  id: string;                       // 'kg' / 'kg.graphs' 稳定 key
  builtinRouteKey?: string;          // 与代码绑定, 不可改
  label: { 'zh-CN': string; 'en-US': string };
  icon?: string;                    // lucide icon key
  children?: MenuNode[];
  hidden?: boolean;
  customGroup?: boolean;             // true = 用户自建分组(无路由)
}
```

### 默认菜单结构 · Default Menu (M0 时)
```
Workspace (group, customGroup=false 内置)
  Knowledge Graph                   /knowledge-graph
    Graphs                          /knowledge-graph/graphs
    Metadata                        /knowledge-graph/metadata
    Import                          /knowledge-graph/import
    Analysis                        /knowledge-graph/analysis
    Visualization                   /knowledge-graph/visualization
    Async Tasks                     /knowledge-graph/async-tasks
    Computer                        /knowledge-graph/computer
    AI                              /knowledge-graph/ai
    Admin                           /knowledge-graph/admin
    Help                            /knowledge-graph/help
  Data Sources                      /data-source
  Agents                            /agents
  Workflows                         /workflow
  Insights                          /insights
Platform (group)
  Settings                          /settings
```

### 展开 / 折叠状态持久化
`useUIStore.sidebarExpandedKeys: string[]` (持久化 key `data-agent.ui`), 默认 KG 展开。

### KG hub 与 sub-nav 的关系
**KG hub 不再渲染独立的 inner sub-nav**, 导航完全靠左侧 Sidebar 树菜单(KG 节点下的 10 子项)。KG hub 内只保留 TopBar(图实例切换器 + Perspective 下拉 + 通知中心 + Outlet)。

## 关联文件 · Files
- `src/app/router.tsx`
- `src/components/layout/AppShell.tsx`
- `src/components/layout/Sidebar.tsx`(M0 改造为树菜单)
- `src/features/*/routes.tsx`
- `src/features/settings/pages/MenuCustomizerPage.tsx`(新增, M0 + ADR-0008 落地后)

## 关联 ADR · Related ADRs
- [ADR-0008 树形菜单与用户自定义边界](../adr/0008-tree-menu-and-user-customization.md)(待写, M0 截止)
