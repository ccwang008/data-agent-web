import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { AlertCircle, LockKeyhole, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";

import { SettingsLayout } from "./SettingsLayout";

const SETTINGS_ACCESS_STORAGE_KEY = "data-agent.settings-access";
const PASSWORD_LINE_PATTERN = /^password:\s*(\S+)\s*$/im;

type AccessState = "authorized" | "loading" | "locked" | "loadError";

function hasStoredAuthorization() {
  try {
    return localStorage.getItem(SETTINGS_ACCESS_STORAGE_KEY) === "authorized";
  } catch {
    return false;
  }
}

function parsePassword(markdown: string) {
  return markdown.match(PASSWORD_LINE_PATTERN)?.[1] ?? null;
}

export function SettingsPasswordGate() {
  const { t } = useTranslation();
  const [accessState, setAccessState] = useState<AccessState>(() =>
    hasStoredAuthorization() ? "authorized" : "loading",
  );
  const [expectedPassword, setExpectedPassword] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [errorKey, setErrorKey] = useState<string | null>(null);

  useEffect(() => {
    if (accessState !== "loading") return;

    const controller = new AbortController();

    async function loadPassword() {
      try {
        const response = await fetch(
          `${import.meta.env.BASE_URL}settings-access.md`,
          { cache: "no-store", signal: controller.signal },
        );

        if (!response.ok) throw new Error("Unable to load settings password");

        const configuredPassword = parsePassword(await response.text());
        if (!configuredPassword) throw new Error("Invalid settings password file");

        setExpectedPassword(configuredPassword);
        setAccessState("locked");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setAccessState("loadError");
      }
    }

    void loadPassword();
    return () => controller.abort();
  }, [accessState]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password !== expectedPassword) {
      setErrorKey("settings.access.incorrect");
      return;
    }

    try {
      localStorage.setItem(SETTINGS_ACCESS_STORAGE_KEY, "authorized");
    } catch {
      // Storage can be unavailable in privacy-restricted browsers; keep this session authorized.
    }
    setAccessState("authorized");
  }

  function handleRetry() {
    setErrorKey(null);
    setExpectedPassword(null);
    setAccessState("loading");
  }

  if (accessState === "authorized") return <SettingsLayout />;

  return (
    <section className="page-shell flex min-h-[calc(100vh-96px)] items-center justify-center animate-fade-in">
      <div className="saas-panel w-full max-w-md p-6 md:p-8">
        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-accent text-primary">
          <LockKeyhole className="h-5 w-5" />
        </div>

        <div className="mt-5">
          <div className="eyebrow">{t("settings.access.eyebrow")}</div>
          <h1 className="mt-2 text-[22px] font-semibold text-foreground">
            {t("settings.access.title")}
          </h1>
          <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
            {t("settings.access.description")}
          </p>
        </div>

        {accessState === "loadError" ? (
          <div className="mt-6 rounded-md border border-destructive/30 bg-destructive/5 p-4">
            <div className="flex items-start gap-3 text-[13px] text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{t("settings.access.loadError")}</span>
            </div>
            <Button className="mt-4" variant="outline" onClick={handleRetry}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {t("settings.access.retry")}
            </Button>
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label
                className="mb-2 block text-[13px] font-medium text-foreground"
                htmlFor="settings-access-password"
              >
                {t("settings.access.label")}
              </label>
              <input
                id="settings-access-password"
                type="password"
                autoComplete="current-password"
                autoFocus
                disabled={accessState === "loading"}
                value={password}
                placeholder={t("settings.access.placeholder")}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setErrorKey(null);
                }}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <div className="min-h-5 text-[12px] text-destructive" aria-live="polite">
              {errorKey ? t(errorKey) : null}
            </div>

            <Button className="w-full" type="submit" disabled={accessState === "loading"}>
              {accessState === "loading"
                ? t("settings.access.loading")
                : t("settings.access.submit")}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}
