import { DEFAULT_NODE_HEIGHT, DEFAULT_NODE_WIDTH, TEMP_NEW_NODE_ID } from "@/features/mindmap/constants/node";
import { MAX_NODE_COUNT } from "@/features/mindmap/constants/node";
import { NODE_COLORS, NodeColor } from "@/features/mindmap/node/constants/colors";
import { TreeAdapter } from "@/features/mindmap/types/mindmapController";
import type {
    AddNodeDirection,
    NodeDirection,
    NodeElement,
    NodeId,
    NodeSize,
    NodeType,
} from "@/features/mindmap/types/node";
import { NodeLimitExceededError } from "@/shared/utils/errors";
import { exhaustiveCheck } from "@/utils/exhaustiveCheck";
import generateId from "@/utils/generateId";

const ROOT_NODE_PARENT_ID = "empty";
export const ROOT_NODE_ID = "root";
const DETACHED_NODE_PARENT_ID = "detached";

const ROOT_DEFAULT_COLOR: NodeColor = "violet";

function sizeByDepth(depth: number): NodeSize {
    if (depth <= 1) return "lg";
    if (depth === 2) return "md";
    return "sm";
}

type RootChildPointers = {
    firstChildIdLeft?: NodeId | null;
    lastChildIdLeft?: NodeId | null;
    firstChildIdRight?: NodeId | null;
    lastChildIdRight?: NodeId | null;
    nextColorIndex?: number; // 루트 전역 컬러 인덱스
};

type RootNodeElement = NodeElement & { type: "root" } & RootChildPointers;
type NodePatch = Partial<Omit<NodeElement, "id">> & RootChildPointers;

function isRootNode(node: NodeElement): node is RootNodeElement {
    return node.type === "root";
}

export class TreeModel {
    private presentationBootstrapped = false;

    constructor(private adapter: TreeAdapter) {
        this.bootstrapPresentation(); // (마이그레이션/초기화 1회)
    }

    get nodes(): Map<NodeId, NodeElement> {
        return this.adapter.getMap();
    }

    transact(fn: () => void, origin?: unknown) {
        this.adapter.transact(fn, origin);
    }

    getRootId(): NodeId {
        return ROOT_NODE_ID;
    }

    getRootNode(): NodeElement {
        const root = this.adapter.get(ROOT_NODE_ID);
        if (!root) throw new Error("Root node missing");
        return root;
    }

    safeGetNode(nodeId: NodeId) {
        return this.adapter.get(nodeId);
    }

    private getNode(nodeId: NodeId): NodeElement {
        const n = this.adapter.get(nodeId);
        if (!n) throw new Error(`Node not found: ${nodeId}`);
        return n;
    }

    safeGetParentNode(nodeId: NodeId) {
        const node = this.safeGetNode(nodeId);
        if (!node) return undefined;
        return this.safeGetNode(node.parentId);
    }

    getParentId(nodeId: NodeId): NodeId | undefined {
        const node = this.safeGetNode(nodeId);
        if (!node) return undefined;
        const parent = this.safeGetNode(node.parentId);
        return parent?.id;
    }

    private getFirstChildId(parent: NodeElement, side?: AddNodeDirection): NodeId | null {
        if (!isRootNode(parent)) return parent.firstChildId ?? null;
        if (side === "left") return parent.firstChildIdLeft ?? null;
        if (side === "right") return parent.firstChildIdRight ?? null;
        return parent.firstChildId ?? null;
    }

    private getLastChildId(parent: NodeElement, side?: AddNodeDirection): NodeId | null {
        if (!isRootNode(parent)) return parent.lastChildId ?? null;
        if (side === "left") return parent.lastChildIdLeft ?? null;
        if (side === "right") return parent.lastChildIdRight ?? null;
        return parent.lastChildId ?? null;
    }

    private setFirstChildId(parent: NodeElement, value: NodeId | null, side?: AddNodeDirection) {
        if (!isRootNode(parent)) {
            this.patchNode(parent.id, { firstChildId: value });
            return;
        }
        if (side === "left") this.patchNode(parent.id, { firstChildIdLeft: value });
        else if (side === "right") this.patchNode(parent.id, { firstChildIdRight: value });
        else this.patchNode(parent.id, { firstChildId: value });
    }

