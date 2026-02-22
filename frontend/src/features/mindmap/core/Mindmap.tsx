import { useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";

import ControllerSideBar from "@/features/mindmap/components/bar/ControllerSideBar";
import { TeamMindmapShareModal } from "@/features/mindmap/components/TeamMindmapShareModal";
import CollaborationList from "@/features/mindmap/core/CollaborationList";
import { MindmapProvider } from "@/features/mindmap/core/MindmapProvider";
import MindmapRenderer from "@/features/mindmap/core/MindmapRenderer";
import { useMindmapDetail } from "@/features/mindmap/hooks/useMindmapDetail";
import StarEpisodeHeaderIndicator from "@/features/mindmap/star/components/StarEpisodeHeaderIndicator";
import StarEpisodePanelOverlay from "@/features/mindmap/star/StarEpisodePanelOverlay";
import { StarEpisodePanelProvider } from "@/features/mindmap/star/StarEpisodePanelProvider";
import StarEpisodeTargetSync from "@/features/mindmap/star/StarEpisodeTargetSync";
import { CollaboratorInfo } from "@/features/mindmap/types/mindmap_collaboration";
import HeaderToolBar from "@/shared/components/HeaderToolBar/HeaderToolBar";
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
const Mindmap = ({
    doc,
    mindmapId,
    provider,
    config = {
        layout: { xGap: 100, yGap: 20 },
        interaction: { dragThreshold: 5 },
    },
    user,
}: Props) => {
    const canvasRef = useRef<SVGSVGElement | null>(null);

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

    const { data: mindmapData } = useMindmapDetail(mindmapId ?? "");

    return (
        <StarEpisodePanelProvider>
            <>
                <HeaderToolBar
                    title={mindmapData.mindmapName}
                    rightSlot={
                        <>
                            <StarEpisodeHeaderIndicator />
                            {mindmapData.isShared ? (
                                <TeamMindmapShareModal collaborators={mindmapData.participants} />
                            ) : null}
                        </>
                    }
                />
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
                            <StarEpisodePanelOverlay />
                        </div>
                    </div>
                </MindmapProvider>
            </>
        </StarEpisodePanelProvider>
    );
};

export default Mindmap;
