import { useCallback, useRef, useState } from "react";

import { ChatBubble, CURSOR_CHAT_STRING_MAX_LEN, CURSOR_CHAT_TTL_MS } from "@/features/mindmap/constants/cursorChat";

const FADE_MS = 400;
const MAX_STACK = 5;

type UserId = string;
export function clampMessage(v: string) {
    return v.replace(/[\r\n]+/g, " ").slice(0, CURSOR_CHAT_STRING_MAX_LEN);
}

export function useCursorChatStacks() {
    const [stacks, setStacks] = useState<Record<UserId, ChatBubble[]>>({});
    const timersRef = useRef(new Map<UserId, { leave?: NodeJS.Timeout; remove: NodeJS.Timeout }>());

    const clearTimers = useCallback((msgId: string) => {
        const t = timersRef.current.get(msgId);
        if (!t) return;
        clearTimeout(t.leave);
        clearTimeout(t.remove);
        timersRef.current.delete(msgId);
    }, []);

    const markLeaving = useCallback((msgId: string) => {
        setStacks((prev) => {
            const next = { ...prev };
            let changed = false;
            for (const [k, arr] of Object.entries(next)) {
                const updated = arr.map((m) => (m.id === msgId ? { ...m, leaving: true } : m));
                if (updated !== arr) changed = true;
                next[k] = updated;
            }
            return changed ? next : prev;
        });
    }, []);

    const removeMessage = useCallback(
        (msgId: string) => {
            clearTimers(msgId);
            setStacks((prev) => {
                const next = { ...prev };
                let changed = false;
                for (const [k, arr] of Object.entries(next)) {
                    const filtered = arr.filter((m) => m.id !== msgId);
                    if (filtered.length !== arr.length) {
                        changed = true;
                        if (filtered.length > 0) next[k] = filtered;
                        else delete next[k];
                    }
                }
                return changed ? next : prev;
            });
        },
        [clearTimers],
    );

    const pushMessage = useCallback(
        (userId: UserId, bubbleInfo: { id: string; text: string; at: number }) => {
            const now = Date.now();

            const removeDelay = CURSOR_CHAT_TTL_MS;
            const leaveDelay = CURSOR_CHAT_TTL_MS - FADE_MS;

            const bubble: ChatBubble = {
                id: bubbleInfo.id,
                text: bubbleInfo.text,
                createdAt: now, // 렌더링용 시간도 로컬 기준으로 맞춤
                leaving: false,
            };

            setStacks((prevStack) => {
                const curArr = prevStack[userId] ?? [];
                if (curArr.some((b) => b.id === bubble.id)) {
                    return prevStack;
                }

                const nextArr = [bubble, ...curArr];
                const slicedArr = nextArr.slice(0, MAX_STACK);

                // 잘린 애들 타이머 정리
                nextArr.slice(MAX_STACK).forEach((d) => clearTimers(d.id));

                return { ...prevStack, [userId]: slicedArr };
            });

            const remove = setTimeout(() => removeMessage(bubble.id), removeDelay);
            const leave = setTimeout(() => markLeaving(bubble.id), leaveDelay);
            timersRef.current.set(bubble.id, { leave, remove });
        },
        [clearTimers, markLeaving, removeMessage],
    );

    return { stacks, pushMessage };
}
