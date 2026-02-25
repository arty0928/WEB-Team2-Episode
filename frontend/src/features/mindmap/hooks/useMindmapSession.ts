import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";

import { ENV } from "@/constants/env";
import { ApiError } from "@/features/auth/types/api";
import { MAX_COLLABORATORS } from "@/features/mindmap/constants/collaboration";
import { mindmapEndpoints } from "@/shared/api/api";
import { post } from "@/shared/api/method";
import { BadRequestError, InternalServerError } from "@/utils/errors";

export type JoinSessionResponse = {
    token: string;
    presignedUrl: string;
};

const postParticipants = (mindmapId: string) => {
    return post({ endpoint: `/mindmaps/${mindmapId}/participants` });
};

export const fetchJoinSession = async (
    mindmapId: string,
    maxRetryCount: number = 3,
    curRetryCount: number = 0,
): Promise<JoinSessionResponse> => {
    try {
        return await post<JoinSessionResponse, { mindmapId: string }>({
            endpoint: mindmapEndpoints.join(mindmapId),
        });
    } catch (e) {
        if (!(e instanceof ApiError)) {
            throw new InternalServerError({
                message: "서버에서 마인드맵 데이터를 불러오지 못했습니다.",
            });
        }

        // 개인마인드맵에 join하려하면 403 + MINDMAP_ACCESS_FORBIDDEN로 오류옵니다.
        // participants가 필요한거면 403 + MINDMAP_PARTICIPANT_NOT_FOUND 오류옵니다.
        if (e.status === 403) {
            if (e.code === "MINDMAP_ACCESS_FORBIDDEN") {
                throw new BadRequestError({ message: "개인 마인드맵에는 참여할 수 없습니다." });
            }

            if (curRetryCount < maxRetryCount) {
                try {
                    await postParticipants(mindmapId);

                    toast.success("참여 등록이 완료되었습니다. 마인드맵을 불러옵니다.");

                    return await fetchJoinSession(mindmapId, maxRetryCount, curRetryCount + 1);
                } catch (participantError) {
                    console.error("❌ 참여자 등록 실패:", participantError);
                    throw participantError;
                }
            }
        }

        throw e;
    }
};

export async function prepareMindmapSession(
    mindmapId: string,
    doc: Y.Doc,
): Promise<{ token: string; lastEntryId: string }> {
    const { token, presignedUrl } = await fetchJoinSession(mindmapId);

    const res = await fetch(presignedUrl);
    if (!res.ok) {
        throw new InternalServerError({ message: `Snapshot fetch failed: ${res.status}` });
    }

    const buffer = await res.arrayBuffer();
    const lastEntryId = res.headers.get("X-Amz-Meta-Last-Entry-Id") ?? "0-0";

    Y.applyUpdate(doc, new Uint8Array(buffer));

    return { token, lastEntryId };
}

const MAX_RETRY_COUNT = 5;
const RETRY_BASE_DELAY = 2000;

const WS_MAX_PARTICIPANTS_CODE = 4001;

type ConnectionStatus = "disconnected" | "connecting" | "connected";

