import * as Y from "yjs";

import { ENV } from "@/constants/env";
import { useCreateMindmap } from "@/features/mindmap/hooks/useCreateMindmap";
import { useUpdateEpisodes } from "@/features/mindmap/hooks/useUpdateEpisodes";
import { MindmapId } from "@/features/mindmap/types/mindmapType";
import { makeDocWithArr } from "@/features/mindmap/utils/createDocWithArr";
import { uploadToS3 } from "@/utils/uploadToS3";

interface InitializeOptions {
    title: string;
    isShared: boolean;
    items: string[];
}

export function useInitializeMindmap(onSuccess: (mindmapId: MindmapId) => void) {
    const { mutate: createMindmap, isPending: isCreating } = useCreateMindmap();
    const { mutateAsync: updateEpisodes, isPending: isUpdating } = useUpdateEpisodes();

    const initialize = ({ title, isShared, items }: InitializeOptions) => {
        createMindmap(
            { title, isShared },
            {
                onSuccess: async (data) => {
                    try {
                        const { uploadInfo, mindmap } = data;

                        let fields = uploadInfo.fields;

                        if (ENV.IS_DEV) {
                            const { "x-amz-security-token": _, ...fieldsWithoutToken } = uploadInfo.fields;
                            fields = fieldsWithoutToken;
                        }

                        const cleanUploadInfo = { ...uploadInfo, fields };
                        const mindmapId = mindmap.mindmapId;

                        const { doc, episodes } = makeDocWithArr({
                            name: title,
                            mindmapId,
                            items,
                        });

                        const yDocBinary = Y.encodeStateAsUpdate(doc);

                        if (uploadInfo) {
                            await uploadToS3(cleanUploadInfo, yDocBinary);
                        }

                        if (episodes.length > 0) {
                            await updateEpisodes({
                                mindmapId,
                                body: { items: episodes },
                            });
                        }

                        onSuccess(mindmapId);
                    } catch (e) {
                        console.error("초기 데이터 생성 및 업로드 실패:", e);
                    }
                },
                onError: (error) => {
                    console.error("마인드맵 생성 실패:", error);
                },
            },
        );
    };

    return { initialize, isPending: isCreating || isUpdating };
}
