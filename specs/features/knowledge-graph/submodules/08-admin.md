# 08 · Admin · 危险操作中心

> 类别: 平台扩展(Hubble 主线无 GUI, hugegraph-tool 仅 CLI)
> Hubble 参照: 无, 平台自设计
> 业务源: hugegraph-toolchain · Tool (CLI)

## 元数据 · Meta
| 项 | 值 |
|---|---|
| 路由 | `/knowledge-graph/admin` |
| 状态 | 🚧 待实现 |
| 优先级 | M5 |
| 类别 | 平台扩展 |

## 概述 · Overview
把 hugegraph-tool CLI 中的危险操作(备份 / 还原 / 清空) 包装成有强护栏的 UI: 集中放在"DangerZone"区块, 二次确认要求输入图实例名, 全部操作写入审计历史, 历史不可删。

## 用户故事 · User Stories
- **US-01** 作为运维, 我希望对当前图实例触发完整备份, 进度可观察, 备份产物可下载或回写远端
- **US-02** 作为运维, 我希望从历史备份还原图实例, 还原前看到差异摘要 + 风险提示
- **US-03** 作为运维, 我希望清空图(保留 schema / 数据全清 二选一) , 必须输入图实例名匹配才放行
- **US-04** 作为治理负责人, 我希望浏览所有危险操作的审计历史, 记录不可删除

## 验收 · Acceptance Criteria (EARS)
- **AC-01 DangerZone 区块** 三类操作(备份 / 还原 / 清空) 集中显示在视觉警示明显的区块(cobalt 警示边 + 锐角红底标签), 与平台其他操作区分
- **AC-02 二次确认** 触发任一危险操作必须打开 `<DangerConfirmDialog>`, 要求用户**输入当前图实例名完全匹配**才放行(防误操作)
- **AC-03** 还原前显示"目标版本 vs 当前版本"差异摘要(顶点数变化 / 边数变化 / Label 变化)
- **AC-04** 清空操作分两档: "仅清空数据(保留 schema)" / "完全清空(含 schema)", 默认前者
- **AC-05** 所有操作走 async-tasks (对应 `AC-G-HANDOFF`); 任务在 async-tasks 与本页审计历史中各显示一份(本页审计不可删, async-tasks 可清理)
- **AC-06 历史不可删** 审计历史只读, 不提供删除按钮; 仅支持按时间 / 类型 / 操作人(mock)筛选
- **AC-07** 用户进入页面时显示警示横幅, 说明"本页所有操作不可逆"

## 数据模型 · Data Model
```ts
type DangerOpKind = 'backup' | 'restore' | 'clear-data' | 'clear-all';

interface BackupArtifact {
  id: string;
  graphId: string;
  size: number;                      // bytes
  vertexCount: number;
  edgeCount: number;
  schemaSnapshot: { vertexLabels: number; edgeLabels: number };
  createdAt: string;
  createdBy: string;
  downloadUrl?: string;              // mock
}

interface DangerOpRecord {
  id: string;
  graphId: string;
  kind: DangerOpKind;
  status: 'pending' | 'running' | 'success' | 'failed';
  parameters: Record<string, unknown>;
  effects?: { vertexDelta: number; edgeDelta: number; schemaDelta: number };
  taskId: string;                    // 关联 05-async-tasks
  performedBy: string;                // mock 当前用户
  performedAt: string;
}
```

## 本地接口 · Local Mock API
| Method | Path | Response |
|---|---|---|
| GET | `/api/knowledge-graph/admin/backups` | `BackupArtifact[]` |
| POST | `/api/knowledge-graph/admin/backup` | `{ taskId: string }` |
| POST | `/api/knowledge-graph/admin/restore` | `{ taskId: string }` (body: `{ backupId }`) |
| POST | `/api/knowledge-graph/admin/clear-data` | `{ taskId: string }` |
| POST | `/api/knowledge-graph/admin/clear-all` | `{ taskId: string }` |
| GET | `/api/knowledge-graph/admin/history?kind=&from=&to=` | `DangerOpRecord[]` |

## 路由 · Routes
- `/knowledge-graph/admin` → AdminPage

## 组件分解 · Components
- `AdminPage`
  - `DangerWarningBanner`(顶部横幅, 不可关闭)
  - `DangerZoneList`
    - `BackupSection`(列出已有备份 + "新建备份"按钮)
    - `RestoreSection`(选备份 + 差异摘要 + 还原按钮)
    - `ClearSection`(两档清空)
  - `DangerConfirmDialog`(共用; 输入图实例名匹配)
  - `OperationHistoryTable`(只读, 含筛选)

## 交互与边界 · UX & Edges
- **空态**: 无备份时, 还原段显示"暂无可用备份"占位
- **错误**: 操作失败时, 历史记录显示 failed 状态 + 错误原因 + "查看任务日志"链接(跳 async-tasks)
- **超时**: 备份 / 还原可能长时间运行, 页面立即返回 toast, 不阻塞
- **跨用户操作**: mock 模拟"另一用户正在备份"时, 后触发的备份排队 + 提示

## 开放问题 · Open Questions
- ❓ 是否需要"计划备份"(定时自动备份)? P2
- ❓ 备份加密策略? 走 ADR(未来真实接入)
- ❓ 审计历史的外部导出? 默认不允许, 防止覆盖
- ❓ 权限模型(谁可触发危险操作) 走 settings 模块的角色 / 权限 P1

## 关联 · Links
- [Requirements](../requirements.md)
- [Design](../design.md)
- 业务源: hugegraph-toolchain · Tool (CLI)
- 下游: 05-async-tasks(任务移交), settings(权限校验)
