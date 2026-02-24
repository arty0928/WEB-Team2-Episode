import type { Rect as ContainerRect } from "@/shared/types/rect";
import type { ViewportTransform, WorldPoint } from "@/shared/types/spatial";

/**
 * world 좌표: 마인드맵 내부 논리 좌표계 (노드가 저장되는 x,y), 카메라 이동/줌 영향 받지 않는 절대 좌표
 * screen 좌표: SVG 캔버스 내부 좌표 (카메라가 world를 투영한 결과)
 * client 좌표: 브라우저 뷰포트 기준 좌표 (PointerEvent.clientX/Y)
 * 카메라(viewport): world → screen/client로 변환하기 위한 transform 값
 */

/**
 * 캔버스 내부 오버레이
 */
export const worldToScreen = (
    containerRect: ContainerRect | null,
    worldPos: WorldPoint,
    viewport: ViewportTransform,
): WorldPoint | null => {
    if (!containerRect) return null;

    return {
        x: containerRect.width / 2 + (worldPos.x - viewport.x) * viewport.scale,
        y: containerRect.height / 2 + (worldPos.y - viewport.y) * viewport.scale,
    };
};

/**
 * 컨테이너 내부 좌표 → 월드 좌표
 * - worldToScreen의 역변환
 */
export const screenToWorld = (
    containerRect: ContainerRect | null,
    screenPos: WorldPoint,
    viewport: ViewportTransform,
): WorldPoint | null => {
    if (!containerRect) return null;

    return {
        x: viewport.x + (screenPos.x - containerRect.width / 2) / viewport.scale,
        y: viewport.y + (screenPos.y - containerRect.height / 2) / viewport.scale,
    };
};

/**
 * client 좌표 → 월드 좌표
 * - ViewportController의 pointer 이벤트(clientX/clientY) 변환.
 * - 사용자의 포인터 입력으로 월드에서 뭘 집었는지/ 어디로 이동하는지 계산
 */
export const clientToWorld = (
    containerRect: ContainerRect | null,
    clientPos: WorldPoint,
    viewport: ViewportTransform,
): WorldPoint | null => {
    if (!containerRect) return null;

    const screenPos: WorldPoint = {
        x: clientPos.x - containerRect.left,
        y: clientPos.y - containerRect.top,
    };

    return screenToWorld(containerRect, screenPos, viewport);
};

/**
 * 월드 좌표 → client 좌표
 * - 노드 위에 뜨는 컨텍스트 메뉴, 툴팁, 코멘트 팝업을 포탈로 띄우는 경우
 */
export const worldToClient = (
    containerRect: ContainerRect | null,
    worldPos: WorldPoint,
    viewport: ViewportTransform,
): WorldPoint | null => {
    if (!containerRect) return null;

    const screenPos = worldToScreen(containerRect, worldPos, viewport);
    if (!screenPos) return null;

    return {
        x: containerRect.left + screenPos.x,
        y: containerRect.top + screenPos.y,
    };
};
