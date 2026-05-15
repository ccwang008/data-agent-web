# 09 · Help · 帮助与深链

> 类别: 平台扩展(hugegraph-website 是独立静态站, 本模块只做深链)
> Hubble 参照: 无, 平台自设计
> 业务源: hugegraph-website — <https://hugegraph.apache.org/>

## 元数据 · Meta
| 项 | 值 |
|---|---|
| 路由 | `/knowledge-graph/help` |
| 状态 | 🚧 待实现 |
| 优先级 | M5 |
| 类别 | 平台扩展 |

## 概述 · Overview
为用户提供进入 hugegraph-website 主要文档章节的深链卡片, 以及承载 KG 模块的 Apache-2.0 归属。各子模块顶部也提供"打开官方文档"的上下文链接, 跳到本页对应章节。

## 用户故事 · User Stories
- **US-01** 作为新用户, 我希望在帮助页快速找到"快速开始 / 元数据建模 / 数据导入 / 数据分析 / 任务管理 / Computer / AI" 的官方文档入口
- **US-02** 作为任何用户, 我希望 Apache-2.0 归属字串在 UI 可见处出现(至少一处)
- **US-03** 作为分析师, 我希望从任意子页面顶部"打开官方文档"链接快速跳到对应章节(指向本页对应卡片或外链)

## 验收 · Acceptance Criteria (EARS)
- **AC-01 归属可见** 页面顶部应当显示 `<AttributionBanner>` 含: "本模块 UI 结构衍生自 Apache HugeGraph (Apache License 2.0)", 链接到 https://github.com/apache/hugegraph 与 https://hugegraph.apache.org/ (对应 `AC-G-ATTRIBUTION`)
- **AC-02 深链卡片** 卡片网格应当至少覆盖以下章节链接(每张卡片有标题 / 简短描述 / 外链图标):
  - 快速开始
  - 元数据建模
  - 数据导入(含 loader)
  - 数据分析(Gremlin)
  - 任务管理
  - 图计算(computer)
  - 图 AI(ai)
  - 项目主页(github)
- **AC-03** 卡片点击在新标签页打开外部链接(`target=_blank` + `rel=noopener`)
- **AC-04** 各子模块(01–10) 顶部应当存在"打开官方文档"小图标链接, 点击跳到本页对应卡片(锚点) 或外链
- **AC-05** 链接失效(404 / 网络错误) 时, 卡片不在前端显示错误, 只在浏览器中由用户感知; 本页不主动健康检查(本期 mock-only)

## 数据模型 · Data Model
```ts
interface DocDeepLink {
  key: string;                       // 'quickstart' / 'metadata' / ...
  title: { 'zh-CN': string; 'en-US': string };
  description: { 'zh-CN': string; 'en-US': string };
  url: string;                       // 完整外链
  category: 'getting-started' | 'feature' | 'ecosystem' | 'project';
}
```

## 本地接口 · Local Mock API
本模块**无** mock 端点(完全静态), 链接清单直接以模块常量定义于 `src/features/knowledge-graph/api/help-links.ts`。

## 路由 · Routes
- `/knowledge-graph/help` → HelpPage
- `/knowledge-graph/help#<key>` → 自动滚动到对应卡片

## 组件分解 · Components
- `HelpPage`
  - `AttributionBanner`(顶部, cobalt 描边, grotesque 文字)
  - `DeepLinkGrid`
    - `DocCategoryGroup`(getting-started / feature / ecosystem / project)
    - `DocLinkCard`

## 交互与边界 · UX & Edges
- **空态**: 不会出现(常量数据)
- **错误**: 浏览器跳转失败由浏览器处理, 本页不感知
- **响应式**: 卡片网格在 < 768px 屏幕下转为单列
- **a11y**: 卡片可键盘聚焦, 外链有清晰图标提示

## 开放问题 · Open Questions
- ❓ 链接清单维护方式: 当前模块常量, 未来是否需要 mock 端点 / 后端配置?
- ❓ 是否需要嵌入官方文档预览(iframe)? 当前不嵌入, 仅深链
- ❓ 各子模块的"打开官方文档"链接是否要在 ADR 中固定 URL 映射? 走 ADR(轻量)

## 关联 · Links
- [Requirements](../requirements.md) — AC-G-ATTRIBUTION
- [Design](../design.md)
- 业务源: hugegraph-website
- 引用方: 01–10 所有子模块顶部"打开官方文档"链接
