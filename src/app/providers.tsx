import { type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";

import i18n from "@/lib/i18n";
import { TooltipProvider } from "@/components/ui/tooltip";

interface Props {
  children: ReactNode;
}

export function AppProviders({ children }: Props) {
  return (
    <I18nextProvider i18n={i18n}>
      <TooltipProvider delayDuration={200} skipDelayDuration={300}>
        {children}
      </TooltipProvider>
    </I18nextProvider>
  );
}
