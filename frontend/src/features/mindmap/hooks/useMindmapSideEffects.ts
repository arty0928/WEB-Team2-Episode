import { useEffect, useRef } from "react";

import { TRANSACTION_TAG } from "@/features/mindmap/constants/transaction";
import { ROOT_NODE_ID } from "@/features/mindmap/core/YjsAdaptor";
import { useDeleteEpisodes } from "@/features/mindmap/hooks/useDeleteEpisodes";
import { useUpdateEpisodes } from "@/features/mindmap/hooks/useUpdateEpisodes";
import type { IMindmapController } from "@/features/mindmap/types/mindmapControllerType";

export function useMindmapServerSideEffects(args: {
    engine: IMindmapController | null;
    mindmapId: string | undefined;
}) {
    const { engine, mindmapId } = args;

    const unlockMut = useUpdateEpisodes();
    const deleteMut = useDeleteEpisodes();

    const editingNodesRef = useRef<Map<string, string>>(new Map());

    const canSendApi = !!mindmapId && mindmapId !== "local";

    // update
    useEffect(() => {
        if (!engine || !canSendApi) return;
        const store = engine.getStore();

        return store.subscribe("locks", () => {
            const state = store.getState();

            const currentLockedIds = state.locks.selfLockedNodeIds || [];
            const prevLockedNodesMap = editingNodesRef.current;

            const itemsToUpdate: { nodeId: string; content: string }[] = [];

            const nextLockedNodesMap = new Map<string, string>();

            for (const [id, initialContent] of prevLockedNodesMap) {
                if (!currentLockedIds.includes(id)) {
                    const node = state.graph.nodes.get(id);
                    const currentContent = node?.contents ?? "";

                    const isNotRoot = id !== ROOT_NODE_ID;
                    const isContentChanged = initialContent !== currentContent;

                    if (isNotRoot && isContentChanged) {
                        itemsToUpdate.push({
                            nodeId: id,
                            content: currentContent,
                        });
                    }
                } else {
                    nextLockedNodesMap.set(id, initialContent);
                }
            }

            currentLockedIds.forEach((id) => {
                if (!prevLockedNodesMap.has(id)) {
                    const node = state.graph.nodes.get(id);
                    nextLockedNodesMap.set(id, node?.contents ?? "");
                }
            });

            if (itemsToUpdate.length > 0) {
                unlockMut.mutate({
                    mindmapId: mindmapId,
                    body: {
                        items: itemsToUpdate,
                    },
                });
            }

            editingNodesRef.current = nextLockedNodesMap;
        });
    }, [engine, canSendApi, mindmapId, unlockMut]);

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
            const deletedIds = Array.from(
                new Set(tx.changedIds.filter((id) => id !== ROOT_NODE_ID && !nodeMap.has(id))),
            );

            if (deletedIds.length > 0) {
                deleteMut.mutate({ nodeIds: deletedIds });
            }
        });
    }, [engine, canSendApi, deleteMut]);
}
