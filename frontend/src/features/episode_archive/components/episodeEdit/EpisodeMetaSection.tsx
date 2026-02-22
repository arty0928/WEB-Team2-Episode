import EpisodeCompetencyChipGroup from "@/features/episode_archive/components/episodeEdit/EpisodeCompetencyChipGroup";
import Button from "@/shared/components/button/Button";
import { cn } from "@/utils/cn";

type EpisodeMetaSectionProps = {
    className?: string;
    onCancel: () => void;
    isSubmitting?: boolean;
};

export default function EpisodeMetaSection({ className, onCancel, isSubmitting = false }: EpisodeMetaSectionProps) {
    return (
        <div className={cn("flex flex-col h-full", className)}>
            <div className="flex-1 overflow-y-auto">
                <h3 className="typo-body-14-semibold text-text-main1 mb-4">역량 태그</h3>
                <EpisodeCompetencyChipGroup isDisabled={isSubmitting} />
            </div>

            <div className="flex flex-col gap-2 mt-6">
                <Button
                    type="submit"
                    variant="primary"
                    layout="fullWidth"
                    className="py-3 rounded-xl"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? "저장 중..." : "저장하기"}
                </Button>

                <Button
                    type="button"
                    variant="basic"
                    layout="fullWidth"
                    onClick={onCancel}
                    className="py-3 rounded-xl bg-gray-200 text-gray-800"
                    disabled={isSubmitting}
                >
                    취소하기
                </Button>
            </div>
        </div>
    );
}
