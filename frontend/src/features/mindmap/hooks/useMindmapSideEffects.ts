import { useEffect, useRef } from "react";

import { TRANSACTION_TAG } from "@/features/mindmap/constants/transaction";
import { useDeleteEpisodes } from "@/features/mindmap/hooks/useDeleteEpisodes";
import { useUpdateEpisodes } from "@/features/mindmap/hooks/useUpdateEpisodes";
import type { IMindmapController } from "@/features/mindmap/types/mindmap_controller";

export function useMindmapServerSideEffects(args: {
    engine: IMindmapController | null;
    mindmapId: string | undefined;
}) {
    const { engine, mindmapId } = args;

    const unlockMut = useUpdateEpisodes();
    const deleteMut = useDeleteEpisodes();

    //n노드의 락 시작 시점
    const editingNodeRef = useRef<{ id: string; content: string } | null>(null);

    const canSendApi = !!mindmapId && mindmapId !== "local";

    // update
    useEffect(() => {
        if (!engine || !canSendApi) return;
        const store = engine.getStore();

        return store.subscribe("locks", () => {
            const state = store.getState();
            const currentLockedId = state.locks.selfLockedNodeId;
            const prevEditing = editingNodeRef.current;

            if (prevEditing?.id === currentLockedId) return;

            if (prevEditing) {
                const node = state.graph.nodes.get(prevEditing.id);
                const currentContent = node?.contents ?? "";

                if (prevEditing.content !== currentContent) {
                    unlockMut.mutate({
                        mindmapId: mindmapId,
                        body: {
                            items: [
                                {
                                    nodeId: prevEditing.id,
                                    content: currentContent,
                                },
                            ],
                        },
                    });
                }
            }

            if (currentLockedId) {
                const newNode = state.graph.nodes.get(currentLockedId);
                editingNodeRef.current = { id: currentLockedId, content: newNode?.contents ?? "" };
            } else {
                editingNodeRef.current = null;
            }
        });
    }, [engine, canSendApi, mindmapId, unlockMut]);

    // deletw
    useEffect(() => {
        if (!engine || !canSendApi) return;
        const store = engine.getStore();

        return store.subscribe("transaction", () => {
            const state = store.getState();
            const tx = state.transaction;

            if (!tx) return;

            const isLocalDeleteTx =
                tx.local && tx.tag === TRANSACTION_TAG.MINDMAP_COMMAND && tx.cmdType === "NODE/DELETE";

            if (!isLocalDeleteTx) return;

            const nodeMap = state.graph.nodes;
            const deletedIds = Array.from(new Set(tx.changedIds.filter((id) => !nodeMap.has(id))));

            if (deletedIds.length > 0) {
                deleteMut.mutate({ nodeIds: deletedIds });
            }
        });
    }, [engine, canSendApi, deleteMut]);
}
