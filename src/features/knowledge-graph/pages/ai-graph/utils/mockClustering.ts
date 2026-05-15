import type { Community, ExtractedVertex, ExtractedEdge } from "@/features/knowledge-graph/api/mock";

export interface CommunityTreeNode {
  community: Community;
  children: CommunityTreeNode[];
}

export function buildCommunityHierarchy(communities: Community[]): CommunityTreeNode[] {
  const byId = new Map<string, CommunityTreeNode>();
  for (const c of communities) byId.set(c.id, { community: c, children: [] });
  const roots: CommunityTreeNode[] = [];
  for (const c of communities) {
    const node = byId.get(c.id)!;
    if (c.parentId && byId.has(c.parentId)) {
      byId.get(c.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  // 高层级在前
  roots.sort((a, b) => b.community.level - a.community.level);
  return roots;
}

export interface MiniGraphPosition {
  vertex: ExtractedVertex;
  x: number; y: number;
  isCentral: boolean;
}

export interface MiniGraphLayout {
  positions: MiniGraphPosition[];
  internalEdges: ExtractedEdge[];
  width: number;
  height: number;
}

/** 圆周布局：成员节点等分一圈，中心实体加 star 标记 */
export function computeCommunityLayout(
  community: Community,
  allVertices: ExtractedVertex[],
  allEdges: ExtractedEdge[],
  size = 240,
): MiniGraphLayout {
  const memberIds = new Set(community.memberVertexIds);
  const centralIds = new Set(community.centralVertexIds);
  const members = allVertices.filter(v => memberIds.has(v.id));
  const cx = size / 2;
  const cy = size / 2;
  const radius = Math.min(size, size) * 0.36;
  const positions: MiniGraphPosition[] = members.map((v, i) => {
    const angle = (i / Math.max(1, members.length)) * Math.PI * 2 - Math.PI / 2;
    return { vertex: v, x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle), isCentral: centralIds.has(v.id) };
  });
  const internalEdges = allEdges.filter(e => memberIds.has(e.sourceVertexId) && memberIds.has(e.targetVertexId));
  return { positions, internalEdges, width: size, height: size };
}