    private setLastChildId(parent: NodeElement, value: NodeId | null, side?: AddNodeDirection) {
        if (!isRootNode(parent)) {
            this.patchNode(parent.id, { lastChildId: value });
            return;
        }
        if (side === "left") this.patchNode(parent.id, { lastChildIdLeft: value });
        else if (side === "right") this.patchNode(parent.id, { lastChildIdRight: value });
        else this.patchNode(parent.id, { lastChildId: value });
    }

    private patchNode(nodeId: NodeId, patch: NodePatch) {
        this.adapter.update(nodeId, patch);
    }

    /** 루트 전역 컬러 시퀀스 인덱스 읽기 */
    private getRootNextColorIndex(): number {
        const root = this.getRootNode() as RootNodeElement;
        const v = root.nextColorIndex;
        if (typeof v === "number" && Number.isFinite(v) && v >= 0) return v;
        return 0;
    }

    /** 루트 전역 컬러 시퀀스 인덱스 설정 */
    private setRootNextColorIndex(next: number) {
        this.patchNode(ROOT_NODE_ID, { nextColorIndex: Math.max(0, Math.floor(next)) });
    }

    /** 1-depth 신규 컬러 할당(전역 시퀀스) */
    private allocateNextDepth1Color(): NodeColor {
        const idx = this.getRootNextColorIndex();
        const color = NODE_COLORS[idx % NODE_COLORS.length] ?? ROOT_DEFAULT_COLOR;
        this.setRootNextColorIndex(idx + 1);
        return color;
    }

    /** depth 계산 (root=0, root child=1, ...) */
    private computeDepth(nodeId: NodeId): number {
        let depth = 0;
        let cur = this.safeGetNode(nodeId);
        let guard = 0;

        while (cur && guard++ < 256) {
            if (cur.type === "root") return depth;
            depth += 1;
            cur = this.safeGetNode(cur.parentId);
        }
        return depth;
    }

    /** 컬러(없으면 기본) */
    private getEffectiveColor(node: NodeElement | undefined): NodeColor {
        return node?.color ?? ROOT_DEFAULT_COLOR;
    }

    /** 서브트리 전체에 (color + size) 규칙 적용 */
    private applyPresentationToSubtree(nodeId: NodeId, color: NodeColor, depth: number) {
        const node = this.safeGetNode(nodeId);
        if (!node) return;

        const desiredSize = sizeByDepth(depth);

        const needColor = node.color !== color;
        const needSize = node.size !== desiredSize;

        if (needColor || needSize) {
            this.patchNode(nodeId, {
                ...(needColor ? { color } : {}),
                ...(needSize ? { size: desiredSize } : {}),
            });
        }

        const children = this.getChildIds(nodeId);
        for (const cid of children) {
            this.applyPresentationToSubtree(cid, color, depth + 1);
        }
    }

    /** attach/move 이후 presentation 정합성 맞추기 */
    private reconcilePresentationAfterRelink(nodeId: NodeId, prevParentId: NodeId, nextParentId: NodeId) {
        const nextParent = this.safeGetNode(nextParentId);

        const nextDepth = nextParentId === ROOT_NODE_ID ? 1 : this.computeDepth(nextParentId) + 1;

        let nextColor: NodeColor;

        if (nextParentId === ROOT_NODE_ID) {
            const node = this.safeGetNode(nodeId);
            const wasDepth1 = prevParentId === ROOT_NODE_ID;

            if (wasDepth1) {
                // 1-depth → 1-depth 이동: 기존 컬러 유지
                nextColor = node?.color ?? this.allocateNextDepth1Color(); // (혹시 비어있으면 새로)
            } else {
                // 2+depth → 1-depth 상승: 전역 다음 컬러 새로 할당
                nextColor = this.allocateNextDepth1Color();
            }
        } else {
            // 2+depth: 부모 컬러 상속
            nextColor = this.getEffectiveColor(nextParent);
        }

        this.applyPresentationToSubtree(nodeId, nextColor, nextDepth);
    }

