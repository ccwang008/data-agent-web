import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BrainCircuit,
  Brain,
  ChevronDown,
  CloudCog,
  Database,
  FileKey2,
  Gauge,
  Layers3,
  LayoutGrid,
  LineChart,
  PanelsTopLeft,
  Search,
  ServerCog,
  Sparkles,
  Tags,
  Zap,
} from "lucide-react";

type CategoryId = "all" | "business" | "ai-platform" | "data-platform" | "infrastructure";

type ProductCapability = string | {
  label: string;
  href: string;
};

type Product = {
  id: string;
  category: Exclude<CategoryId, "all">;
  title: string;
  englishTitle?: string;
  description: string;
  detail: string;
  href: string;
  icon: LucideIcon;
  accent: string;
  badge?: string;
  capabilities?: ProductCapability[];
};

function capabilityLabel(capability: ProductCapability): string {
  return typeof capability === "string" ? capability : capability.label;
}

type Category = {
  id: CategoryId;
  label: string;
  englishLabel: string;
  description: string;
  icon: LucideIcon;
  accent: string;
};

const categories: Category[] = [
  {
    id: "all",
    label: "全部产品",
    englishLabel: "Product matrix",
    description: "从业务应用到底层基础设施的一站式数据产品矩阵",
    icon: LayoutGrid,
    accent: "blue",
  },
  {
    id: "business",
    label: "业务应用层",
    englishLabel: "Business applications",
    description: "面向业务场景的智能应用与经营分析产品",
    icon: PanelsTopLeft,
    accent: "blue",
  },
  {
    id: "ai-platform",
    label: "AI 平台",
    englishLabel: "AI platform",
    description: "连接模型、数据、知识和智能体运行的产品",
    icon: BrainCircuit,
    accent: "mint",
  },
  {
    id: "data-platform",
    label: "数据平台",
    englishLabel: "Data platform",
    description: "以 Data Stack 为核心的数据资产与数据服务产品",
    icon: Layers3,
    accent: "green",
  },
  {
    id: "infrastructure",
    label: "基础设施层",
    englishLabel: "Infrastructure",
    description: "模型、数据库、计算和多模态存储基础设施",
    icon: ServerCog,
    accent: "slate",
  },
];

