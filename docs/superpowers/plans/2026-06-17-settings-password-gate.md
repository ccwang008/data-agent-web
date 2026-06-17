# Settings Password Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require the configured Markdown password before rendering any `/settings/*` route and remember successful access across browser restarts.

**Architecture:** A focused `SettingsPasswordGate` component owns Markdown loading, parsing, validation, persistence, and locked/error UI. The settings route renders this gate at its shared parent so Sidebar and direct URL navigation follow the same path; existing `SettingsLayout` and child routes remain unchanged.

**Tech Stack:** React 18, React Router 6, react-i18next, Vite static assets, browser `fetch` and `localStorage`, Tailwind CSS.

---

### Task 1: Add the Markdown credential source

**Files:**
- Create: `public/settings-access.md`

- [ ] **Step 1: Create the credential file**

Create a Markdown file with exactly one `password:` field and the user-approved value. The value is intentionally not repeated in this plan because the runtime Markdown file must be its only source.

- [ ] **Step 2: Confirm the single-source constraint**

Run: `credential=$(sed -n 's/^password:[[:space:]]*//p' public/settings-access.md); rg -n -F "$credential" src specs docs`

Expected: no matches.

### Task 2: Implement the shared settings gate

**Files:**
- Create: `src/features/settings/pages/SettingsPasswordGate.tsx`

- [ ] **Step 1: Add parsing and persistent authorization**

Implement these module-level constants and helper:

```tsx
const SETTINGS_ACCESS_STORAGE_KEY = "data-agent.settings-access";
const PASSWORD_LINE_PATTERN = /^password:\s*(\S+)\s*$/im;

function parsePassword(markdown: string): string | null {
  return markdown.match(PASSWORD_LINE_PATTERN)?.[1] ?? null;
}
```

Initialize authorization from `localStorage`. When locked, load `${import.meta.env.BASE_URL}settings-access.md`, reject non-OK responses and malformed content, and expose a retry action.

- [ ] **Step 2: Add the gate form and transitions**

Render `<SettingsLayout />` only when authorized. Otherwise render a centered card containing a labeled `type="password"` input, submit button, loading state, and `aria-live="polite"` error region. Wrong input stays locked; correct input writes `"authorized"` to the storage key and renders the requested route in place.

### Task 3: Wire the route and translations

**Files:**
- Modify: `src/features/settings/routes.tsx`
- Modify: `src/locales/zh-CN/common.json`
- Modify: `src/locales/en-US/common.json`

- [ ] **Step 1: Route all settings pages through the gate**

Replace the parent route element import and usage:

```tsx
import { SettingsPasswordGate } from "./pages/SettingsPasswordGate";

// /settings route
element: <SettingsPasswordGate />,
```

Keep every existing child route unchanged.

- [ ] **Step 2: Add password-free UI translations**

Add `settings.access` keys for eyebrow, title, description, label, placeholder, submit, loading, incorrect password, load error, and retry in both locale files. No translation value may reveal the credential.

### Task 4: Verify behavior and update task tracking

**Files:**
- Modify: `specs/features/settings/tasks.md`

- [ ] **Step 1: Run static verification**

Run: `npm run typecheck && npm run lint && npm run build`

Expected: all commands exit 0 with no warnings or errors.

- [ ] **Step 2: Run the credential leak scan**

Run `rg` for the approved password while excluding `public/settings-access.md` and `.git`.

Expected: no matches.

- [ ] **Step 3: Verify browser paths**

Check locked direct access to `/settings/preferences`, incorrect password feedback, successful access without URL replacement, refresh persistence, browser restart persistence, and a recoverable error after making the Markdown request unavailable.

- [ ] **Step 4: Mark completed settings tasks**

Mark `T-settings-18` through `T-settings-21` complete only after all verification steps pass.
