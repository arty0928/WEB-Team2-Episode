import { CursorModule } from "@/features/mindmap/core/CursorModule";
import {
    AwarenessLike,
    Collaborator,
    CollaboratorCursorsInfo,
    CollaboratorInfo,
    Collaborators,
    CursorPos,
    LockInfo,
    LocksInfo,
    LockState,
} from "@/features/mindmap/types/mindmapCollaborationType";
import type { NodeId } from "@/features/mindmap/types/node";

type Deps = {
    awareness: AwarenessLike;

    getCanvasRect: () => DOMRect | null;
    screenToWorld: (clientX: number, clientY: number) => { x: number; y: number };

    commitPresence: (next: Collaborators) => void;
    commitCursors: (next: CollaboratorCursorsInfo) => void;
    commitLocks: (next: LocksInfo) => void;
};

function shallowEqualParticipants(a: Collaborator[], b: Collaborator[]) {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        const A = a[i]!;
        const B = b[i]!;
        if (
            A.clientId !== B.clientId ||
            A.isSelf !== B.isSelf ||
            A.user.id !== B.user.id ||
            A.user.name !== B.user.name ||
            A.user.color !== B.user.color
        ) {
            return false;
        }
    }
    return true;
}

function sameLockInfo(a: LockInfo, b: LockInfo) {
    const isNodeIdsEqual =
        a.nodeIds === b.nodeIds ||
        (a.nodeIds.length === b.nodeIds.length && a.nodeIds.every((id, index) => id === b.nodeIds[index]));

    return (
        isNodeIdsEqual &&
        a.clientId === b.clientId &&
        a.timestamp === b.timestamp &&
        a.user.id === b.user.id &&
        a.user.name === b.user.name &&
        a.user.color === b.user.color
    );
}

function shallowEqualLocks(a: LocksInfo, b: LocksInfo) {
    if (a === b) return true;
    if (a.enabled !== b.enabled) return false;
    if (a.selfClientId !== b.selfClientId) return false;

    if (a.byNodeId.size !== b.byNodeId.size) return false;

    for (const [nodeId, infoA] of a.byNodeId.entries()) {
        const infoB = b.byNodeId.get(nodeId);
        if (!infoB) return false;
        if (!sameLockInfo(infoA, infoB)) return false;
    }
    return true;
}
/**
 * - awareness에 local user + cursor + lock 상태를 세팅
 * - remote states 변화 감지 -> participants/cursors/locks를 분리해서 store에 반영
 * - cursor update는 rAF로 throttle
 */
export class CollaborationManager {
    private deps: Deps;
    private localUser: CollaboratorInfo;

    private cursorModule: CursorModule;
    private disposed = false;

    private lastPresence: Collaborators = { enabled: true, selfClientId: null, participants: [] };
    private lastCursors: CollaboratorCursorsInfo = { enabled: true, selfClientId: null, cursors: [] };
    private lastLocks: LocksInfo = {
        enabled: true,
        selfClientId: null,
        selfLockedNodeIds: [],
        byNodeId: new Map(),
    };

    private pendingCursor: CursorPos | null = null;
    private cursorRaf: number | null = null;

    private chatClearTimeout: ReturnType<typeof setTimeout> | null = null;

    private onAwarenessChange = (_evt: unknown) => {
        this.syncFromAwareness();
    };

    constructor(deps: Deps, user: CollaboratorInfo) {
        this.deps = deps;
        this.localUser = user;

        this.ensureLocalState();
        this.deps.awareness.setLocalStateField("user", this.localUser);
        this.cursorModule = new CursorModule({ ...this.deps }, this.localUser);
        this.deps.awareness.setLocalStateField("lock", null);

        this.deps.awareness.on("change", this.onAwarenessChange);

        this.syncFromAwareness();
    }

    destroy() {
        if (this.disposed) return;
        this.disposed = true;
        this.cursorModule.destroy();

        try {
            this.deps.awareness.setLocalStateField("chat", null);
            this.deps.awareness.setLocalStateField("cursor", null);
            this.deps.awareness.setLocalStateField("lock", null);
        } catch {
            // ignore
        }

        try {
            this.deps.awareness.off("change", this.onAwarenessChange);
        } catch {
            // ignore
        }

        if (this.cursorRaf) {
            cancelAnimationFrame(this.cursorRaf);
            this.cursorRaf = null;
        }
    }

    sendCursorChat(message: string) {
        this.cursorModule.sendCursorChat(message);
    }