const products: Product[] = [
  {
    id: "multi-agent",
    category: "business",
    title: "多场景 Agent",
    description: "垂直行业智能体与业务自动化助手",
    detail: "面向不同业务角色，快速组合数据、知识和工具能力。",
    href: "/agents",
    icon: BrainCircuit,
    accent: "blue",
    badge: "AI 应用",
  },
  {
    id: "smart-report",
    category: "business",
    title: "智能报表平台",
    description: "多维可视化经营分析与指标监控",
    detail: "把经营数据转化为可追踪、可分享的分析视图。",
    href: "/insights",
    icon: BarChart3,
    accent: "blue",
    badge: "业务分析",
  },
  {
    id: "smart-tag",
    category: "business",
    title: "智能标签平台",
    description: "垂直行业智能体与业务自动化助手",
    detail: "沉淀统一标签体系，为画像、分析和 AI 应用提供语义资产。",
    href: "/data-asset/catalog",
    icon: Tags,
    accent: "blue",
    badge: "数据资产",
  },
  {
    id: "decision-analysis",
    category: "business",
    title: "分析决策平台",
    description: "基于机器学习实现趋势预测与风险预警",
    detail: "将指标、模型与业务规则连接起来，辅助经营决策。",
    href: "/insights",
    icon: LineChart,
    accent: "blue",
    badge: "决策分析",
  },
  {
    id: "metric-management",
    category: "business",
    title: "指标管理平台",
    description: "指标体系构建、指标查询与经营分析",
    detail: "统一指标口径、责任人、版本和使用范围。",
    href: "/data-governance/standards",
    icon: Gauge,
    accent: "blue",
    badge: "指标中心",
  },
  {
    id: "agentic-os",
    category: "ai-platform",
    title: "Agentic OS",
    englishTitle: "Data Agentic OS",
    description: "智能体与 AI 数据能力操作系统",
    detail: "统一承载智能体、插件、数据中心、知识中心和运行运维。",
    href: "/agents",
    icon: BrainCircuit,
    accent: "mint",
    badge: "AI 产品",
    capabilities: ["智能体管理", "能力插件", "数据中心", "知识中心", "Agent 运维"],
  },
  {
    id: "data-stack",
    category: "data-platform",
    title: "Data Stack",
    englishTitle: "Enterprise Data Platform",
    description: "企业数据资产与数据服务平台",
    detail: "统一管理数据资产、数据湖、治理、开发、调度、安全和运维。",
    href: "/data-asset/catalog",
    icon: Layers3,
    accent: "green",
    badge: "数据产品",
    capabilities: [
      { label: "数据资产运营", href: "/data-asset/catalog" },
      { label: "数据集成", href: "/data-source/sources" },
      { label: "数据湖", href: "/data-lake/storage" },
      { label: "数据治理", href: "/data-governance/metadata" },
      { label: "数据开发", href: "/data-development/etl" },
      { label: "调度引擎", href: "/scheduler/tasks" },
      { label: "运维与监控", href: "/ops-monitor/tasks" },
      { label: "数据安全", href: "/data-security/classification" },
    ],
  },
  {
    id: "datascience-llm",
    category: "infrastructure",
    title: "科学大模型",
    englishTitle: "DataScienceLLM",
    description: "垂直领域大模型",
    detail: "分析建模与机器学习融合，支撑 AI 应用大脑。",
    href: "/agents",
    icon: Sparkles,
    accent: "slate",
    badge: "模型基础设施",
  },
  {
    id: "machine-learning-platform",
    category: "infrastructure",
    title: "机器学习平台",
    englishTitle: "Machine Learning Platform",
    description: "拖拽式建模与 Notebook 开发",
    detail: "覆盖数据准备、特征工程、模型训练、评估与发布的机器学习研发工作台。",
    href: "#products",
    icon: Brain,
    accent: "slate",
    badge: "AI 开发平台",
    capabilities: ["拖拽式开发", "Notebook", "特征工程", "模型训练"],
  },
  {
    id: "seabox-sql",
    category: "infrastructure",
    title: "信创数据库",
    englishTitle: "SeaboxSql",
    description: "集中式 + 分布式，国产化合规部署",
    detail: "为企业级数据管理提供稳定、安全、可扩展的数据库能力。",
    href: "/data-source/sources",
    icon: FileKey2,
    accent: "slate",
    badge: "数据库",
  },
  {
    id: "sdp",
    category: "infrastructure",
    title: "大数据计算平台",
    englishTitle: "SDP",
    description: "批处理 / 流处理一体化",
    detail: "统一承载分布式数据计算与作业编排。",
    href: "/scheduler/editor",
    icon: Zap,
    accent: "slate",
    badge: "计算平台",
  },
  {
    id: "datasore",
    category: "infrastructure",
    title: "多模数据存储",
    englishTitle: "DataSore",
    description: "海量结构化和非结构化数据管理",
    detail: "提供高持久性、可靠性和全生命周期的数据存储能力。",
    href: "/data-lake/storage",
    icon: CloudCog,
    accent: "slate",
    badge: "存储平台",
  },
];

function getAccentClasses(accent: string) {
  if (accent === "mint") {
    return {
      icon: "bg-emerald-50 text-emerald-600 ring-emerald-100",
      hover: "hover:border-emerald-200 hover:shadow-emerald-100/70",
      label: "text-emerald-700",
    };
  }
  if (accent === "slate") {
    return {
      icon: "bg-slate-100 text-slate-600 ring-slate-200",
      hover: "hover:border-slate-300 hover:shadow-slate-200/70",
      label: "text-slate-600",
    };
  }
  if (accent === "green") {
    return {
      icon: "bg-green-50 text-green-700 ring-green-100",
      hover: "hover:border-green-200 hover:shadow-green-100/70",
      label: "text-green-700",
    };
  }
  return {
    icon: "bg-blue-50 text-blue-600 ring-blue-100",
    hover: "hover:border-blue-200 hover:shadow-blue-100/70",
    label: "text-blue-700",
  };
}

