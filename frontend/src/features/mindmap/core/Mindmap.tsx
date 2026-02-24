import { useCallback, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";

import ControllerSideBar from "@/features/mindmap/components/bar/ControllerSideBar";
import { TeamMindmapShareModal } from "@/features/mindmap/components/TeamMindmapShareModal";
import CollaborationList from "@/features/mindmap/core/CollaborationList";
import CursorChatLayer from "@/features/mindmap/core/CursorChatLayer";
import { MindmapProvider } from "@/features/mindmap/core/MindmapProvider";
import MindmapRenderer from "@/features/mindmap/core/MindmapRenderer";
import { useMindmapDetail } from "@/features/mindmap/hooks/useMindmapDetail";
import StarEpisodeHeaderIndicator from "@/features/mindmap/star/components/StarEpisodeHeaderIndicator";
import StarEpisodePanelOverlay from "@/features/mindmap/star/StarEpisodePanelOverlay";
import { StarEpisodePanelProvider, useStarEpisodePanelActions } from "@/features/mindmap/star/StarEpisodePanelProvider";
import StarEpisodeTargetSync from "@/features/mindmap/star/StarEpisodeTargetSync";
import { CollaboratorInfo } from "@/features/mindmap/types/mindmapCollaborationType";
import HeaderToolBar from "@/shared/components/headerToolBar/HeaderToolBar";
import { BaseError } from "@/shared/utils/errors";

export type MindmapConfig = {
    layout?: { xGap?: number; yGap?: number };
    interaction?: { dragThreshold?: number };
};

type Props = {
    doc?: Y.Doc;
    mindmapId?: string;
    provider?: WebsocketProvider;
    config?: MindmapConfig;
    user?: CollaboratorInfo;
};

/*
화면 전체를 차지하는 마인드맵을 렌더링합니다.
*/
const MindmapContent = ({
    doc,
    mindmapId,
    provider,
    resolvedConfig,
    user,
    handleMindmapError,
}: Omit<Props, "config"> & {
    resolvedConfig: MindmapConfig;
    handleMindmapError: (e: unknown) => void;
}) => {
    const canvasRef = useRef<SVGSVGElement | null>(null);
    const { data: mindmapData } = useMindmapDetail(mindmapId ?? "");

    const { setIsShared } = useStarEpisodePanelActions();

    useEffect(() => {
        if (mindmapData) {
            setIsShared(!!mindmapData.isShared);
        }
    }, [mindmapData?.isShared, setIsShared]);

    return (
        <div className="flex flex-col w-full h-full min-h-0">
            <div className="shrink-0">
                <HeaderToolBar
                    title={mindmapData.mindmapName}
                    rightSlot={
                        <>
                            <StarEpisodeHeaderIndicator />
                            {mindmapData.isShared && <TeamMindmapShareModal collaborators={mindmapData.participants} />}
                        </>
                    }
                />
            </div>
            <div className="flex-1 min-h-0">
                <MindmapProvider
                    doc={doc}
                    roomId={mindmapId}
                    canvasRef={canvasRef}
                    awareness={provider?.awareness ?? null}
                    user={user}
                    config={resolvedConfig}
                    onError={handleMindmapError}
                >
                    <div className="flex flex-col w-full h-full bg-slate-100 overflow-hidden relative">
                        {mindmapData.isShared && <CollaborationList />}
                        <ControllerSideBar />

                        <div className="flex-1 relative min-h-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-size-[20px_20px]">
                            <StarEpisodeTargetSync />
                            <svg ref={canvasRef} className="w-full h-full block">
                                <MindmapRenderer isShared={mindmapData.isShared} />
                            </svg>
                            <CursorChatLayer />
                            <StarEpisodePanelOverlay />
                        </div>
                    </div>
                </MindmapProvider>
            </div>
        </div>
    );
};

/* 외부로 노출되는 메인 컴포넌트 (Provider 주입) */
const Mindmap = (props: Props) => {
    const { config } = props;

    const resolvedConfig = useMemo<MindmapConfig>(
        () => ({
            layout: {
                xGap: config?.layout?.xGap ?? 100,
                yGap: config?.layout?.yGap ?? 20,
            },
            interaction: {
                dragThreshold: config?.interaction?.dragThreshold ?? 5,
            },
        }),
        [config?.layout?.xGap, config?.layout?.yGap, config?.interaction?.dragThreshold],
    );

    const handleMindmapError = useCallback((e: unknown) => {
        if (e instanceof BaseError) {
            if (e.displayType === "alert") {
                toast.error(e.message);
                return;
            }
        }
    }, []);

    return (
        <StarEpisodePanelProvider>
            <MindmapContent {...props} resolvedConfig={resolvedConfig} handleMindmapError={handleMindmapError} />
        </StarEpisodePanelProvider>
    );
};

export default Mindmap;
