package com.yat2.episode.collaboration.worker;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.Cursor;
import org.springframework.data.redis.core.RedisCallback;
import org.springframework.data.redis.core.ScanOptions;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import com.yat2.episode.collaboration.config.RedisProperties;
import com.yat2.episode.collaboration.redis.JobStreamStore;
import com.yat2.episode.collaboration.redis.UpdateStreamStore;

@Slf4j
@Component
@RequiredArgsConstructor
public class SnapshotTriggerScheduler {
    private static final int SCAN_COUNT_HINT = 300;

    private final StringRedisTemplate stringRedisTemplate;
    private final JobStreamStore jobStreamStore;
    private final UpdateStreamStore updateStreamStore;
    private final RedisProperties redisProperties;

    @Scheduled(fixedDelay = 30000)
    public void triggerSnapshotIfNeeded() {
        List<String> keys = scanKeys();

        if (keys.isEmpty()) return;

        for (String key : keys) {
            try {
                Long len = updateStreamStore.length(key);
                if (len == null) continue;

                if (len == 0) {
                    updateStreamStore.deleteIfEmptyStream(key);
                    continue;
                }

                if (len >= redisProperties.updateStream().snapshotThreshold()) {
                    UUID roomId = extractRoomIdFromUpdatesKey(key);
                    if (roomId != null) {
                        jobStreamStore.publishSnapshot(roomId);
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to evaluate stream. key={}", key, e);
            }
        }
    }

    private List<String> scanKeys() {
        String pattern = redisProperties.updateStream().keyPrefix() + "*:updates";

        return stringRedisTemplate.execute((RedisCallback<List<String>>) connection -> {
            List<String> result = new ArrayList<>();
            ScanOptions options = ScanOptions.scanOptions().match(pattern).count(SCAN_COUNT_HINT).build();

            try (Cursor<byte[]> cursor = connection.keyCommands().scan(options)) {
                while (cursor.hasNext()) {
                    byte[] raw = cursor.next();
                    result.add(new String(raw, StandardCharsets.UTF_8));
                }
            }

            return result;
        });
    }

    private UUID extractRoomIdFromUpdatesKey(String key) {
        try {
            String prefix = redisProperties.updateStream().keyPrefix();
            if (!key.startsWith(prefix)) return null;

            String rest = key.substring(prefix.length());
            int idx = rest.indexOf(':');
            if (idx <= 0) return null;

            String roomIdStr = rest.substring(0, idx);
            return UUID.fromString(roomIdStr);
        } catch (Exception e) {
            return null;
        }
    }
}
