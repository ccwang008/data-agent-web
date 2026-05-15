import { Construction } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Props {
  titleKey: string;
}

export function SettingsPlaceholderPage({ titleKey }: Props) {
  const { t } = useTranslation();

  return (
    <div className="saas-panel flex min-h-[360px] flex-col items-start justify-center gap-4 p-8">
      <div className="grid h-11 w-11 place-items-center rounded-md border border-primary/20 bg-accent text-primary">
        <Construction className="h-5 w-5" />
      </div>
      <div>
        <div className="eyebrow">{t("module.todo.status")}</div>
        <h2 className="mt-1 text-[18px] font-semibold text-foreground">
          {t(titleKey)}
        </h2>
        <p className="mt-2 max-w-xl text-[13px] leading-6 text-muted-foreground">
          {t("settings.placeholder")}
        </p>
      </div>
    </div>
  );
}
