import { DEFAULT_NODE_HEIGHT, DEFAULT_NODE_WIDTH } from "@/features/mindmap/constants/node";
import type { BaseNodeInfo } from "@/features/mindmap/types/mindmapInteraction";
import type { AddNodeDirection, NodeElement, NodeId } from "@/features/mindmap/types/node";
import type { Rect, SpatialPoint, SpatialStats, WorldPoint } from "@/shared/types/spatial";
import { isIntersected } from "@/shared/utils/rectHelper";

const NEAR_RADIUS_SCREEN = 200;

type Deps = {
    screenToWorld: (x: number, y: number) => WorldPoint;

    querySpatialPointsInRange: (range: Rect) => Array<SpatialPoint>;
    getSpatialStats: () => SpatialStats;

    getRootNode: () => NodeElement;
    safeGetNode: (nodeId: NodeId) => NodeElement | undefined;
    getChildNodes: (nodeId: NodeId) => NodeElement[];

    excludedIds: Set<NodeId> | null;
};

type Args = Deps & {
    clientX: number;
    clientY: number;
    mouseWorld: WorldPoint;
};

function getNodeSize(node: NodeElement) {
    const w = typeof node.width === "number" && node.width > 0 ? node.width : DEFAULT_NODE_WIDTH;
    const h = typeof node.height === "number" && node.height > 0 ? node.height : DEFAULT_NODE_HEIGHT;
    return { w, h };
}

function getNodeRect(node: NodeElement): Rect {
    const { w, h } = getNodeSize(node);
    return {
        minX: node.x - w / 2,
        maxX: node.x + w / 2,
        minY: node.y - h / 2,
        maxY: node.y + h / 2,
    };
}

function calcNearRectWorld(
    clientX: number,
    clientY: number,
    screenToWorld: (x: number, y: number) => WorldPoint,
): Rect {
    const p1 = screenToWorld(clientX - NEAR_RADIUS_SCREEN, clientY - NEAR_RADIUS_SCREEN);
    const p2 = screenToWorld(clientX + NEAR_RADIUS_SCREEN, clientY + NEAR_RADIUS_SCREEN);

    return {
        minX: Math.min(p1.x, p2.x),
        maxX: Math.max(p1.x, p2.x),
        minY: Math.min(p1.y, p2.y),
        maxY: Math.max(p1.y, p2.y),
    };
}

function expandRectForQuery(nearRectWorld: Rect, stats: SpatialStats): Rect {
    return {
        minX: nearRectWorld.minX - stats.maxHalfW,
        maxX: nearRectWorld.maxX + stats.maxHalfW,
        minY: nearRectWorld.minY - stats.maxHalfH,
        maxY: nearRectWorld.maxY + stats.maxHalfH,
    };
}

function pointToRectDistanceSquared(p: WorldPoint, r: Rect): number {
    const dx = p.x < r.minX ? r.minX - p.x : p.x > r.maxX ? p.x - r.maxX : 0;
    const dy = p.y < r.minY ? r.minY - p.y : p.y > r.maxY ? p.y - r.maxY : 0;
    return dx * dx + dy * dy;
}

function resolveSide(root: NodeElement, nearest: NodeElement, mouseWorld: WorldPoint): AddNodeDirection {
    if (nearest.type === "root") {
        return mouseWorld.x < root.x ? "left" : "right";
    }
    return nearest.addNodeDirection;
}

function resolveBaseParent(
    root: NodeElement,
    nearest: NodeElement,
    mouseWorld: WorldPoint,
    safeGetNode: Deps["safeGetNode"],
) {
    if (nearest.type === "root") return nearest;

    const { w } = getNodeSize(nearest);
    const side = nearest.addNodeDirection;

    const isChildIntent = side === "right" ? mouseWorld.x > nearest.x + w / 2 : mouseWorld.x < nearest.x - w / 2;

    if (isChildIntent) return nearest;

    const parent = nearest.parentId ? safeGetNode(nearest.parentId) : undefined;
    return parent ?? root;
}