    /** 최초 1회: 기존 데이터(컬러/사이즈 없음)를 규칙에 맞게 보정 */
    private bootstrapPresentation() {
        if (this.presentationBootstrapped) return;
        this.presentationBootstrapped = true;

        const root = this.getRootNode() as RootNodeElement;

        const depth1Ids = this.getChildIds(ROOT_NODE_ID);

        const hasAnyDepth1Color = depth1Ids.some((id) => {
            const n = this.safeGetNode(id);
            return n?.color != null;
        });

        const rootHasIndex =
            typeof root.nextColorIndex === "number" && Number.isFinite(root.nextColorIndex) && root.nextColorIndex >= 0;

        if (!rootHasIndex) {
            // 색이 하나도 없던 구버전이면 0부터 시작, 일부라도 있으면 최소한 depth1 개수만큼은 진행시켜 둠
            this.setRootNextColorIndex(hasAnyDepth1Color ? depth1Ids.length : 0);
        }

        // root 자체는 고정 violet(안전장치)
        if (root.color !== ROOT_DEFAULT_COLOR) {
            this.patchNode(ROOT_NODE_ID, { color: ROOT_DEFAULT_COLOR });
        }
        if (root.size !== "lg") {
            this.patchNode(ROOT_NODE_ID, { size: "lg" }); //(root는 UI상 고정이지만 데이터 정합용)
        }

        // depth1부터 규칙 적용
        for (const id of depth1Ids) {
            const n = this.safeGetNode(id);
            if (!n) continue;

            const color = n.color ?? this.allocateNextDepth1Color();
            this.applyPresentationToSubtree(id, color, 1);
        }
    }

    /** 이동 작업에 사용할 노드를 확보 */
    private ensureMovingNode(
        movingNodeId: NodeId,
        initialBaseNode: NodeElement,
        addNodeDirection?: AddNodeDirection,
    ): NodeElement {
        const isTempNew = movingNodeId === TEMP_NEW_NODE_ID;
        const existingMoving = this.safeGetNode(movingNodeId);

        // 1. 유효성 검사: 존재하지도 않고 임시 노드도 아닌 경우 에러 발생
        if (!existingMoving && !isTempNew) {
            throw new Error(`[TreeModel.moveTo] Critical error: moving node not found. ID: ${movingNodeId}`);
        }

        // 2. 이동 대상 확보
        return (
            existingMoving ??
            this.generateNewNodeElement({
                contents: "",
                addNodeDirection:
                    initialBaseNode.type === "root" ? (addNodeDirection ?? "right") : initialBaseNode.addNodeDirection,
            })
        );
    }

    update(nodeId: NodeId, newNodeData: Partial<Omit<NodeElement, "id">>) {
        this.patchNode(nodeId, newNodeData);
    }

    private updateSubtreeDirection(nodeId: NodeId, direction: AddNodeDirection) {
        const traverse = (id: NodeId) => {
            const node = this.safeGetNode(id);
            if (!node) return;

            if (node.addNodeDirection !== direction) {
                this.patchNode(id, { addNodeDirection: direction });
            }

            const children = this.getChildIds(id);
            children.forEach(traverse);
        };
        traverse(nodeId);
    }

    private generateNewNodeElement({
        contents = "",
        type = "normal",
        addNodeDirection = "right",
    }: {
        contents?: string;
        type?: NodeType;
        addNodeDirection?: AddNodeDirection;
    }) {
        if (this.getNodeCount() >= MAX_NODE_COUNT) {
            throw new NodeLimitExceededError(MAX_NODE_COUNT);
        }

        const id = generateId();

        const node: NodeElement & RootChildPointers = {
            id,
            x: 0,
            y: 0,
            width: DEFAULT_NODE_WIDTH,
            height: DEFAULT_NODE_HEIGHT,
            addNodeDirection: type === "root" ? "right" : addNodeDirection,

            parentId: ROOT_NODE_PARENT_ID,
            firstChildId: null,
            lastChildId: null,
            nextId: null,
            prevId: null,

            contents,
            type,

            color: ROOT_DEFAULT_COLOR, // 초기값, 실제 값은 attach/move 후 reconcile)
            size: type === "root" ? "lg" : "sm",

            ...(type === "root"
                ? {
                      firstChildIdLeft: null,
                      lastChildIdLeft: null,
                      firstChildIdRight: null,
                      lastChildIdRight: null,
                      nextColorIndex: 0,
                  }
                : {}),
        };

        this.adapter.set(id, node);
        return node;
    }

    private attachNext(baseNode: NodeElement, movingNode: NodeElement) {
        const parentNode = this.getNode(baseNode.parentId);
        const side = parentNode.type === "root" ? baseNode.addNodeDirection : undefined;

        this.updateSubtreeDirection(movingNode.id, baseNode.addNodeDirection);

        this.patchNode(movingNode.id, {
            parentId: baseNode.parentId,
            prevId: baseNode.id,
            nextId: baseNode.nextId,
        });

        if (baseNode.nextId) {
            this.patchNode(baseNode.nextId, { prevId: movingNode.id });
        }

        this.patchNode(baseNode.id, { nextId: movingNode.id });

        if (this.getLastChildId(parentNode, side) === baseNode.id) {
            this.setLastChildId(parentNode, movingNode.id, side);
        }
    }

