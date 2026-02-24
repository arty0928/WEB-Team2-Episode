import { Rect } from "@/shared/types/rect";

export const worldToScreen = (
    containerRect: Rect,
    worldPos: { x: number; y: number },
    viewport: { x: number; y: number; scale: number },
) => {
    if (!containerRect) return null;
    return {
        x: containerRect.width / 2 + (worldPos.x - viewport.x) * viewport.scale,
        y: containerRect.height / 2 + (worldPos.y - viewport.y) * viewport.scale,
    };
};
