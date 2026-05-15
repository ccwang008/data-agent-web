# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Vite dev server on :5173
npm run build        # tsc -b && vite build (type-check + bundle)
npm run preview      # preview the production build
npm run lint         # eslint, --max-warnings 0
npm run typecheck    # tsc --noEmit
```

There is no test framework installed. Do not invent a `test` script — if testing is needed, raise it first.

## Spec-driven workflow

`specs/` is the **source of truth**, not just documentation. The repo follows a `requirements → design → tasks → code` flow:

- `specs/platform/00..06-*.md` — cross-cutting contracts (architecture, design system, i18n, mock-api, state, routing)
- `specs/features/<key>/` — per-feature `README.md` / `requirements.md` / `design.md` / `tasks.md`
- `specs/adr/NNNN-*.md` — architecture decision records; supersession is explicit, ADRs are not deleted
- `specs/_templates/` — copy these when scaffolding a new feature or ADR

Spec and code must ship in the same PR; do not land code without updating the relevant spec. When a change conflicts with an existing ADR, propose a new ADR that `Supersedes` it rather than silently changing course.

## High-level architecture

### Bootstrap
`main.tsx` → `App` → `AppProviders` (i18n + tooltip) → `RouterProvider` (`createBrowserRouter`) → `AppShell` (sidebar + topbar + `<Outlet>`) → feature page.

### Feature-composed routing
Each `src/features/<key>/routes.tsx` exports a `RouteObject[]`. `src/app/router.tsx` is the **only** place that imports feature routes and concatenates them under the root `AppShell`. Do not import feature pages from `app/router.tsx` directly — go through each feature's `routes.tsx`.

Path conventions: top-level path = feature key in kebab-case (`/knowledge-graph`, `/data-source`); nested routes live in `children`; details use `:id`; unmatched paths redirect to `/knowledge-graph`.

### Mock API as the single I/O boundary
All HTTP-like calls go through `src/lib/mock-client.ts` (`mockClient.get/post/put/patch/delete`). Features register fixtures in `src/features/<key>/api/mock.ts` via `registerMockRoute(method, path, handler)`. The mock client supports `:id`-style pattern matching and simulates latency / failure rates.

**Critical pattern — early mock registration:** `routes.tsx` performs a side-effect `import "./api/mock"` at the top so fixtures are registered before any page mounts (otherwise the first `mockClient.get` races against an empty route map). Preserve this when adding new features.

Swap to a real backend by replacing the body of `dispatch` in `mock-client.ts` — the `mockClient` shape and all call sites stay unchanged. Never call `fetch`/`axios` directly from a feature.

### Module boundaries (enforced by convention, not lint)
- Features **never import from each other**. Cross-feature code must move up to `src/components/`, `src/lib/`, or `src/stores/`.
- `src/components/ui/` (shadcn primitives) must not depend on any feature.
- Internal `components/` and `hooks/` inside a feature are private to that feature.

### State management
Zustand only, with `persist` middleware for state worth surviving reloads.

- Global stores in `src/stores/` are for app-level state only: `useUIStore` (sidebar collapsed + `sidebarExpandedKeys` tree-menu state), `useLocaleStore` (current language, kept in sync with i18next).
- Feature-local state lives in `src/features/<key>/store.ts` and **must not** be imported from another feature.
- Persistence-key convention: `data-agent.<scope>` (e.g. `data-agent.ui`, `data-agent.locale`, `data-agent.knowledge-graph`).
- Do **not** put server-fetched data in stores — use `mockClient` + local `useState`/`useEffect`. No React Query / SWR in scope.

### Sidebar tree menu is decoupled from routing
The left sidebar renders a user-customizable tree menu (`src/components/layout/Sidebar.tsx` + `src/features/settings/menu/`). Routes are owned by code (each `routes.tsx`); user menu customization (`/settings/menu`) only affects rendering — order, nesting, visibility, custom labels, custom groups. Hidden menu items are still reachable by direct URL.

When you need to navigate programmatically or render breadcrumbs / sub-navs, **always anchor on `builtinRouteKey`**, never on the user's custom label. See `specs/platform/06-routing.md` and (pending) ADR-0008.

The KG hub does **not** render its own sub-nav anymore — KG sub-pages are reached purely via the sidebar tree (KG node has 10 children).

### i18n
`react-i18next` with `zh-CN` (default) and `en-US` (fallback). Each feature owns a namespace named after the feature key, with `locales/{zh-CN,en-US}.json`. **A new namespace must be registered in `src/lib/i18n.ts`** under both locales — the file currently loads `common` and `knowledge-graph` statically; future features need to be added there.

### Design system — Classic Light SaaS
Light theme only (no dark mode). Tokens live in `src/styles/globals.css` `:root`; Tailwind reads them via `tailwind.config.ts`. Key values currently shipped: `--background 210 24% 97%`, `--primary 221 83% 53%` (blue), `--radius 0.5rem` (8px). Fonts: **Space Grotesk** (UI) + **IBM Plex Mono** (data/numerics), loaded in `index.html`.

Anti-patterns called out in the spec: purple gradients, Inter/Roboto/Arial, blanket `rounded-2xl/3xl`, feature-local color tokens, marketing-page hero treatments. Don't add color tokens inside a feature — extend `globals.css` if a new semantic role is genuinely needed.

shadcn style is `new-york` (see `components.json`); add primitives with `npx shadcn@latest add <name>` into `src/components/ui/`. Don't fork shadcn APIs — build composition wrappers in `src/components/common/` if needed.

## Adding a new feature module

1. Copy `specs/_templates/` files into `specs/features/<key>/` and fill out requirements → design → tasks.
2. Create `src/features/<key>/` with `routes.tsx` (required) + `pages/`, plus optional `api/mock.ts`, `store.ts`, `locales/{zh-CN,en-US}.json`, `components/`, `hooks/`.
3. If you added `api/mock.ts`, side-effect-import it from `routes.tsx` so fixtures register early.
4. Wire the route into `src/app/router.tsx`.
5. If you added a locale namespace, register it in `src/lib/i18n.ts` for both `zh-CN` and `en-US`.
6. Add a sidebar entry via the menu registry in `src/features/settings/menu/registry.ts` (the sidebar reads from `useMenuStore`, not from a hand-written list).
7. Update `specs/README.md` status table.

## Module status (as of current commit)

Only `knowledge-graph` is implemented (hub + 10 sub-routes: `graphs`, `metadata`, `import`, `analysis`, `visualization`, `async-tasks`, `computer`, `ai`, `ai-graph`, `admin`, `help`). The other features (`data-source`, `agents`, `workflow`, `insights`, `settings`) are placeholder shells.
