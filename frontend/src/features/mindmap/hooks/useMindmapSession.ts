import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";

import { ENV } from "@/constants/env";
import { ApiError } from "@/features/auth/types/api";
import { mindmapEndpoints } from "@/shared/api/api";
import { post } from "@/shared/api/method";
import { BadRequestError, InternalServerError } from "@/shared/utils/errors";

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
            throw new InternalServerError(
                "네트워크가 불안정하여 마인드맵 데이터를 불러오지 못했습니다. 새로고침 해주세요.",
            );
        }

        // 개인마인드맵에 join하려하면 403 + MINDMAP_ACCESS_FORBIDDEN로 오류옵니다.
        // participants가 필요한거면 403 + MINDMAP_PARTICIPANT_NOT_FOUND 오류옵니다.
        if (e.status === 403) {
            if (e.code === "MINDMAP_ACCESS_FORBIDDEN") {
                throw new BadRequestError("개인 마인드맵에는 참여할 수 없습니다.");
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

type ConnectionStatus = "disconnected" | "connecting" | "connected";

type Props = {
    mindmapId: string;
};

export function useMindmapSession({ mindmapId }: Props) {
    const doc = useMemo(() => new Y.Doc(), [mindmapId]);
    const [provider, setProvider] = useState<WebsocketProvider | undefined>(undefined);
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
    const [isSynced, setIsSynced] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const isUnmountedRef = useRef(false);
    const isInitialLoadRef = useRef(true);
    const isConnectingRef = useRef(false);

    useEffect(() => {
        isUnmountedRef.current = false;

        let wsProvider: WebsocketProvider | null = null;
        let retryTimeout: NodeJS.Timeout;
        let retryCount = 0;
        const MAX_RETRY = 5;

        const destroyCurrentProvider = () => {
            if (wsProvider) {
                wsProvider.disconnect();
                wsProvider.destroy();
                wsProvider = null;
            }
        };

        const connectWebSocket = async () => {
            if (!mindmapId || isUnmountedRef.current) return;

            if (isConnectingRef.current) return;

            setError(null);

            if (!navigator.onLine) {
                toast.error("네트워크 상태를 확인해주세요.");
                setConnectionStatus("disconnected");
                if (isInitialLoadRef.current) {
                    setError(new BadRequestError("네트워크에 연결되어 있지 않습니다. 연결 확인 후 새로고침 해주세요."));
                } else {
                    toast.error("네트워크 상태를 확인해주세요.");
                }

                return;
            }

            try {
                isConnectingRef.current = true;
                setConnectionStatus("connecting");

                const { token, presignedUrl } = await fetchJoinSession(mindmapId);
                if (isUnmountedRef.current) return;

                const res = await fetch(presignedUrl);
                if (!res.ok) throw new InternalServerError(`Snapshot fetch failed: ${res.status}`);

                const buffer = await res.arrayBuffer();
                if (isUnmountedRef.current) return;

                const lastEntryId = res.headers.get("X-Amz-Meta-Last-Entry-Id") ?? "0-0";

                Y.applyUpdate(doc, new Uint8Array(buffer));

                destroyCurrentProvider();

                wsProvider = new WebsocketProvider(`${ENV.WS_BASE_URL}/mindmap/`, mindmapId, doc, {
                    connect: true,
                    params: { token, lastEntryId },
                    resyncInterval: 20000,
                });

                wsProvider.on("status", (event: { status: ConnectionStatus }) => {
                    if (isUnmountedRef.current) return;
                    setConnectionStatus(event.status);

                    if (event.status === "disconnected") {
                        console.warn("🔌 웹소켓 끊김 감지. 새 토큰과 스냅샷으로 재연결을 준비합니다.");

                        setIsSynced(false);
                        destroyCurrentProvider();

                        clearTimeout(retryTimeout);
                        retryTimeout = setTimeout(() => {
                            if (navigator.onLine) {
                                console.warn("🔄 재연결 시도 중...");
                                connectWebSocket();
                            }
                        }, 2000);
                    }
                });

                wsProvider.on("sync", (synced: boolean) => {
                    if (isUnmountedRef.current) return;
                    setIsSynced(synced);
                    if (synced) {
                        console.log("🎉 서버와 데이터 동기화 완료!");
                        isInitialLoadRef.current = false;
                        retryCount = 0;
                    }
                });

                setProvider(wsProvider);
            } catch (err) {
                console.error("❌ 세션 연결 실패:", err);
                if (isUnmountedRef.current) return;

                if (retryCount < MAX_RETRY) {
                    retryCount++;
                    const delay = Math.pow(2, retryCount) * 1000;
                    console.warn(`🔄 ${delay}ms 후 재연결 시도 중... (${retryCount}/${MAX_RETRY})`);
                    clearTimeout(retryTimeout);
                    retryTimeout = setTimeout(connectWebSocket, delay);
                } else {
                    setConnectionStatus("disconnected");

                    if (isInitialLoadRef.current) {
                        setError(
                            new BadRequestError(
                                "네트워크가 불안정하여 마인드맵 데이터를 불러오지 못했습니다. 새로고침 해주세요.",
                            ),
                        );
                    } else {
                        toast.error("세션이 만료되었거나 네트워크가 끊어졌습니다.");
                    }
                }
            } finally {
                isConnectingRef.current = false;
            }
        };

        connectWebSocket();

        const handleEnvironmentChange = () => {
            if (navigator.onLine && (!wsProvider || !wsProvider.wsconnected)) {
                console.log("🔄 환경 변화 감지. 스냅샷 및 토큰을 새로 갱신합니다.");
                retryCount = 0;
                connectWebSocket();
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") handleEnvironmentChange();
        };

        window.addEventListener("online", handleEnvironmentChange);
        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("focus", handleEnvironmentChange);

        return () => {
            isUnmountedRef.current = true;
            clearTimeout(retryTimeout);
            window.removeEventListener("online", handleEnvironmentChange);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("focus", handleEnvironmentChange);
            destroyCurrentProvider();
        };
    }, [mindmapId, doc]);

    return {
        doc,
        provider,
        connectionStatus,
        isSynced,
        error,
    };
}
