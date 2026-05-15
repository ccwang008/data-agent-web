# Platform · 设计系统 · Design System

## 设计意图 · Intent
经典浅色 SaaS / B2B 运营后台。以白色面板、浅灰工作区、蓝色主色和清晰分割线为主, 服务高频操作、表格扫描和长时间使用。避免紫色渐变、过度装饰、过大圆角和营销页式布局。

## 色板 · Palette (Light SaaS)
定义于 `src/styles/globals.css` 的 `:root` 段, Tailwind 通过 `tailwind.config.ts` 映射为命名颜色。

| Token | HSL | 用途 · Usage |
|---|---|---|
| `--background` | `210 24% 97%` | 应用工作区背景 |
| `--foreground` | `222 47% 11%` | 主文本 |
| `--card` / `--surface` | `0 0% 100%` | 侧栏、顶栏、卡片和弹层 |
| `--surface-raised` | `210 40% 98%` | 轻微抬升面 |
| `--border` | `214 32% 91%` | 分割线、输入框边框 |
| `--muted-foreground` | `215 16% 47%` | 次级文本、说明和导航默认态 |
| `--primary` | `221 83% 53%` | active rail、focus、primary CTA |
| `--accent` | `214 95% 93%` | active nav 背景和轻量高亮 |
| `--destructive` | `0 72% 51%` | 错误、危险操作 |

## 字体 · Typography
- UI: **Space Grotesk** (Google Fonts 加载, 兜底 system-ui)
- 数据 / 等宽: **IBM Plex Mono**
- 数字密集场景(stat row / 列表序号): 统一 `font-mono tabular-nums`
- 配置位置: `tailwind.config.ts` 的 `fontFamily.sans / mono`
- 加载位置: `index.html` 的 `<link>`

## 间距与圆角 · Spacing & Radius
沿用 Tailwind 默认 4px 基线。
- 高密度导航: `h-8` / `h-9`, `px-2.5`
- 常规卡片: `px-5 py-4` 或 `p-5`
- 大区段: `gap-6`
- `--radius: 0.5rem` (8px), 派生 `rounded-md` / `rounded-sm`

## 组件约定 · Components
| 类 | 实现 | 用途 |
|---|---|---|
| `.saas-panel` | `rounded-md border bg-card shadow-sm` | 标准 SaaS 面板 |
| `.card-ticks` | 保留类名, 现在只提供轻量阴影 | 兼容旧页面卡片 |
| `.bg-grid-paper` | 24px 浅灰网格 | 仅用于图/画布类区域 |
| `.hairline` | `box-shadow: inset 0 -1px 0 hsl(var(--border))` | 单边描边 |
| `.eyebrow` | 11px uppercase + `font-semibold` | 小型分类标签 |
| `.scrollbar-thin` | 自定义 webkit 滚动条 | 内嵌容器 |

## shadcn 接入约定 · shadcn Conventions
- 风格: `new-york` (见 `components.json`)
- 添加新原子件: `npx shadcn@latest add <name>`, 落到 `src/components/ui/`
- 不修改 shadcn 原始 API; 扩展时新建组合组件放入 `src/components/common/`
- 初始化时已就位: `button`, `tooltip`

## 反模式 · Anti-Patterns
- 紫色渐变背景
- Inter / Roboto / Arial 等通用字体
- 全部使用 `rounded-2xl` / `rounded-3xl`
- 在 feature 内自创色彩 token
- 营销页式 hero、装饰卡片堆叠、过度插画化空状态

## 关联文件 · Files
- `src/styles/globals.css`
- `tailwind.config.ts`
- `index.html` (font links)
- `components.json`
