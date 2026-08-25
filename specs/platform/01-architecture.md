# Platform · 架构 · Architecture

## 分层 · Layers

```
src/
├── app/           # 应用壳: providers / router / App
├── components/
│   ├── ui/        # shadcn 原子组件 (跨 feature 复用)
│   └── layout/    # AppShell / Sidebar / TopBar / ModulePlaceholder
├── features/      # 业务模块, 每个自包含 (pages/store/api/locales/routes)
│   ├── product-matrix/    # 产品矩阵首页
│   ├── solutions/         # 行业解决方案
│   ├── data-agent/        # 通用 Agent 编排与五类专业任务工作区
│   ├── data-source/       # 数据源、同步、共享交换
│   ├── data-lake/         # 统一存储、湖表、分层与容量
│   ├── data-governance/   # 元数据、质量
│   ├── data-development/  # ETL、SQL、Notebook
│   ├── scheduler/         # 任务列表、任务画布、任务监控
│   ├── data-asset/        # 目录、流通、权属、价值、运营与审计
│   ├── ops-monitor/       # 任务、链路、质量与资源监控
│   ├── data-security/     # 合规、分类分级、防护、审计与事件响应
│   └── metrics/           # DCMM 九域量化看板
├── stores/        # 全局 Zustand store (UI / locale)
├── lib/           # 工具: cn / i18n / mock-client
├── locales/       # 全局 namespace `common`
└── styles/        # 全局 CSS 与 token
```

## 产品域分层 · Product Layers

```text
数据消费层       数据资产目录 / 数据服务 / AI 与业务系统
治理与运营层     元数据 / 血缘 / 质量 / 数据标准 / 价值 / 安全 / 运维
开发与编排层     ETL / SQL / Notebook / 调度任务 / 共享交换
存储层           数据湖表 / 文件 / 图片 / 视频 / 日志 / 文档
接入层           数据库 / 文件 / 本地文件 / 消息队列 / API
```

当前前端已用十一个产品域 feature 验证 Data Agent、接入、存储、标准、治理、开发、调度、资产运营、运维、安全和量化主链路。`src/features/data-agent/` 作为一级跨域智能任务入口，只保存共享任务、可见计划、动作、产物和证据引用；专业事实继续由原产品域持有。`src/features/data-standard/` 作为独立一级产品域，权威维护业务术语、本体模型、主数据、参考数据、数据元标准、指标字典和语义层指标模型。所有执行结果仍是 mock 语义，可变状态统一写入项目本地 SQLite；产品边界见 [`07-data-platform-product-scope.md`](./07-data-platform-product-scope.md)。

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
feature fixture / initial state
       ↓
feature page / store
       ↓
useSqliteState (lib/sqlite-client.ts) → /api/sqlite/state → data/platform.sqlite

模拟执行、延迟和失败状态可继续使用 mockClient；已有 fixture 的浏览器 fallback
可通过 local-json-store 镜像写入 SQLite。
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
- [ADR-0020：最终确认数据标准为一级产品域](../adr/0020-finalize-data-standard-as-top-level-product.md)
