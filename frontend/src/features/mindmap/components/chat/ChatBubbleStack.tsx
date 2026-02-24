import { memo } from "react";

import { ChatBubble } from "@/features/mindmap/constants/cursorChat";
import { CollaboratorInfo } from "@/features/mindmap/types/mindmapCollaborationType";
import { cn } from "@/utils/cn";

const STACK_GAP = 42;

interface ChatBubbleStackProps {
    x: number;
    y: number;
    messages: ChatBubble[];
    user: CollaboratorInfo;
}

export const ChatBubbleStack = memo(function ChatBubbleStack({ x, y, messages, user }: ChatBubbleStackProps) {
    if (!messages || messages.length === 0) return null;

    return (
        <div
            className="absolute z-30 pointer-events-none will-change-transform"
            style={{
                left: x,
                top: y,
            }}
        >
            {messages.map((m, idx) => (
                <div
                    key={m.id}
                    className="absolute left-0 bottom-0 w-max transition-transform duration-300 cubic-bezier(0.16, 1, 0.3, 1)"
                    style={{
                        transform: `translateY(-${idx * STACK_GAP}px)`,
                        zIndex: messages.length - idx,
                    }}
                >
                    <div
                        className={cn(
                            "px-3.5 py-2 rounded-2xl shadow-sm border border-white/10",
                            "text-13 font-medium text-white leading-tight",
                            "max-w-60",
                            "transition-all duration-200 ease-out",
                            m.leaving
                                ? "opacity-0 -translate-y-2 scale-95 blur-[2px]"
                                : "opacity-100 translate-y-0 scale-100 blur-0",
                        )}
                        style={{ backgroundColor: user.color }}
                    >
                        {m.text}
                    </div>
                </div>
            ))}
        </div>
    );
});
