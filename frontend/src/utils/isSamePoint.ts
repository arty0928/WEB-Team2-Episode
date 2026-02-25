export const isSamePoint = (a: { x: number; y: number } | null, b: { x: number; y: number } | null) => {
    if (a === b) {
        return true;
    }
    if (!a || !b) {
        return false;
    }

    return a.x === b.x && a.y === b.y;
};
