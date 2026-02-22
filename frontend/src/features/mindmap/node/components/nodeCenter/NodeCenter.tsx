// NodeCenter.tsx
import { ReactNode } from "react";

import AddChildNodeButton from "@/features/mindmap/node/components/addNode/AddChildNodeButton";
import { NodeId } from "@/features/mindmap/types/node";
import { cn } from "@/utils/cn";

type NodeCenterProps = {
    baseId?: NodeId;
    username?: string;
    className?: string;
    children?: ReactNode;
};

const PRIMARY_COLOR = "violet";
const DEFAULT_BASE_ID = "root" as NodeId;

export default function NodeCenter({ username = "", baseId = DEFAULT_BASE_ID, className, children }: NodeCenterProps) {
    const fallbackLabel = username ? `${username}의\n마인드맵` : "마인드맵";

    return (
        <div className={cn("group relative flex items-center gap-2 cursor-pointer", className)}>
            {/* 왼쪽 버튼: 항상 존재 */}
            <AddChildNodeButton
                baseId={baseId}
                side="left"
                color={PRIMARY_COLOR}
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            />

            {/* 중앙 원형 콘텐츠: children을 여기로 */}
            <div className="text-center cursor-pointer w-40 bg-node-violet-op-100 rounded-full h-40 flex items-center justify-center text-white typo-body-16-semibold px-3 whitespace-pre-line">
                {children ?? fallbackLabel}
            </div>

            {/* 오른쪽 버튼: 항상 존재 */}
            <AddChildNodeButton
                baseId={baseId}
                side="right"
                color={PRIMARY_COLOR}
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            />
        </div>
    );
}
