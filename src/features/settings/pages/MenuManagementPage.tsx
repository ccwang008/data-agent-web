import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Download,
  Eye,
  EyeOff,
  FolderTree,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n";

import {
  BUILTIN_MENU,
  canContainChildren,
  resolveMenuLabel,
  type MenuConfig,
  type MenuNode,
} from "../menu/registry";
import { useMenuStore } from "../menu/store";

type MenuPath = number[];

interface TreeRow {
  node: MenuNode;
  path: MenuPath;
  depth: number;
  ancestorHidden: boolean;
}

export function MenuManagementPage() {
  const { t, i18n } = useTranslation();
  const config = useMenuStore((s) => s.config);
  const draft = useMenuStore((s) => s.draft);
  const beginEdit = useMenuStore((s) => s.beginEdit);
  const setDraft = useMenuStore((s) => s.setDraft);
  const commitDraft = useMenuStore((s) => s.commitDraft);
  const discardDraft = useMenuStore((s) => s.discardDraft);
  const resetToDefault = useMenuStore((s) => s.resetToDefault);
  const locale = normalizeLocale(i18n.resolvedLanguage || i18n.language);
  const activeConfig = draft ?? config;

  useEffect(() => {
    if (!draft) beginEdit();
  }, [beginEdit, draft]);

  const rows = useMemo(() => flattenTree(activeConfig.root), [activeConfig.root]);
  const hasChanges = useMemo(
    () => JSON.stringify(activeConfig.root) !== JSON.stringify(config.root),
    [activeConfig.root, config.root],
  );

  const updateDraftRoot = (root: MenuNode[]) => {
    setDraft({
      ...activeConfig,
      root,
      updatedAt: new Date().toISOString(),
    });
  };

  const updateNode = (path: MenuPath, updater: (node: MenuNode) => MenuNode) => {
    updateDraftRoot(updateNodeAtPath(activeConfig.root, path, updater));
  };

  const addCustomGroup = () => {
    const name = t("settings.menu.newGroup");
    updateDraftRoot([
      ...activeConfig.root,
      {
        id: `custom.group.${Date.now()}`,
        customGroup: true,
        visible: true,
        label: { "zh-CN": name, "en-US": "Custom group" },
        children: [],
      },
    ]);
  };

  const deleteCustomGroup = (path: MenuPath) => {
    const node = getNodeAtPath(activeConfig.root, path);
    if (!node || !isUserCustomGroup(node)) return;
    if (!window.confirm(t("settings.menu.deleteConfirm"))) return;

    const result = removeNodeAtPath(activeConfig.root, path);
    updateDraftRoot(result.root);
  };

  const resetDefault = () => {
    if (!window.confirm(t("settings.menu.resetConfirm"))) return;
    void resetToDefault();
  };

  const exportConfig = () => {
    const payload = JSON.stringify(config, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "menu.config.json";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid h-full min-h-[520px] gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="saas-panel flex min-h-0 min-w-0 flex-col overflow-hidden">
        <div className="shrink-0 flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="eyebrow">{t("settings.menu.eyebrow")}</div>
            <h2 className="mt-1 text-[18px] font-semibold text-foreground">
              {t("settings.menu.title")}
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={addCustomGroup}>
              <Plus className="h-3.5 w-3.5" />
              {t("settings.menu.addGroup")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!hasChanges}
              onClick={discardDraft}
            >
              <X className="h-3.5 w-3.5" />
              {t("actions.cancel")}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={resetDefault}>
              <RotateCcw className="h-3.5 w-3.5" />
              {t("settings.menu.reset")}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={exportConfig}>
              <Download className="h-3.5 w-3.5" />
              {t("settings.menu.export")}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!hasChanges}
              onClick={commitDraft}
            >
              <Save className="h-3.5 w-3.5" />
              {t("actions.save")}
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto scrollbar-thin">
          <div className="min-w-[880px]">
            <div className="sticky top-0 z-10 grid grid-cols-[minmax(260px,1.3fr)_160px_160px_140px_230px] gap-3 border-b border-border bg-muted px-4 py-2 text-[12px] font-semibold text-muted-foreground">
              <span>{t("settings.menu.columns.node")}</span>
              <span>{t("settings.menu.columns.zh")}</span>
              <span>{t("settings.menu.columns.en")}</span>
              <span>{t("settings.menu.columns.visible")}</span>
              <span>{t("settings.menu.columns.actions")}</span>
            </div>

            <div className="divide-y divide-border">
              {rows.map((row) => (
                <MenuEditorRow
                  key={row.node.id}
                  row={row}
                  locale={locale}
                  root={activeConfig.root}
                  onMoveUp={() => updateDraftRoot(moveWithinSiblings(activeConfig.root, row.path, -1))}
                  onMoveDown={() => updateDraftRoot(moveWithinSiblings(activeConfig.root, row.path, 1))}
                  onPromote={() => updateDraftRoot(promoteNode(activeConfig.root, row.path))}
                  onDemote={() => updateDraftRoot(demoteNode(activeConfig.root, row.path))}
                  onToggleVisible={() =>
                    updateNode(row.path, (node) => ({ ...node, visible: !node.visible }))
                  }
                  onLabelChange={(nextLocale, value) =>
                    updateNode(row.path, (node) => ({
                      ...node,
                      label: { ...node.label, [nextLocale]: value },
                    }))
                  }
                  onDelete={() => deleteCustomGroup(row.path)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <MenuPreviewPanel config={activeConfig} locale={locale} />
    </div>
  );
}

function MenuEditorRow({
  row,
  locale,
  root,
  onMoveUp,
  onMoveDown,
  onPromote,
  onDemote,
  onToggleVisible,
  onLabelChange,
  onDelete,
}: {
  row: TreeRow;
  locale: Locale;
  root: MenuNode[];
  onMoveUp: () => void;
  onMoveDown: () => void;
  onPromote: () => void;
  onDemote: () => void;
  onToggleVisible: () => void;
  onLabelChange: (locale: Locale, value: string) => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const entry = row.node.builtinRouteKey ? BUILTIN_MENU[row.node.builtinRouteKey] : undefined;
  const Icon = entry?.icon ?? FolderTree;
  const routeText = entry?.to ?? t("settings.menu.groupOnly");
  const canDelete = isUserCustomGroup(row.node);
  const canMoveUp = lastIndex(row.path) > 0;
  const canMoveDown = lastIndex(row.path) < siblingCount(root, row.path) - 1;
  const canPromoteNode = row.path.length > 1;
  const canDemoteNode = canDemote(root, row.path);
  const effectiveHidden = row.ancestorHidden || !row.node.visible;

  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(260px,1.3fr)_160px_160px_140px_230px] gap-3 px-4 py-3 text-[13px]",
        effectiveHidden && "bg-muted/25 text-muted-foreground",
      )}
    >
      <div className="flex min-w-0 items-center gap-2" style={{ paddingLeft: row.depth * 18 }}>
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <div className="truncate font-medium text-foreground">
            {resolveMenuLabel(row.node, locale)}
          </div>
          <div className="truncate text-[11px] text-muted-foreground">{routeText}</div>
        </div>
      </div>

      <input
        value={row.node.label["zh-CN"]}
        onChange={(event) => onLabelChange("zh-CN", event.target.value)}
        className="h-8 rounded-md border border-input bg-background px-2 text-[13px] outline-none focus:border-primary"
      />
      <input
        value={row.node.label["en-US"]}
        onChange={(event) => onLabelChange("en-US", event.target.value)}
        className="h-8 rounded-md border border-input bg-background px-2 text-[13px] outline-none focus:border-primary"
      />

      <button
        type="button"
        onClick={onToggleVisible}
        className={cn(
          "inline-flex h-8 w-fit items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-medium transition-colors",
          row.node.visible
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-slate-200 bg-slate-50 text-slate-600",
        )}
      >
        {row.node.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        {row.node.visible ? t("settings.menu.visible") : t("settings.menu.hidden")}
      </button>

      <div className="flex items-center gap-1">
        <IconButton label={t("settings.menu.moveUp")} disabled={!canMoveUp} onClick={onMoveUp}>
          <ArrowUp className="h-3.5 w-3.5" />
        </IconButton>
        <IconButton label={t("settings.menu.moveDown")} disabled={!canMoveDown} onClick={onMoveDown}>
          <ArrowDown className="h-3.5 w-3.5" />
        </IconButton>
        <IconButton label={t("settings.menu.promote")} disabled={!canPromoteNode} onClick={onPromote}>
          <ArrowLeft className="h-3.5 w-3.5" />
        </IconButton>
        <IconButton label={t("settings.menu.demote")} disabled={!canDemoteNode} onClick={onDemote}>
          <ArrowRight className="h-3.5 w-3.5" />
        </IconButton>
        <IconButton label={t("actions.delete")} disabled={!canDelete} onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </IconButton>
      </div>
    </div>
  );
}

function MenuPreviewPanel({ config, locale }: { config: MenuConfig; locale: Locale }) {
  const { t } = useTranslation();

  return (
    <aside className="saas-panel min-h-[420px] p-4">
      <div className="eyebrow">{t("settings.menu.preview")}</div>
      <div className="mt-3 rounded-md border border-border bg-card p-2">
        <div className="mb-3 flex h-9 items-center gap-2 border-b border-border px-1 pb-3">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-primary font-mono text-[10px] font-bold text-primary-foreground">
            DA
          </div>
          <span className="truncate text-[13px] font-semibold text-foreground">
            Data Agent
          </span>
        </div>
        <PreviewNodes nodes={config.root} locale={locale} depth={0} />
      </div>
    </aside>
  );
}

function PreviewNodes({
  nodes,
  locale,
  depth,
}: {
  nodes: MenuNode[];
  locale: Locale;
  depth: number;
}) {
  return (
    <div className={cn(depth > 0 && "ml-4 border-l border-border pl-2")}>
      {nodes.filter((node) => node.visible).map((node) => {
        const children = (node.children ?? []).filter((child) => child.visible);
        const entry = node.builtinRouteKey ? BUILTIN_MENU[node.builtinRouteKey] : undefined;
        const Icon = entry?.icon ?? FolderTree;

        return (
          <div key={node.id} className="mb-1">
            <div className="flex h-8 items-center gap-2 rounded-md px-2 text-[12px] text-muted-foreground">
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{resolveMenuLabel(node, locale)}</span>
            </div>
            {children.length ? (
              <PreviewNodes nodes={children} locale={locale} depth={depth + 1} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-primary disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function flattenTree(nodes: MenuNode[], depth = 0, parentPath: MenuPath = [], ancestorHidden = false) {
  const rows: TreeRow[] = [];

  nodes.forEach((node, index) => {
    const path = [...parentPath, index];
    rows.push({ node, path, depth, ancestorHidden });
    if (node.children?.length) {
      rows.push(...flattenTree(node.children, depth + 1, path, ancestorHidden || !node.visible));
    }
  });

  return rows;
}

function normalizeLocale(language: string): Locale {
  return language.startsWith("zh") ? "zh-CN" : language.startsWith("en") ? "en-US" : DEFAULT_LOCALE;
}

function updateNodeAtPath(
  nodes: MenuNode[],
  path: MenuPath,
  updater: (node: MenuNode) => MenuNode,
): MenuNode[] {
  const [index, ...rest] = path;

  return nodes.map((node, currentIndex) => {
    if (currentIndex !== index) return node;
    if (!rest.length) return updater(node);

    return {
      ...node,
      children: updateNodeAtPath(node.children ?? [], rest, updater),
    };
  });
}

function getNodeAtPath(nodes: MenuNode[], path: MenuPath): MenuNode | null {
  let current: MenuNode | undefined;
  let level = nodes;

  for (const index of path) {
    current = level[index];
    if (!current) return null;
    level = current.children ?? [];
  }

  return current ?? null;
}

function removeNodeAtPath(nodes: MenuNode[], path: MenuPath): { root: MenuNode[]; removed: MenuNode | null } {
  if (!path.length) return { root: nodes, removed: null };
  const [index, ...rest] = path;

  if (!rest.length) {
    const next = [...nodes];
    const [removed] = next.splice(index, 1);
    return { root: next, removed: removed ?? null };
  }

  return {
    root: nodes.map((node, currentIndex) => {
      if (currentIndex !== index) return node;
      const result = removeNodeAtPath(node.children ?? [], rest);
      return { ...node, children: result.root };
    }),
    removed: getNodeAtPath(nodes, path),
  };
}

function insertNodeAtPath(nodes: MenuNode[], parentPath: MenuPath, index: number, node: MenuNode): MenuNode[] {
  if (!parentPath.length) {
    const next = [...nodes];
    next.splice(index, 0, node);
    return next;
  }

  return updateNodeAtPath(nodes, parentPath, (parent) => {
    const children = [...(parent.children ?? [])];
    children.splice(index, 0, node);
    return { ...parent, children };
  });
}

function updateChildrenAtPath(
  nodes: MenuNode[],
  parentPath: MenuPath,
  updater: (children: MenuNode[]) => MenuNode[],
): MenuNode[] {
  if (!parentPath.length) return updater(nodes);

  return updateNodeAtPath(nodes, parentPath, (node) => ({
    ...node,
    children: updater(node.children ?? []),
  }));
}

function moveWithinSiblings(root: MenuNode[], path: MenuPath, direction: -1 | 1): MenuNode[] {
  const parentPath = path.slice(0, -1);
  const index = lastIndex(path);

  return updateChildrenAtPath(root, parentPath, (children) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= children.length) return children;
    const next = [...children];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    return next;
  });
}

function promoteNode(root: MenuNode[], path: MenuPath): MenuNode[] {
  if (path.length < 2) return root;

  const parentPath = path.slice(0, -1);
  const parentIndex = parentPath[parentPath.length - 1];
  const grandParentPath = parentPath.slice(0, -1);
  const result = removeNodeAtPath(root, path);
  if (!result.removed) return root;

  return insertNodeAtPath(result.root, grandParentPath, parentIndex + 1, result.removed);
}

function demoteNode(root: MenuNode[], path: MenuPath): MenuNode[] {
  if (!canDemote(root, path)) return root;

  const parentPath = path.slice(0, -1);
  const index = lastIndex(path);
  const previousPath = [...parentPath, index - 1];
  const result = removeNodeAtPath(root, path);
  if (!result.removed) return root;

  return updateNodeAtPath(result.root, previousPath, (node) => ({
    ...node,
    children: [...(node.children ?? []), result.removed as MenuNode],
  }));
}

function canDemote(root: MenuNode[], path: MenuPath) {
  const index = lastIndex(path);
  if (index <= 0) return false;
  const previous = getNodeAtPath(root, [...path.slice(0, -1), index - 1]);
  return Boolean(previous && canContainChildren(previous));
}

function siblingCount(root: MenuNode[], path: MenuPath) {
  const parentPath = path.slice(0, -1);
  if (!parentPath.length) return root.length;
  return getNodeAtPath(root, parentPath)?.children?.length ?? 0;
}

function lastIndex(path: MenuPath) {
  return path[path.length - 1] ?? 0;
}

function isUserCustomGroup(node: MenuNode) {
  return Boolean(node.customGroup && !node.builtinRouteKey && node.id.startsWith("custom."));
}
