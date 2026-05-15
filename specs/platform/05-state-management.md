# Platform · 状态管理 · State Management

## 框架 · Stack
**Zustand** + `persist` middleware。无 Redux / Recoil / Jotai。

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
| `knowledge-graph` | `useKnowledgeGraphStore` | 否 |
| (其他 feature 未实现) | — | — |

## 持久化键命名 · Persistence Keys
`data-agent.<scope>` 全小写 dot 分隔:
- 全局: `data-agent.ui` / `data-agent.locale`
- Feature: `data-agent.<feature-key>` (如需持久化, 当前 KG 不需要)

## 模式参考 · Patterns

```ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface XxxState {
  value: string;
  setValue: (v: string) => void;
}

export const useXxxStore = create<XxxState>()(
  persist(
    (set) => ({
      value: "",
      setValue: (value) => set({ value }),
    }),
    { name: "data-agent.xxx" },
  ),
);
```

## 反模式 · Anti-Patterns
- ❌ 服务端数据塞进 store (用 `mockClient` + local state / `useEffect`, 服务端缓存应单独引入 React Query/SWR, 当前不在范围)
- ❌ feature store 出现在 `src/stores/`
- ❌ 大对象嵌套, 不可序列化的字段(`Map`/`Set`/`Date` 直接放 `persist` 字段会丢类型)
- ❌ 在 store 里持有 React refs 或 DOM 节点

## 关联文件 · Files
- `src/stores/useUIStore.ts`
- `src/stores/useLocaleStore.ts`
- `src/features/knowledge-graph/store.ts`

## 关联 ADR · Related ADRs
- TODO: `adr/NNNN-state-library-zustand.md`
