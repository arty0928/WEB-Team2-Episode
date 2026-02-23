import { memo, useCallback } from "react";
import { useFormContext } from "react-hook-form";

import { CompetencyTag, EpisodeDetailResponse } from "@/features/episodeArchive/types/episode";
import Chip from "@/shared/components/chip/Chip";
import { ALL_COMPETENCIES } from "@/shared/constants/competency";
import { cn } from "@/utils/cn";

type Props = {
    isDisabled?: boolean;
    className?: string;
};

function EpisodeCompetencyChipGroupComponent({ isDisabled = false, className }: Props) {
    const { watch, setValue } = useFormContext<EpisodeDetailResponse>();

    const selectedCompetencies = watch("competencyTypes") ?? [];

    const toggleTag = useCallback(
        (competency: CompetencyTag) => {
            if (isDisabled) return;

            const isSelected = selectedCompetencies.some((item) => item.id === competency.id);

            const nextCompetencies = isSelected
                ? selectedCompetencies.filter((item) => item.id !== competency.id)
                : [...selectedCompetencies, competency];

            setValue("competencyTypes", nextCompetencies, {
                shouldValidate: true,
                shouldDirty: true,
            });
        },
        [isDisabled, selectedCompetencies, setValue],
    );

    return (
        <div className={cn("flex flex-wrap gap-2", className)}>
            {ALL_COMPETENCIES.map((item) => {
                const isSelected = selectedCompetencies.some((selected) => selected.id === item.id);

                return (
                    <Chip
                        interactive={true}
                        key={item.id}
                        as="button"
                        type="button"
                        onClick={() => toggleTag(item)}
                        variant={isSelected ? "tertiary_outlined" : "quaternary_outlined"}
                        size="md"
                        className={cn(isDisabled && "cursor-not-allowed opacity-50")}
                    >
                        {item.competencyType}
                    </Chip>
                );
            })}
        </div>
    );
}

const EpisodeCompetencyChipGroup = memo(EpisodeCompetencyChipGroupComponent);
export default EpisodeCompetencyChipGroup;
