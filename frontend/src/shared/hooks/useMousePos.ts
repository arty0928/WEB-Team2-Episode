import { useEffect, useRef, useState } from "react";

const useMousePos = <E extends HTMLElement>() => {
    const containerRef = useRef<E>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [isInside, setIsInside] = useState(false);

    const [containerRect, setContainerRect] = useState<{
        width: number;
        height: number;
        left: number;
        top: number;
    }>({ width: 0, height: 0, left: 0, top: 0 });

    useEffect(() => {
        const updateRect = () => {
            if (containerRef.current) {
                const r = containerRef.current.getBoundingClientRect();
                setContainerRect({ width: r.width, height: r.height, left: r.left, top: r.top });
            }
        };

        updateRect();
        window.addEventListener("resize", updateRect);
        window.addEventListener("scroll", updateRect, true);

        const onMove = (e: PointerEvent) => {
            if (!containerRef.current) return;

            const rect = containerRef.current.getBoundingClientRect();

            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;

            setIsInside(inside);
            if (inside) {
                setMousePos({ x, y });
            }
        };

        window.addEventListener("pointermove", onMove);

        return () => {
            window.removeEventListener("resize", updateRect);
            window.removeEventListener("scroll", updateRect, true);
            window.removeEventListener("pointermove", onMove);
        };
    }, []);

    return {
        containerRef,
        mousePos,
        isInside,
        containerRect,
    };
};

export default useMousePos;