    private attachPrev(baseNode: NodeElement, movingNode: NodeElement) {
        const parentNode = this.getNode(baseNode.parentId);
        const side = parentNode.type === "root" ? baseNode.addNodeDirection : undefined;

        this.updateSubtreeDirection(movingNode.id, baseNode.addNodeDirection);

        this.patchNode(movingNode.id, {
            parentId: baseNode.parentId,
            nextId: baseNode.id,
            prevId: baseNode.prevId,
        });

        if (baseNode.prevId) {
            this.patchNode(baseNode.prevId, { nextId: movingNode.id });
        }

        this.patchNode(baseNode.id, { prevId: movingNode.id });

        if (this.getFirstChildId(parentNode, side) === baseNode.id) {
            this.setFirstChildId(parentNode, movingNode.id, side);
        }
    }
    private detach(node: NodeElement) {
        if (node.type === "root") throw new Error("Cannot detach root node");

        const parentNode = this.getNode(node.parentId);
        const side = parentNode.type === "root" ? node.addNodeDirection : undefined;

        if (this.getFirstChildId(parentNode, side) === node.id) {
            this.setFirstChildId(parentNode, node.nextId ?? null, side);
        }
        if (this.getLastChildId(parentNode, side) === node.id) {
            this.setLastChildId(parentNode, node.prevId ?? null, side);
        }

        if (node.prevId) this.patchNode(node.prevId, { nextId: node.nextId });
        if (node.nextId) this.patchNode(node.nextId, { prevId: node.prevId });

        this.patchNode(node.id, {
            prevId: null,
            nextId: null,
            parentId: DETACHED_NODE_PARENT_ID,
        });
    }

    appendChild(args: { parentNodeId: NodeId; childNodeId?: NodeId; addNodeDirection?: AddNodeDirection }) {
        const { parentNodeId, childNodeId, addNodeDirection } = args;

        const parentNode = this.getNode(parentNodeId);

        const childNode = childNodeId
            ? this.getNode(childNodeId)
            : this.generateNewNodeElement({
                  addNodeDirection:
                      parentNode.type === "root" ? addNodeDirection || "right" : parentNode.addNodeDirection,
              });

        const finalDir: AddNodeDirection =
            parentNode.type === "root"
                ? addNodeDirection || childNode.addNodeDirection || "right"
                : parentNode.addNodeDirection;

        this.patchNode(childNode.id, {
            parentId: parentNodeId,
        });
        this.updateSubtreeDirection(childNode.id, finalDir);

        const side = parentNode.type === "root" ? finalDir : undefined;
        const lastChildId = this.getLastChildId(parentNode, side);

        if (lastChildId) {
            this.patchNode(lastChildId, { nextId: childNode.id });
            this.patchNode(childNode.id, { prevId: lastChildId, nextId: null });
            this.setLastChildId(parentNode, childNode.id, side);
        } else {
            this.setFirstChildId(parentNode, childNode.id, side);
            this.setLastChildId(parentNode, childNode.id, side);
            this.patchNode(childNode.id, { prevId: null, nextId: null });
        }
    }

    attachTo(args: { baseNodeId: NodeId; direction: NodeDirection; addNodeDirection: AddNodeDirection }): NodeId {
        const { baseNodeId, direction, addNodeDirection } = args;

        const baseNode = this.getNode(baseNodeId);

        if (baseNode.type === "root" && direction !== "child") {
            throw new Error("Cannot add sibling to root");
        }

        const newNode = this.generateNewNodeElement({ addNodeDirection });

        switch (direction) {
            case "next":
                this.attachNext(baseNode, newNode);
                break;
            case "prev":
                this.attachPrev(baseNode, newNode);
                break;
            case "child":
                this.appendChild({ parentNodeId: baseNode.id, childNodeId: newNode.id, addNodeDirection });
                break;
            default:
                exhaustiveCheck(direction);
        }
        // attach 이후 presentation 반영
        const nextParentId = this.getNode(newNode.id).parentId;
        this.reconcilePresentationAfterRelink(newNode.id, ROOT_NODE_PARENT_ID, nextParentId);

        return newNode.id;
    }

