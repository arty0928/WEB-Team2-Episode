package com.yat2.episode.collaboration.redis;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Range;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.RecordId;
import org.springframework.data.redis.connection.stream.StreamRecords;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.StreamOperations;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.yat2.episode.collaboration.config.RedisProperties;

@Slf4j
@Service
@RequiredArgsConstructor
public class UpdateStreamStore {
    private static final DefaultRedisScript<Long> DEL_IF_EMPTY_STREAM;

    static {
        DEL_IF_EMPTY_STREAM = new DefaultRedisScript<>();
        DEL_IF_EMPTY_STREAM.setLocation(
                new org.springframework.core.io.ClassPathResource("lua/del_if_empty_stream.lua"));
        DEL_IF_EMPTY_STREAM.setResultType(Long.class);
    }

    private final RedisTemplate<String, byte[]> redisBinaryTemplate;
    private final RedisProperties redisProperties;


    public boolean deleteIfEmptyStream(String key) {
        try {
            Long deleted = redisBinaryTemplate.execute(DEL_IF_EMPTY_STREAM, List.of(key));
            return deleted != null && deleted > 0;
        } catch (Exception e) {
            log.warn("Failed to delete empty stream. key={}", key, e);
            return false;
        }
    }

    public Long length(String key) {
        try {
            StreamOperations<String, String, byte[]> ops = redisBinaryTemplate.opsForStream();
            return ops.size(key);
        } catch (Exception e) {
            log.warn("Failed to read stream length. key={}", key, e);
            return null;
        }
    }

    public RecordId appendUpdate(UUID roomId, byte[] update) {
        String key = redisProperties.updateStream().keyPrefix() + roomId + ":updates";

        StreamOperations<String, String, byte[]> ops = redisBinaryTemplate.opsForStream();

        MapRecord<String, String, byte[]>
                record =
                StreamRecords.newRecord().in(key).ofMap(Map.of(redisProperties.updateStream().fieldUpdate(), update));
        RecordId id = ops.add(record);

        redisBinaryTemplate.expire(key, redisProperties.updateStream().ttl());

        return id;
    }

    public List<byte[]> readAllUpdates(UUID roomId) {
        String key = redisProperties.updateStream().keyPrefix() + roomId + ":updates";
        String field = redisProperties.updateStream().fieldUpdate();

        StreamOperations<String, String, byte[]> ops = redisBinaryTemplate.opsForStream();

        List<MapRecord<String, String, byte[]>> records = ops.range(key, Range.unbounded());

        if (records == null || records.isEmpty()) {
            return List.of();
        }

        return records.stream().map(r -> r.getValue().get(field)).filter(java.util.Objects::nonNull)
                .collect(java.util.stream.Collectors.toList());
    }
}
