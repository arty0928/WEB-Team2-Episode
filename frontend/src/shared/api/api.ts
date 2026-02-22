import { MindmapId } from "@/features/mindmap/types/mindmap";

export const USER_ENDPOINT = "/users";
export const USER_ME_ENDPOINT = `${USER_ENDPOINT}/me`;

export const mindmapEndpoints = {
    create: "/mindmaps",
    list: () => "/mindmaps",
    detail: (mindmapId: string) => `/mindmaps/${mindmapId}`,
    delete: (mindmapId: string) => `/mindmaps/${mindmapId}`,
    rename: (mindmapId: string) => `/mindmaps/${mindmapId}/name`,
    favorite: (mindmapId: string) => `/mindmaps/${mindmapId}/favorite`,

    node: (mindmapId: string, nodeId: string) => `/mindmaps/${mindmapId}/nodes/${nodeId}`,

    updateEpisodes: (mindmapId: string) => `/mindmaps/${mindmapId}/episodes/batch`,
    deleteEpisodes: () => `/episodes/batch`,

    join: (mindmapId: MindmapId) => `/mindmaps/${mindmapId}/sessions/join`,
} as const;

export const episodeEndpoints = {
    search: "/episodes",
    update: (nodeId: string) => `/episodes/${nodeId}/stars`,
    clear: (nodeId: string) => `/episodes/${nodeId}/stars/clear`,
} as const;
