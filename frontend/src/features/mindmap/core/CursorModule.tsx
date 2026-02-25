import { CURSOR_CHAT_THROTTLE_MS, CURSOR_PRESENCE_FPS_MIN } from "@/features/mindmap/constants/collaboration";
import { CURSOR_CHAT_STRING_MAX_LEN, CURSOR_CHAT_TTL_MS } from "@/features/mindmap/constants/cursorChat";
import {
    AwarenessLike,
    CollaboratorCursor,
    CollaboratorCursorsInfo,
    CollaboratorInfo,
    CursorChat,
    CursorPos,
} from "@/features/mindmap/types/mindmapCollaborationType";
import generateId from "@/utils/generateId";
import { isSamePoint } from "@/utils/isSamePoint";
import { isPointInRect } from "@/utils/rectHelper";

export interface CursorModuleDeps {
    awareness: AwarenessLike;

    getCanvasRect: () => DOMRect | null;
    screenToWorld: (clientX: number, clientY: number) => { x: number; y: number };

    commitCursors: (next: CollaboratorCursorsInfo) => void;
}

export class CursorModule {
    private deps: CursorModuleDeps;
    private localUser: CollaboratorInfo;
    private disposed = false;

    private pendingCursor: CursorPos | null = null;
    private pendingChatMessage: string | null = null;

    private lastSentCursor: CursorPos | null = null;
    private isCursorDirty: boolean = false;

    private cursorTargetFps = CURSOR_PRESENCE_FPS_MIN;
    private cursorIntervalMs = 1000 / CURSOR_PRESENCE_FPS_MIN;

    private lastCursorSentTime = 0;
    private lastCursorChatSentTime = 0;

    private cursorTimer: ReturnType<typeof setTimeout> | null = null;
    private cursorChatTimer: ReturnType<typeof setTimeout> | null = null;

    private cursorChatTimeoutId: ReturnType<typeof setTimeout> | null = null;

    constructor(deps: CursorModuleDeps, localUser: CollaboratorInfo) {
        this.deps = deps;
        this.localUser = localUser;

        this.deps.awareness.setLocalStateField("user", this.localUser);
        this.deps.awareness.setLocalStateField("cursor", null);
        this.deps.awareness.setLocalStateField("chat", null);

        this.deps.awareness.on("change", this.onAwarenessChange);
    }

    // 실제 커서 좌표가 변했는지 아닌지를 체크합니다.
    private updateCursorDirty() {
        this.isCursorDirty = !isSamePoint(this.pendingCursor, this.lastSentCursor);
    }

    private setCursor(cursor: CursorPos) {
        this.pendingCursor = cursor;
        this.updateCursorDirty();
        this.scheduleCursorFlush();
    }

    private scheduleCursorFlush(): void {
        if (this.disposed || !this.isCursorDirty || this.cursorTimer) {
            return;
        }

        // new Date로 하면, 시스템 시간이 달라질 경우 계속 남어있거나 할 수 있음.
        const nowTime = performance.now();
        const spendTime = nowTime - this.lastCursorSentTime;
        const needWaitTime = Math.max(0, this.cursorIntervalMs - spendTime);

        // 대기 시간이 다 끝났다면 보낸다.
        if (needWaitTime <= 0) {
            this.flushCursor();
            // this.scheduleCursorFlush();
            return;
        }

        // 대기 시간이 남아잇다면 예약한다.
        this.cursorTimer = setTimeout(() => {
            this.cursorTimer = null;
            this.flushCursor();
            this.scheduleCursorFlush();
        }, needWaitTime);
    }

    private flushCursor() {
        if (this.disposed || !this.isCursorDirty) {
            return;
        }

        this.deps.awareness.setLocalStateField("cursor", this.pendingCursor);

        this.lastSentCursor = this.pendingCursor;
        this.lastCursorSentTime = performance.now();
        this.isCursorDirty = false;
    }

