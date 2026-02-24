import { NodeId } from "@/features/mindmap/types/node";

export type CollaboratorInfo = {
    id: string;
    name: string;
    color: string;
};

export type Collaborator = {
    clientId: number;
    user: CollaboratorInfo;
    isSelf: boolean;
};

export type CursorChat = {
    id: string; // 유니크 이벤트 id (중복 방지)
    message: string; // 1줄 메시지
    at: number; // ms timestamp
};

export type CollaboratorCursor = {
    clientId: number;
    user: CollaboratorInfo;
    cursor: CursorPos;
    chat?: CursorChat | null;
};

export type Collaborators = {
    enabled: boolean;
    selfClientId: number | null;
    participants: Collaborator[];
};

export type CollaboratorCursorsInfo = {
    enabled: boolean;
    selfClientId: number | null;
    cursors: CollaboratorCursor[];
};

export type LockState = { nodeId: NodeId; at: number } | null;

export type LockInfo = { nodeId: NodeId; clientId: number; user: CollaboratorInfo; timestamp: number };
export type LocksInfo = {
    enabled: boolean;
    selfClientId: number | null;
    selfLockedNodeId: NodeId | null;
    byNodeId: Map<NodeId, LockInfo>;
};

export type AwarenessLike = {
    clientID: number;

    getStates(): Map<number, SharedInfo | null>;
    getLocalState(): SharedInfo | null;

    setLocalState(state: SharedInfo): void;
    setLocalStateField<K extends keyof SharedInfo>(field: K, value: SharedInfo[K]): void;

    on(event: "change" | "update", cb: (args: unknown) => void): void;
    off(event: "change" | "update", cb: (args: unknown) => void): void;
};

export type CursorPos = { x: number; y: number };

export type SharedInfo = {
    user?: CollaboratorInfo;
    cursor?: CursorPos | null;
    lock?: LockState;
    chat?: CursorChat | null;
};
