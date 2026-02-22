// frontend/src/features/mindmap/constants/root_node.ts
export const ROOT_CONTENTS_MAX_LENGTH = 12;

// NodeCenter 구성(현재 Tailwind 기준)
// - 중앙 원: w-40/h-40 => 160px
// - AddNode: w-13.5 => 54px
// - gap-2 => 8px
export const ROOT_CENTER_DIAMETER = 160;
export const ADD_NODE_BUTTON_SIZE = 54;
export const NODE_CENTER_GAP = 8;

// AddNode + gap 을 “한쪽 영역”으로 본 값 (54 + 8 = 62)
export const ADD_NODE_TOTAL_W = ADD_NODE_BUTTON_SIZE + NODE_CENTER_GAP; // 62

// NodeCenter 전체 외곽(좌/우 AddNode 포함) 크기
export const ROOT_NODE_OUTER_WIDTH = ROOT_CENTER_DIAMETER + ADD_NODE_TOTAL_W * 2; // 284
export const ROOT_NODE_OUTER_HEIGHT = ROOT_CENTER_DIAMETER; // 160

/** 루트 컨텐츠 정규화: 줄바꿈 금지 + 12자 제한 */
export function normalizeRootContents(input: string): string {
    const cleaned = input.replace(/[\r\n]+/g, " "); // 줄바꿈 제거(공백 치환)
    return cleaned.slice(0, ROOT_CONTENTS_MAX_LENGTH);
}
