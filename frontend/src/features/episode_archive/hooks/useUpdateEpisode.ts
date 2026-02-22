import { useMutation, useQueryClient } from "@tanstack/react-query";

import { episodeArchiveQueryKeys } from "@/features/episode_archive/api/episodeArchiveQueryKeys";
import { UpdateEpisodeRequest } from "@/features/episode_archive/types/episode";
import { episodeEndpoints } from "@/shared/api/api";
import { patch } from "@/shared/api/method";

export const useUpdateEpisode = (nodeId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: UpdateEpisodeRequest) =>
            patch<void, UpdateEpisodeRequest>({
                endpoint: episodeEndpoints.update(nodeId),
                data,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: episodeArchiveQueryKeys.searches() });
        },
    });
};
