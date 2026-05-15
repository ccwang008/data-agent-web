# Platform · 架构 · Architecture

## 分层 · Layers

```
src/
├── app/           # 应用壳: providers / router / App
├── components/
│   ├── ui/        # shadcn 原子组件 (跨 feature 复用)
│   └── layout/    # AppShell / Sidebar / TopBar / ModulePlaceholder
├── features/      # 业务模块, 每个自包含 (pages/store/api/locales/routes)
├── stores/        # 全局 Zustand store (UI / locale)
├── lib/           # 工具: cn / i18n / mock-client
├── locales/       # 全局 namespace `common`
└── styles/        # 全局 CSS 与 token
```

## Feature 解剖 · Feature Anatomy
每个 `src/features/<key>/` 应包含:

| 文件 | 必需 | 作用 |
|---|---|---|
| `routes.tsx` | ✅ | 导出 `RouteObject[]`,被 `app/router.tsx` 组合 |
| `pages/XxxPage.tsx` | ✅ | 顶层页面组件 |
| `api/mock.ts` | 可选 | `registerMockRoute(...)` 注册 fixtures |
| `store.ts` | 可选 | 该 feature 的 Zustand store |
| `locales/{zh-CN,en-US}.json` | 可选 | i18n namespace, 名称等于 feature key |
| `components/`, `hooks/` | 可选 | 内部组件与 hooks, **不对外暴露** |

## 模块边界 · Module Boundaries
- ❌ feature 之间**禁止直接 import**;需要共享 → 上提到 `components/` 或 `lib/`。
- ❌ feature 不直接调 `fetch` / `axios`;统一通过 `mockClient`(后续可替换)。
- ❌ `components/ui` 不依赖任何 feature;反向依赖只能 feature → ui。

## 数据流 · Data Flow

```
mockClient (lib/mock-client.ts)
       ▲
features/<key>/api/mock.ts (registerMockRoute)
       ▼
features/<key>/pages/XxxPage.tsx → useEffect → mockClient.get(...)
       ▼
local state / feature store / props
```

## 路由组装 · Route Composition
详见 [`06-routing.md`](./06-routing.md)。简言之: feature 暴露 `RouteObject[]`, `app/router.tsx` 合并到根 `AppShell` 的 children。

## 入口流程 · Bootstrap Flow

```
main.tsx
  └─ <React.StrictMode>
       └─ <App />                       (src/app/App.tsx)
            └─ <AppProviders>           (i18n, tooltip)
                 └─ <RouterProvider>    (createBrowserRouter)
                      └─ <AppShell>     (sidebar + topbar + outlet)
                           └─ <FeaturePage />
```

## 关联文件 · Files
- `src/main.tsx`
- `src/app/App.tsx` · `src/app/providers.tsx` · `src/app/router.tsx`
- `src/components/layout/AppShell.tsx`
- `src/lib/mock-client.ts`

## 关联 ADR · Related ADRs
- [ADR-0001](../adr/0001-record-architecture-decisions.md)
