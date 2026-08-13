# Product Matrix · Design

## 路由 · Route

`src/features/product-matrix/routes.tsx` 导出 index route，由 `src/app/router.tsx` 组合到根 `AppShell`。根路径由 `AppShell` 识别为产品矩阵首页并隐藏通用工作台侧边栏和顶栏，避免出现两套导航。行业解决方案由独立的 `src/features/solutions/` feature 提供 `/solutions` 页面。

## 数据结构 · Data Structure

产品类型和产品卡片是 `ProductMatrixHomePage.tsx` 内的本地常量：

```ts
type CategoryId = "all" | "business" | "ai-platform" | "data-platform" | "infrastructure";

type Product = {
  id: string;
  category: Exclude<CategoryId, "all">;
  title: string;
  description: string;
  detail: string;
  href: string;
  capabilities?: Array<string | { label: string; href: string }>;
};
```

通过页面局部 state 管理当前类型和搜索词，使用 `useMemo` 得到展示卡片，搜索范围包含产品能力名称。Data Stack、Agentic OS 和机器学习平台等是产品卡片；Data Stack 的 capability tags 是八个产品域的直接入口，其他仅用于说明的 capability 保持普通标签。基础设施层的机器学习平台突出拖拽式开发、Notebook、特征工程和模型训练。后续新增产品只需增加 mock 配置。卡片使用 React Router `Link` 进入已有产品路由或首页锚点。

## 视觉结构 · Layout

```text
顶部品牌导航
└─ 产品矩阵标题 + 平台统计
   └─ 左侧产品类型导航
      └─ 右侧产品卡片网格
         └─ 产品详情 / 工作台路由
```

首页是独立的产品发现入口，沿用 Classic Light SaaS 的浅色背景、白色卡片、蓝色主色和紧凑信息密度；行业内容只在解决方案 Tab 页面展示。