    setLocks(nodeIds: NodeId[] | []) {
        this.ensureLocalState();

        const awareness = this.deps.awareness;
        const selfId = awareness.clientID;

        if (nodeIds.length === 0) {
            awareness.setLocalStateField("lock", null);

            return true;
        }

        const states = awareness.getStates();
        for (const [clientId, st] of states.entries()) {
            if (clientId === selfId) continue;

            const lock = st?.lock;
            if (lock) {
                for (const nodeId of nodeIds) {
                    if (lock.nodeIds.includes(nodeId)) {
                        return false;
                    }
                }
            }
        }

        awareness.setLocalStateField("lock", { nodeIds: [...nodeIds], at: Date.now() } satisfies Exclude<
            LockState,
            null
        >);

        return true;
    }

    setLock(nodeId: NodeId | null): boolean {
        this.ensureLocalState();

        const awareness = this.deps.awareness;
        const selfId = awareness.clientID;

        if (nodeId) {
            const states = awareness.getStates();
            for (const [clientId, st] of states.entries()) {
                if (clientId === selfId) continue;

                const lock = st?.lock;

                if (lock && lock.nodeIds.some((id) => id === nodeId)) {
                    return false;
                }
            }

            awareness.setLocalStateField("lock", { nodeIds: [nodeId], at: Date.now() } satisfies Exclude<
                LockState,
                null
            >);

            return true;
        }

        awareness.setLocalStateField("lock", null);

        return true;
    }

    private ensureLocalState() {
        const local = this.deps.awareness.getLocalState();
        if (local == null) {
            this.deps.awareness.setLocalState({});
        }
    }

    handlePointerMove(cursor: CursorPos) {
        this.cursorModule.handlePointerMove(cursor);
    }

    private syncFromAwareness() {
        if (this.disposed) return;

        const awareness = this.deps.awareness;
        const selfId = awareness.clientID;
        const states = awareness.getStates();

        const participants: Collaborator[] = [];

        const locksByNodeId = new Map<NodeId, LockInfo>();

        let desiredSelfLockNodeIds: NodeId[] = [];
        let desiredSelfLockAt = 0;

        states.forEach((state, clientId) => {
            const user = state?.user;
            if (!user) return;

            const isSelf = clientId === selfId;

            participants.push({ clientId, user, isSelf });

            const lock = state?.lock;

            if (lock && lock.nodeIds.length > 0) {
                const ts = lock.at;

                if (isSelf) {
                    desiredSelfLockNodeIds = lock.nodeIds;
                    desiredSelfLockAt = ts;
                }

                lock.nodeIds.forEach((nodeId: NodeId) => {
                    const candidate: LockInfo = {
                        nodeIds: lock.nodeIds,
                        clientId,
                        user,
                        timestamp: ts,
                    };

                    const prev = locksByNodeId.get(nodeId);

                    if (!prev) {
                        locksByNodeId.set(nodeId, candidate);
                    } else {
                        if (candidate.timestamp < prev.timestamp) {
                            locksByNodeId.set(nodeId, candidate);
                        } else if (candidate.timestamp === prev.timestamp && candidate.clientId < prev.clientId) {
                            locksByNodeId.set(nodeId, candidate);
                        }
                    }
                });
            }
        });

        let selfLockedNodeIds: NodeId[] = [];

        if (desiredSelfLockNodeIds.length > 0) {
            selfLockedNodeIds = desiredSelfLockNodeIds.filter((id) => {
                const winner = locksByNodeId.get(id);
                return winner?.clientId === selfId;
            });

            if (selfLockedNodeIds.length === 0 && desiredSelfLockAt > 0) {
                try {
                    awareness.setLocalStateField("lock", null);
                } catch {
                    // ignore
                }
            }
        }

        participants.sort((a, b) => {
            if (a.isSelf && !b.isSelf) return -1;
            if (!a.isSelf && b.isSelf) return 1;
            return a.user.name.localeCompare(b.user.name);
        });

        const nextPresence: Collaborators = { enabled: true, selfClientId: selfId, participants };

        const nextLocks: LocksInfo = {
            enabled: true,
            selfClientId: selfId,
            selfLockedNodeIds,
            byNodeId: locksByNodeId,
        };

        if (
            this.lastPresence.selfClientId !== nextPresence.selfClientId ||
            !shallowEqualParticipants(this.lastPresence.participants, nextPresence.participants)
        ) {
            this.lastPresence = nextPresence;
            this.deps.commitPresence(nextPresence);
        }

        if (!shallowEqualLocks(this.lastLocks, nextLocks)) {
            this.lastLocks = nextLocks;
            this.deps.commitLocks(nextLocks);
        }
    }
}
