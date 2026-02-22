import { memo } from "react";

import {
    useStarEpisodePanelActions,
    useStarEpisodePanelSelector,
} from "@/features/mindmap/star/StarEpisodePanelProvider";
import StarEpisodeSideSheet from "@/features/mindmap/star/StarEpisodeSideSheet";

function StarEpisodePanelOverlayComponent() {
    const isOpen = useStarEpisodePanelSelector((s) => s.isOpen);
    const targetNodeId = useStarEpisodePanelSelector((s) => s.targetNodeId);
    const { close } = useStarEpisodePanelActions();

    if (!isOpen) return null;
    if (!targetNodeId) return null;

    return <StarEpisodeSideSheet nodeId={targetNodeId} onClose={close} />;
}

const StarEpisodePanelOverlay = memo(StarEpisodePanelOverlayComponent);
export default StarEpisodePanelOverlay;
