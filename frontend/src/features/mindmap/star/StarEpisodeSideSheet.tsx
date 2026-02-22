import { memo, useEffect, useMemo } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";

import EmptyEpisode from "@/features/episode_archive/components/EmptyEpisode";
import EpisodeCompetencyChipGroup from "@/features/episode_archive/components/episodeEdit/EpisodeCompetencyChipGroup";
import EpisodeContentSection from "@/features/episode_archive/components/episodeEdit/EpisodeContentSection";
import { useEpisodeDetail } from "@/features/episode_archive/hooks/useEpisodeDetail";
import { useUpdateEpisode } from "@/features/episode_archive/hooks/useUpdateEpisode";
import type { EpisodeDetailResponse, UpdateEpisodeRequest } from "@/features/episode_archive/types/episode";
import { useMindmapNode } from "@/features/mindmap/hooks/useMindmapStoreState";
import Button from "@/shared/components/button/Button";
import Icon from "@/shared/components/icon/Icon";
import { cn } from "@/utils/cn";

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

    const methods = useForm<EpisodeDetailResponse>({
        mode: "onChange",
        defaultValues: useMemo(() => buildEmptyEpisode(nodeId), [nodeId]),
    });

    const {
        reset,
        handleSubmit,
        formState: { dirtyFields },
    } = methods;

    const { data, isLoading, isError } = useEpisodeDetail(nodeId, hasText);
    const { mutateAsync: updateEpisode, isPending } = useUpdateEpisode(nodeId);

    // 요구사항 4: 패널 열려있는 상태에서 노드 바뀌면 그냥 내용 교체(저장 안 됨)
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
                "absolute top-0 right-0 z-star-sheet",
                "w-star-sheet h-full max-h-star-sheet",
                "bg-base-white shadow-star-sheet overflow-hidden",
                "flex flex-col",
            )}
        >
            {/* 상단 고정 바 */}
            <div className="h-star-sheet-header w-full flex items-center justify-between border-b border-gray-200 bg-base-white px-6 shrink-0">
                <div className="typo-title-20-semibold text-text-main1">STAR 정리하기</div>

                {/* 요구사항 1: 닫기는 X만 */}
                <button
                    type="button"
                    onClick={onClose}
                    className="size-10 flex items-center justify-center"
                    aria-label="닫기"
                >
                    <Icon name="ic_x" size={24} color="var(--ColorSystem-Semantic-Text-color-text-sub1)" />
                </button>
            </div>

            {/* 스크롤 영역 */}
            <div className="flex-1 overflow-y-auto">
                {/* 저장하기 버튼이 끝까지 “완전히 보이도록” 하단 패딩 확보 */}
                <div className="px-6 py-6 pb-20 flex flex-col gap-4">
                    {!hasText ? (
                        // 요구사항 5: 빈 텍스트 노드면 API 호출 없이 EmptyEpisode
                        <div className="min-h-72">
                            <EmptyEpisode />
                        </div>
                    ) : (
                        <FormProvider {...methods}>
                            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8">
                                {/* Episode (read-only box) */}
                                <section className="flex flex-col gap-2">
                                    <div className="flex items-center gap-1">
                                        <div className="typo-body-16-semibold text-text-main1">에피소드</div>
                                        <div className="typo-body-16-semibold text-red-100">*</div>
                                    </div>

                                    <div className="w-full rounded-lg border border-gray-200 bg-base-white px-4 py-3 typo-body-14-semibold text-gray-800 whitespace-pre-wrap break-words">
                                        {nodeText}
                                    </div>
                                </section>

                                {/* Competency */}
                                <section className="flex flex-col gap-2">
                                    <div className="flex items-center gap-1">
                                        <span className="typo-body-16-semibold text-text-main1">역량 태그</span>
                                        <span className="typo-caption-12-reg text-gray-500">(복수 선택 가능)</span>
                                    </div>
                                    <EpisodeCompetencyChipGroup isDisabled={isLoading || isPending} />
                                </section>

                                {/* Content */}
                                <EpisodeContentSection className="w-full p-0 bg-transparent" />

                                {isError ? (
                                    <div className="typo-body-14-medium text-red-100">
                                        에피소드 정보를 불러오지 못했습니다.
                                    </div>
                                ) : null}

                                <Button
                                    type="submit"
                                    variant="primary"
                                    layout="fullWidth"
                                    className="py-3 rounded-xl"
                                    disabled={isLoading || isPending}
                                >
                                    {isPending ? "저장 중..." : "저장하기"}
                                </Button>
                            </form>
                        </FormProvider>
                    )}
                </div>
            </div>
        </aside>
    );
}

const StarEpisodeSideSheet = memo(StarEpisodeSideSheetComponent);
export default StarEpisodeSideSheet;
