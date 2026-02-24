import { memo, useEffect, useMemo } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";

import EmptyEpisode from "@/features/episodeArchive/components/EmptyEpisode";
import EpisodeCompetencyChipGroup from "@/features/episodeArchive/components/episodeEdit/EpisodeCompetencyChipGroup";
import EpisodeContentSection from "@/features/episodeArchive/components/episodeEdit/EpisodeContentSection";
import EpisodeDateRangeSection from "@/features/episodeArchive/components/episodeEdit/EpisodeDateRangeSection";
import { useEpisodeDetail } from "@/features/episodeArchive/hooks/useEpisodeDetail";
import { useUpdateEpisode } from "@/features/episodeArchive/hooks/useUpdateEpisode";
import { EpisodeDetailResponse, UpdateEpisodeRequest } from "@/features/episodeArchive/types/episode";
import { useMindmapNode } from "@/features/mindmap/hooks/useMindmapStoreState";
import { useStarEpisodePanelSelector } from "@/features/mindmap/star/StarEpisodePanelProvider";
import Button from "@/shared/components/button/Button";
import EpisodeGuide from "@/shared/components/episodeGuide/EpisodeGuide";
import Icon from "@/shared/components/icon/Icon";
import { cn } from "@/utils/cn";

type FooterProps = {
    disabled: boolean;
    isPending: boolean;
};

const StarSheetFooter = memo(function StarSheetFooter({ disabled, isPending }: FooterProps) {
    return (
        <div className=" shrink-0 p-6 pb-6 bg-base-white border-t border-gray-100">
            <Button type="submit" variant="primary" layout="fullWidth" className="py-3 rounded-xl" disabled={disabled}>
                {isPending ? "저장 중..." : "저장하기"}
            </Button>
        </div>
    );
});

type Props = {
    nodeId: string;
    onClose: () => void;
};

const buildEmptyEpisode = (nodeId: string): EpisodeDetailResponse => ({
    nodeId,
    mindmapId: "",
    content: "",
    situation: "",
    task: "",
    action: "",
    result: "",
    startDate: "",
    endDate: "",
    competencyTypes: [],
    createdAt: "",
    updatedAt: "",
});

function StarEpisodeSideSheetComponent({ nodeId, onClose }: Props) {
    const node = useMindmapNode(nodeId);
    const nodeText = (node?.contents ?? "").trim();
    const hasText = nodeText.length > 0;

    const isShared = useStarEpisodePanelSelector((s) => s.isShared);

    const methods = useForm<EpisodeDetailResponse>({
        mode: "onChange",
        defaultValues: useMemo(() => buildEmptyEpisode(nodeId), [nodeId]),
    });

    const {
        reset,
        handleSubmit,
        formState: { dirtyFields, isDirty },
    } = methods;

    const { data, isLoading } = useEpisodeDetail(nodeId, hasText);
    const { mutateAsync: updateEpisode, isPending } = useUpdateEpisode(nodeId);
    const isSaveDisabled = isLoading || isPending || !isDirty;

    // 패널 열려있는 상태에서 노드 바뀌면 그냥 내용 교체(저장 안 됨)
    useEffect(() => {
        reset(buildEmptyEpisode(nodeId));
    }, [nodeId, reset]);

    useEffect(() => {
        if (!data) return;
        reset(data);
    }, [data, reset]);

    const onSubmit = async (formData: EpisodeDetailResponse) => {
        if (!hasText) return;

        const submittedNodeId = nodeId;

        const requestBody: UpdateEpisodeRequest = {};

        const starFields: Array<keyof UpdateEpisodeRequest & keyof EpisodeDetailResponse> = [
            "situation",
            "task",
            "action",
            "result",
        ];

        starFields.forEach((field) => {
            if (dirtyFields[field]) requestBody[field] = (formData[field] as string) || "";
        });

        if (dirtyFields.competencyTypes) {
            requestBody.competencyTypeIds = (formData.competencyTypes ?? []).map((t) => t.id);
        }

        // 입력 기간
        const isDateRangeDirty = Boolean(dirtyFields.startDate || dirtyFields.endDate);
        if (isDateRangeDirty) {
            requestBody.startDate = formData.startDate || "";
            requestBody.endDate = formData.endDate || "";
        }

        if (Object.keys(requestBody).length === 0) return;

        try {
            await updateEpisode(requestBody);

            // 가드 로직: 응답이 왔을 때, 여전히 같은 노드인지 확인
            if (submittedNodeId !== nodeId) {
                // 노드가 이미 바뀌었다면, 현재 노드(B)의 데이터를 덮어쓰지 않도록
                // A의 데이터로 reset하는 과정을 생략
                return;
            }

            toast.success("에피소드 내용이 저장되었습니다.");
            reset(formData); // 같은 노드일 때만 폼 상태를 최신화(dirty 제거)
        } catch {
            toast.error("저장에 실패했습니다. 다시 시도해 주세요.");
        }
    };

    return (
        <aside
            role="dialog"
            aria-label="STAR 정리하기"
            className={cn(
                "absolute inset-y-0 right-0 z-star-sheet",
                "w-star-sheet",
                "bg-base-white shadow-star-sheet overflow-hidden",
                "flex flex-col min-h-0",
            )}
        >
            {/* 1. 상단 헤더: 고정 */}
            <div className="py-2 w-full flex flex-col border-b border-gray-100 bg-base-white px-6 shrink-0">
                <div className="flex w-full justify-between gap-4">
                    <div className="typo-title-20-semibold text-text-main1 flex items-center">STAR 정리하기</div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="size-10 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors shrink-0"
                    >
                        <Icon name="ic_x" size={24} color="var(--ColorSystem-Semantic-Text-color-text-sub1)" />
                    </button>
                </div>
                {isShared && <EpisodeGuide />}
            </div>

            <FormProvider {...methods}>
                <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    {/* 2. 중앙 내용 영역: 스크롤 가능 */}
                    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 flex flex-col gap-8">
                        {!hasText ? (
                            <div className="flex-1 flex items-center justify-center min-h-60">
                                <EmptyEpisode />
                            </div>
                        ) : (
                            <div className="flex flex-col gap-8">
                                <EpisodeDateRangeSection layout="sideSheetRow" />

                                <section className="flex flex-col gap-2">
                                    <div className="flex items-center gap-1">
                                        <span className="typo-body-16-semibold text-text-main1">역량 태그</span>
                                        <span className="typo-caption-12-reg text-gray-500">(복수 선택 가능)</span>
                                    </div>
                                    <EpisodeCompetencyChipGroup isDisabled={isLoading || isPending} />
                                </section>

                                <EpisodeContentSection className="w-full p-0 bg-transparent" />
                            </div>
                        )}
                    </div>

                    {/* 3. 하단 푸터: hasText가 true일 때만 렌더링 */}
                    {hasText && (
                        <div className="shrink-0">
                            <StarSheetFooter disabled={isSaveDisabled} isPending={isPending} />
                        </div>
                    )}
                </form>
            </FormProvider>
        </aside>
    );
}

const StarEpisodeSideSheet = memo(StarEpisodeSideSheetComponent);
export default StarEpisodeSideSheet;
