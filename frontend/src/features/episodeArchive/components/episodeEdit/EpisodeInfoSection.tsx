import { useFormContext, useWatch } from "react-hook-form";

import EpisodeDateRangeSection from "@/features/episodeArchive/components/episodeEdit/EpisodeDateRangeSection";
import { EpisodeDetailResponse } from "@/features/episodeArchive/types/episode";
import { cn } from "@/utils/cn";

type EpisodeInfoSectionProps = {
    className?: string;
};

export default function EpisodeInfoSection({ className }: EpisodeInfoSectionProps) {
    const { control } = useFormContext<EpisodeDetailResponse>();
    const content = useWatch({ control, name: "content" });

    return (
        <div className={cn("flex flex-col gap-8 overflow-visible", className)}>
            <EpisodeDateRangeSection layout="vertical" />

            <div className="flex flex-col gap-3 w-full">
                <label className="typo-body-16-semibold text-text-main1">에피소드 제목</label>
                <div className="flex w-full h-fit px-5 pt-4 pb-3.5 rounded-xl bg-white focus-within:border-primary transition-colors">
                    {content}
                </div>
            </div>
        </div>
    );
}
