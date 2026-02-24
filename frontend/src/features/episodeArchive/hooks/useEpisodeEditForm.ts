import { useEffect } from "react";
import { useForm } from "react-hook-form";

import type { EpisodeDetailResponse } from "@/features/episodeArchive/types/episode";

export const useEpisodeEditForm = (initialData: EpisodeDetailResponse) => {
    const methods = useForm<EpisodeDetailResponse>({
        defaultValues: initialData,
        mode: "onChange",
    });

    const { reset } = methods;

    useEffect(() => {
        reset(initialData);
    }, [initialData.nodeId, initialData.updatedAt, reset]);

    return methods;
};
