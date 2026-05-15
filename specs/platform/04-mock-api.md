# Platform · Mock API

## 目的 · Purpose
前端独立开发,需要一套**低开销、易切换**的 fixture 机制。`mockClient` 提供 HTTP-like 接口, 真实接入后只需替换 `dispatch` 内部实现, 业务代码零改动。

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

**早注册**: 在 `routes.tsx` 顶部 `import "./api/mock"` 触发副作用, 保证页面挂载前 fixture 已就绪。

## 命名约定 · Path Conventions
- 路径前缀 `/api/<feature-key>/...`, 与 feature 目录同名
- 资源用复数, 详情用 id: `/api/agents` · `/api/agents/:id` (将来支持)
- 操作型路由用动词后缀: `/api/agents/:id/trigger`

## 切换到真实 API · Swap to Real API
1. 修改 `src/lib/mock-client.ts` 的 `dispatch` 内部, 改用 `fetch(BASE_URL + path, ...)`
2. 保留 `mockClient` 与 `get/post/put/delete` 导出名;业务方代码无需修改
3. (可选)用 `import.meta.env.MODE` 判断, dev → mock, prod → real

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

## 关联文件 · Files
- `src/lib/mock-client.ts`
- `src/features/*/api/mock.ts`

## 关联 ADR · Related ADRs
- TODO: `adr/NNNN-mock-strategy-handrolled-vs-msw.md`
