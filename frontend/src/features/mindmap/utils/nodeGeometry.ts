import { ROOT_CENTER_DIAMETER } from "@/features/mindmap/constants/rootNode";
import { NodeElement } from "@/features/mindmap/types/node";

// * node.width에서 AddNode 영역만큼 제외해 content 벽 좌표를 계산 */
const DEFAULT_OUTER_W = 200; // 측정 전 fallback
const DEFAULT_OUTER_H = 60;

export const ADD_NODE_TOTAL_W = 55;

export function getOuterSize(node: NodeElement) {
    if (node.type === "root") {
        return {
            w: ROOT_CENTER_DIAMETER,
            h: ROOT_CENTER_DIAMETER,
        };
    }
    return {
        w: node.width || DEFAULT_OUTER_W,
        h: node.height || DEFAULT_OUTER_H,
    };
}

/** 루트 외곽선 기준 */
export function getOuterBounds(node: NodeElement) {
    const { w, h } = getOuterSize(node);
    const halfW = w / 2;
    const halfH = h / 2;

    return {
        left: node.x - halfW,
        right: node.x + halfW,
        top: node.y - halfH,
        bottom: node.y + halfH,
    };
}

/**
 * 엣지 시작점 전용 bounds
 *  루트는 outer bounds(= x ± width/2)
 *  일반 노드는 기존처럼 content bounds(= add-node 영역 피하기) 유지
 */
export function getEdgeStartBounds(node: NodeElement) {
    return node.type === "root" ? getOuterBounds(node) : getContentBounds(node);
}

/**
 * Node.Content의 좌/우 벽을 월드 좌표로 반환
 * - root: AddNode가 양쪽
 * - normal: addNodeDirection에 따라 왼쪽/오른쪽 한쪽에만 AddNode
 */
export function getContentBounds(node: NodeElement) {
    if (node.type === "root") {
        return getOuterBounds(node);
    }

    const outer = getOuterBounds(node);

    let contentLeft = outer.left;
    let contentRight = outer.right;

    if (node.addNodeDirection === "right") {
        // AddNode가 오른쪽에 있으니 오른쪽 벽에서 제외
        contentRight = outer.right - ADD_NODE_TOTAL_W;
    } else {
        // AddNode가 왼쪽
        contentLeft = outer.left + ADD_NODE_TOTAL_W;
    }

    return {
        left: contentLeft,
        right: contentRight,
        top: outer.top,
        bottom: outer.bottom,
    };
}

/**
 * 부모-자식 edge 앵커:
 * - child가 parent 오른쪽이면 parent.right -> child.left
 * - child가 parent 왼쪽이면 parent.left -> child.right
 */
export function getParentChildEdgeAnchors(parent: NodeElement, child: NodeElement) {
    const isRight = child.x >= parent.x;

    const p = getContentBounds(parent);
    const c = getContentBounds(child);

    const start = { x: isRight ? p.right : p.left, y: parent.y };
    const end = { x: isRight ? c.left : c.right, y: child.y };

    return { start, end };
}
