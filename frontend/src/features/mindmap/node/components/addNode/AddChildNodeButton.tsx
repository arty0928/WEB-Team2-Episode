import type { SyntheticEvent } from "react";
import { memo, useCallback } from "react";

import { useMindmapActions } from "@/features/mindmap/hooks/useMindmapStoreState";
import AddNode from "@/features/mindmap/node/components/addNode/AddNode";
import type { NodeColor } from "@/features/mindmap/node/constants/colors";
import type { AddNodeDirection, NodeId } from "@/features/mindmap/types/node";

type Props = {
    baseId: NodeId;
    side: AddNodeDirection;
    color: NodeColor;
    className?: string;
};

function AddChildNodeButton({ baseId, side, color, className }: Props) {
    const { addNode, cancelInteraction } = useMindmapActions();

    const stop = useCallback((e: SyntheticEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handlePointerDown = useCallback(
        (e: SyntheticEvent<HTMLDivElement>) => {
            stop(e);
            cancelInteraction();
        },
        [cancelInteraction, stop],
    );

    const handleClick = useCallback(
        (e: SyntheticEvent<HTMLDivElement>) => {
            stop(e);
            addNode(baseId, "child", side);
        },
        [addNode, baseId, side, stop],
    );
    return (
        <AddNode
            direction={side}
            color={color}
            className={className}
            onPointerDown={handlePointerDown}
            onPointerUp={stop}
            onClick={handleClick}
            onDoubleClick={stop}
        />
    );
}

export default memo(AddChildNodeButton);
