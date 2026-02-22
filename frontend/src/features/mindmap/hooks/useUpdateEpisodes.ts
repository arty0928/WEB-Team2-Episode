import { useMutation } from "@tanstack/react-query";

import { ApiError } from "@/features/auth/types/api";
import { episodeArchiveQueryKeys } from "@/features/episode_archive/api/episodeArchiveQueryKeys";
import { MindmapId } from "@/features/mindmap/types/mindmap";
import { NodeId } from "@/features/mindmap/types/node";
import { mindmapEndpoints } from "@/shared/api/api";
import { post } from "@/shared/api/method";
import { queryClient } from "@/shared/api/query_client";

export type UpdateEpisodesRequestBody = {
    items: {
        nodeId: NodeId;
        content: string;
    }[];
};

export type UpdateEpisodesParams = {
    mindmapId: MindmapId;
    body: UpdateEpisodesRequestBody;
};

const fetchUpdateEpisodes = ({ mindmapId, body }: UpdateEpisodesParams) => {
    return post<void, UpdateEpisodesRequestBody>({
        endpoint: mindmapEndpoints.updateEpisodes(mindmapId),
        data: body,
    });
};

export const useUpdateEpisodes = () => {
    return useMutation<void, ApiError, UpdateEpisodesParams>({
        mutationFn: fetchUpdateEpisodes,
        retry: 3,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: episodeArchiveQueryKeys.searches() });
        },
    });
};
