import { memo } from "react";

import { useStarEpisodePanelSelector } from "@/features/mindmap/star/StarEpisodePanelProvider";
import Icon from "@/shared/components/icon/Icon";

type Props = {
    className?: string;
};

function StarEpisodeHeaderIndicatorComponent({ className }: Props) {
    const isOpen = useStarEpisodePanelSelector((s) => s.isOpen);

    // 메뉴에서 STAR 눌렀을 때만 보이게 = 패널 오픈일 때만 표시
    if (!isOpen) return null;

    return (
        <div className={className}>
            <div className="bg-primary flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2">
                <Icon name="ic_star" color="var(--color-base-white)" />
                <span className="typo-body-14-reg text-base-white whitespace-nowrap">STAR 정리하기</span>
            </div>
        </div>
    );
}

const StarEpisodeHeaderIndicator = memo(StarEpisodeHeaderIndicatorComponent);
export default StarEpisodeHeaderIndicator;
