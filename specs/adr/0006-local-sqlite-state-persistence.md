# ADR-0006 · Local SQLite State Persistence

## 状态 · Status

Accepted

## 背景 · Context

产品原型的可变数据此前主要由 React local state、Local Storage 或 feature mock module 持有，刷新后难以统一恢复，也无法检查不同功能产生的数据。用户要求所有功能数据落入 SQLite，同时保持真实数据源、计算引擎和执行器不接入。

## 决策 · Decision

使用 Node 22 内置 `node:sqlite` 建立项目本地数据库 `data/platform.sqlite`。数据库提供：

- `app_state`：按 `data-agent.*` scope 保存 JSON 状态、版本和更新时间。
- `app_events`：记录 scope 的 upsert/delete 操作，便于本地检查和后续审计扩展。
- `server/dev.mjs`：将 SQLite API 与 Vite 开发服务合并到同一端口。
- `src/lib/sqlite-client.ts`：提供 `readSqliteState`、`writeSqliteState` 和 `useSqliteState`，页面不直接调用 `fetch`。

已有 `local-json-store` 保留为浏览器 fallback，并将写入镜像到 SQLite；`mockClient` 继续承载模拟执行、延迟和失败状态，不代表真实后端。

## 影响 · Consequences

- 数据集成、数据湖、数据治理、数据资产、数据开发、调度、运维和安全页面的可变状态可跨刷新恢复。
- 本地开发需要使用 `npm run dev`，不能使用只启动 Vite 的 `npm run dev:vite` 验证持久化功能。
- SQLite 的 JSON scope 牺牲了生产级关系模型和并发能力，后续接入真实后端时需保留 scope 到领域表的迁移路径。
- 不在 SQLite 中保存密码、token、私钥、完整连接串或其他真实敏感数据。