function sortByYThenId(a: NodeElement, b: NodeElement) {
    if (a.y !== b.y) return a.y - b.y;
    return String(a.id).localeCompare(b.id);
}

export function resolveDropBaseNode(args: Args): BaseNodeInfo {
    const empty: BaseNodeInfo = { targetId: null, direction: null, side: null };

    const nearRectWorld = calcNearRectWorld(args.clientX, args.clientY, args.screenToWorld);
    const stats = args.getSpatialStats();
    const queryRectWorld = expandRectForQuery(nearRectWorld, stats);

    const candidatePoints = args.querySpatialPointsInRange(queryRectWorld);
    if (candidatePoints.length === 0) return empty;

    const excluded = args.excludedIds;

    const candidates: Array<{ node: NodeElement; rect: Rect }> = [];

    for (const p of candidatePoints) {
        if (excluded && excluded.has(p.id)) continue;

        const node = args.safeGetNode(p.id);
        if (!node) continue;

        const rect = getNodeRect(node);

        if (!isIntersected(rect, nearRectWorld)) continue;

        candidates.push({ node, rect });
    }

    if (candidates.length === 0) return empty;

    // nearest 선정: B 거리(점↔사각형 최단거리), 타이브레이커 yDist, id
    let best = candidates[0]!;
    let bestDist2 = pointToRectDistanceSquared(args.mouseWorld, best.rect);
    let bestYDist = Math.abs(args.mouseWorld.y - best.node.y);

    for (let i = 1; i < candidates.length; i++) {
        const c = candidates[i]!;
        const d2 = pointToRectDistanceSquared(args.mouseWorld, c.rect);
        if (d2 < bestDist2) {
            best = c;
            bestDist2 = d2;
            bestYDist = Math.abs(args.mouseWorld.y - c.node.y);
            continue;
        }

        if (d2 === bestDist2) {
            const yDist = Math.abs(args.mouseWorld.y - c.node.y);
            if (yDist < bestYDist) {
                best = c;
                bestDist2 = d2;
                bestYDist = yDist;
                continue;
            }

            if (yDist === bestYDist) {
                const aId = best.node.id;
                const bId = c.node.id;
                if (bId.localeCompare(aId) < 0) {
                    best = c;
                    bestDist2 = d2;
                    bestYDist = yDist;
                }
            }
        }
    }

    const nearest = best.node;
    const root = args.getRootNode();
    const side = resolveSide(root, nearest, args.mouseWorld);

    const baseParent = resolveBaseParent(root, nearest, args.mouseWorld, args.safeGetNode);

    let children = args.getChildNodes(baseParent.id);

    if (baseParent.type === "root") {
        children = children.filter((c) => c.addNodeDirection === side);
    }

    if (excluded) {
        children = children.filter((c) => !excluded.has(c.id));
    }

    if (children.length === 0) {
        return { targetId: baseParent.id, direction: "child", side };
    }

    const ordered = [...children].sort(sortByYThenId);

    let insertIndex = -1;
    for (let i = 0; i < ordered.length; i++) {
        if (args.mouseWorld.y < ordered[i]!.y) {
            insertIndex = i;
            break;
        }
    }
    if (insertIndex === -1) insertIndex = ordered.length;

    if (insertIndex <= 0) {
        return { targetId: ordered[0]!.id, direction: "prev", side };
    }

    if (insertIndex >= ordered.length) {
        return { targetId: ordered[ordered.length - 1]!.id, direction: "next", side };
    }

    const A = ordered[insertIndex - 1]!;
    const B = ordered[insertIndex]!;
    const dA = Math.abs(args.mouseWorld.y - A.y);
    const dB = Math.abs(B.y - args.mouseWorld.y);

    if (dA <= dB) {
        return { targetId: A.id, direction: "next", side };
    }
    return { targetId: B.id, direction: "prev", side };
}
