import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ChatBubbleStack } from "@/features/mindmap/components/chat/ChatBubbleStack";
import { CURSOR_CHAT_STRING_MAX_LEN, CURSOR_CHAT_TTL_MS } from "@/features/mindmap/constants/cursorChat";
import { useMindmapControllerContext } from "@/features/mindmap/core/MindmapProvider";
import { useCursorChatStacks } from "@/features/mindmap/hooks/useCursorChatStack";
import {
    useMindmapParticipants,
    useMindmapRemoteCursors,
    useMindmapSelfClientId,
    useMindmapViewport,
} from "@/features/mindmap/hooks/useMindmapStoreState";
import { CollaboratorInfo } from "@/features/mindmap/types/mindmapCollaborationType";
import useMousePos from "@/shared/hooks/useMousePos";
import useSingleKeyDown from "@/shared/hooks/useSingleKeyDown";
import { cn } from "@/utils/cn";
import { worldToScreen } from "@/utils/worldScreenTransform";

function fallbackUser(): CollaboratorInfo {
    return { id: "local", name: "나", color: "rgba(17,24,39,0.92)" };
}

export default function CursorChatOverlay() {
    const engine = useMindmapControllerContext();
    const viewport = useMindmapViewport();

    const remoteCursors = useMindmapRemoteCursors();
    const participants = useMindmapParticipants();
    const selfClientId = useMindmapSelfClientId();

    const selfKey = String(selfClientId ?? -1);
    const selfUser = useMemo(() => participants.find((p) => p.isSelf)?.user ?? fallbackUser(), [participants]);

    const { stacks, pushMessage } = useCursorChatStacks();

    const { containerRect, containerRef, mousePos } = useMousePos<HTMLDivElement>();

    const lastSeenChatIdRef = useRef(new Map<number, string>());
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState("");
    const inputRef = useRef<HTMLInputElement | null>(null);

    useSingleKeyDown(
        "Slash",
        () => setOpen(true),
        () => true,
    );

    useEffect(() => {
        if (open) inputRef.current?.focus();
    }, [open]);

    useEffect(() => {
        const now = Date.now();
        for (const c of remoteCursors) {
            const chat = c.chat;
            if (chat && now - chat.at <= CURSOR_CHAT_TTL_MS) {
                if (lastSeenChatIdRef.current.get(c.clientId) !== chat.id) {
                    lastSeenChatIdRef.current.set(c.clientId, chat.id);
                    pushMessage(String(c.clientId), { id: chat.id, text: chat.message, at: chat.at });
                }
            }
        }
    }, [remoteCursors, pushMessage]);

    const submitChat = useCallback(() => {
        const text = draft.trim();
        if (text) {
            const localId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
            pushMessage(String(selfClientId ?? -1), { id: localId, text, at: Date.now() });
            engine.actions.sendCursorChat(text);
        }
        setOpen(false);
        setDraft("");
    }, [draft, engine.actions, pushMessage, selfClientId]);

    return (
        <div ref={containerRef} className="absolute inset-0 z-20 pointer-events-none">
            {(stacks[selfKey]?.length ?? 0) > 0 && (
                <ChatBubbleStack x={mousePos.x} y={mousePos.y} messages={stacks[selfKey] ?? []} user={selfUser} />
            )}

            {remoteCursors.map((c) => {
                const msgs = stacks[String(c.clientId)];
                if (!msgs || msgs.length === 0) return null;

                const screenPos = worldToScreen(containerRect, c.cursor, viewport);
                if (!screenPos) return null;

                return (
                    <ChatBubbleStack
                        key={c.clientId}
                        x={screenPos.x}
                        y={screenPos.y}
                        messages={msgs}
                        user={c.user ?? fallbackUser()}
                    />
                );
            })}

            {open && (
                <input
                    ref={inputRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value.slice(0, CURSOR_CHAT_STRING_MAX_LEN))}
                    onKeyDown={(e) => {
                        if (e.nativeEvent.isComposing) return; // 한글 조합 중 엔터 방지

                        if (e.key === "Enter") {
                            e.preventDefault();
                            submitChat();
                        }
                        if (e.key === "Escape") {
                            e.preventDefault();
                            setOpen(false);
                            setDraft("");
                        }
                    }}
                    onBlur={() => {
                        setOpen(false);
                        setDraft("");
                    }}
                    placeholder="채팅 입력..."
                    className={cn(
                        "absolute w-64 px-3.5 py-2.5 z-50",
                        "bg-white rounded-2xl shadow-xl border border-gray-400",
                        "typo-caption-12-medium text-text-main1 placeholder:text-gray-400",
                        "outline-none focus:ring-2 focus:ring-blue-500/20",
                        "pointer-events-auto transition-all duration-200 ease-out origin-top-left",
                    )}
                    style={{
                        left: mousePos.x,
                        top: mousePos.y,
                        transform: "translate(0px, -38px)",
                    }}
                />
            )}
        </div>
    );
}
