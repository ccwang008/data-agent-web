# Knowledge Center Menu Only Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restrict the sidebar and menu editor to Knowledge Center with only Knowledge Base and Analysis Reports, including when a browser contains a stale broader menu configuration.

**Architecture:** Keep routing unchanged and enforce a fixed allowlist in the menu registry's default-construction and normalization boundary. Persisted and public configurations pass through that boundary, so every source converges on one root group and two children while retaining supported labels, visibility, and relative order for allowed nodes.

**Tech Stack:** React 18, TypeScript, Zustand, Vitest, Vite

---

### Task 1: Add registry unit-test support and capture the failing behavior

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/features/settings/menu/registry.test.ts`

- [ ] **Step 1: Install Vitest and add the test command**

Run: `npm install --save-dev vitest@^2.1.9`

Add this script to `package.json`:

```json
"test": "vitest run"
```

- [ ] **Step 2: Write failing tests for defaults and stale configurations**

Create `src/features/settings/menu/registry.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  createDefaultMenuConfig,
  normalizeMenuConfig,
  type MenuConfig,
  type MenuNode,
} from "./registry";

const expectedKeys = [
  "knowledge-center.knowledge-bases",
  "knowledge-center.reports",
];

function node(key: string, children?: MenuNode[]): MenuNode {
  return {
    id: key,
    builtinRouteKey: key,
    label: { "zh-CN": key, "en-US": key },
    visible: true,
    ...(children ? { children } : {}),
  };
}

function keys(config: MenuConfig) {
  return {
    roots: config.root.map((item) => item.builtinRouteKey),
    children: config.root[0]?.children?.map((item) => item.builtinRouteKey),
  };
}

describe("knowledge-center-only menu", () => {
  it("creates only Knowledge Center with Knowledge Base and Analysis Reports", () => {
    expect(keys(createDefaultMenuConfig())).toEqual({
      roots: ["knowledge-center"],
      children: expectedKeys,
    });
  });

  it("removes disallowed entries from a stale full configuration", () => {
    const stale: MenuConfig = {
      version: 2,
      updatedAt: "2026-06-18T00:00:00.000Z",
      root: [
        node("kg", [node("kg.graphs")]),
        node("knowledge-center", [
          node("knowledge-center.documents"),
          node("knowledge-center.reports"),
          node("knowledge-center.knowledge-bases"),
          node("knowledge-center.permissions"),
        ]),
        node("settings"),
      ],
    };

    expect(keys(normalizeMenuConfig(stale))).toEqual({
      roots: ["knowledge-center"],
      children: [
        "knowledge-center.reports",
        "knowledge-center.knowledge-bases",
      ],
    });
  });

  it("restores a missing required child and preserves allowed customization", () => {
    const customizedReports = node("knowledge-center.reports");
    customizedReports.label["zh-CN"] = "数据报表";
    customizedReports.visible = false;

    const normalized = normalizeMenuConfig({
      version: 2,
      updatedAt: "2026-06-18T00:00:00.000Z",
      root: [node("knowledge-center", [customizedReports])],
    });

    expect(keys(normalized).children).toEqual([
      "knowledge-center.knowledge-bases",
      "knowledge-center.reports",
    ]);
    expect(normalized.root[0].children?.[1]).toMatchObject({
      visible: false,
      label: { "zh-CN": "数据报表" },
    });
  });
});
```

- [ ] **Step 3: Run the focused test and verify RED**

Run: `npm test -- src/features/settings/menu/registry.test.ts`

Expected: all three tests fail because the current default and normalization retain the full built-in menu.

- [ ] **Step 4: Commit the failing tests**

```bash
git add package.json package-lock.json src/features/settings/menu/registry.test.ts
git commit -m "test: cover restricted knowledge center menu"
```

### Task 2: Enforce the menu allowlist

**Files:**
- Modify: `src/features/settings/menu/registry.ts`
- Modify: `public/menu.config.json`

- [ ] **Step 1: Replace the default root and normalize through a focused restriction helper**

In `registry.ts`, keep only these Knowledge Center defaults:

```ts
const knowledgeCenterChildren: MenuNode[] = [
  builtinNode("knowledge-center.knowledge-bases"),
  builtinNode("knowledge-center.reports"),
];

