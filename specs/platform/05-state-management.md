# Platform · 状态管理 · State Management

## 框架 · Stack

- **Zustand** + `persist`：全局 UI、语言和菜单展示偏好。
- **useSqliteState**：可变业务状态，通过 `/api/sqlite/state` 保存到 `data/platform.sqlite`。
- **local-json-store**：仅兼容已有 mock fixture，并镜像写入 SQLite。

## 切分原则 · Split Strategy

### 全局 store (`src/stores/`)
跨 feature 共享的"应用级别"状态。

| Store | 文件 | 持久化键 | 说明 |
|---|---|---|---|
| UI | `useUIStore.ts` | `data-agent.ui` | sidebar collapsed 等 |
| Locale | `useLocaleStore.ts` | `data-agent.locale` | 当前语言 + 与 i18next 同步 |

### Feature store (`src/features/<key>/store.ts`)
仅在该 feature 内消费的状态。**禁止跨 feature 导入**。

| Feature | Store | 持久化 |
|---|---|---|
| `data-asset` | `useDataAssetStore` | `useSqliteState("data-agent.data-asset")` |
| 数据集成、湖、治理、开发、运维、安全 | 页面级 feature state | 各自 `data-agent.<feature>.*` SQLite scope |

目标 `data-standard` feature 使用单一 `data-agent.data-standard` scope，并在内部按 `candidates`、`ontology`、`businessTerms`、`masterData`、`referenceData`、`dataElements`、`metrics`、`audits`、`aiDecisions` 和 `participationEvidence` 分区。该 scope 尚未实现；其他 feature 只保存标准 ID、版本 ID 和必要摘要，不直接读取或复制标准正文。

## 持久化键命名 · Persistence Keys
`data-agent.<scope>` 全小写 dot 分隔:
- 全局: `data-agent.ui` / `data-agent.locale`
- Feature: `data-agent.<feature-key>.<resource>`

## 业务状态模式 · Business State Pattern

```ts
import { useSqliteState } from "@/lib/sqlite-client";

const [items, setItems, meta] = useSqliteState(
  "data-agent.xxx.items",
  initialItems,
);
```

## 反模式 · Anti-Patterns
- ❌ 为新业务页面另建 Local Storage 持久化；统一使用 `useSqliteState`
- ❌ 页面直接调用 SQLite HTTP API；只由共享数据层调用
- ❌ feature store 出现在 `src/stores/`
- ❌ 大对象嵌套, 不可序列化的字段(`Map`/`Set`/`Date` 直接放 `persist` 字段会丢类型)
- ❌ 在 store 里持有 React refs 或 DOM 节点

## 关联文件 · Files
- `src/stores/useUIStore.ts`
- `src/stores/useLocaleStore.ts`
- `src/lib/sqlite-client.ts`
- `server/sqlite.mjs`

## 关联 ADR · Related ADRs
- [ADR-0006 本地 SQLite 状态持久化](../adr/0006-local-sqlite-state-persistence.md)
- [ADR-0020 数据标准一级产品域](../adr/0020-finalize-data-standard-as-top-level-product.md)
