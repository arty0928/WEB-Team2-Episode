import { useParams } from "react-router";

import { MindmapCategoryStep } from "@/features/mindmap/components/step/MindmapCategoryStep";
import { MindmapTypeStep } from "@/features/mindmap/components/step/MindmapTypeStep";
import { TeamDetailStep } from "@/features/mindmap/components/step/TeamDetailStep";
import { CreateMindmapFunnel } from "@/features/mindmap/types/mindmapFunnelType";
import { MindmapType } from "@/features/mindmap/types/mindmapType";
import Icon from "@/shared/components/icon/Icon";
import MaxWidth from "@/shared/components/maxWidth/MaxWidth";
import Top from "@/shared/components/top/Top";
import { useFunnel } from "@/shared/hooks/useFunnel";

const CreateMindmapFunnelPage = () => {
    const { mindmapType } = useParams<{ mindmapType: MindmapType }>();

    const funnel = useFunnel<CreateMindmapFunnel, "TYPE">({
        id: "create-mindmap-funnel",
        initial: {
            step: "TYPE",
            context: {
                mindmapType,
            },
        },
    });

    return (
        <MaxWidth gap="md" maxWidth="md" className="flex-1 flex flex-col pt-15 h-full">
            <Top
                leftSlot={
                    <button onClick={() => funnel.history.back()}>
                        <Icon name="ic_chevron_left" />
                    </button>
                }
            />

            {funnel.step === "TYPE" && <MindmapTypeStep funnel={funnel} />}
            {funnel.step === "TEAM_DETAIL" && <TeamDetailStep funnel={funnel} />}
            {funnel.step === "CATEGORY" && <MindmapCategoryStep funnel={funnel} />}
        </MaxWidth>
    );
};

export default CreateMindmapFunnelPage;