    private flushCursorChat() {
        if (this.disposed || this.pendingChatMessage === null) return;

        const message = this.pendingChatMessage.trim().slice(0, CURSOR_CHAT_STRING_MAX_LEN);

        const cursorChat: CursorChat = { id: generateId(), message: message, at: Date.now() };
        this.deps.awareness.setLocalStateField("chat", cursorChat);

        if (this.cursorChatTimeoutId) {
            clearTimeout(this.cursorChatTimeoutId);
        }

        this.cursorChatTimeoutId = setTimeout(() => {
            if (this.disposed) return;
            const current = this.deps.awareness.getLocalState()?.chat;
            if (current?.id === cursorChat.id) {
                this.deps.awareness.setLocalStateField("chat", null);
            }
        }, CURSOR_CHAT_TTL_MS);

        this.lastCursorChatSentTime = performance.now();
        this.pendingChatMessage = null;
    }

    private scheduleCursorChatFlush(): void {
        if (this.disposed || this.cursorChatTimer) {
            return;
        }

        const nowTime = performance.now();
        const spendTime = nowTime - this.lastCursorChatSentTime;
        const needWaitTime = Math.max(0, CURSOR_CHAT_THROTTLE_MS - spendTime);

        if (needWaitTime <= 0) {
            this.flushCursorChat();
            return;
        }

        this.cursorChatTimer = setTimeout(() => {
            this.cursorChatTimer = null;
            this.flushCursorChat();
        }, needWaitTime);
    }

    // pointer move가 발생할 때마다 실행됩니다.
    handlePointerMove(cursor: CursorPos): void {
        // 현재 커서 영역 안에 있나요?
        const rect = this.deps.getCanvasRect();
        if (!rect || !isPointInRect(cursor, rect)) {
            this.clearCursor();
            return;
        }

        const world = this.deps.screenToWorld(cursor.x, cursor.y);
        this.setCursor(world);
    }

    handlePointerLeave(): void {
        this.clearCursor();
    }

    clearCursor() {
        this.pendingCursor = null;
        this.isCursorDirty = !isSamePoint(this.pendingCursor, this.lastSentCursor);
        this.scheduleCursorFlush();
    }

    sendCursorChat(message: string): void {
        if (this.disposed) return;

        const cleanMessage = message.trim().slice(0, CURSOR_CHAT_STRING_MAX_LEN);
        if (this.pendingChatMessage === cleanMessage) return; // 이전과 같다면 무시

        this.pendingChatMessage = cleanMessage;

        this.scheduleCursorChatFlush();
    }

    destroy(): void {
        this.disposed = true;

        if (this.cursorTimer) {
            clearTimeout(this.cursorTimer);
            this.cursorTimer = null;
        }
        if (this.cursorChatTimer) {
            clearTimeout(this.cursorChatTimer);
            this.cursorChatTimer = null;
        }
        if (this.cursorChatTimeoutId) {
            clearTimeout(this.cursorChatTimeoutId);
            this.cursorChatTimeoutId = null;
        }

        try {
            this.deps.awareness.off("change", this.onAwarenessChange);
            this.deps.awareness.setLocalStateField("cursor", null);
            this.deps.awareness.setLocalStateField("chat", null);
        } catch {
            // ignore
        }
    }

    onAwarenessChange = () => {
        const selfId = this.deps.awareness.clientID;
        const states = this.deps.awareness.getStates();
        const cursors: CollaboratorCursor[] = [];

        states.forEach((state, clientId) => {
            const user = state?.user;
            if (!user) return;

            if (clientId === this.deps.awareness.clientID) return;

            const { cursor, chat } = state;

            if (cursor) {
                cursors.push({
                    clientId,
                    user,
                    cursor,
                    chat,
                });
            }
        });

        const nextCursors: CollaboratorCursorsInfo = { enabled: true, selfClientId: selfId, cursors };
        this.deps.commitCursors(nextCursors);
    };
}