    moveTo(args: {
        baseNodeId: NodeId;
        movingNodeId: NodeId;
        direction: NodeDirection;
        addNodeDirection?: AddNodeDirection;
    }) {
        const { baseNodeId, movingNodeId, direction, addNodeDirection } = args;

        if (baseNodeId === movingNodeId) return;

        // 1. 이동할 노드 확보
        const initialBaseNode = this.getNode(baseNodeId);
        const movingNode = this.ensureMovingNode(movingNodeId, initialBaseNode, addNodeDirection);

        const prevParentId = movingNode.parentId; //(detach 전에 저장)

        // 2. 기존 노드인 경우 순환 참조 방지 및 분리
        const isExistingNode = this.nodes.has(movingNodeId);
        if (isExistingNode) {
            const checkNodeId = direction === "child" ? initialBaseNode.id : initialBaseNode.parentId;
            let temp: NodeElement | undefined = this.safeGetNode(checkNodeId);

            while (temp) {
                if (temp.id === movingNode.id) {
                    throw new Error("Cannot move a node into its own descendant subtree.");
                }
                if (temp.type === "root") break;
                temp = this.safeGetNode(temp.parentId);
            }

            this.detach(movingNode);
        }

        const freshBaseNode = this.getNode(baseNodeId);
        const freshMovingNode = this.getNode(movingNode.id);

        switch (direction) {
            case "next":
                this.attachNext(freshBaseNode, freshMovingNode);
                break;

            case "prev":
                this.attachPrev(freshBaseNode, freshMovingNode);
                break;

            case "child":
                this.appendChild({
                    parentNodeId: freshBaseNode.id,
                    childNodeId: freshMovingNode.id,
                    addNodeDirection,
                });
                break;

            default:
                exhaustiveCheck(direction);
        }
        // move 이후 presentation 반영
        const nextParentId = this.getNode(movingNode.id).parentId;
        this.reconcilePresentationAfterRelink(movingNode.id, prevParentId, nextParentId);
    }

    getNodeCount(): number {
        const map = this.adapter.getMap();
        const total = map.size - 1;

        return total;
    }

    delete(nodeId: NodeId) {
        const node = this.getNode(nodeId);
        if (node.type === "root") throw new Error("Cannot delete root");

        const parent = this.getNode(node.parentId);
        const side = parent.type === "root" ? node.addNodeDirection : undefined;

        if (this.getFirstChildId(parent, side) === node.id) this.setFirstChildId(parent, node.nextId ?? null, side);
        if (this.getLastChildId(parent, side) === node.id) this.setLastChildId(parent, node.prevId ?? null, side);

        if (node.prevId) this.patchNode(node.prevId, { nextId: node.nextId });
        if (node.nextId) this.patchNode(node.nextId, { prevId: node.prevId });

        this.deleteTraverse(node.id);
    }

    private deleteTraverse(nodeId: NodeId) {
        const node = this.safeGetNode(nodeId);
        if (!node) return;

        const childIds = this.getChildIds(nodeId);
        for (const cid of childIds) {
            this.deleteTraverse(cid);
        }
        this.adapter.delete(nodeId);
    }

    private collectFromList(startId: NodeId | null, out: NodeId[]) {
        let cur = startId;
        const visited = new Set<NodeId>();

        while (cur) {
            if (visited.has(cur)) {
                console.error(`Circular reference detected at Node: ${cur}. Breaking loop.`);
                break;
            }

            const node = this.safeGetNode(cur);
            if (!node) break;

            visited.add(cur);
            out.push(cur);

            cur = node.nextId ?? null;
        }
    }

    getChildIds(nodeId: NodeId): NodeId[] {
        const node = this.safeGetNode(nodeId);
        if (!node) return [];

        const ids: NodeId[] = [];

        if (isRootNode(node)) {
            this.collectFromList(node.firstChildIdRight ?? null, ids);
            this.collectFromList(node.firstChildIdLeft ?? null, ids);

            if (ids.length === 0) this.collectFromList(node.firstChildId ?? null, ids);
        } else {
            this.collectFromList(node.firstChildId ?? null, ids);
        }

        return ids;
    }

    getChildNodes(parentNodeId: NodeId): NodeElement[] {
        const ids = this.getChildIds(parentNodeId);
        const out: NodeElement[] = [];
        for (const id of ids) {
            const n = this.safeGetNode(id);
            if (n) out.push(n);
        }
        return out;
    }

    getAllDescendantIds(nodeId: NodeId): Set<NodeId> {
        const out = new Set<NodeId>();
        const walk = (id: NodeId) => {
            out.add(id);
            for (const c of this.getChildIds(id)) walk(c);
        };
        walk(nodeId);
        return out;
    }
}
