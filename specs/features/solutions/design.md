# Solutions · Design

## 路由 · Route

`src/features/solutions/routes.tsx` 导出 `/solutions` route，由 `src/app/router.tsx` 组合到 `AppShell`。`AppShell` 将 `/solutions` 与 `/` 一起视为官网 landing page，隐藏通用工作台导航。

## 数据与交互 · Data and Interaction

行业方案配置位于 `SolutionsHomePage.tsx` 的本地常量中，当前行业由页面局部 state 管理。图片使用 `public/solutions/industry-solutions-strip.png`，不接入真实内容管理、推荐或行业服务 API。

## 视觉结构 · Layout

```text
东方金信官网导航
└─ 行业解决方案标题 + 统计
   └─ 行业场景图片长幅
      └─ 行业 Tab 卡片
         └─ 当前行业方案详情 + 能力标签
```

页面延续首页的 Classic Light SaaS 视觉基线，并用深色图片展示区区分解决方案内容。
