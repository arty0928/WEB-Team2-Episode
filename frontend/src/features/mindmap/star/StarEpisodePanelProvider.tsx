import { createContext, useCallback, useContext, useMemo, useRef } from "react";
import { useSyncExternalStore } from "react";

import type { NodeId } from "@/features/mindmap/types/node";

type StarEpisodePanelState = {
    isOpen: boolean;
    targetNodeId: NodeId | null;
};

type Listener = () => void;

type StarEpisodePanelStore = {
    getState: () => StarEpisodePanelState;
    setState: (updater: (prev: StarEpisodePanelState) => StarEpisodePanelState) => void;
    subscribe: (listener: Listener) => () => void;
};

const createStarEpisodePanelStore = (): StarEpisodePanelStore => {
    let state: StarEpisodePanelState = { isOpen: false, targetNodeId: null };
    const listeners = new Set<Listener>();

    const getState = () => state;

    const setState = (updater: (prev: StarEpisodePanelState) => StarEpisodePanelState) => {
        const next = updater(state);
        if (next === state) return;
        state = next;
        listeners.forEach((l) => l());
    };

    const subscribe = (listener: Listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
    };

    return { getState, setState, subscribe };
};

type StarEpisodePanelActions = {
    openFromMenu: (nodeId: NodeId) => void;
    close: () => void;
    setTargetNodeId: (nodeId: NodeId) => void;
};

const StarEpisodePanelStoreContext = createContext<StarEpisodePanelStore | null>(null);
const StarEpisodePanelActionsContext = createContext<StarEpisodePanelActions | null>(null);

type Props = {
    children: React.ReactNode;
};

export function StarEpisodePanelProvider({ children }: Props) {
    const storeRef = useRef<StarEpisodePanelStore | null>(null);
    if (!storeRef.current) storeRef.current = createStarEpisodePanelStore();

    const store = storeRef.current;

    const openFromMenu = useCallback(
        (nodeId: NodeId) => {
            store.setState(() => ({ isOpen: true, targetNodeId: nodeId }));
        },
        [store],
    );

    const close = useCallback(() => {
        store.setState(() => ({ isOpen: false, targetNodeId: null }));
    }, [store]);

    // 패널 열린 상태에서만 타겟 변경 (요구사항 4)
    const setTargetNodeId = useCallback(
        (nodeId: NodeId) => {
            store.setState((prev) => {
                if (!prev.isOpen) return prev;
                if (prev.targetNodeId === nodeId) return prev;
                return { ...prev, targetNodeId: nodeId };
            });
        },
        [store],
    );

    const actions = useMemo<StarEpisodePanelActions>(
        () => ({ openFromMenu, close, setTargetNodeId }),
        [openFromMenu, close, setTargetNodeId],
    );

    return (
        <StarEpisodePanelActionsContext.Provider value={actions}>
            <StarEpisodePanelStoreContext.Provider value={store}>{children}</StarEpisodePanelStoreContext.Provider>
        </StarEpisodePanelActionsContext.Provider>
    );
}

export function useStarEpisodePanelActions() {
    const ctx = useContext(StarEpisodePanelActionsContext);
    if (!ctx) throw new Error("useStarEpisodePanelActions must be used within StarEpisodePanelProvider");
    return ctx;
}

export function useStarEpisodePanelSelector<T>(selector: (s: StarEpisodePanelState) => T): T {
    const store = useContext(StarEpisodePanelStoreContext);
    if (!store) throw new Error("useStarEpisodePanelSelector must be used within StarEpisodePanelProvider");

    const getSnapshot = () => selector(store.getState());
    return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}

export function useIsStarTargetNode(nodeId: NodeId): boolean {
    return useStarEpisodePanelSelector((s) => s.isOpen && s.targetNodeId === nodeId);
}