function ProductCard({ product }: { product: Product }) {
  const Icon = product.icon;
  const accent = getAccentClasses(product.accent);

  return (
    <article
      className={`group flex min-h-[178px] flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 ${accent.hover}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`grid h-10 w-10 place-items-center rounded-lg ring-1 ${accent.icon}`}>
          <Icon className="h-5 w-5" strokeWidth={1.8} />
        </div>
        {product.badge && (
          <span className={`rounded-full bg-slate-50 px-2 py-1 text-[10px] font-medium ${accent.label}`}>
            {product.badge}
          </span>
        )}
      </div>
      <div className="mt-4 flex-1">
        <div className="flex items-baseline gap-2">
          <h3 className="text-[16px] font-semibold tracking-tight text-slate-900 group-hover:text-blue-700">
            {product.title}
          </h3>
          {product.englishTitle && (
            <span className="font-mono text-[10px] text-slate-400">{product.englishTitle}</span>
          )}
        </div>
        <p className="mt-2 text-[13px] font-medium leading-5 text-slate-600">{product.description}</p>
        <p className="mt-1 text-[12px] leading-5 text-slate-400">{product.detail}</p>
        {product.capabilities && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {product.capabilities.map((capability) => {
              const label = capabilityLabel(capability);
              return typeof capability === "string" ? (
                <span key={label} className="rounded-md bg-slate-50 px-2 py-1 text-[10px] text-slate-500">
                  {label}
                </span>
              ) : (
                <Link key={capability.href} to={capability.href} className="rounded-md bg-slate-50 px-2 py-1 text-[10px] text-slate-500 transition hover:bg-blue-50 hover:text-blue-700">
                  {label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
      <Link to={product.href} className="mt-4 flex items-center gap-1 text-[12px] font-medium text-blue-600 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
        进入产品
        <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    </article>
  );
}

function CategoryNavItem({
  category,
  active,
  count,
  onClick,
}: {
  category: Category;
  active: boolean;
  count: number;
  onClick: () => void;
}) {
  const Icon = category.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition ${
        active
          ? "bg-blue-600 text-white shadow-md shadow-blue-200"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      <span className={`grid h-8 w-8 place-items-center rounded-md ${active ? "bg-white/15" : "bg-slate-100 group-hover:bg-blue-50"}`}>
        <Icon className={`h-4 w-4 ${active ? "text-white" : "text-slate-500 group-hover:text-blue-600"}`} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold">{category.label}</span>
        <span className={`mt-0.5 block truncate text-[10px] ${active ? "text-blue-100" : "text-slate-400"}`}>
          {category.englishLabel}
        </span>
      </span>
      <span className={`font-mono text-[11px] ${active ? "text-blue-100" : "text-slate-400"}`}>{count}</span>
    </button>
  );
}

export default function ProductMatrixHomePage() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>("all");
  const [search, setSearch] = useState("");

  const selected = categories.find((category) => category.id === selectedCategory) ?? categories[0];
  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
      const matchesSearch = !query || [
        product.title,
        product.englishTitle,
        product.description,
        product.detail,
        ...(product.capabilities ?? []).map(capabilityLabel),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [search, selectedCategory]);

  return (
    <div className="min-h-screen overflow-y-auto bg-[#f6f8fb] text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[68px] max-w-[1500px] items-center gap-8 px-6">
          <Link to="/" className="flex shrink-0 items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-sm shadow-blue-200">
              <Database className="h-5 w-5" strokeWidth={2.2} />
            </span>
            <span>
              <span className="block text-[15px] font-bold tracking-tight text-slate-900">东方金信</span>
              <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">DONGFANG JINXIN</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-[13px] text-slate-500 md:flex">
            <a href="#products" className="font-semibold text-blue-700">产品矩阵</a>
            <a href="/solutions" className="transition hover:text-slate-900">解决方案</a>
            <a href="#about" className="transition hover:text-slate-900">关于东方金信</a>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden h-9 w-56 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-400 lg:flex">
              <Search className="h-4 w-4" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="搜索产品"
                className="min-w-0 flex-1 bg-transparent text-[12px] text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>
            <Link
              to="/data-asset/catalog"
              className="hidden items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-[12px] font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700 sm:flex"
            >
                查看产品
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-6 pb-12">
        <section className="relative overflow-hidden pb-7 pt-10" id="layers">
          <div className="pointer-events-none absolute -right-10 -top-24 h-72 w-72 rounded-full bg-blue-100/60 blur-3xl" />
          <div className="pointer-events-none absolute right-48 top-16 h-40 w-40 rounded-full bg-emerald-100/70 blur-3xl" />
          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600">
                <Sparkles className="h-3.5 w-3.5" />
                PRODUCT MATRIX
              </div>
              <h1 className="text-3xl font-bold tracking-[-0.04em] text-slate-950 sm:text-4xl">
                东方金信产品矩阵
              </h1>
              <p className="mt-3 max-w-2xl text-[14px] leading-6 text-slate-500">
                面向行业客户打造业务应用、AI 平台、数据产品与基础设施，选择一个产品类型，探索东方金信的产品能力。
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                ["4", "产品层"],
                [String(products.length), "产品数"],
                ["∞", "持续扩展"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-lg border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
                  <div className="font-mono text-[18px] font-semibold tabular-nums text-slate-900">{value}</div>
                  <div className="mt-1 text-[10px] text-slate-400">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[232px_minmax(0,1fr)]" id="products">
          <aside className="h-fit rounded-xl border border-slate-200 bg-white p-3 shadow-sm lg:sticky lg:top-[88px]">
            <div className="flex items-center justify-between px-2 pb-2 pt-1">
              <div>
                <div className="text-[13px] font-bold text-slate-900">产品类型</div>
                <div className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-slate-400">Browse by layer</div>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-300" />
            </div>
            <div className="space-y-1.5">
              {categories.map((category) => (
                <CategoryNavItem
                  key={category.id}
                  category={category}
                  count={category.id === "all" ? products.length : products.filter((product) => product.category === category.id).length}
                  active={selectedCategory === category.id}
                  onClick={() => setSelectedCategory(category.id)}
                />
              ))}
            </div>
            <div className="mt-4 border-t border-slate-100 pt-4" id="quick-start">
              <div className="px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Featured products</div>
              <Link to="/data-asset/catalog" className="mt-2 flex items-center gap-2 rounded-lg px-2 py-2 text-[12px] text-slate-600 transition hover:bg-blue-50 hover:text-blue-700">
                <Layers3 className="h-4 w-4 text-blue-500" />
                Data Stack
                <ArrowUpRight className="ml-auto h-3.5 w-3.5" />
              </Link>
              <Link to="/agents" className="flex items-center gap-2 rounded-lg px-2 py-2 text-[12px] text-slate-600 transition hover:bg-blue-50 hover:text-blue-700">
                <BrainCircuit className="h-4 w-4 text-blue-500" />
                Agentic OS
                <ArrowUpRight className="ml-auto h-3.5 w-3.5" />
              </Link>
            </div>
          </aside>

          <div className="min-w-0">
            <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600">{selected.englishLabel}</div>
                <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">{selected.label}</h2>
                <p className="mt-1 text-[13px] text-slate-500">{selected.description}</p>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {visibleProducts.length} 个产品可用
              </div>
            </div>

            {visibleProducts.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {visibleProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="grid min-h-[280px] place-items-center rounded-xl border border-dashed border-slate-300 bg-white text-center">
                <div>
                  <Search className="mx-auto h-8 w-8 text-slate-300" />
                  <div className="mt-3 text-sm font-semibold text-slate-700">没有匹配的产品</div>
                  <button type="button" onClick={() => setSearch("")} className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-700">
                    清除搜索条件
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        <footer className="mt-9 flex flex-col justify-between gap-3 border-t border-slate-200 pt-5 text-[11px] text-slate-400 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2" id="about">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            东方金信 · 让数据驱动业务，让智能创造价值
          </div>
          <div className="flex items-center gap-4">
            <span>数据资产 · 智能应用 · 基础设施</span>
            <a href="#products" className="transition hover:text-slate-700">浏览产品</a>
          </div>
        </footer>
      </main>
    </div>
  );
}
