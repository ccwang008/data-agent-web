# Knowledge Center Menu Only Design

## Goal

Create a dedicated branch whose sidebar exposes only the Knowledge Center group with two children: Knowledge Base and Analysis Reports. All other built-in menu entries remain routable by direct URL but are absent from the sidebar and menu-management tree.

## Chosen approach

Apply a fixed allowlist while constructing and normalizing `MenuConfig`, rather than changing only `public/menu.config.json`.

Changing only the public JSON would not be reliable because an existing `data-agent.menu` value in `localStorage` takes precedence. Enforcing the allowlist in normalization makes fresh installs, old browser caches, imported configurations, and reset-to-default behavior converge on the same two-item menu.

## Menu structure

The effective root contains one node:

- `knowledge-center`
  - `knowledge-center.knowledge-bases`
  - `knowledge-center.reports`

The existing labels and route registry entries are reused. The visible report label remains “分析报表” / “Analysis Reports”; no route is renamed.

## Components and data flow

- `src/features/settings/menu/registry.ts` owns the fixed root structure and normalization policy.
- `public/menu.config.json` mirrors the effective default configuration for fresh browsers and exported/deployed defaults.
- `useMenuStore` continues to persist the normalized result under `data-agent.menu`; its API does not change.
- `Sidebar` and `MenuManagementPage` continue consuming `useMenuStore` without special-case filtering.

At startup, persisted or public configuration enters `normalizeMenuConfig`. Normalization retains labels, visibility, and ordering for the two allowed child nodes when present, removes every disallowed node, and restores either required allowed node if it is missing.

## Error handling

If `menu.config.json` cannot be loaded or is malformed, `createDefaultMenuConfig()` produces the same restricted menu. Stale or broader browser state is safely narrowed by normalization.

## Testing and verification

Add a lightweight Node test setup and test the registry as a pure unit:

- the default configuration contains exactly the allowed tree;
- normalization removes disallowed root and child nodes from a legacy full configuration;
- normalization restores required allowed nodes when absent while preserving supported custom labels/visibility where applicable.

Run the focused tests, TypeScript checking, ESLint, and the production build. Manually inspect the sidebar only if automated browser verification is available during implementation.

## Out of scope

- Deleting routes or feature code.
- SQLite or backend persistence.
- Renaming `/knowledge-center/reports` or its existing labels.
- Adding role-based or user-specific menu permissions.
