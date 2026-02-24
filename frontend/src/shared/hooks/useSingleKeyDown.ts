import { useEffect } from "react";

const useSingleKeyDown = (keyCode: string, cb: () => void, isValid: () => boolean) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const isEditing = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

            if (e.code === keyCode && !e.ctrlKey && !e.metaKey && !e.altKey && !isEditing && isValid()) {
                e.preventDefault();
                cb();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isValid()]);
};

export default useSingleKeyDown;
