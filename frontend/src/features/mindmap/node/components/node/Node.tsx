import { cva } from "class-variance-authority";
import { ComponentPropsWithoutRef, ReactNode, useState } from "react";

import { useMindmapActions } from "@/features/mindmap/hooks/useMindmapStoreState";
import AddChildNodeButton from "@/features/mindmap/node/components/addNode/AddChildNodeButton";
import { NodeColor } from "@/features/mindmap/node/constants/colors";
import { NodeVariant } from "@/features/mindmap/node/types/node";
import { colorBySize, shadowClass } from "@/features/mindmap/node/utils/style";
import { useStarEpisodePanelActions } from "@/features/mindmap/star/StarEpisodePanelProvider";
import { NodeId } from "@/features/mindmap/types/node";
import Icon from "@/shared/components/icon/Icon";
import List from "@/shared/components/list/List";
import ListRow from "@/shared/components/list/ListRow";
import Popover from "@/shared/components/popover/Popover";
import { NonNullableVariantProps } from "@/shared/types/safeVariantProps";
import { cn } from "@/utils/cn";

type Props = ComponentPropsWithoutRef<"div"> & {
    children?: ReactNode;
};

export const nodeVariants = cva(
    "relative flex w-full px-4.5 py-5 justify-center items-center gap-2.5 rounded-xl transition-shadow cursor-pointer outline-none",
    {
        variants: {
            size: {
                sm: "typo-body-14-medium text-text-main2",
                md: "typo-body-14-semibold text-text-main2",
                lg: "typo-body-16-semibold text-text-main1",
            },
        },
    },
);

function NodeComponent({ className, children, ...rest }: Props) {
    return (
        <div className={cn("group relative flex items-center gap-2", className)} {...rest}>
            {children}
        </div>
    );
}

const nodeMenuVariants = cva(
    "w-5.5 h-5.5 cursor-pointer rounded-bl-xl rounded-tr-lg justify-center items-center flex",
    {
        variants: {
            color: {
                violet: "bg-node-violet-op-100",
                blue: "bg-node-blue-op-100",
                skyblue: "bg-node-skyblue-op-100",
                mint: "bg-node-mint-op-100",
                cyan: "bg-node-cyan-op-100",
                purple: "bg-node-purple-op-100",
                magenta: "bg-node-magenta-op-100",
                navy: "bg-node-navy-op-100",
            },
        },
    },
);

type NodeContentProps = ComponentPropsWithoutRef<"div"> &
    NonNullableVariantProps<typeof nodeVariants> & {
        color: NodeColor;
        highlight?: boolean;
        nodeId: NodeId;
        contents: string; // 원본 텍스트
        isEditing: boolean; // 편집 모드 여부
        renderEditor: () => ReactNode; // 에디터 렌더링 함수
    };

function NodeContent({
    size = "sm",
    color,
    contents,
    isEditing,
    renderEditor,
    highlight = false,
    className,
    nodeId,
    ...rest
}: NodeContentProps) {
    const [isMenuOpened, setMenuIsOpened] = useState(false);
    const [isHover, setIsHover] = useState(false);

    // 실제 값이 있는지 확인 (공백 제외)
    const hasContent = contents.trim().length > 0;

    // 인터랙티브 상태 판단: 호버 중이거나 메뉴가 열려있을 때
    const variant: NodeVariant = isHover || isMenuOpened ? "interactive" : highlight ? "highlighted" : "idle";
    const colorClass = colorBySize({ size, color, variant: variant });

    const { deleteNode, selectNode } = useMindmapActions();
    const { openFromMenu } = useStarEpisodePanelActions();

    const nodeText = (contents ?? "").trim();
    const hasText = nodeText.length > 0;
    const isRoot = nodeId === "root";

    const handleOpenStarFromMenu = () => {
        if (!hasText) return;
        if (isRoot) return;

        selectNode(nodeId);
        openFromMenu(nodeId);
        setMenuIsOpened(false);
    };

    return (
        <div
            className={cn(nodeVariants({ size }), colorClass, className, variant !== "idle" ? shadowClass(color) : "")}
            onPointerEnter={() => setIsHover(true)}
            onPointerLeave={() => setIsHover(false)}
            {...rest}
        >
            {/* 1. 편집 중일 때는 에디터(textarea) 표시 */}
            {isEditing ? (
                renderEditor()
            ) : (
                /* 2. 편집 중이 아닐 때: 내용 유무에 따른 텍스트 표시 */
                <div
                    className={cn(
                        "whitespace-pre-wrap break-all w-full text-center select-none",
                        !hasContent && "text-gray-500",
                    )}
                >
                    {hasContent ? contents : "빈 칸"}
                </div>
            )}

            {/* 3. 메뉴: 인터랙티브 상태일 때만 노출 */}
            {variant === "interactive" && (
                <button
                    className={cn(nodeMenuVariants({ color }), "absolute top-0 right-0 transition-opacity")}
                    onClick={(e) => e.stopPropagation()} // 노드 클릭 이벤트 전파 방지
                >
                    <Popover
                        isOnOpenChange={(v) => setMenuIsOpened(v)}
                        direction="bottom_right"
                        contents={
                            <List className="w-40">
                                <ListRow
                                    contents="삭제하기"
                                    className="text-red-300 typo-body-14-medium"
                                    leftSlot={<Icon name="ic_nodemenu_delete" size={16} />}
                                    onClick={() => deleteNode(nodeId)}
                                />
                                {/* 내용이 있을 때만 STAR 작성하기 메뉴 표시 */}
                                {hasContent && !isRoot && (
                                    <ListRow
                                        contents="STAR 작성하기"
                                        className="text-text-main2 typo-body-14-medium"
                                        leftSlot={<Icon name="ic_star" size={16} />}
                                        onClick={handleOpenStarFromMenu}
                                    />
                                )}
                            </List>
                        }
                    >
                        <Icon name="ic_ellipsis" size={16} color="var(--color-base-white)" />
                    </Popover>
                </button>
            )}
        </div>
    );
}

export const Node = Object.assign(NodeComponent, {
    AddNode: AddChildNodeButton,
    Content: NodeContent,
});