export function useMindmapSession({ mindmapId }: { mindmapId: string }) {
    const doc = useMemo(() => new Y.Doc(), [mindmapId]);

    const [provider, setProvider] = useState<WebsocketProvider | null>(null);
    const [status, setStatus] = useState<ConnectionStatus>("disconnected");
    const [isSynced, setIsSynced] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const retryCountRef = useRef(0);
    const isUnmountedRef = useRef(false);
    const fatalErrorRef = useRef<boolean>(false);
    const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const cleanupProvider = useCallback(() => {
        setProvider((prev) => {
            if (prev) {
                prev.disconnect();
                prev.destroy();
            }
            return null;
        });
        setIsSynced(false);
    }, []);

    const stopSession = useCallback(
        (err: Error, isFatal: boolean = false) => {
            cleanupProvider();
            setStatus("disconnected");
            setError(err);

            if (isFatal) {
                fatalErrorRef.current = true;
                if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
            }
        },
        [cleanupProvider],
    );

    const connect = useCallback(async () => {
        if (isUnmountedRef.current || fatalErrorRef.current) return;
        if (!navigator.onLine) {
            toast.error("인터넷 연결을 확인해주세요.");
            return;
        }

        setStatus("connecting");
        setError(null);

        try {
            const { token, lastEntryId } = await prepareMindmapSession(mindmapId, doc);

            if (isUnmountedRef.current) return;

            cleanupProvider();

            const wsProvider = new WebsocketProvider(`${ENV.WS_BASE_URL}/mindmap/`, mindmapId, doc, {
                connect: false,
                params: { token, lastEntryId },
                resyncInterval: 20000,
            });

            wsProvider.on("connection-close", (event: CloseEvent | null, _: WebsocketProvider) => {
                if (event?.code === WS_MAX_PARTICIPANTS_CODE) {
                    stopSession(
                        new BadRequestError({
                            message: `최대 인원(${MAX_COLLABORATORS}명) 초과로 접속할 수 없습니다.`,
                        }),
                        true,
                    );
                }
            });

            wsProvider.on("status", ({ status }: { status: ConnectionStatus }) => {
                if (isUnmountedRef.current || fatalErrorRef.current) return;

                setStatus(status);

                if (status === "disconnected") {
                    console.warn("🔌 Websocket disconnected. Attempting reconnect...");
                    scheduleRetry();
                } else if (status === "connected") {
                    retryCountRef.current = 0;
                }
            });

            wsProvider.on("sync", (synced: boolean) => {
                setIsSynced(synced);
            });

            wsProvider.connect();
            setProvider(wsProvider);
        } catch (e) {
            if (!(e instanceof ApiError)) {
                stopSession(
                    new BadRequestError({
                        message: String(e),
                    }),
                    true,
                );

                console.error("❌ Connection failed:", e);
                return;
            }

            if (e.status === 403 || e.code === "MINDMAP_ACCESS_FORBIDDEN") {
                stopSession(e, true);
                return;
            }

            scheduleRetry();
        }
    }, [mindmapId, doc, cleanupProvider, stopSession]);

    const scheduleRetry = useCallback(() => {
        if (fatalErrorRef.current || isUnmountedRef.current) return;

        cleanupProvider();

        if (retryCountRef.current >= MAX_RETRY_COUNT) {
            stopSession(new Error("네트워크 상태가 불안정하여 연결할 수 없습니다."), true);
            return;
        }

        const nextRetryCount = retryCountRef.current + 1;
        const delay = RETRY_BASE_DELAY;

        console.log(`🔄 Retrying in ${delay}ms... (${nextRetryCount}/${MAX_RETRY_COUNT})`);

        retryCountRef.current = nextRetryCount;

        if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = setTimeout(() => {
            connect();
        }, delay);
    }, [connect, cleanupProvider, stopSession]);

    useEffect(() => {
        isUnmountedRef.current = false;
        fatalErrorRef.current = false;
        retryCountRef.current = 0;

        connect();

        return () => {
            isUnmountedRef.current = true;
            if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
            cleanupProvider();
        };
    }, [connect, cleanupProvider]);

    useEffect(() => {
        const handleReconnection = () => {
            if (document.visibilityState === "visible" && navigator.onLine) {
                if (status === "disconnected" && !fatalErrorRef.current) {
                    console.log("👀 App visible/online. Reconnecting immediately.");
                    retryCountRef.current = 0;
                    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
                    connect();
                }
            }
        };

        window.addEventListener("online", handleReconnection);
        document.addEventListener("visibilitychange", handleReconnection);
        window.addEventListener("focus", handleReconnection);

        return () => {
            window.removeEventListener("online", handleReconnection);
            document.removeEventListener("visibilitychange", handleReconnection);
            window.removeEventListener("focus", handleReconnection);
        };
    }, [connect, status]);

    return { doc, provider, connectionStatus: status, isSynced, error };
}
