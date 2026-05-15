import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Brain, MessageSquare, BookOpen, BarChart2, Send, Upload, ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { mockClient } from "@/lib/mock-client";

type Feature = "nl2query" | "graphrag" | "kgbuild" | "graphml";

export function AiPage() {
  const { t } = useTranslation("knowledge-graph");
  const [feature, setFeature] = useState<Feature>("nl2query");

  const tabs: { key: Feature; icon: React.ReactNode; label: string }[] = [
    { key: "nl2query",  icon: <MessageSquare className="h-4 w-4" />, label: t("ai.nl2query.title") },
    { key: "graphrag",  icon: <BookOpen className="h-4 w-4" />,      label: t("ai.graphrag.title") },
    { key: "kgbuild",   icon: <Brain className="h-4 w-4" />,         label: t("ai.kgbuild.title") },
    { key: "graphml",   icon: <BarChart2 className="h-4 w-4" />,     label: t("ai.graphml.title") },
  ];

  return (
    <div className="page-shell animate-fade-in">
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold">{t("ai.title")}</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">{t("ai.subtitle")}</p>
      </div>

      {/* Feature switcher */}
      <div className="mb-6 grid grid-cols-2 gap-2 md:grid-cols-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFeature(tab.key)}
            className={cn(
              "card-ticks flex flex-col items-start gap-2 rounded border p-4 text-left transition-all",
              feature === tab.key ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
            )}
          >
            <div className={cn(feature === tab.key ? "text-primary" : "text-muted-foreground")}>{tab.icon}</div>
            <span className={cn("text-[13px]", feature === tab.key ? "text-primary font-medium" : "text-foreground")}>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Feature panel */}
      {feature === "nl2query"  && <NL2QueryPanel />}
      {feature === "graphrag"  && <GraphRAGPanel />}
      {feature === "kgbuild"   && <KGBuildPanel />}
      {feature === "graphml"   && <GraphMLPanel />}
    </div>
  );
}

