import { useMutation } from "@tanstack/react-query";

import { ApiError } from "@/features/auth/types/api";
import { episodeArchiveQueryKeys } from "@/features/episodeArchive/api/episodeArchiveQueryKeys";
import { mindmapEndpoints } from "@/shared/api/api";
import { del } from "@/shared/api/method";
import { queryClient } from "@/shared/api/queryClient";

export type DeleteEpisodesRequestBody = {
    nodeIds: string[];
};

const fetchDeleteEpisodes = (body: DeleteEpisodesRequestBody) => {
    return del<void, DeleteEpisodesRequestBody>({
        endpoint: mindmapEndpoints.deleteEpisodes(),
        data: body,
    });
};

export const useDeleteEpisodes = () => {
    return useMutation<void, ApiError, DeleteEpisodesRequestBody>({
        mutationFn: fetchDeleteEpisodes,
        retry: 3,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: episodeArchiveQueryKeys.searches() });
        },
    });
};
