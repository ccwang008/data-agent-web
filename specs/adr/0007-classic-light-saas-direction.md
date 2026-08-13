# ADR-0007 · Classic Light SaaS 视觉方向

## 状态 · Status

Accepted

## 背景 · Context

平台同时包含数据工程、治理、资产、运维和 AI 工作台，需要统一的高密度企业后台视觉，避免不同 feature 自行创建颜色体系和营销式页面。

## 决策 · Decision

业务工作台统一采用 Classic Light SaaS：浅色工作区、白色面板、蓝色主色、紧凑表格、清晰状态反馈和适度圆角。设计 token 由全局样式维护，feature 不创建私有主题；产品矩阵与行业方案可使用独立公司首页布局，但进入工作台后回归统一应用壳。

## 后果 · Consequences

- 共享 UI 和业务页面可以保持一致的信息密度。
- 不采用紫色渐变、过大圆角或与产品无关的营销 hero。
- 暗色主题和品牌深度定制需要后续 ADR。

