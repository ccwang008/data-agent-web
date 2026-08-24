# Platform · Mock API

## 目的 · Purpose
前端独立开发,需要一套**低开销、易切换**的 fixture 机制。`mockClient` 提供 HTTP-like 模拟接口,业务代码零改动。需要跨刷新保留的业务状态使用本地 SQLite；`local-json-store` 仅作为兼容已有 fixture 的浏览器 fallback。

## 协议 · Contract

```ts
mockClient.get<T>(path, opts?): Promise<T>
mockClient.post<T>(path, body?, opts?): Promise<T>
mockClient.put<T>(path, body?, opts?): Promise<T>
mockClient.delete<T>(path, opts?): Promise<T>
```

`opts`:
- `latencyMs?: number` — 模拟延迟, 默认 220ms
- `failureRate?: number` — 0-1 之间, 模拟随机失败 (默认 0)

## 注册路由 · Registering Routes

```ts
// src/features/<key>/api/mock.ts
import { registerMockRoute } from "@/lib/mock-client";

interface Xxx { id: string }
const data: Xxx[] = [/* ... */];

registerMockRoute("GET", "/api/<key>/list", () => data);
registerMockRoute("POST", "/api/<key>", (body) => {
  // body 是请求体, return 是响应
});
```

**先注册再渲染**：小型 feature 可在 `routes.tsx` 顶部副作用导入；大型 lazy route 应在 lazy loader 中先 `await import("./api/mock")` 再加载页面，以保证 fixture 就绪并保留代码分割。

## 命名约定 · Path Conventions
- 路径前缀 `/api/<feature-key>/...`, 与 feature 目录同名
- 资源用复数, 详情用 id: `/api/data-sources` · `/api/data-sources/:id`
- 操作型路由用动词后缀: `/api/scheduler/tasks/:id/run`

## 当前边界 · Current Boundary

当前阶段使用 mock API 与项目本地 SQLite 状态，不接入真实 API、外部数据库、文件系统、消息队列或执行引擎。`mockClient` 负责模拟执行；`useSqliteState` 负责页面可变数据的 SQLite 持久化。

后续若进入后端集成阶段，应保留 `mockClient` 与 `get/post/put/delete` 的调用形状，只替换底层 dispatch；该工作不属于当前前端原型范围。

## 本地 JSON 状态 · Local JSON Store

`src/lib/sqlite-client.ts` 提供页面状态的 SQLite 持久化能力：

```ts
const [items, setItems] = useSqliteState("data-agent.feature.items", initialItems);
```

`src/lib/local-json-store.ts` 仍提供确定性的浏览器本地 fallback，并将写入镜像到 SQLite：

```ts
readLocalJson<T>(key, defaultValue)
writeLocalJson<T>(key, value)
updateLocalJson<T>(key, defaultValue, updater)
```

适合已有 mock CRUD、菜单配置和演示任务状态；key 使用 `data-agent.*` 前缀。密码、token、私钥、完整连接串和真实敏感数据不得写入 SQLite 或 Local Storage。

本地 SQLite 服务由 `server/dev.mjs` 提供，数据库默认为 `data/platform.sqlite`，通过 `server/sqlite.mjs` 的 `app_state` 和 `app_events` 表保存状态与操作记录。

```ts
// 切换后参考实现 (示意)
async function dispatch<T>(method, path, body, opts) {
  const res = await fetch(`${import.meta.env.VITE_API_BASE}${path}`, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { "content-type": "application/json" },
  });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}
```

## 反模式 · Anti-Patterns
- ❌ feature 直接 `fetch()` / `axios()`
- ❌ 在 `mock-client.ts` 内塞业务 fixture (业务数据归 feature 各自的 `api/mock.ts`)
- ❌ 把 mock fixture 注入到全局 `window`
- ❌ 用 `path` 拼接业务参数 (用 `body` 或将来的 query params)
- ❌ 把真实凭证或安全策略存入 Local Storage

## 关联文件 · Files
- `src/lib/mock-client.ts`
- `src/features/*/api/mock.ts`

## 关联 ADR · Related ADRs
- [`adr/0006-local-sqlite-state-persistence.md`](../adr/0006-local-sqlite-state-persistence.md)
