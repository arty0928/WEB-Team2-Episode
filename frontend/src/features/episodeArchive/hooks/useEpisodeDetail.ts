import { useQuery } from "@tanstack/react-query";

import { EpisodeDetailResponse } from "@/features/episodeArchive/types/episode";
import { episodeEndpoints } from "@/shared/api/api";
import { get } from "@/shared/api/method";

type EmptyParams = Record<string, never>;

export const useEpisodeDetail = (nodeId: string, enabled: boolean = true) => {
    return useQuery<EpisodeDetailResponse>({
        queryKey: ["episodes", "detail", nodeId],
        queryFn: () =>
            get<EpisodeDetailResponse, EmptyParams>({
                endpoint: episodeEndpoints.detail(nodeId),
            }),
        enabled: Boolean(nodeId) && enabled,
        staleTime: 0,
        refetchOnMount: "always",
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });
};
