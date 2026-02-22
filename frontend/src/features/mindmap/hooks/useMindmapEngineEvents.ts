import { useEffect } from "react";

import { useMindmapControllerContext } from "@/features/mindmap/core/MindmapProvider";

export function useMindmapControllerEvents() {
    const engine = useMindmapControllerContext();

    useEffect(() => {
        const svg = engine.getCanvas();
        if (!svg) return;

        const onWheel = (e: WheelEvent) => engine.input.wheel(e);
        const onContextMenu = (e: MouseEvent) => e.preventDefault();

        const onPointerDown = (e: MouseEvent) => engine.input.pointerDown(e);
        const onPointerMove = (e: MouseEvent) => engine.input.pointerMove(e);
        const onPointerUp = (e: MouseEvent) => engine.input.pointerUp(e);
        const onPointerLeave = (e: MouseEvent) => engine.input.pointerUp(e);

        const onKeyDown = (e: KeyboardEvent) => engine.input.keyDown(e);

        const onDblClick = (e: MouseEvent) => engine.input.doubleClick(e);

        svg.addEventListener("wheel", onWheel, { passive: false });
        svg.addEventListener("contextmenu", onContextMenu);
        svg.addEventListener("pointerdown", onPointerDown);
        svg.addEventListener("dblclick", onDblClick);

        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
        window.addEventListener("pointerleave", onPointerLeave);
        window.addEventListener("keydown", onKeyDown);

        return () => {
            svg.removeEventListener("wheel", onWheel);
            svg.removeEventListener("contextmenu", onContextMenu);
            svg.removeEventListener("pointerdown", onPointerDown);
            svg.removeEventListener("dblclick", onDblClick);

            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", onPointerUp);
            window.removeEventListener("pointerleave", onPointerLeave);
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [engine]);
}
