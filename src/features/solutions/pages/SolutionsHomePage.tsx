import { useState } from "react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Building2,
  Database,
  Factory,
  GraduationCap,
  Landmark,
  Sparkles,
  Stethoscope,
  TrainFront,
  Wind,
} from "lucide-react";

type IndustrySolution = {
  id: string;
  label: string;
  englishLabel: string;
  title: string;
  description: string;
  detail: string;
  metric: string;
  icon: LucideIcon;
  tags: string[];
};

const industrySolutions: IndustrySolution[] = [
  {
    id: "finance",
    label: "金融",
    englishLabel: "Finance",
    title: "金融数据智能化解决方案",
    description: "围绕客户、风险、营销与运营场景，构建可信数据底座与实时洞察能力。",
    detail: "统一指标口径，连接数据资产、智能分析和风险预警，让经营决策更及时。",
    metric: "风险识别 · 实时经营 · 智能营销",
    icon: Landmark,
    tags: ["客户画像", "风险预警", "监管报送"],
  },
  {
    id: "industry",
    label: "工业",
    englishLabel: "Industry",
    title: "工业数据与智能制造解决方案",
    description: "打通设备、产线与经营数据，推动生产过程透明化、质量可追溯。",
    detail: "通过数据集成、湖仓管理和 AI 分析，支撑产能优化与设备预测性维护。",
    metric: "设备互联 · 质量追踪 · 产能优化",
    icon: Factory,
    tags: ["设备联网", "质量分析", "预测维护"],
  },
  {
    id: "transportation",
    label: "交通",
    englishLabel: "Transportation",
    title: "交通运行与出行服务解决方案",
    description: "融合路网、车辆、客流和气象数据，提升交通运行监测与出行服务体验。",
    detail: "让复杂交通数据可感知、可分析、可调度，为城市交通治理提供实时依据。",
    metric: "路网感知 · 智慧调度 · 出行服务",
    icon: TrainFront,
    tags: ["路网监测", "客流预测", "智能调度"],
  },
  {
    id: "energy",
    label: "能源",
    englishLabel: "Energy",
    title: "能源生产与经营管理解决方案",
    description: "统一接入能源生产、输配、消费数据，助力能源企业精细化运营。",
    detail: "围绕安全生产、能效管理和新能源消纳，构建从数据到决策的闭环。",
    metric: "安全生产 · 能效管理 · 低碳运营",
    icon: Wind,
    tags: ["能效分析", "安全监控", "碳排管理"],
  },
  {
    id: "government",
    label: "政务",
    englishLabel: "Government",
    title: "数字政府与城市治理解决方案",
    description: "以数据共享交换和治理为基础，推动政务服务协同与城市精细化管理。",
    detail: "构建统一数据目录、数据地图和服务编排能力，支撑跨部门业务协同。",
    metric: "数据共享 · 协同治理 · 服务提效",
    icon: Building2,
    tags: ["数据共享", "一网统管", "政务服务"],
  },
  {
    id: "education",
    label: "教育",
    englishLabel: "Education",
    title: "教育数据治理与智慧校园解决方案",
    description: "连接教学、科研、管理与服务数据，支持学校运营与人才培养。",
    detail: "用统一数据标准和可视化分析，帮助教育管理者发现问题、辅助教学决策。",
    metric: "教学分析 · 校园运营 · 人才培养",
    icon: GraduationCap,
    tags: ["学情分析", "科研管理", "校园画像"],
  },
  {
    id: "healthcare",
    label: "医疗",
    englishLabel: "Healthcare",
    title: "医疗数据与智慧健康解决方案",
    description: "在合规安全的基础上，促进临床、运营和公共健康数据的高效利用。",
    detail: "面向医院管理、科研分析和区域健康，提供可信、可追溯的数据服务。",
    metric: "临床科研 · 运营管理 · 健康服务",
    icon: Stethoscope,
    tags: ["临床数据", "科研分析", "健康管理"],
  },
];

