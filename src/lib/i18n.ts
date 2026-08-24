import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import commonEn from "@/locales/en-US/common.json";
import commonZh from "@/locales/zh-CN/common.json";

export const SUPPORTED_LOCALES = ["zh-CN", "en-US"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "zh-CN";

void i18n
  .use(initReactI18next)
  .init({
    lng: DEFAULT_LOCALE,
    resources: {
      "zh-CN": {
        common: commonZh,
      },
      "en-US": {
        common: commonEn,
      },
    },
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: SUPPORTED_LOCALES as unknown as string[],
    ns: ["common"],
    defaultNS: "common",
    interpolation: { escapeValue: false },
  });

export default i18n;
