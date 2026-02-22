import { SearchEpisodesReq } from "@/features/episode_archive/types/episode";

export const episodeArchiveQueryKeys = {
    all: ["episodes"] as const,

    searches: () => [...episodeArchiveQueryKeys.all, "search"] as const,
    search: (params: SearchEpisodesReq) => [...episodeArchiveQueryKeys.searches(), { ...params }] as const,
};
