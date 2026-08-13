// @vitest-environment jsdom

import type { RouteObject } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: {},
  getDocument: vi.fn(),
}));

import publicMenu from "../../public/menu.config.json";
import { appFeatureRoutes } from "@/app/router";
import {
  BUILTIN_MENU,
  createDefaultMenuConfig,
  normalizeMenuConfig,
  type MenuConfig,
} from "@/features/settings/menu/registry";

describe("route and menu consistency", () => {
  it("keeps every built-in menu destination backed by a feature route", () => {
    const routePaths = collectRoutePaths(appFeatureRoutes);
    const menuPaths = Object.values(BUILTIN_MENU)
      .map((entry) => entry.to)
      .filter((path): path is string => Boolean(path));

    expect(menuPaths.filter((path) => !routePaths.has(path))).toEqual([]);
  });

  it("normalizes public and stale menu configurations to the complete product menu", () => {
    const expectedKeys = collectMenuKeys(createDefaultMenuConfig());
    const normalizedPublic = normalizeMenuConfig(publicMenu as MenuConfig);
    const stale = normalizeMenuConfig({
      version: 2,
      updatedAt: "2026-06-18T00:00:00.000Z",
      root: [
        {
          id: "data-asset",
          builtinRouteKey: "data-asset",
          label: { "zh-CN": "数据资产", "en-US": "Data Assets" },
          visible: true,
          children: [
            {
              id: "data-asset.scan-tasks",
              builtinRouteKey: "data-asset.scan-tasks",
              label: { "zh-CN": "扫描任务", "en-US": "Scan Tasks" },
              visible: true,
            },
          ],
        },
      ],
    });

    expect(collectMenuKeys(normalizedPublic)).toEqual(expectedKeys);
    expect(collectMenuKeys(stale)).toEqual(expectedKeys);
  });

  it("reparents legacy data-security leaves into the new third-level groups without duplicates", () => {
    const normalized = normalizeMenuConfig({
      version: 2,
      updatedAt: "2026-08-13T00:00:00.000Z",
      root: [
        {
          id: "data-security",
          builtinRouteKey: "data-security",
          label: { "zh-CN": "数据安全", "en-US": "Data Security" },
          visible: true,
          children: [
            {
              id: "data-security.classification",
              builtinRouteKey: "data-security.classification",
              label: { "zh-CN": "分级分类", "en-US": "Classification" },
              visible: true,
            },
            {
              id: "data-security.masking",
              builtinRouteKey: "data-security.masking",
              label: { "zh-CN": "脱敏与加密", "en-US": "Masking & Encryption" },
              visible: true,
            },
          ],
        },
      ],
    });
    const security = normalized.root.find((node) => node.builtinRouteKey === "data-security");
    const directKeys = security?.children?.map((node) => node.builtinRouteKey) ?? [];
    const allKeys = collectMenuKeys(normalized);

    expect(directKeys).not.toContain("data-security.classification");
    expect(directKeys).not.toContain("data-security.masking");
    expect(allKeys.filter((key) => key === "data-security.classification")).toHaveLength(1);
    expect(allKeys.filter((key) => key === "data-security.masking")).toHaveLength(1);
  });
});

function collectRoutePaths(routes: RouteObject[], parent = ""): Set<string> {
  const paths = new Set<string>(parent === "" ? ["/"] : []);
  routes.forEach((route) => {
    const current = route.path
      ? normalizePath(parent + "/" + route.path)
      : parent || "/";
    if (route.path || route.index) paths.add(current);
    if (route.children) {
      collectRoutePaths(route.children, current).forEach((path) => paths.add(path));
    }
  });
  return paths;
}

function normalizePath(path: string) {
  return ("/" + path).replace(/\/+/g, "/").replace(/\/$/, "") || "/";
}

function collectMenuKeys(config: MenuConfig) {
  const keys: string[] = [];
  const visit = (nodes: MenuConfig["root"]) => {
    nodes.forEach((node) => {
      if (node.builtinRouteKey) keys.push(node.builtinRouteKey);
      if (node.children) visit(node.children);
    });
  };
  visit(config.root);
  return keys.sort();
}
