import { useSuspenseQuery } from "@tanstack/react-query";

import { ApiError } from "@/features/auth/types/api";
import { mindmapKeys } from "@/features/mindmap/api/mindmap_query_keys";
import { mindmapEndpoints } from "@/shared/api/api";
import { get } from "@/shared/api/method";

export type CompetencyType = {
    id: number;
    category: string;
    competencyType: string;
};

export type GetMindmapDetailResponse = {
    mindmapId: string;
    mindmapName: string;
    isFavorite: boolean;
    isShared: boolean;
    competencyTypes: CompetencyType[];
    participants: string[];
    createdAt: string;
    updatedAt: string;
};

const fetchMindmapDetail = (mindmapId: string) => {
    return get<GetMindmapDetailResponse>({
        endpoint: mindmapEndpoints.detail(mindmapId),
    });
};

export const useMindmapDetail = (mindmapId: string) => {
    return useSuspenseQuery<GetMindmapDetailResponse, ApiError>({
        queryKey: mindmapKeys.detail(mindmapId),
        queryFn: () => fetchMindmapDetail(mindmapId),
        staleTime: 1000 * 60 * 1,
    });
};
