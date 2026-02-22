import { memo, useEffect } from "react";

import { useMindmapSelection } from "@/features/mindmap/hooks/useMindmapStoreState";
import {
    useStarEpisodePanelActions,
    useStarEpisodePanelSelector,
} from "@/features/mindmap/star/StarEpisodePanelProvider";

function StarEpisodeTargetSyncComponent() {
    const isOpen = useStarEpisodePanelSelector((s) => s.isOpen);
    const selectedNodeId = useMindmapSelection();
    const { setTargetNodeId } = useStarEpisodePanelActions();

    useEffect(() => {
        if (!isOpen) return;
        if (!selectedNodeId) return; //빈 곳 클릭(패닝 포함) -> 이전 노드 유지
        if (selectedNodeId === "root") return; // root는 대상 제외
        setTargetNodeId(selectedNodeId);
    }, [isOpen, selectedNodeId, setTargetNodeId]);

    return null;
}

const StarEpisodeTargetSync = memo(StarEpisodeTargetSyncComponent);
export default StarEpisodeTargetSync;
