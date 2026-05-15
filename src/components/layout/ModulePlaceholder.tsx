import { useTranslation } from "react-i18next";
import { Construction } from "lucide-react";

interface Props {
  featureKey: string;
}

export function ModulePlaceholder({ featureKey }: Props) {
  const { t } = useTranslation();
  const name = t(`nav.${featureKey}`);

  const checklist = [
    t("module.todo.checklist.api"),
    t("module.todo.checklist.store"),
    t("module.todo.checklist.pages"),
    t("module.todo.checklist.i18n"),
  ];

  return (
    <section className="page-shell flex flex-col gap-6 animate-fade-in">
      <header className="flex flex-col gap-2 border-b border-border pb-5">
        <span className="eyebrow">{t("module.todo.status")}</span>
        <h1 className="text-[22px] font-semibold text-foreground">
          {t("module.todo.title", { name })}
        </h1>
        <p className="text-[13px] text-muted-foreground">{t("module.todo.subtitle")}</p>
      </header>

      <div className="grid gap-5 md:grid-cols-[1.4fr_1fr]">
        <div className="saas-panel p-8">
          <div className="flex flex-col items-start gap-4">
            <div className="grid h-11 w-11 place-items-center rounded-md border border-primary/20 bg-accent text-primary">
              <Construction className="h-5 w-5" />
            </div>
            <div>
              <div className="eyebrow">{featureKey}</div>
              <div className="mt-1 text-[16px] font-semibold text-foreground">{name}</div>
            </div>
          </div>
        </div>

        <aside className="saas-panel p-5">
          <h2 className="eyebrow mb-4">{t("module.todo.checklist.title")}</h2>
          <ul className="space-y-3">
            {checklist.map((line, i) => (
              <li key={line} className="flex items-start gap-3 text-[13px] text-foreground">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border border-border bg-muted font-mono text-[10px] text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="leading-snug">{line}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
}
