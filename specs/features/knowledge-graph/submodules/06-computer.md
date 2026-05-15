# 06 · Computer · 图计算

> 类别: 平台扩展(Hubble 主线无对应 UI)
> Hubble 参照: 无, 平台自设计
> 业务源: hugegraph-computer(OLAP) — <https://hugegraph.apache.org/docs/quickstart/hugegraph-computer/>

## 元数据 · Meta
| 项 | 值 |
|---|---|
| 路由 | `/knowledge-graph/computer` |
| 状态 | 🚧 待实现 |
| 优先级 | M4 |
| 类别 | 平台扩展 |

## 概述 · Overview
为当前图实例提供离线 OLAP 算法目录, 用户选择算法 → 填参数 → 提交 → 跳转 05-async-tasks 监控 → 结果回写图或下载。本模块的 UI 与流程为本项目自设计, 业务能力对齐 hugegraph-computer 的算法清单, 但**不**接入 computer 服务或镜像其提交协议(k8s manifest), 全部走 mock。

## 用户故事 · User Stories
- **US-01** 作为分析师, 我希望在算法目录卡片网格中按类别(中心性 / 社区 / 路径) 浏览 11 个内建算法
- **US-02** 作为分析师, 我希望点击算法后看到参数表单(通用参数 + 算法特定参数)
- **US-03** 作为分析师, 我希望提交后**不阻塞页面**, 任务移交 05-async-tasks, 通知中心提醒进度
- **US-04** 作为分析师, 我希望结果可选: ① 回写到图(在 visualization / analysis 中显式查询 OLAP 输出属性) ② 下载

## 验收 · Acceptance Criteria (EARS)
- **AC-01 算法目录** 页面应当呈现算法卡片网格, 按三类分组:
  - **中心性**: PageRank · BetweennessCentrality · ClosenessCentrality · DegreeCentrality (共 4)
  - **社区发现**: ClusteringCoefficient · Kcore · LPA · TriangleCount · WCC (共 5)
  - **路径分析**: RingsDetection · RingsDetectionWithFilter (共 2)
- **AC-02** 卡片应当含: 算法名 / 类别 / 简短描述 / "提交"按钮
- **AC-03** 点击"提交"打开参数表单抽屉, 通用参数(目标 VertexLabel 范围 / 最大迭代次数 / 输出方式) + 算法特定参数(如 PageRank 的 dampingFactor)
- **AC-04** 提交后弹 toast 含"前往任务详情"链接, 任务出现在 05-async-tasks 列表顶部 (对应 `AC-G-HANDOFF`)
- **AC-05** 结果回写: success 后, 在 visualization 的 Property Panel 中应当能看到 OLAP 输出属性(如 `pagerank: 0.0234`)
- **AC-06** 提交时若参数非法, 表单行内错误提示, 不提交

## 数据模型 · Data Model
```ts
type AlgorithmCategory = 'centrality' | 'community' | 'path';

interface AlgorithmDescriptor {
  key: string;                      // 'page-rank' / 'wcc' / ...
  name: string;
  category: AlgorithmCategory;
  description: string;
  paramSchema: Array<{
    key: string;
    label: string;
    type: 'number' | 'string' | 'boolean' | 'enum' | 'label-multi';
    default?: unknown;
    min?: number;
    max?: number;
    options?: string[];
  }>;
  outputProperty?: string;          // 回写时的属性名, 如 'pagerank'
}

interface AlgorithmJobSubmission {
  algorithmKey: string;
  graphId: string;
  params: Record<string, unknown>;
  output: 'write-back' | 'download' | 'both';
}
```

## 本地接口 · Local Mock API
| Method | Path | Response |
|---|---|---|
| GET | `/api/knowledge-graph/computer/algorithms` | `AlgorithmDescriptor[]` |
| POST | `/api/knowledge-graph/computer/jobs` | `{ taskId: string }` (移交 async-tasks) |
| GET | `/api/knowledge-graph/computer/jobs/:taskId` | `AsyncTask`(代理给 async-tasks 端点) |

## 路由 · Routes
- `/knowledge-graph/computer` → 算法目录
- `/knowledge-graph/computer?algo=<key>` → 自动打开参数表单抽屉

## 组件分解 · Components
- `ComputerPage`
  - `AlgorithmCatalog`
    - `CategorySection`(中心性 / 社区 / 路径)
    - `AlgorithmCard`
  - `AlgorithmParamDrawer`
    - `CommonParamSection`
    - `AlgorithmSpecificParamSection`
    - `OutputSelector`

## 交互与边界 · UX & Edges
- **空态**: 当前图实例数据规模太小 → 卡片上显示"建议数据规模 ≥ N 顶点"提示, 不阻塞提交
- **错误**: 参数校验错误行内提示; 提交后端错误显示在抽屉底部
- **超时**: 算法本身可能跑分钟级 — 整个流程走 async, 当前页面不需要等待
- **结果回写冲突**: 若图已有同名属性, 提示用户选"覆盖 / 重命名输出属性"

## 开放问题 · Open Questions
- ❓ Graph ML 算法(嵌入 / 节点分类 / 链路预测) 与 07-ai 的 Graph ML 区分: 本模块偏 OLAP 离线计算, 07-ai 偏在线 ML 推理 / 训练
- ❓ k8s manifest 真实提交协议如何接入? 走未来 ADR
- ❓ 算法目录是否支持用户自定义算法? 暂不支持

## 关联 · Links
- [Requirements](../requirements.md)
- [Design](../design.md)
- 业务源: hugegraph-computer
- 下游: 05-async-tasks(任务移交), 10-visualization / 04-analysis(结果属性可视化)