function NL2QueryPanel() {
  const { t } = useTranslation("knowledge-graph");
  const [question, setQuestion] = useState("");
  const [lang, setLang] = useState<"gremlin" | "cypher">("gremlin");
  const [result, setResult] = useState<{ query: string; rationale?: string; confidence: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const ask = async () => {
    if (!question) return;
    setLoading(true);
    try {
      const r = await mockClient.post<{ query: string; rationale?: string; confidence: number }>(
        "/api/knowledge-graph/ai/nl2query",
        { question, targetLanguage: lang, graphId: "hugegraph-demo" },
      );
      setResult(r);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex rounded border border-border overflow-hidden">
          {(["gremlin", "cypher"] as const).map((l) => (
            <button key={l} type="button" onClick={() => setLang(l)}
              className={cn("px-3 py-1 text-[12px] transition-colors", lang === l ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:text-foreground")}>
              {t(`ai.nl2query.lang.${l}`)}
            </button>
          ))}
        </div>
      </div>
      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder={t("ai.nl2query.placeholder")}
        className="w-full h-20 resize-none rounded border border-border bg-background px-4 py-3 text-[13px] outline-none focus:border-primary"
      />
      <button type="button" onClick={() => void ask()} disabled={!question || loading}
        className="flex h-8 items-center gap-2 rounded border border-primary bg-primary px-4 text-[13px] font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">
        <Send className="h-3.5 w-3.5" />{loading ? "生成中…" : t("ai.nl2query.ask")}
      </button>

      {result && (
        <div className="space-y-3">
          <div className="rounded border border-border bg-background p-4">
            <div className="eyebrow mb-2">生成的 {lang.toUpperCase()} 查询</div>
            <pre className="font-mono text-[12px] text-foreground whitespace-pre-wrap">{result.query}</pre>
            {result.rationale && <p className="mt-2 text-[11px] text-muted-foreground">{result.rationale}</p>}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[12px] text-muted-foreground">{t("ai.nl2query.confidence")}</span>
            <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-primary" style={{ width: `${result.confidence * 100}%` }} />
            </div>
            <span className="font-mono text-[12px]">{Math.round(result.confidence * 100)}%</span>
            {result.confidence < 0.5 && <span className="text-[11px] text-amber-600">置信度偏低，请人工审核</span>}
          </div>
          <button type="button" className="flex h-7 items-center gap-1.5 rounded border border-border px-3 text-[12px] text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors">
            <ArrowRight className="h-3 w-3" />{t("ai.nl2query.toAnalysis")}
          </button>
        </div>
      )}
    </div>
  );
}

function GraphRAGPanel() {
  const { t } = useTranslation("knowledge-graph");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const ask = async () => {
    if (!input) return;
    const userMsg = { role: "user" as const, content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const r = await mockClient.post<{ answer: string; citations: unknown[] }>(
        "/api/knowledge-graph/ai/ragqa",
        { question: input, contextDepth: 2, graphId: "hugegraph-demo" },
      );
      setMessages((prev) => [...prev, { role: "assistant", content: r.answer }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded border border-border bg-card overflow-hidden">
      <div className="flex flex-col h-[400px]">
        <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
          {messages.length === 0 && (
            <div className="grid h-full place-items-center text-[13px] text-muted-foreground">{t("ai.graphrag.placeholder")}</div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[80%] rounded p-3 text-[13px]",
                m.role === "user" ? "bg-primary text-primary-foreground" : "border border-border bg-background text-foreground")}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && <div className="flex justify-start"><div className="border border-border bg-background rounded p-3 text-[12px] text-muted-foreground">思考中…</div></div>}
        </div>
        <div className="flex items-center gap-2 border-t border-border p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void ask(); } }}
            placeholder={t("ai.graphrag.placeholder")}
            className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
          />
          <button type="button" onClick={() => void ask()} disabled={!input || loading}
            className="flex h-7 items-center gap-1.5 rounded border border-primary bg-primary px-3 text-[12px] text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">
            <Send className="h-3.5 w-3.5" />{t("ai.graphrag.ask")}
          </button>
        </div>
      </div>
    </div>
  );
}

function KGBuildPanel() {
  const { t } = useTranslation("knowledge-graph");
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<{ extractedVertices: Array<{ label: string; name: string; properties: Record<string, unknown> }>; extractedEdges: Array<{ sourceName: string; targetName: string; label: string }> } | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const extract = async () => {
    if (!text) return;
    setLoading(true);
    try {
      const r = await mockClient.post<typeof preview>("/api/knowledge-graph/ai/kg-build/preview", { text, graphId: "hugegraph-demo" });
      setPreview(r);
    } finally {
      setLoading(false);
    }
  };

  const commit = async () => {
    await mockClient.post("/api/knowledge-graph/ai/kg-build/commit", { graphId: "hugegraph-demo", text });
    setSubmitted(true);
  };

  return (
    <div className="space-y-4">
      <div className="rounded border border-border bg-card p-5">
        <div className="eyebrow mb-3">{t("ai.kgbuild.upload")}</div>
        <div className="rounded border border-dashed border-border bg-background p-4 text-center">
          <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-[13px] text-muted-foreground">或直接粘贴文本</p>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="粘贴要抽取的文本内容…"
          className="mt-3 w-full h-28 resize-none rounded border border-border bg-background px-4 py-3 text-[13px] outline-none focus:border-primary"
        />
        <button type="button" onClick={() => void extract()} disabled={!text || loading}
          className="mt-3 flex h-8 items-center gap-2 rounded border border-primary bg-primary px-4 text-[13px] font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
          {loading ? "抽取中…" : "开始抽取"}
        </button>
      </div>

      {preview && !submitted && (
        <div className="rounded border border-border bg-card p-5 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="eyebrow mb-2">{t("ai.kgbuild.extractedV")} ({preview.extractedVertices.length})</div>
              <div className="space-y-1">
                {preview.extractedVertices.map((v, i) => (
                  <div key={i} className="flex items-center gap-2 text-[12px]">
                    <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{v.label}</span>
                    <span>{v.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="eyebrow mb-2">{t("ai.kgbuild.extractedE")} ({preview.extractedEdges.length})</div>
              <div className="space-y-1">
                {preview.extractedEdges.map((e, i) => (
                  <div key={i} className="text-[12px] text-muted-foreground">
                    {e.sourceName} <span className="text-primary">—{e.label}→</span> {e.targetName}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <button type="button" onClick={() => void commit()}
            className="flex h-8 items-center gap-2 rounded border border-primary bg-primary px-4 text-[13px] font-medium text-primary-foreground hover:opacity-90">
            {t("ai.kgbuild.commit")}
          </button>
        </div>
      )}
      {submitted && (
        <div className="rounded border border-emerald-500/30 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-700">
          KG 构建任务已提交，前往「异步任务」查看进度
        </div>
      )}
    </div>
  );
}

function GraphMLPanel() {
  const { t } = useTranslation("knowledge-graph");
  const models = [
    { key: "gcn", family: "embedding", description: "图卷积网络 (GCN)" },
    { key: "gat", family: "embedding", description: "图注意力网络 (GAT)" },
    { key: "graphsage", family: "embedding", description: "GraphSAGE 归纳式" },
    { key: "node-cls", family: "node-classification", description: "节点分类" },
    { key: "link-pred", family: "link-prediction", description: "链路预测" },
  ];
  const families = ["embedding", "node-classification", "link-prediction"];
  return (
    <div className="space-y-6">
      {families.map((fam) => (
        <div key={fam}>
          <div className="eyebrow mb-3">{t(`ai.graphml.family.${fam}`)}</div>
          <div className="grid gap-3 md:grid-cols-3">
            {models.filter((m) => m.family === fam).map((m) => (
              <article key={m.key} className="card-ticks rounded border border-border bg-card p-4">
                <div className="text-[13px] font-medium">{m.description}</div>
                <button type="button" className="mt-4 flex h-7 w-full items-center justify-center rounded border border-primary bg-primary text-[12px] font-medium text-primary-foreground hover:opacity-90 transition-opacity">
                  {t("ai.graphml.train")}
                </button>
              </article>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
