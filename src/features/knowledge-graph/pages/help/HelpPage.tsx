import { useTranslation } from "react-i18next";
import { ExternalLink } from "lucide-react";


interface DocLink {
  key: string;
  title: { "zh-CN": string; "en-US": string };
  description: { "zh-CN": string; "en-US": string };
  url: string;
  category: "getting-started" | "feature" | "ecosystem" | "project";
}

const DOC_LINKS: DocLink[] = [
  { key: "quickstart",  title: { "zh-CN": "快速开始",    "en-US": "Quick Start"       }, description: { "zh-CN": "5 分钟内启动 HugeGraph 并导入第一份数据", "en-US": "Get HugeGraph running in 5 minutes" }, url: "https://hugegraph.apache.org/docs/quickstart/hugegraph-server/", category: "getting-started" },
  { key: "hubble",      title: { "zh-CN": "Hubble UI",   "en-US": "Hubble UI"          }, description: { "zh-CN": "图形化管理界面，本平台的参照来源", "en-US": "The web UI this platform is based on" }, url: "https://hugegraph.apache.org/docs/quickstart/hugegraph-hubble/", category: "getting-started" },
  { key: "metadata",    title: { "zh-CN": "元数据建模",  "en-US": "Metadata Modeling"  }, description: { "zh-CN": "VertexLabel / EdgeLabel / PropertyKey / IndexLabel 管理", "en-US": "Manage schema: labels, properties, indexes" }, url: "https://hugegraph.apache.org/docs/quickstart/hugegraph-hubble/", category: "feature" },
  { key: "loader",      title: { "zh-CN": "数据导入",    "en-US": "Data Import"        }, description: { "zh-CN": "HugeGraph-Loader 支持 CSV / JSON / JDBC / Kafka 等多源导入", "en-US": "HugeGraph-Loader: CSV, JSON, JDBC, Kafka and more" }, url: "https://hugegraph.apache.org/docs/quickstart/hugegraph-loader/", category: "feature" },
  { key: "gremlin",     title: { "zh-CN": "Gremlin 查询", "en-US": "Gremlin Query"    }, description: { "zh-CN": "Apache TinkerPop Gremlin 图遍历语言参考", "en-US": "TinkerPop Gremlin graph traversal language" }, url: "https://hugegraph.apache.org/docs/clients/gremlin-console/", category: "feature" },
  { key: "computer",    title: { "zh-CN": "图计算",      "en-US": "Graph Computer"     }, description: { "zh-CN": "OLAP 算法（PageRank / WCC / LPA 等）离线计算框架", "en-US": "OLAP algorithms: PageRank, WCC, LPA, etc." }, url: "https://hugegraph.apache.org/docs/quickstart/hugegraph-computer/", category: "ecosystem" },
  { key: "ai",          title: { "zh-CN": "图 AI",       "en-US": "Graph AI"           }, description: { "zh-CN": "NL2Gremlin / GraphRAG / KG 自动构建能力", "en-US": "NL2Gremlin, GraphRAG, Auto KG Build" }, url: "https://hugegraph.apache.org/docs/quickstart/hugegraph-ai/", category: "ecosystem" },
  { key: "github",      title: { "zh-CN": "GitHub 主页", "en-US": "GitHub"             }, description: { "zh-CN": "Apache HugeGraph 开源项目主页", "en-US": "Apache HugeGraph open-source project" }, url: "https://github.com/apache/incubator-hugegraph", category: "project" },
];

export function HelpPage() {
  const { t, i18n } = useTranslation("knowledge-graph");
  const lang = (i18n.language as "zh-CN" | "en-US") === "en-US" ? "en-US" : "zh-CN";

  const categories: DocLink["category"][] = ["getting-started", "feature", "ecosystem", "project"];

  return (
    <div className="page-shell animate-fade-in">
      {/* Attribution banner */}
      <div className="mb-6 rounded border border-primary/20 bg-primary/5 px-5 py-4">
        <p className="text-[13px] text-foreground">
          {t("help.attribution")}
          {" — "}
          <a href="https://github.com/apache/incubator-hugegraph" target="_blank" rel="noopener noreferrer"
            className="text-primary hover:underline">apache/incubator-hugegraph</a>
          {" · "}
          <a href="https://hugegraph.apache.org/" target="_blank" rel="noopener noreferrer"
            className="text-primary hover:underline">hugegraph.apache.org</a>
        </p>
      </div>

      <div className="mb-6">
        <h1 className="text-[20px] font-semibold">{t("help.title")}</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">{t("help.subtitle")}</p>
      </div>

      <div className="space-y-8">
        {categories.map((cat) => {
          const links = DOC_LINKS.filter((l) => l.category === cat);
          if (!links.length) return null;
          return (
            <div key={cat}>
              <div className="eyebrow mb-3">{t(`help.category.${cat}`)}</div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {links.map((link) => (
                  <a
                    key={link.key}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    id={link.key}
                    className="card-ticks group flex flex-col rounded border border-border bg-card p-4 hover:border-primary/40 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[13px] font-semibold text-foreground group-hover:text-primary transition-colors">
                        {link.title[lang]}
                      </span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <p className="mt-2 text-[12px] text-muted-foreground leading-relaxed">
                      {link.description[lang]}
                    </p>
                  </a>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
