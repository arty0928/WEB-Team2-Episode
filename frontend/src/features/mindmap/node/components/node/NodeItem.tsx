import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { DEFAULT_NODE_HEIGHT, DEFAULT_NODE_WIDTH } from "@/features/mindmap/constants/node";
import {
    normalizeRootContents,
    ROOT_CONTENTS_MAX_LENGTH,
    ROOT_NODE_OUTER_HEIGHT,
    ROOT_NODE_OUTER_WIDTH,
} from "@/features/mindmap/constants/rootNode";
import { useMindmapActions, useMindmapNode, useMindmapNodeLock } from "@/features/mindmap/hooks/useMindmapStoreState";
import { Node } from "@/features/mindmap/node/components/node/Node";
import NodeCenter from "@/features/mindmap/node/components/nodeCenter/NodeCenter";
import { useIsStarTargetNode } from "@/features/mindmap/star/StarEpisodePanelProvider";
import type { NodeId } from "@/features/mindmap/types/node";
import { moveCursorToEnd } from "@/shared/utils/moveCursorToEnd";
import { cn } from "@/utils/cn";

const MAX_CONTENTS_LENGTH = 200;

type Props = {
    nodeId: NodeId;
    measure?: boolean;
};

// TODO: 컨트롤러의 actions이용하는 거로 변경
function NodeItem({ nodeId, measure = true }: Props) {
    const nodeData = useMindmapNode(nodeId);
    const { updateNodeSize, updateNodeContents, unlockNode } = useMindmapActions();

    const lock = useMindmapNodeLock(nodeId);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const lastSizeRef = useRef({ w: 0, h: 0 });

    // 실제 노드 사이즈 업데이트
    useEffect(() => {
        if (!measure) return;
        if (!nodeData) return;
        if (nodeData.type === "root") return; //root는 고정 크기
        if (!contentRef.current) return;

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;

            const { height } = entry.contentRect;
            const newWidth = DEFAULT_NODE_WIDTH;
            const newHeight = Math.max(Math.round(height), DEFAULT_NODE_HEIGHT);

            if (Math.abs(lastSizeRef.current.w - newWidth) > 1 || Math.abs(lastSizeRef.current.h - newHeight) > 1) {
                lastSizeRef.current = { w: newWidth, h: newHeight };

                requestAnimationFrame(() => {
                    updateNodeSize(nodeId, newWidth, newHeight);
                });
            }
        });

        observer.observe(contentRef.current);
        return () => observer.disconnect();
    }, [measure, nodeData, nodeId, updateNodeSize]);

    if (!nodeData) return null;

    const { x, y, contents, width: nodeW, height: nodeH } = nodeData;
    const isRoot = nodeData.type === "root";
    const { addNodeDirection } = nodeData;

    const nodeColor = nodeData.color ?? "violet";
    const nodeSize = nodeData.size ?? "sm";

    const locked = lock.locked;
    const lockedByMe = locked && lock.lockedByMe;
    const lockedByOther = locked && !lock.lockedByMe;

    const [draft, setDraft] = useState<string>(contents ?? "");
    const pendingContentsRef = useRef<string | null>(null);
    const rafIdRef = useRef<number | null>(null);

    const isStarTarget = useIsStarTargetNode(nodeId);

    useEffect(() => {
        if (lockedByMe) return;
        setDraft(contents ?? "");
    }, [contents, lockedByMe]);

    useLayoutEffect(() => {
        if (!lockedByMe) return;

        const el = textareaRef.current;
        if (!el) return;

        // 포커스 + 커서 끝으로
        moveCursorToEnd(el);

        el.style.height = "auto";
        el.style.height = `${el.scrollHeight}px`;
    }, [lockedByMe]);

    const lockLabel = locked && lock.info ? `🔒 ${lock.info?.user.name}` : null;
    const lockColor = locked && lock.info ? lock.info?.user.color : "#999";

    const flushBroadcast = useCallback(
        (value?: string) => {
            const next = value ?? pendingContentsRef.current ?? draft;
            pendingContentsRef.current = null;
            if (rafIdRef.current != null) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
            updateNodeContents(nodeId, next);
        },
        [draft, nodeId, updateNodeContents],
    );

    const commitDraft = useCallback(() => {
        if (draft !== (contents ?? "")) {
            updateNodeContents(nodeId, draft);
        }
    }, [contents, draft, nodeId, updateNodeContents]);

    const scheduleBroadcast = useCallback(
        (value: string) => {
            pendingContentsRef.current = value;
            if (rafIdRef.current != null) return;
            rafIdRef.current = requestAnimationFrame(() => {
                rafIdRef.current = null;
                const v = pendingContentsRef.current;
                if (v == null) return;
                pendingContentsRef.current = null;
                updateNodeContents(nodeId, v);
            });
        },
        [nodeId, updateNodeContents],
    );

    const exitEdit = useCallback(() => {
        if (lockedByMe) unlockNode();
    }, [lockedByMe, unlockNode]);

    // =========================
    // 루트 12자 제한 안내 (textarea 아래 고정)
    // =========================
    const [rootHintVisible, setRootHintVisible] = useState(false);
    const hintTimerRef = useRef<number | null>(null);

    const showRootHint = useCallback(() => {
        setRootHintVisible(true);

        if (hintTimerRef.current != null) window.clearTimeout(hintTimerRef.current);
        hintTimerRef.current = window.setTimeout(() => {
            setRootHintVisible(false);
            hintTimerRef.current = null;
        }, 1200);
    }, []);

    useEffect(() => {
        return () => {
            if (hintTimerRef.current != null) window.clearTimeout(hintTimerRef.current);
        };
    }, []);

    if (isRoot) {
        const w = ROOT_NODE_OUTER_WIDTH;
        const h = ROOT_NODE_OUTER_HEIGHT;

        const display = (contents ?? "").trim() || "마인드맵";

        return (
            <>
                <foreignObject
                    x={x - w / 2}
                    y={y - h / 2}
                    width={w}
                    height={h}
                    data-node-id={nodeId}
                    className="overflow-visible transition-all duration-75"
                >
                    <div style={{ width: w, height: h, boxSizing: "border-box" }} className="relative">
                        {locked && lockLabel && (
                            <div
                                className="absolute -top-3 -right-3 z-10 px-2 py-1 rounded-full text-11 text-white pointer-events-none select-none shadow"
                                style={{ backgroundColor: lockColor, opacity: 0.95 }}
                            >
                                {lockLabel}
                                {lockedByMe ? " (나)" : ""}
                            </div>
                        )}

                        <NodeCenter>
                            {lockedByMe ? (
                                <div className="relative w-full">
                                    <textarea
                                        ref={textareaRef}
                                        value={draft}
                                        placeholder="마인드맵"
                                        className="w-full bg-transparent outline-none resize-none overflow-hidden text-center leading-normal"
                                        rows={1}
                                        style={{
                                            height: "auto",
                                            minHeight: "1.5em",
                                            display: "block",
                                        }}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onFocus={(e) => {
                                            e.currentTarget.style.height = "auto";
                                            e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
                                        }}
                                        onKeyDown={(e) => {
                                            e.stopPropagation();
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                commitDraft();
                                                flushBroadcast();
                                                exitEdit();
                                            }
                                        }}
                                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                                            const rawValue = e.target.value;
                                            const next = normalizeRootContents(rawValue);

                                            if (rawValue.replace(/[\r\n]+/g, " ").length > ROOT_CONTENTS_MAX_LENGTH) {
                                                showRootHint();
                                            }

                                            setDraft(next);
                                            scheduleBroadcast(next);
                                            e.currentTarget.style.height = "auto";
                                            e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
                                        }}
                                        onBlur={() => {
                                            const normalized = normalizeRootContents(draft);
                                            if (normalized !== draft) setDraft(normalized);

                                            commitDraft();
                                            flushBroadcast(normalized);
                                            exitEdit(); // 여기서 잠금 해제
                                        }}
                                    />

                                    {rootHintVisible && (
                                        <div
                                            className="absolute left-1/2 top-full mt-2 -translate-x-1/2
                                                   px-3 py-2 rounded-md bg-black/80 text-white text-12 shadow
                                                   pointer-events-none select-none whitespace-nowrap"
                                        >
                                            12글자 내에서 작성해주세요
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div
                                    className={cn(
                                        "whitespace-pre-wrap break-all w-full text-center select-none",
                                        !contents ? "text-white/70" : "text-white",
                                    )}
                                >
                                    {display}
                                </div>
                            )}
                        </NodeCenter>
                    </div>
                </foreignObject>
            </>
        );
    }
    return (
        <foreignObject
            x={x - (nodeW || DEFAULT_NODE_WIDTH) / 2}
            y={y - (nodeH || DEFAULT_NODE_HEIGHT) / 2}
            width={nodeW || DEFAULT_NODE_WIDTH}
            height={nodeH || DEFAULT_NODE_HEIGHT}
            data-node-id={nodeId}
            className="overflow-visible transition-all duration-75"
        >
            <div
                ref={contentRef}
                className="inline-block"
                style={{
                    width: DEFAULT_NODE_WIDTH,
                    minHeight: DEFAULT_NODE_HEIGHT,
                    boxSizing: "border-box",
                    height: "auto",
                }}
            >
                <div className="relative w-full h-full">
                    {locked && lockLabel && (
                        <div
                            className="absolute -top-3 -right-3 z-10 px-2 py-1 rounded-full text-11 text-white pointer-events-none select-none shadow"
                            style={{ backgroundColor: lockColor, opacity: 0.95 }}
                        >
                            {lockLabel}
                            {lockedByMe ? " (나)" : ""}
                        </div>
                    )}

                    <Node>
                        <Node.AddNode baseId={nodeId} side={addNodeDirection} color={nodeColor} />
                        <Node.Content
                            nodeId={nodeData.id}
                            contents={contents ?? ""} // 원본 텍스트 전달 (내부에서 메뉴 노출/빈칸 스타일 판단)
                            isEditing={lockedByMe} // 내가 편집 중인지 여부
                            size={nodeSize}
                            color={nodeColor}
                            // highlight={lockedByMe}
                            highlight={isStarTarget || lockedByMe}
                            data-action="select"
                            className={cn(
                                isRoot ? "bg-primary text-white" : "",
                                "min-h-20 h-auto p-4 flex items-center justify-center wrap-break-word overflow-wrap-anywhere",
                            )}
                            onClick={() => {
                                if (lockedByOther) {
                                    toast.error("잠금 상태라 내용 수정이 불가합니다");
                                }
                            }}
                            /* 편집 모드일 때 보여줄 textarea를 Render Prop으로 전달 */
                            renderEditor={() => (
                                <textarea
                                    ref={textareaRef}
                                    value={draft}
                                    maxLength={MAX_CONTENTS_LENGTH}
                                    placeholder="내용을 입력하세요"
                                    className="w-full bg-transparent outline-none resize-none overflow-hidden text-center leading-normal"
                                    style={{
                                        height: "auto",
                                        minHeight: "1.5rem", // 가이드라인 준수: 1.5em 대신 rem 권장
                                        display: "block",
                                    }}
                                    rows={1}
                                    onChange={(e) => {
                                        let next = e.target.value;
                                        if (next.length > MAX_CONTENTS_LENGTH) {
                                            next = next.slice(0, MAX_CONTENTS_LENGTH);
                                            toast.warning(`${MAX_CONTENTS_LENGTH}자까지만 입력 가능합니다.`);
                                        }
                                        setDraft(next);
                                        // 높이 자동 조절
                                        e.target.style.height = "auto";
                                        e.target.style.height = `${e.target.scrollHeight}px`;
                                        scheduleBroadcast(next);
                                    }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => {
                                        e.stopPropagation();
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            commitDraft();
                                            flushBroadcast();
                                            exitEdit();
                                        }
                                    }}
                                    onBlur={() => {
                                        commitDraft();
                                        flushBroadcast();
                                        exitEdit();
                                    }}
                                />
                            )}
                        />
                    </Node>
                </div>
            </div>
        </foreignObject>
    );
}
export default memo(NodeItem);
