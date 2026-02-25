import { Point, Rect } from "@/shared/types/spatial";

// 2개의 다른 Rect를 isPointInRect에서 사용하기 위함.
type AnyRect = Rect | DOMRect;

/** 특정 점이 지정된 사각형 영역 안에 포함되는지 확인 */
export const isPointInRect = (point: Pick<Point, "x" | "y">, rect: AnyRect): boolean => {
    const minX = "minX" in rect ? rect.minX : rect.left;
    const maxX = "maxX" in rect ? rect.maxX : rect.right;
    const minY = "minY" in rect ? rect.minY : rect.top;
    const maxY = "maxY" in rect ? rect.maxY : rect.bottom;

    return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY;
};

/** 두 사각형 영역이 서로 겹치는지 확인  */
export const isIntersected = (rectA: Rect, rectB: Rect): boolean => {
    return !(rectB.minX > rectA.maxX || rectB.maxX < rectA.minX || rectB.minY > rectA.maxY || rectB.maxY < rectA.minY);
};