export default function SolutionsHomePage() {
  const [selectedIndustryId, setSelectedIndustryId] = useState("finance");
  const selectedIndustry = industrySolutions.find((industry) => industry.id === selectedIndustryId) ?? industrySolutions[0];

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
            <Link to="/" className="transition hover:text-slate-900">产品矩阵</Link>
            <Link to="/solutions" className="font-semibold text-blue-700">解决方案</Link>
            <Link to="/#about" className="transition hover:text-slate-900">关于东方金信</Link>
          </nav>
          <div className="ml-auto">
            <Link
              to="/#products"
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-[12px] font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700"
            >
              查看产品
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-6 pb-12">
        <section className="relative overflow-hidden pb-7 pt-10">
          <div className="pointer-events-none absolute -right-10 -top-24 h-72 w-72 rounded-full bg-blue-100/60 blur-3xl" />
          <div className="pointer-events-none absolute right-48 top-16 h-40 w-40 rounded-full bg-emerald-100/70 blur-3xl" />
          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600">
                <Sparkles className="h-3.5 w-3.5" />
                INDUSTRY SOLUTIONS
              </div>
              <h1 className="text-3xl font-bold tracking-[-0.04em] text-slate-950 sm:text-4xl">行业解决方案</h1>
              <p className="mt-3 max-w-2xl text-[14px] leading-6 text-slate-500">
                深入金融、工业、交通、能源、政务、教育和医疗等行业现场，以数据底座、治理运营和智能应用支撑业务增长。
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                [String(industrySolutions.length), "行业领域"],
                ["4", "产品层"],
                ["∞", "持续演进"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-lg border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
                  <div className="font-mono text-[18px] font-semibold tabular-nums text-slate-900">{value}</div>
                  <div className="mt-1 text-[10px] text-slate-400">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="solutions" className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-xl shadow-slate-200/70">
          <div className="relative min-h-[300px] overflow-hidden sm:min-h-[340px]">
            <img
              src="/solutions/industry-solutions-strip.png"
              alt="金融、工业、交通、能源、政务、教育和医疗行业场景"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/35 to-slate-950/75" />
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-slate-950/35 to-transparent" />
            <div className="relative z-10 flex min-h-[300px] flex-col justify-between p-6 sm:min-h-[340px] sm:p-8">
              <div className="max-w-xl">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200">Selected industry</div>
                <h2 className="mt-3 text-2xl font-bold tracking-[-0.03em] text-white sm:text-3xl">{selectedIndustry.title}</h2>
                <p className="mt-3 text-[13px] leading-6 text-slate-200/85 sm:text-sm">{selectedIndustry.description}</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg border border-white/15 bg-slate-950/35 px-3 py-2.5 backdrop-blur-sm">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-cyan-200/80">Industry focus</div>
                  <div className="mt-1 text-[13px] font-semibold text-white">{selectedIndustry.metric}</div>
                </div>
                <div className="rounded-lg border border-white/15 bg-slate-950/35 px-3 py-2.5 backdrop-blur-sm">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-cyan-200/80">Solution approach</div>
                  <div className="mt-1 text-[13px] font-semibold text-white">数据底座 + AI 应用</div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-20 grid gap-2 border-t border-white/10 bg-slate-950/95 p-3 sm:grid-cols-4 lg:grid-cols-7 lg:p-4">
            {industrySolutions.map((industry) => {
              const Icon = industry.icon;
              const active = industry.id === selectedIndustryId;
              return (
                <button
                  key={industry.id}
                  type="button"
                  onClick={() => setSelectedIndustryId(industry.id)}
                  className={`group rounded-xl border px-3 py-3 text-left transition ${
                    active
                      ? "border-cyan-300 bg-white text-slate-900 shadow-lg shadow-cyan-950/20"
                      : "border-white/10 bg-white/[0.06] text-white hover:border-cyan-300/50 hover:bg-white/[0.12]"
                  }`}
                >
                  <span className={`grid h-8 w-8 place-items-center rounded-lg ${active ? "bg-blue-50 text-blue-600" : "bg-white/10 text-cyan-200"}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="mt-3 block text-[13px] font-semibold">{industry.label}</span>
                  <span className="mt-1 block text-[10px] text-slate-400">{industry.englishLabel}</span>
                </button>
              );
            })}
          </div>

          <div className="grid gap-5 border-t border-slate-200 bg-white p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600">{selectedIndustry.englishLabel}</div>
              <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-900">{selectedIndustry.title}</h3>
              <p className="mt-2 max-w-3xl text-[13px] leading-6 text-slate-500">{selectedIndustry.description} {selectedIndustry.detail}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedIndustry.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700">{tag}</span>
                ))}
              </div>
            </div>
            <Link to="/#products" className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-[12px] font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
              查看产品矩阵
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>

        <footer className="mt-9 flex flex-col justify-between gap-3 border-t border-slate-200 pt-5 text-[11px] text-slate-400 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2" id="about">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            东方金信 · 让数据驱动业务，让智能创造价值
          </div>
          <div className="flex items-center gap-4">
            <span>行业方案 · 产品矩阵 · 数据智能</span>
            <Link to="/" className="transition hover:text-slate-700">返回首页</Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
