# Data Agent

Frontend scaffold for an AI-native Data Agent Platform.

## Stack
- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui (new-york style, classic light SaaS palette)
- Zustand (global UI + locale stores; feature-level stores per module)
- React Router v6 (feature-composed routes)
- react-i18next (zh-CN default, en-US fallback; per-feature namespaces)
- Mock API client (`src/lib/mock-client.ts`) — swap-point for a real HTTP client

## Scripts
```bash
npm install
npm run dev          # vite dev server on :5173
npm run build        # type-check + production build
npm run preview      # preview the production build
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
```

## Layout

```
src/
  app/                  # providers, router, App
  components/
    ui/                 # shadcn primitives (button, tooltip)
    layout/             # AppShell, Sidebar, TopBar, ModulePlaceholder
  features/
    knowledge-graph/    # implemented entry
    data-source/        # TODO
    agents/             # TODO
    workflow/           # TODO
    insights/           # TODO
    settings/           # TODO
  stores/               # global Zustand stores
  lib/                  # cn(), i18n, mock-client
  locales/              # global `common` namespace (zh-CN / en-US)
  styles/globals.css    # design tokens, dark theme
```

## Adding a new feature module

1. Create `src/features/<name>/`.
2. Add `routes.tsx` exporting a `RouteObject[]`.
3. (Optional) `api/mock.ts` with `registerMockRoute(...)` calls, imported for side effects from `routes.tsx`.
4. (Optional) `store.ts` for feature-local Zustand state.
5. (Optional) `locales/{zh-CN,en-US}.json` and register the namespace in `src/lib/i18n.ts`.
6. Register the feature's routes in `src/app/router.tsx`.
7. Add a sidebar entry in `src/components/layout/Sidebar.tsx` and copy in `src/locales/*/common.json` under `nav.*`.

## Design tokens
Classic light SaaS admin palette with a blue primary accent. Tokens live in `src/styles/globals.css`; Tailwind reads them via `tailwind.config.ts`. Fonts: **Space Grotesk** (UI) + **IBM Plex Mono** (numerics/labels), loaded from Google Fonts in `index.html`.

## Mock API
```ts
import { mockClient, registerMockRoute } from "@/lib/mock-client";

registerMockRoute("GET", "/api/example", () => ({ ok: true }));

const data = await mockClient.get<{ ok: boolean }>("/api/example");
```
When backing the app with a real API, replace the `dispatch` body in `src/lib/mock-client.ts` with a real `fetch`/`axios` call.

## Status of modules
| Module           | Path                | State           |
|------------------|---------------------|-----------------|
| Knowledge Graph  | `/knowledge-graph`  | scaffolded (UI shell + mock overview) |
| Data Sources     | `/data-source`      | TODO placeholder |
| Agents           | `/agents`           | TODO placeholder |
| Workflows        | `/workflow`         | TODO placeholder |
| Insights         | `/insights`         | TODO placeholder |
| Settings         | `/settings`         | TODO placeholder |
