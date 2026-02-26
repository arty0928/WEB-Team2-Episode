package com.yat2.episode.collaboration;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;
import org.springframework.web.socket.handler.SessionLimitExceededException;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import com.yat2.episode.collaboration.config.WebSocketProperties;

import static com.yat2.episode.global.constant.AttributeKeys.CONNECTED_AT;
import static com.yat2.episode.global.constant.AttributeKeys.LAST_SEEN;

@Slf4j
@RequiredArgsConstructor
@Component
public class SessionRegistry {
    private final ConcurrentHashMap<UUID, ConcurrentHashMap<String, WebSocketSession>> rooms =
            new ConcurrentHashMap<>();
    private final WebSocketProperties wsProperties;

    public void addSession(UUID mindmapId, WebSocketSession session) {
        session.getAttributes().putIfAbsent(CONNECTED_AT, System.nanoTime());

        WebSocketSession decorated =
                new ConcurrentWebSocketSessionDecorator(session, wsProperties.sendTimeout(), wsProperties.bufferSize());

        rooms.compute(mindmapId, (id, sessions) -> {
            if (sessions == null) {
                sessions = new ConcurrentHashMap<>();
            }

            int limit = wsProperties.roomSessionLimit();

            if (sessions.size() >= limit) {
                try {
                    decorated.close(new CloseStatus(4001, "ROOM_SESSION_LIMIT"));
                } catch (Exception ignored) {
                }
                return sessions;
            }

            sessions.put(decorated.getId(), decorated);
            return sessions;
        });
    }

    public int removeSession(UUID mindmapId, WebSocketSession session) {
        return removeSession(mindmapId, session.getId());
    }

    private int removeSession(UUID mindmapId, String sessionId) {
        ConcurrentHashMap<String, WebSocketSession> updated = rooms.computeIfPresent(mindmapId, (id, sessions) -> {
            sessions.remove(sessionId);
            return sessions.isEmpty() ? null : sessions;
        });
        return updated == null ? 0 : updated.size();
    }

    public void broadcast(UUID mindmapId, WebSocketSession sender, byte[] payload) {
        if (payload == null) {
            return;
        }
        ConcurrentHashMap<String, WebSocketSession> sessions = rooms.get(mindmapId);
        if (sessions == null || sessions.isEmpty()) return;

        final String senderId = (sender == null) ? null : sender.getId();
        final int len = payload.length;

        List<String> deadSessionIds = null;

        for (Map.Entry<String, WebSocketSession> entry : sessions.entrySet()) {
            String sessionId = entry.getKey();
            WebSocketSession session = entry.getValue();

            if (senderId != null && senderId.equals(sessionId)) continue;

            if (session == null || !session.isOpen()) {
                if (deadSessionIds == null) deadSessionIds = new ArrayList<>();
                deadSessionIds.add(sessionId);
                continue;
            }

            try {
                session.sendMessage(new BinaryMessage(payload));

            } catch (SessionLimitExceededException e) {
                if (deadSessionIds == null) deadSessionIds = new ArrayList<>();
                deadSessionIds.add(sessionId);

                log.warn("[WS][LIMIT] mindmapId={} sessionId={} senderId={} payloadBytes={} msg={}", mindmapId,
                         sessionId, senderId, len, e.getMessage());

            } catch (Exception e) {
                if (deadSessionIds == null) deadSessionIds = new ArrayList<>();
                deadSessionIds.add(sessionId);

                log.warn("[WS][SEND_FAIL] mindmapId={} sessionId={} senderId={} payloadBytes={} ex={}", mindmapId,
                         sessionId, senderId, len, e.toString());
            }
        }

        if (deadSessionIds != null) {
            for (String deadId : deadSessionIds) {
                WebSocketSession s = sessions.get(deadId);
                try {
                    if (s != null && s.isOpen()) {
                        s.close();
                    }
                } catch (Exception ignored) {}
                removeSession(mindmapId, deadId);
            }
        }
    }

    public boolean unicast(UUID mindmapId, String receiverSessionId, byte[] payload) {
        WebSocketSession session = getAliveSession(mindmapId, receiverSessionId);
        if (session == null) return false;

        try {
            session.sendMessage(new BinaryMessage(payload));
            return true;
        } catch (Exception e) {
            removeSession(mindmapId, receiverSessionId);
            log.warn("[WS][SEND_FAIL] mindmapId={} sessionId={} ex={}", mindmapId, receiverSessionId, e.toString());
            try {
                session.close();
            } catch (Exception ignored) {}
            return false;
        }
    }

    public boolean unicastAll(UUID mindmapId, String receiverSessionId, List<byte[]> payloads) {
        if (payloads == null || payloads.isEmpty()) return true;

        WebSocketSession session = getAliveSession(mindmapId, receiverSessionId);
        if (session == null) return false;

        try {
            for (byte[] payload : payloads) {
                if (payload == null) continue;
                session.sendMessage(new BinaryMessage(payload));
            }
            return true;
        } catch (Exception e) {
            removeSession(mindmapId, receiverSessionId);
            log.warn("[WS][SEND_FAIL] mindmapId={} sessionId={} ex={}", mindmapId, receiverSessionId, e.toString());
            try {
                session.close();
            } catch (Exception ignored) {}
            return false;
        }
    }

    public WebSocketSession getAliveSession(UUID roomId, String sessionId) {
        ConcurrentHashMap<String, WebSocketSession> sessions = rooms.get(roomId);
        if (sessions == null || sessions.isEmpty()) return null;

        WebSocketSession session = sessions.get(sessionId);
        if (session == null) return null;

        if (!session.isOpen() || isStale(session)) {
            removeSession(roomId, sessionId);
            return null;
        }

        return session;
    }

    public List<WebSocketSession> findAllAlivePeers(UUID roomId, String excludeId) {
        ConcurrentHashMap<String, WebSocketSession> sessions = rooms.get(roomId);
        if (sessions == null || sessions.isEmpty()) return List.of();

        List<WebSocketSession> result = new ArrayList<>(sessions.size());

        for (WebSocketSession session : sessions.values()) {
            if (session == null) continue;
            if (excludeId.equals(session.getId())) continue;

            if (!session.isOpen() || isStale(session)) {
                removeSession(roomId, session);
                continue;
            }
            result.add(session);
        }
        return result;
    }

    private boolean isStale(WebSocketSession s) {
        if (!(s.getAttributes().get(LAST_SEEN) instanceof Long last)) return false;
        return System.nanoTime() - last > wsProperties.heartbeatTimeout().toNanos();
    }

    public long getConnectedAt(WebSocketSession session) {
        return (Long) session.getAttributes().get(CONNECTED_AT);
    }
}