const ALLOWED_KNOWLEDGE_CENTER_CHILD_KEYS = new Set(
  knowledgeCenterChildren.map((node) => node.builtinRouteKey),
);
```

Change `normalizeMenuConfig` and `createDefaultRootNodes`, then add the helper:

```ts
export function normalizeMenuConfig(config: MenuConfig): MenuConfig {
  const source = removeDeprecatedBuiltinNodes(flattenLegacySections(config.root));

  return {
    ...config,
    version: 2,
    root: restrictToKnowledgeCenterMenu(source),
  };
}

function createDefaultRootNodes(): MenuNode[] {
  return [builtinNode("knowledge-center", knowledgeCenterChildren)];
}

function restrictToKnowledgeCenterMenu(nodes: MenuNode[]): MenuNode[] {
  const defaultRoot = createDefaultRootNodes()[0];
  const existingRoot = findBuiltinNode(nodes, "knowledge-center");
  const existingChildren = collectNodes(nodes).filter(
    (node) =>
      node.builtinRouteKey &&
      ALLOWED_KNOWLEDGE_CENTER_CHILD_KEYS.has(node.builtinRouteKey),
  );
  const children = mergeMissingBuiltinNodes(
    dedupeBuiltinNodes(existingChildren),
    knowledgeCenterChildren,
  );

  return [
    {
      ...(existingRoot ?? defaultRoot),
      children,
    },
  ];
}

function collectNodes(nodes: MenuNode[]): MenuNode[] {
  return nodes.flatMap((node) => [node, ...collectNodes(node.children ?? [])]);
}

function dedupeBuiltinNodes(nodes: MenuNode[]): MenuNode[] {
  const seen = new Set<string>();

  return nodes.filter((node) => {
    if (!node.builtinRouteKey || seen.has(node.builtinRouteKey)) return false;
    seen.add(node.builtinRouteKey);
    return true;
  });
}
```

Remove now-unused default child arrays and deprecated top-level default construction references so TypeScript has no unused declarations.

- [ ] **Step 2: Replace the public default with the restricted tree**

Set `public/menu.config.json` to version 2 with one `knowledge-center` root containing only `knowledge-center.knowledge-bases` and `knowledge-center.reports`, both visible and using their existing bilingual labels.

- [ ] **Step 3: Run the focused test and verify GREEN**

Run: `npm test -- src/features/settings/menu/registry.test.ts`

Expected: 3 tests pass.

- [ ] **Step 4: Run static checks**

Run: `npm run typecheck && npm run lint`

Expected: both commands exit 0 with no warnings.

- [ ] **Step 5: Commit the implementation**

```bash
git add src/features/settings/menu/registry.ts public/menu.config.json
git commit -m "feat: restrict sidebar to knowledge center reports"
```

### Task 3: Update the source-of-truth feature specifications

**Files:**
- Modify: `specs/features/settings/requirements.md`
- Modify: `specs/features/settings/design.md`
- Modify: `specs/features/settings/tasks.md`

- [ ] **Step 1: Record the branch-specific menu requirement**

Add acceptance criterion `AC-13` stating that this branch exposes only Knowledge Center → Knowledge Base / Analysis Reports in the sidebar, while direct routes remain available.

- [ ] **Step 2: Document the normalization boundary**

Document in `design.md` that `normalizeMenuConfig` applies the fixed allowlist to defaults, persisted browser state, imported configuration, and reset behavior.

- [ ] **Step 3: Record completion work**

Add `T-settings-22` for the restricted menu, stale-cache normalization, public default update, and registry tests.

- [ ] **Step 4: Commit the specification updates**

```bash
git add specs/features/settings/requirements.md specs/features/settings/design.md specs/features/settings/tasks.md
git commit -m "docs: specify restricted knowledge center menu"
```

### Task 4: Verify the completed branch

**Files:**
- Verify only

- [ ] **Step 1: Run the complete automated verification**

Run: `npm test && npm run typecheck && npm run lint && npm run build`

Expected: tests pass and all three project checks exit 0.

- [ ] **Step 2: Inspect the final diff and branch state**

Run: `git status --short && git diff main...HEAD --stat`

Expected: clean working tree; diff contains only test support, menu restriction, public configuration, and associated specifications.

- [ ] **Step 3: Perform browser verification when available**

Start with `npm run dev`, open the app, and verify the sidebar contains one Knowledge Center group with Knowledge Base and Analysis Reports only. Seed `localStorage["data-agent.menu"]` with the former full menu, reload, and verify disallowed entries do not return.
