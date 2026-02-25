import { memo } from "react";

import { ChatBubble } from "@/features/mindmap/constants/cursorChat";
import { CollaboratorInfo } from "@/features/mindmap/types/mindmapCollaborationType";
import { cn } from "@/utils/cn";

const INPUT_SPACE = 60;

interface ChatBubbleStackProps {
    x: number;
    y: number;
    messages: ChatBubble[];
    user: CollaboratorInfo;
    needSlide?: boolean;
}
export const ChatBubbleStack = memo(function ChatBubbleStack({
    x,
    y,
    messages,
    user,
    needSlide = false,
}: ChatBubbleStackProps) {
    if (!messages || messages.length === 0) return null;

    return (
        <div
            className={cn(
                "absolute z-30 pointer-events-none flex flex-col-reverse items-start gap-1.5", // 역순 정렬 및 간격 설정
                "transition-transform duration-300 cubic-bezier(0.16, 1, 0.3, 1)",
            )}
            style={{
                left: x,
                // 커서 위치에서 위로 쌓이도록 transform 조정
                top: y,
                transform: `translate(0, ${needSlide ? -INPUT_SPACE : 0}px) translateY(-100%)`,
            }}
        >
            {messages.map((m, idx) => (
                <div
                    key={m.id}
                    className="relative w-max transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1)"
                    style={{
                        zIndex: messages.length - idx,
                        opacity: m.leaving ? 0 : 1,
                        transform: m.leaving ? "scale(0.95)" : "scale(1)",
                    }}
                >
                    <div
                        className={cn(
                            "px-3.5 py-2 rounded-2xl shadow-sm border border-white/10",
                            "text-13 font-medium text-white leading-tight",
                            "max-w-60 wrap-break-word", // 단어가 길면 자동 줄바꿈
                            "transition-all duration-200 ease-out",
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
