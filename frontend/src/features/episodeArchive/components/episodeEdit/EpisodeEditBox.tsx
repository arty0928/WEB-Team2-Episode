import { FormProvider } from "react-hook-form";
import { toast } from "sonner";

import EpisodeContentSection from "@/features/episodeArchive/components/episodeEdit/EpisodeContentSection";
import EpisodeInfoSection from "@/features/episodeArchive/components/episodeEdit/EpisodeInfoSection";
import EpisodeMetaSection from "@/features/episodeArchive/components/episodeEdit/EpisodeMetaSection";
import { useEpisodeEditForm } from "@/features/episodeArchive/hooks/useEpisodeEditForm";
import { useUpdateEpisode } from "@/features/episodeArchive/hooks/useUpdateEpisode";
import { EpisodeDetailResponse, UpdateEpisodeRequest } from "@/features/episodeArchive/types/episode";

type EpisodeEditBoxProps = {
    initialData: EpisodeDetailResponse;
    onCancel: () => void;
};

export default function EpisodeEditBox({ initialData, onCancel }: EpisodeEditBoxProps) {
    const methods = useEpisodeEditForm(initialData);
    const {
        handleSubmit,
        formState: { dirtyFields, isDirty },
    } = methods;

    const { mutateAsync: updateEpisode, isPending } = useUpdateEpisode(initialData.nodeId);
    const isSaveDisabled = isPending || !isDirty;

    const onSubmit = async (formData: EpisodeDetailResponse) => {
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
            toast.success("에피소드 내용이 저장되었습니다.");
        } catch (error) {
            toast.error("저장에 실패했습니다. 다시 시도해 주세요.");
            console.error(error);
        }
    };

    return (
        <FormProvider {...methods}>
            <form
                onSubmit={handleSubmit(onSubmit)}
                className="flex w-full h-full items-stretch bg-gray-100 rounded-xl overflow-hidden"
            >
                <EpisodeInfoSection className="w-48 p-6 shrink-0" />
                <EpisodeContentSection className="flex-1 p-6 bg-white/50" />
                <EpisodeMetaSection
                    className="w-47 p-6 shrink-0"
                    onCancel={onCancel}
                    isSubmitting={isPending}
                    isSaveDisabled={isSaveDisabled}
                />
            </form>
        </FormProvider>
    );
}
