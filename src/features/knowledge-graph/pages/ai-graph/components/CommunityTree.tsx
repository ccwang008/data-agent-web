import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight, ChevronDown, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Community, ExtractedVertex } from "@/features/knowledge-graph/api/mock";
import type { CommunityTreeNode } from "../utils/mockClustering";
import { buildCommunityHierarchy } from "../utils/mockClustering";

interface Props {
  communities: Community[];
  vertices: ExtractedVertex[];
  selectedId: string | null;
  onSelect: (c: Community) => void;
}

export function CommunityTree({ communities, vertices, selectedId, onSelect }: Props) {
  const roots = buildCommunityHierarchy(communities);
  return (
    <div className="space-y-1">
      {roots.map((n) => <TreeNode key={n.community.id} node={n} depth={0} vertices={vertices} selectedId={selectedId} onSelect={onSelect} />)}
    </div>
  );
}

function TreeNode({ node, depth, vertices, selectedId, onSelect }: {
  node: CommunityTreeNode; depth: number; vertices: ExtractedVertex[]; selectedId: string | null; onSelect: (c: Community) => void;
}) {
  const { t } = useTranslation("knowledge-graph");
  const [open, setOpen] = useState(true);
  const hasChildren = node.children.length > 0;
  const c = node.community;
  const isSelected = selectedId === c.id;
  const centralNames = c.centralVertexIds.map(id => vertices.find(v => v.id === id)?.name).filter(Boolean).join(" · ");
  return (
    <div>
      <button type="button"
        onClick={() => onSelect(c)}
        className={cn("flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors",
          isSelected ? "bg-primary/10 text-primary" : "hover:bg-accent/30")}
        style={{ paddingLeft: 8 + depth * 16 }}>
        {hasChildren ? (
          <span onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }} className="text-muted-foreground hover:text-foreground">
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </span>
        ) : <span className="w-3.5 h-3.5" />}
        <span className="rounded border border-border px-1 py-0.5 font-mono text-[9px] text-muted-foreground shrink-0">
          {t("ai-graph.community.level")}{c.level}
        </span>
        <span className={cn("text-[12px] truncate flex-1", isSelected ? "font-medium" : "")}>{c.title}</span>
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
          <Users className="h-3 w-3" />{c.memberVertexIds.length}
        </span>
      </button>
      {isSelected && centralNames && (
        <div className="ml-9 mt-0.5 text-[10px] text-muted-foreground truncate" style={{ paddingLeft: depth * 16 }}>
          {t("ai-graph.community.central")}: {centralNames}
        </div>
      )}
      {hasChildren && open && node.children.map((cn) => (
        <TreeNode key={cn.community.id} node={cn} depth={depth + 1} vertices={vertices} selectedId={selectedId} onSelect={onSelect} />
      ))}
    </div>
  );
}
